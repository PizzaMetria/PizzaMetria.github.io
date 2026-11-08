# Calibrazione «C» del motore di calcolo

Data: 3 novembre 2026
Stato: **implementata, non pubblicata**. In attesa di approvazione.

## Cosa è cambiato, in una riga

Il motore resta a ore equivalenti, ma ora ha **tre rami di calibrazione** (verace,
contemporanea, teglia), la forza della farina guarda **due orologi** (ore
equivalenti e ore reali in frigorifero) e agli estremi il modello **taglia**
invece di estrapolare. `f(4)` non è stato toccato.

## Backup e ripristino

Prima di ogni modifica:

```
sito-unito/backup/motore-calcolo-2026-11-03-strategia-c/
```

Contiene le copie originali di `fermentazione.ts`, `calcolo.ts`, `vecchio.ts`,
`inerzia.ts`, `types.ts`, `config/impasti.ts` e di tutti i `*.test.ts` della
cartella `lib`. Per tornare indietro basta ricopiare quei file sopra gli
originali: nessun'altra parte del sito è stata toccata.

## Costanti modificate

| Costante | Prima | Dopo | Perché |
|---|---|---|---|
| `RAMI` | 2 rami: `napoletana` 2,8656 / 1,1978 · `teglia` 14,0668 / 1,3589 | 3 rami: `verace` 2,8656 / 1,1978 · `contemporanea` 2,99 / 1,225 · `teglia` invariata | verace e contemporanea sono due ricette, non un formato e una variante: una curva sola le costringeva a comportarsi uguale |
| `IDRO.esponente` | globale −1,2 su tutte | **per ramo**: verace −1,2 · contemporanea −0,3 · teglia −1,2 | il −1,2 è misurato a temperatura ambiente; al 75% stava assorbendo la differenza fra le ricette, non quella fra le acque |
| `SALE` | retta senza limiti (si annulla a 17,89%) | stessa retta, argomento limitato a 0–8% | oltre l'8% il fattore cambiava segno: a 17,8% la dose era 8%, a 18,2% era 0,01%. Un salto, non una curva |
| `OLIO` | senza limiti | argomento limitato a 0–10% | robustezza: un valore assurdo non deve produrre una dose assurda |
| `IDRO` (minimo) | 30% | 40% | sotto il 40% non è impasto di pizza, e l'estrapolazione non è verificata |
| `LIMITI_TEMPERATURA` | clamp −5…40, nessun calo | clamp **−2…42**, con calo sopra i 38 °C (0,68 a 42 °C) | la quadratica cresceva fino a 52 °C: diceva "più caldo è meglio" mentre l'optimum è ~35 °C e sopra 45 °C il lievito muore |
| `LIMITI_LIEVITO` | 0,01–8% (0,1–80 g/kg) | **0,015–3% (0,15–30 g/kg)** | sotto 0,15 g/kg il lievito non si distribuisce; sopra 30 g/kg non è più un impasto a lievitazione |
| `FORZA` | `162,657 + 5,8044 · oreEq` | `162,657 + 5,8044 · oreEq + **2 · oreFrigo**` | a 4 °C il lievito è fermo, gli enzimi no: la maglia si consuma comunque, e il W deve saperlo. Dal 3 novembre la legge vale per **entrambi i motori** |
| `forzaImpasto` | `(oreEq, correzione)` | `(oreEq, oreFrigo, correzione)` | per portare l'altro orologio fino al calcolo |
| `f(4)` | 0,1148 | **0,1148** | non toccato: vedi sotto |

### Perché f(4) non è stato toccato

Tre verifiche, tutte convergenti:

1. la letteratura dà un rallentamento 20 °C → 4 °C fra 6× e 12×, cioè un fattore
   fra 0,10 e 0,17. 0,1148 sta dentro, nella parte bassa;
2. **Q10 = 2 darebbe 0,33**, cioè il triplo: il raddoppio ogni 10 °C non regge
   fra 20 e 4 °C, e la quadratica del motore batte Q10 su questo;
3. i dati riferimento del progetto permettono una verifica indipendente
   dell'esponente dell'idratazione (0,1501% al 75% contro 0,189% al 62%, stesso
   programma): il rapporto dà −1,21, che conferma il −1,2 misurato.

Nessuna delle tre dice che 0,1148 sia sbagliato. Il sospetto iniziale ("il frigo
pesa troppo poco") andava inoltre nella direzione opposta al sintomo: alzare
`f(4)` **abbassa** la dose, non la alza.

## Il modello, in formule

```
oreEq   = ∫ f(T_impasto) dt                     (inerzia termica, invariata)
dose%   = K_ramo · oreEq^(−E_ramo) · (idr/62)^(h_ramo) / (fattoreSale · fattoreOlio)
W       = 162,657 + 5,8044 · oreEq + 2 · oreFrigo        (tetto 365)
```

| Ramo | K | E | h (idratazione) | Tarato su |
|---|---|---|---|---|
| verace | 2,8656 | 1,1978 | −1,20 | campagna riferimento a 62%, 6–48 h (invariato) |
| contemporanea | 2,99 | 1,225 | −0,30 | 5 ancore: casi 1 e 2, 24 h di solo frigo, 48 h, 72 h |
| teglia | 14,0668 | 1,3589 | −1,20 | campagna riferimento a 62%, 6–48 h (invariato) |

La contemporanea è l'unico ramo che si discosta dal riferimento: **+15,9%** sul punto
misurato a 75% con 28,7 h di programma. È una scelta, non un errore: riferimento per
quel programma dà 1,5 g/kg, le ricette di riferimento per 18–24 h con frigo
danno 2,5–3 g/kg. Il test `riferimento.test.ts` lo scrive esplicitamente, così la
divergenza resta visibile e reversibile.

## Protezioni agli estremi

| Grandezza | Comportamento |
|---|---|
| temperatura | tagliata a −2…42 °C; sopra 38 °C il fattore cala, a 42 °C vale 0,68 di quello grezzo; nessun valore negativo |
| sale | limitato a 0–8%: il fattore non si annulla e non cambia segno |
| idratazione | limitata a 40–100%: fuori scala il risultato è identico al bordo |
| olio | limitato a 0–10% |
| dose | 0,15–30 g/kg. Quando scatta un limite compare un avviso, perché il numero mostrato non è più quello del modello |
| durata | continua da 4 a 72 ore equivalenti: 0,25 h di passo, nessun salto > 10%, monotona decrescente |

## Continuità

Non esistono fasce: la legge è una potenza per ramo e i limiti sono tagli
(min/max), non soglie con salti. Il test percorre 4 → 72 ore equivalenti con
passi di 15 minuti su tutti e tre i rami e verifica che il rapporto fra due
valori consecutivi non superi il 10% e che la curva non risalga mai.

## Collaudo: prima e dopo

Ingressi identici, motore nuovo con inerzia, temperatura impasto 21 °C.

| Caso | Prima | Dopo |
|---|---|---|
| verace, 8 h a 20 °C, 6 × 250 g | eq 8,20 · 2,31 g/kg · 2,10 g · W 210 | **invariato** |
| contemporanea, 1 + 18 + 5 · 75% · 6 × 280 g | eq 7,08 · 2,19 g/kg · 2,07 g · W 204 | eq 7,08 · **2,57 g/kg · 2,43 g · W 240** |
| contemporanea, 4 + 12 + 1 · 70% · 3 × 280 g | eq 6,82 · 2,48 g/kg · 1,21 g · W 202 | eq 6,82 · **2,74 g/kg · 1,34 g · W 226** |
| teglia 30 × 40 · 6 h · 70% · olio 2 · malto 1 | eq 6,25 · 11,08 g/kg · 4,17 g · W 199 | **invariato** |
| contemporanea, 1 + 48 + 6 · 65% | eq 11,43 · 1,46 g/kg · 1,47 g · W 229 | eq 11,43 · 1,49 g/kg · 1,49 g · **W 325** |

Sui casi 1 e 2 dei test del committente il motore **senza inerzia** (quello che
produceva 1,87 e 2,69 g/kg) dà ora 2,20 e 2,86 g/kg. La differenza fra le due
letture (±10%) è più grande di quella che si sta cercando di correggere: prima
di tarare ulteriormente va scelto un solo motore di riferimento.

## Curva della dose per ramo (g di lievito fresco per kg di farina, 62%, sale 2,5%)

| ore eq | verace | contemporanea | teglia |
|---|---|---|---|
| 4 | 5,45 | 5,47 | 21,38 |
| 6 | 3,35 | 3,33 | 12,32 |
| 8 | 2,37 | 2,34 | 8,34 |
| 12 | 1,46 | 1,42 | 4,81 |
| 18 | 0,90 | 0,87 | 2,77 |
| 24 | 0,64 | 0,61 | 1,87 |
| 36 | 0,39 | 0,37 | 1,08 |
| 48 | 0,28 | 0,26 | 0,73 |
| 72 | 0,17 | 0,16 | 0,42 |

## Confronto con i riferimenti

| Riferimento | Valore | Motore | Scarto |
|---|---|---|---|
| riferimento, contemporanea 75%, 28,7 h | 0,150% | 0,174% | **+15,9%** (voluto) |
| riferimento, verace 62%, 28,7 h | 0,189% | 0,183% | −3% |
| riferimento, teglia 70%, 28,7 h | 0,5915% | 0,594% | +0,4% |
| PizzaPlan, 24 h a 4–6 °C | 4,0 g/kg | 4,2 g/kg (verace, 24 h solo frigo) | +5% |
| Professionale, 48 h frigo | 0,5–2,5 g/kg | 1,5 g/kg (contemporanea, 48 h) | dentro |
| Professionale, 72 h frigo | 0,5–2 g/kg | 0,9 g/kg | dentro |
| Ricette contemporanea, 18–24 h con frigo | 2,5–3 g/kg | 2,57 g/kg (caso 1) | dentro |

## Il W: prima e dopo

| Maturazione | W prima | W dopo |
|---|---|---|
| 12 ore equivalenti, nessun frigo | 232 | 232 |
| 12 ore equivalenti + 24 h di frigo | 232 | 280 |
| 48 h di frigo (eq 11,43) | 229 | 325 |
| 72 h di frigo (eq 16,25) | 257 | 365 (tetto) |

Le ricette per 48–72 h chiedono W 320–350: prima il motore consigliava 229, ora
325.

### Il motore predefinito (stessa legge, ore sue)

Il W a due orologi è stato esteso anche al motore vecchio, che resta il
predefinito. La formula è una sola nel codice: cambiano solo le ore equivalenti
di ciascun motore. Sul motore predefinito:

| caso | W prima | W dopo |
|---|---|---|
| verace 8 h a 20 °C | 206 | 209 |
| contemporanea 1+18+5 | 239 | 251 |
| contemporanea 4+12+1 | 220 | 230 |
| teglia 30×40 · 6 h | 195 | 197 |
| contemporanea 1+48+6 | 312 | **339** |
| verace 24 h a 20 °C | 294 | 297 |
| teglia 24 h frigo + 2 h | 230 | **245** |

**Costo dichiarato:** l'emulazione del calcolatore precedente non riproduce più
il suo W. La retta storica (`161,149 + 3,912·eq + 1,759·oreTot`) sbagliava da 0,0%
a 1,3% sugli otto punti riferimento; sostituendola con la legge a due orologi
l'errore sale fino all'8,6% (46 h con 40 in frigo: 315 contro 290 misurato). Non
esiste una formula che riproduca riferimento e corregga le lunghe fredde insieme: il
termine `1,759 × oreTot` e il termine `2 × oreFrigo` dicono cose diverse sulle
stesse ore.

Per questo `forzaVecchio` resta in `vecchio.ts` come **emulazione storica**: non
è più chiamata dall'applicazione, ma continua a essere verificata contro i suoi
otto punti, altrimenti fra un anno nessuno saprebbe più che cosa riproduceva.

## Punti aperti (da decidere, non da correggere in silenzio)

1. **Il motore predefinito del sito è ancora il vecchio**, ma ora usa lo stesso
   W a due orologi del modello a inerzia: la differenza fra i due è solo nel
   conteggio delle ore, non nella legge della farina. Cambiare il default resta
   una riga (`sito-unito/src/App.tsx:449`), e cambia le dosi mostrate: decisione
   del responsabile.
2. **La teglia sulle lunghe maturazioni in frigo sovrastima.** A 24 h di solo
   frigo, 70% e olio 2%, il ramo teglia chiede circa 15 g/kg; Bonci per lo
   stesso schema ne usa 2,5–7,5. Il ramo teglia non è stato toccato da questa
   calibrazione: è il prossimo candidato.
3. **Il modello non è commutativo, la realtà non lo è.** Un'ora a 20 °C dopo 18
   ore di frigo vale meno di un'ora a 20 °C a impasto fresco, perché lo zucchero
   è finito. Le ore equivalenti invece sommano e basta. Spiega il residuo del
   ±10–15% che resta sui casi 1 e 2, e si corregge solo con un modello dinamico
   (Baranyi/ODE), non con un'altra potenza.
4. **L'emulazione del vecchio calcolatore resta a una curva sola** per le due
   tonde: riproduce uno strumento che non le distingueva, e non va "migliorata".
5. **Il malto non entra ancora nella velocità di fermentazione**, solo nel peso
   dell'impasto. Sulla teglia (1–2% di malto) è una semplificazione accettata.

## Verifiche eseguite

- `npx tsc --noEmit`: pulito.
- `npx vitest run`: 383 test, tutti verdi (28 file di test).
- Nuovo `calibrazione-c.test.ts`: 19 test su f(4), tre rami, continuità,
  limiti, due orologi e i cinque casi di collaudo.
- `riferimento.test.ts`: allineamento a riferimento entro il 5% per verace e teglia; la
  divergenza della contemporanea è un test dedicato, con la soglia scritta.
