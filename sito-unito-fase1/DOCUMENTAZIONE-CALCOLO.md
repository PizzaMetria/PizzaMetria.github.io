# Come il calcolatore prevede l'azione del lievito

Documento tecnico del calcolatore libero di PizzaMetria. Spiega il modello, da
dove vengono i coefficienti, quanta precisione ha e dove può essere migliorato.
I numeri citati sono quelli che i test verificano a ogni build.

---

## 1. L'idea in una frase

Ogni fase della lievitazione viene convertita in **ore equivalenti a 20 °C**;
quelle ore alimentano una **legge a potenza** che restituisce la percentuale di
lievito fresco sulla farina, corretta per idratazione, sale e olio. La stessa
scala di ore dice anche **quanta forza deve avere la farina**.

Non è un modello chimico: è un modello empirico, costruito per essere
prevedibile, verificabile e spiegabile in cucina. Sa dire "con 24 ore a 20 °C
serve lo 0,064% di lievito fresco", non "il lievito sta consumando zuccheri al
ritmo di X".

---

## 2. Il fattore di temperatura

Il punto di partenza è la regola di cucina "ogni 10 °C la lievitazione raddoppia".
È falsa ai due estremi: a 4 °C non esiste un raddoppio ogni 10 °C, e nemmeno a
30 °C. La curva reale è leggermente concava, e una quadratica sul logaritmo la
descrive bene:

```
ln(rate) = −2,843854 + 0,175803 · T − 0,00168741 · T²
```

normalizzata a **1 esatto a 20 °C**:

| T | fattore | cosa significa |
|---|---|---|
| 4 °C | 0,115 | un'ora in frigo vale 7 minuti a 20 °C |
| 16 °C | 0,628 | cantina fresca: quasi un terzo della velocità |
| 20 °C | 1,000 | riferimento |
| 24 °C | 1,490 | mezza volta più veloce |
| 28 °C | 2,134 | più del doppio |
| 35 °C | ~3,5 | acqua calda: il lievito comincia a soffrire |

Due proprietà interessanti:

- **la stessa formula vale in freddo**, senza correzioni: 0,115 ai 4 °C è
  esattamente il peso che l'esperienza comune attribuisce a un'ora di
  frigorifero (un decimo di un'ora a temperatura ambiente);
- **il fattore non dipende dal tempo**: un'ora a 24 °C vale 1,49 sia all'inizio
  sia alla ventesima ora. È un'approssimazione, ed è il limite principale del
  modello (§11).

Scarti misurati sulla curva: **sotto lo 0,5%** fra 16 e 28 °C.

---

## 3. Le ore equivalenti

Le fasi si sommano, ciascuna moltiplicata per il proprio fattore:

```
oreEq = oreTA_prima · f(TA) + oreFrigo · f(TC) + oreTA_dopo · f(TA)
```

Esempio: 2 ore a 20 °C, 18 ore a 4 °C, 4 ore a 20 °C.

```
2 · 1,000 + 18 · 0,115 + 4 · 1,000 = 2 + 2,07 + 4 = 8,07 ore equivalenti
```

Diciotto ore di frigo contano come **due ore scarse** a temperatura ambiente.
È il motivo per cui un impasto in frigo può stare 24 ore senza sovralievitare.

Questa è la forma **senza inerzia**: presuppone che l'impasto passi all'istante
alla temperatura dell'ambiente. Il calcolatore fa un conto più fine, che usa la
temperatura reale del pezzo (§15); i numeri qui restano quelli del modello
semplice, e servono a capire da dove viene la dose.

---

## 4. La legge del lievito

```
percentuale di lievito fresco = coefficiente · oreEq^(−esponente)
```

| ramo | coefficiente | esponente | a 6 h | a 24 h | a 48 h |
|---|---|---|---|---|---|
| tonda | 2,8656 | 1,1978 | 0,335% | 0,064% | 0,028% |
| teglia | 14,0668 | 1,3589 | 1,232% | 0,193% | 0,069% |

I due rami non differiscono per un fattore costante: **cambia l'esponente**.
Questo ha una conseguenza pratica precisa: la teglia chiede 3,7 volte la tonda
sugli impasti brevi e solo 2,6 volte su quelli lunghi. Un fattore fisso avrebbe
sbagliato uno dei due estremi.

Perché due esponenti diversi: l'impasto in teglia è più idratato, più zuccherato
(malto, olio) e cresce in volume contro le pareti dello stampo, quindi la sua
cinetica non è quella del panetto. Il modello non cerca di spiegarlo, lo misura.

---

## 5. Cosa sposta il ritmo

### Idratazione

```
dose × (idratazione / 62)^−1,20
```

Più acqua, più mobilità, quindi **meno** lievito: dal 62% all'80% la dose scende
del 27%, dal 55% all'80% del 36%. Misurata su quattro idratazioni fra 55% e 80%,
con lo stesso esponente nei due rami (tonda −1,22, teglia −1,20).

L'esponente era positivo nella prima versione: un errore di segno. Una velocità
che sale va al denominatore della dose, non al numeratore.

Le misure complete — strumento, campi della risposta, tabelle e fit — stanno in
[`docs/riferimento/`](docs/riferimento/README.md): è il foglio di lavoro da cui vengono
questi numeri, ed è la prima cosa da guardare se un valore sembra sbagliato.

### Sale

```
fattore di velocità = (1,172 − 0,0655 · sale%) / (1,172 − 0,0655 · 2,5)
```

Normalizzato al 2,5%. Al 4% il fattore scende a 0,90: il sale **rallenta**, quindi
la dose di lievito va **divisa** per quel numero, cioè sale dell'11%.

Questo era un errore della prima versione: avevo usato sale e olio come
moltiplicatori della dose. Indicano una velocità, non una quantità.

### Olio

```
fattore di velocità = 1 / (1 + 0,05 · olio%)
```

Al 2% di olio la dose sale del 10%, al 4% del 20%: frena meno del sale a parità
di punti, ma nello stesso verso. Misurato su cinque dosi fra 0 e 4%, a 62% e a
70% di idratazione, scarti sotto lo 0,5%.

### Formula completa

```
% = [ coeff_ramo · oreEq^(−esp_ramo) · (idro/62)^−1,20 ] / (fattoreSale · fattoreOlio)
```

con dose limitata fra 0,01% e 8% per non produrre numeri assurdi su input
estremi.

---

## 6. I tre lieviti

| tipo | resa rispetto al fresco |
|---|---|
| fresco | 1,000 |
| secco attivo | 0,438 |
| secco istantaneo | 0,335 |

Non sono i rapporti "da etichetta" (1/3 e 1/2,5): sono quelli misurati a parità
di risultato. Il secco istantaneo è il più concentrato perché ha meno cellule
morte e più materia secca. La dose in grammi si arrotonda al **centesimo**,
perché su un impasto piccolo 0,04 g contano.

---

## 7. La forza della farina

### Il W che serve

Retta sulle ore equivalenti, con tetto a 365:

```
W = 162,657 + 5,8044 · oreEq
```

6 h → 197 · 12 h → 233 · 24 h → 302 · 30 h → 336 · oltre 35 h → 365.

### La finestra è asimmetrica

Sotto il **90%** del W consigliato l'impasto non tiene, e non c'è rimedio: il
glutine è corto. Sopra il **125%** è solo più tenace, e si recupera allungando la
maturazione o alzando l'idratazione. Per W 302 la finestra è **272–378**.

Il tetto era al 145%: una tolleranza così larga ammetteva farine più forti del
45% senza dire niente. Il riferimento non pubblica una banda — dà un solo W — quindi la
finestra è una scelta nostra; l'AVPN, per una maturazione da 24 ore, chiede
W 250–310, che su un consigliato di 258 vale 0,97–1,20. A 1,25 restiamo appena
più larghi di così, ma non nascondiamo più l'errore.

L'asimmetria resta perché i due errori non si pagano uguale: sotto il 90% non
c'è rimedio, sopra si allunga la maturazione.

### Il mix non è una media

Con tre farine il W del mix è la media pesata, ma il comportamento non lo è: la
maglia si rompe dove il glutine è più corto, non "in media". Il modello calcola
un **W efficace**:

```
W_efficace = media pesata − 0,5 · scarto quadratico pesato
```

- una farina sola: penalità 0, W efficace = W dichiarato;
- 50/50 di W 250 e W 150: media 200, **efficace 175**.

### Le ore che il tuo W regge

Invertendo la retta si ottiene la domanda vera:

```
oreMax = (W − 162,657) / 5,8044
```

Con W 200 la maturazione regge **6,4 ore equivalenti**. Se ne hai pianificate 24,
il calcolatore non dice solo "la farina è debole": dice quanto è lunga la
maturazione che quella farina può permettersi.

### Come rimediare

Se il mix è sotto finestra e ci sono almeno due farine con W diverso, si risolve
la media pesata per la quota della farina più forte:

```
quota_forte = (W_voluto − W_debole) / (W_forte − W_debole)
```

Con W 150 e W 350 su una maturazione che chiede 302 serve il **76%** della forte.

### Gli ingredienti spostano la zona

La retta del W è stata misurata su un impasto preciso: **62% di idratazione,
2,5% di sale, niente olio né malto**. Tempo e temperatura ci sono già dentro,
perché le ore equivalenti sono l'integrale del profilo: cambiano il W da sole.

Gli ingredienti no, e invece cambiano quanto la maglia regge. Il modello li
tratta come un moltiplicatore sulla retta:

```
W_impasto = min(365, (162,657 + 5,8044 · oreEq) · K)

K = (idr / 62)^0,6
    · (1 + 0,03 · olio)
    · (1 − 0,04 · (sale − 2,5))
    · (1 + 0,05 · malto)
```

Con 24 ore equivalenti, dove la retta da da sola W 302:

| ingresso | K | W che serve | perché |
|---|---|---|---|
| idratazione 45% | 0,83 | 249 | meno acqua, maglia più tenace |
| idratazione 62% | **1,00** | 302 | il riferimento della campagna |
| idratazione 70% | 1,08 | 325 | gluten più diluito |
| idratazione 85% | 1,21 | 365 (tetto) | come sopra, fino al massimo |
| olio 5% | 1,15 | 347 | il grasso interferisce col glutine |
| sale 4% | 0,94 | 284 | il sale rafforza la maglia |
| malto 3% | 1,15 | 347 | più zuccheri liberi, impasto fragile |

Il tetto a 365 si applica **dopo** la correzione: chiedere una farina più forte
del massimo che il modello ammette non cambia il consiglio.

**Onestà della legge.** Le direzioni sono solide — acqua e grasso indeboliscono
la maglia, il sale la rafforza — ma i quattro coefficienti sono una scelta di
modellazione, non una misura: non c'è una campagna da cui ricavarli, e il sito
di riferimento per le dosi ignora tutti questi fattori (il suo W dipende solo
dalle ore totali). Sono monotoni e moderati, e i test ne blindano la forma. Se
una prova vera darà un numero diverso, si cambia `CORREZIONE_FORZA` in
`src/lib/calcolo.ts` e i test si riallineano.

### Il grafico della zona

La card «Forza della farina» disegna l'asse dei W con tre elementi:

- la **zona consigliata**, la parte più alta della curva: coincide con il
  giudizio «ottima», da `0,9 · W` a `1,15 · W`;
- la **finestra** disegnata dietro, la stessa `finestra` stampata nella card:
  da `0,9 · W` a `1,45 · W`, il tratto in cui il mix regge ma va recuperato;
- il **segno del mix**, il W efficace delle farine: è l'unica cosa che non si
  muove.

A sinistra della zona la curva scende subito, senza spalla: la debolezza pesa
più dell'eccesso, come nel giudizio. A destra resta intorno a 0,6 fino al bordo
della finestra, e solo oltre cade.

La curva non è una grandezza misurata. È la lettura morbida delle stesse tre
soglie del giudizio (altezza 1 nella zona, circa 0,6 sulla spalla, 0 oltre),
fatta per vedere *dove* cade il mix e non per quantificare quanto regge.

La zona non si muove con gli ingredienti. Misurato sul riferimento: il W consigliato
resta 258 al 62% come al 75%, 258 con olio a 0, 2 e 4%, e 258 con 20, 40 o 60 g/l
di sale. Su 24 ore equivalenti, con un mix a W 300:

| idratazione | W richiesto | zona consigliata | mix a W 300 |
|---|---|---|---|
| 45% | 302 | 272–347 | dentro · «forza in linea» |
| 62% | 302 | 272–347 | dentro · «forza in linea» |
| 70% | 302 | 272–347 | dentro · «forza in linea» |
| 100% | 302 | 272–347 | dentro · «forza in linea» |

Prima qui c'era una correzione degli ingredienti (idratazione^0,6, olio +3% per
punto, malto +5%, sale −4%): alzava il W del 12% sulla contemporanea e del 21%
sulla teglia. Era una scelta di modellazione presentata come una misura, ed è
stata tolta.

---

## 8. La curva dell'attività

Il grafico mostra due cose insieme, minuto per minuto: l'area è quante ore
equivalenti matura l'impasto in quell'ora, la linea è la temperatura reale del
pezzo. La fascia chiara è il frigo.

La curva non fa scalini: quando cambia l'ambiente l'impasto non ci salta sopra,
lo insegue, quindi il ritmo scende e risale con una curva continua. È il punto:
**il freddo rallenta, non ferma** — e ci mette un po' a farsi sentire.

Nel PDF la curva è disegnata in vettoriale, quindi resta nitida a qualsiasi
ingrandimento.

---

## 9. La temperatura dell'acqua

Formula classica dei panificatori:

```
T_acqua = 3 · T_impasto − T_ambiente − T_farina − riscaldamento
```

Il riscaldamento è quanto scalda la macchina: 4–6 °C a mano, 8–12 °C con la
planetaria. Se l'acqua richiesta scende sotto i 4 °C o sale sopra i 30 °C il
calcolatore avvisa, perché in quei due casi il lievito parte male comunque.

---

## 10. Quanta precisione ha

Confronto su 14 punti con i valori presi come riferimento durante la
costruzione del modello (6 panetti da 250 g, 62% di idratazione, 2,5% di sale,
nessun olio, 20 °C, nessuna ora di frigo). Percentuale di lievito fresco:

| ramo | ore | riferimento | nostro | rapporto | differenza in g/kg |
|---|---|---|---|---|---|
| tonda | 6 | 0,3462% | 0,3351% | 96,8% | −0,11 |
| tonda | 8 | 0,2527% | 0,2374% | 93,9% | −0,15 |
| tonda | 12 | 0,1394% | 0,1461% | 104,8% | +0,07 |
| tonda | 18 | 0,0878% | 0,0899% | 102,3% | +0,02 |
| tonda | 24 | 0,0636% | 0,0637% | 100,1% | +0,001 |
| tonda | 36 | 0,0395% | 0,0392% | 99,3% | −0,003 |
| tonda | 48 | 0,0285% | 0,0278% | 97,4% | −0,007 |
| teglia | 6 | 1,2133% | 1,2324% | 101,6% | +0,19 |
| teglia | 8 | 0,8710% | 0,8337% | 95,7% | −0,37 |
| teglia | 12 | 0,4675% | 0,4805% | 102,8% | +0,13 |
| teglia | 18 | 0,2813% | 0,2770% | 98,4% | −0,04 |
| teglia | 24 | 0,1932% | 0,1873% | 97,0% | −0,06 |
| teglia | 36 | 0,1098% | 0,1080% | 98,4% | −0,02 |
| teglia | 48 | 0,0692% | 0,0730% | 105,6% | +0,04 |

**Media 99,6% · errore medio assoluto 2,9% · intervallo 93,9–105,6%.**

### Dove finisce il 2,9%

Tre cause, in ordine di peso:

1. **La granularità del riferimento.** I valori di confronto sono arrotondati al
   centesimo di grammo: a 48 ore la dose è 0,26 g, quindi un centesimo vale il
   2%. Sotto le 12 ore questo rumore è irrilevante (< 0,4%).
2. **La curva di riferimento non è liscia.** Gli scarti oscillano di segno
   (−3,2%, −6,1%, +4,8%, +2,3%, +0,1%…): non è rumore casuale attorno a una
   curva, è una curva a gradini. Il nostro modello è una potenza continua
   interpolata su quei gradini, e ~3% è il pavimento di confrontabilità.
3. **Il modello semplifica il tempo.** Moltiplicare le ore per un fattore
   costante assume che la velocità non cambi con l'avanzare della
   maturazione: vero in prima approssimazione, meno vero dopo 24 ore.

### In termini pratici

La differenza massima è **0,4 g di lievito fresco per kg di farina** (teglia a
8 ore); sulla tonda a 24 ore è **un millesimo di grammo**. Per un kg di farina
siamo nell'ordine del granello: sotto la sensibilità di una bilancia da cucina
e molto sotto la variabilità di una bustina di lievito aperta.

Il limite reale non è il modello: sono gli ingressi. Un errore di 2 °C sulla
temperatura ambiente vale circa il 20% sulla dose; una farina diversa da quella
dichiarata vale molto di più di tutto il nostro scarto.

---

## 11. Cosa il modello non fa

- **Non modella i prefermenti.** Biga, poolish, pasta di riporto e lievito madre
  hanno una popolazione microbica diversa: qui ci sono solo impasti diretti.
- **Non ha inerzia termica.** Se l'impasto esce dal frigo a 6 °C e l'ambiente è a
  26 °C, il modello lo considera subito a 26 °C. Nella realtà ci vogliono
  30–60 minuti.
- **Non usa la temperatura dell'impasto.** Usa quella ambiente. L'acqua è
  calcolata per portare l'impasto a 24 °C, ma quel dato non entra nel ritmo.
- **Non conosce la vitalità del lievito.** Un cubetto scaduto ha meno cellule
  attive e il modello non lo sa.
- **Non conosce la qualità del glutine** oltre al W (rapporto P/L, farine
  danneggiate, miscele con farine deboli in percentuale minima).
- **Non prevede la cottura.** Volume, cornicione e alveolatura dipendono anche
  da stesura, forno e vapore.

---

## 12. Come aumentare la precisione

In ordine di guadagno atteso per unità di lavoro:

1. **Usare la temperatura dell'impasto nella prima fase.** Oggi il ritmo dipende
   dalla temperatura ambiente; un impasto chiuso a 26 °C in una stanza a 20 °C
   fermenta come a 26 °C per la prima ora e mezza. Guadagno atteso: qualche
   punto percentuale sui profili brevi, dove la prima fase pesa di più.
2. **Modello a integrazione.** Invece di moltiplicare le ore per un fattore
   costante, integrare un rate istantaneo `dM/dt = k(T) · (1 − M)` con il tempo.
   Guadagno: più fedeltà sui profili a tre fasi (TA → frigo → TA), dove la
   moltiplicazione sovrastima le fasi finali.
3. **Un termine di curvatura nella legge del lievito.** Aggiungere un esponente
   quadratico nel logaritmo delle ore ridurrebbe l'errore di fit, ma solo se i
   dati di taratura sono più fitti: con 14 punti per ramo si rischia di
   inseguire il rumore.
4. **Fattore di vitalità.** Chiedere età e conservazione del lievito e applicare
   un coefficiente (un fresco di 3 settimane vale meno di uno appena comprato).
5. **Taratura dell'utente.** Il campo "correzione lievito" esiste già: è il modo
   più onesto di assorbire le differenze di farina, forno e mano.
6. **Validazione sperimentale.** È l'unica misura vera. Protocollo minimo:
   stessa farina, stessa idratazione, tre dosi (0,8× · 1× · 1,2× del valore
   calcolato), stesso tempo; si misura l'altezza del panetto a intervalli di
   un'ora. Dopo tre prove si sa se il proprio ambiente sta sopra o sotto il
   modello, e di quanto.

---

## 13. Dove vivono i numeri nel codice

| cosa | file | costante |
|---|---|---|
| fattore di temperatura | `src/lib/fermentazione.ts` | `TEMP` |
| legge del lievito | `src/lib/fermentazione.ts` | `RAMI` |
| idratazione | `src/lib/fermentazione.ts` | `IDRO` |
| sale e olio | `src/lib/fermentazione.ts` | `SALE`, `OLIO` |
| forza consigliata | `src/lib/fermentazione.ts` | `FORZA` |
| rese dei lieviti | `src/lib/fermentazione.ts` | `FATTORI_LIEVITO` |
| ore equivalenti e dosi | `src/lib/calcolo.ts` | `oreEquivalenti`, `calcola` |
| W efficace, finestra, consiglio | `src/lib/calcolo.ts` | `forzaEfficace`, `finestraForza`, `consiglioForza` |
| correzione con gli ingredienti | `src/lib/calcolo.ts` | `CORREZIONE_FORZA`, `correzioneForza` |
| fasce e curva della zona | `src/lib/calcolo.ts` | `fasceForza`, `adattamentoForza` |
| inerzia termica | `src/lib/inerzia.ts` | `COSTANTI_INERZIA`, `costanteTempo` |
| profilo termico e curva | `src/lib/inerzia.ts` | `profiloTermico` |
| foglio PDF e JPG | `src/export/foglio.ts`, `src/export/pdf.ts` | — |

Le misure di taratura sono verificate dai test: `fermentazione.test.ts`
(fattore, legge, rami, rese), `confronto.test.ts` (i 14 punti), `calcolo.test.ts`
(mix, W, finestra, curva).

---

## 14. In sintesi

- Il modello è **empirico, continuo e verificabile**: quattro formule e una
  manciata di coefficienti, tutti coperti da test.
- La precisione è **±3% sulla dose di lievito**, cioè decimi di grammo su un
  impasto da tavola.
- La parte più solida non è il numero: è la **struttura** — ore equivalenti,
  rami separati, finestra asimmetrica della forza, ore massime invertite.
  Cambiare i coefficienti è banale; cambiare struttura no.
- Il margine di miglioramento vero non è nel fit: è nel **misurare meglio gli
  ingressi**.
- L'**inerzia termica** (§15) non è un coefficiente in più: è la stessa legge
  applicata alla temperatura reale del pezzo, ricavata dalla geometria.
- La **zona di forza** (§7) non è più un numero fisso: la muovono le ore
  equivalenti — tempo e temperatura, già dentro — e `CORREZIONE_FORZA`
  (idratazione, olio, sale, malto). La correzione è una scelta dichiarata, non
  una misura: i test ne blindano forma e bordi.

---

## 15. L'inerzia termica

L'impasto non ha la temperatura della stanza in cui si trova: ci arriva. Il
modello lo tratta come una capacità termica concentrata che insegue l'ambiente
(legge di Newton):

```
dT/dt = (T_ambiente − T) / τ
```

La costante di tempo non è un numero scelto a occhio, viene dalla geometria:

```
τ = ρ · cp · L / h          con L = V / A
```

| simbolo | valore | cosa è |
|---|---|---|
| ρ | 1.100 kg/m³ | densità dell'impasto |
| cp | 3.400 J/(kg·K) | calore specifico |
| h | 5,5 W/(m²·K) | scambio con l'aria ferma, contenitore compreso |
| L | V/A | lunghezza caratteristica del pezzo |

Per un cilindro appiattito L = k·r/(1+2k), con k = altezza/diametro: 0,35 per un
panetto, 0,5 per una massa unica in ciotola. Di conseguenza τ cresce con la
radice cubica della massa:

| pezzo | τ |
|---|---|
| panetto da 250 g | 1,8 ore |
| panetto da 500 g | 2,3 ore |
| massa unica da 1,5 kg | 3,6 ore |

Le ore equivalenti diventano l'integrale del ritmo sulla temperatura reale:

```
oreEq = ∫ f(T(t)) dt
```

calcolato a passi di un minuto, con la soluzione esatta dell'esponenziale dentro
ogni passo: la temperatura non può saltare quando cambia fase, cambia solo la τ
con cui insegue la nuova ambiente.

### Perché il conto può salire o scendere

`f(T)` cresce **più che linearmente** con la temperatura, quindi le ore spese a
raffreddarsi in ingresso rendono meno di quanto costino quelle spese a
riscaldarsi in uscita. Sui profili reali, con panetti da 250 g e frigo a 4 °C:

| profilo (ambiente 20 °C, impasto a 24 °C) | senza inerzia | con inerzia |
|---|---|---|
| 2 h + 18 h frigo + 0,5 h | 4,57 | 5,87 |
| 2 h + 18 h frigo + 4 h | 8,07 | 7,82 |
| solo frigo 18 h | 2,07 | 3,52 |
| 1 h + 9 h frigo + 8 h, panetti | 10,03 | 9,39 |
| 1 h + 9 h frigo + 8 h, massa unica | 10,03 | 10,85 |

Quindi: **entrare in frigo conta sempre più** di quanto dica la temperatura
della cella (a 4 °C valgono 0,115 all'ora, ma nelle prime ore il pezzo è ancora
a 20 °C), mentre un appretto lungo può restituire più di quanto abbia reso
l'ingresso. Il segno della correzione dipende dal profilo: non è un aumento
fisso.

### Lo staglio sposta la massa che conta

Con «panetti prima del frigo» in cella entra un pezzo da 250 g (τ 1,8 h), con
«massa unica» entra tutto l'impasto (τ 3,6 h): la massa tiene il caldo più a
lungo, quindi fermenta di più. Sullo stesso profilo 1 h + 9 h + 8 h la
differenza è di **1,5 ore equivalenti**, cioè qualche punto percentuale sulla
dose.

### Il limite del modello

Vale finché il numero di Biot resta basso: Bi = h·L/λ, con λ ≈ 0,35 W/(m·K).
Per un panetto da 250 g viene 0,15, per una massa unica da 1,5 kg 0,30. Va bene
per una stima, ma il cuore del pezzo è più lento della superficie, quindi una τ
misurata con la sonda risulterà un po' più alta, soprattutto sulla massa unica.
Se le prove con la sonda danno uno scarto sistematico, il punto da correggere è
**h** — il contenitore e l'aria ferma sono la voce più incerta — non la forma
della legge.

## 16. Il vecchio calcolatore (emulazione per le prove)

Il calcolatore ha un interruttore provvisorio, nella card **Modello di calcolo**:
`Nuovo (inerzia)` oppure `Vecchio`. Cambia il modo di leggere la temperatura,
non le dosi classiche né gli orari.

Il modello **nuovo** è quello descritto nei paragrafi precedenti: l'impasto
insegue l'ambiente con la costante di tempo che viene da peso e forma.

Il modello **vecchio** emula il calcolatore precedente. Le sue formule non sono
pubbliche, quindi non c'è niente di copiato: ci sono coefficienti fittati su
otto calcoli eseguiti davvero su quello strumento, con lo stesso impasto (6
panetti da 250 g, 62%, 2,5% di sale, ambiente 20 °C, frigo 4 °C, lievito
istantaneo, impasto a 24 °C). Sta in `src/lib/vecchio.ts`.

Cosa è misurato e cosa è fittato:

| Pezzo | Come è ottenuto | Quanto riproduce |
| --- | --- | --- |
| Curva di temperatura | misurata: raffreddamento con τ 2,3 h, riaccesa con τ 0,39 h, poi 3 h verso l'ambiente | forma della curva |
| Ritmo di fermentazione | tre coefficienti fittati (a, b, c del logaritmo quadratico) | ore equivalenti entro il 7% |
| Dose di lievito | potenza fittata sulle otto dosi | entro l'8%, tranne 24 h a +11% e 46 h a −18% |
| Forza consigliata | retta in due variabili, ore equivalenti e ore totali | W entro l'1% |

I test in `src/lib/vecchio.test.ts` rifanno gli otto casi e verificano quelle
tolleranze: se qualcuno cambia i coefficienti, il test lo dice.

Differenza che ne risulta, sullo stesso programma di lavoro:

- senza frigorifero i due modelli danno quasi lo stesso numero (entro il 2%);
- con il frigorifero il vecchio resta più alto del 7–27%, perché scalda
  l'impasto quasi subito all'uscita dal frigo;
- il modello nuovo distingue panetti e massa unica (+10%…+29% di ore
  equivalenti per la massa unica), il vecchio no: per lui il peso non conta.

Per le esportazioni: il **PDF** porta entrambi i grafici (zona di forza con la
banda consigliata e il segno del mix, più la curva di attività con la fascia
del frigorifero); il **JPG** resta la ricetta, cioè dosi, totale e tabella di
marcia.

## 17. La Modalità Facile (wizard)

La Modalità Facile non è una versione ridotta delle formule: usa lo stesso
motore, cambia solo il modo di chiedere i dati. Le ore fuori dal frigorifero
non si scrivono, si ricavano (`src/lib/facile.ts`):

1. le ore fuori frigo sono il 30% del tempo a disposizione, mai meno di 4 e mai
   più di 8;
2. si dividono a metà fra puntata e appretto — è il 50/50 deciso, la scelta che
   nel confronto dava il valore intermedio fra "tutto prima" e "tutto dopo";
3. con i minimi: almeno 1 ora prima del frigo e almeno 3 ore dopo, perché a due
   ore dall'uscita un panetto da 250 g è ancora a circa 15 °C;
4. se il frigo resterebbe sotto le 5 ore, tanto vale non usarlo: tutto il tempo
   passa a temperatura ambiente;
5. tutto si arrotonda alla mezz'ora, così gli orari della tabella di marcia
   tornano con i numeri.

Nella Modalità Facile il W non si chiede e non si mostra: al suo posto c'è un
consiglio in parole sulla farina che serve. Il frigo è quello di casa, 4 °C, e
le ore in frigo si possono correggere a mano: appena le tocchi valgono i tuoi
numeri (l'appretto si aggiusta di conseguenza), e «Torna ai tempi consigliati»
riporta la riga alla ripartizione automatica.

Lo staglio si sceglie nella stessa scheda con la domanda «Vuoi stagliare ora
l'impasto?»: «Sì, panetti ora» è il valore predefinito e non cambia niente
rispetto a prima, «No, dopo il frigo» mette in cella la massa unica e forma i
panetti all'uscita (per la teglia lo staglio resta "panetti prima").

Le ore si leggono nell'ordine in cui passano, ognuna con la sua temperatura e
l'orario previsto di fine: puntata a temperatura ambiente, domanda sullo staglio,
riposo in frigo (con la riga dello staglio solo se i panetti si formano dopo),
appretto e impasto pronto. Con meno di 9 ore il frigo si spegne da solo e resta
una riga sola, tutto a temperatura ambiente.

Le tre schermate sono un wizard con Avanti/Indietro (`src/components/Wizard.tsx`);
sul telefono la Modalità Pro usa la stessa navigazione: un passo per volta, il
sesto è il risultato.

## 18. I grafici dentro il PDF

Il testo del PDF resta vettoriale (font standard, testo selezionabile), ma i due
grafici sono le immagini della schermata: si clona l'SVG, si risolvono le
variabili CSS in colori pieni, si riportano le tinte sulla tavolozza chiara del
foglio, si rasterizza su canvas e si incapsula il JPEG nel PDF (`/DCTDecode`).
Se la rasterizzazione non riesce, il PDF torna al disegno vettoriale della curva,
che resta nel codice come ripiego.
