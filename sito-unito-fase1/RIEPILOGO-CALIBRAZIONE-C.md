# Riepilogo finale — calibrazione «C»

Data: 3 novembre 2026 · Stato: **implementata e collaudata, non pubblicata**.
Motore predefinito del sito: **ancora il vecchio**, come richiesto.

Documenti collegati:
- `DOCUMENTAZIONE-CALIBRAZIONE-C.md` — costanti, motivi, prima/dopo;
- `scripts/confronto-motori.mjs` — rigenera tutte le tabelle di questo file.

---

## 1. I tre motori

| Motore | Ore equivalenti | Dose | W | Default |
|---|---|---|---|---|
| vecchio | τ fisse 3 / 2,3 / 0,39 h, ritmo non normalizzato | propria legge (K 3,9635 / 11,755) | `161,149 + 3,912·eq + 1,759·oreTot` | **sì** |
| nuovo senza inerzia | `t·f(T)` per fase, f(4)=0,1148 | tre rami | `162,657 + 5,8044·eq + 2·oreFrigo` | no |
| nuovo con inerzia | integrale su temperatura reale del pezzo | tre rami | idem | no |

Gli ingressi sono identici in tutti i casi: 6 pezzi (o teglia 30×40), ambiente 20 °C, frigo 4 °C, impasto a 21 °C.

## 2. Confronto sui sette casi

| caso | vecchio | nuovo senza inerzia | nuovo con inerzia |
|---|---|---|---|
| verace 8 h a 20 °C | 7,92 h · 2,98 g/kg · 2,72 g · W 209 | 8,00 h · 2,37 g/kg · 2,17 g · W 209 | 8,20 h · 2,31 g/kg · 2,10 g · W 210 |
| contemporanea 1+18+5 (75%) | 9,03 h · 2,01 g/kg · 1,90 g · W 251 | 8,07 h · 2,19 g/kg · 2,07 g · W 245 | 7,08 h · 2,57 g/kg · 2,43 g · W 240 |
| contemporanea 4+12+1 (70%) | 7,41 h · 2,80 g/kg · 1,36 g · W 230 | 6,38 h · 2,98 g/kg · 1,45 g · W 224 | 6,82 h · 2,74 g/kg · 1,34 g · W 226 |
| teglia 30×40 · 6 h (70%) | 5,99 h · 12,91 g/kg · 4,86 g · W 197 | 6,00 h · 11,72 g/kg · 4,41 g · W 197 | 6,27 h · 11,04 g/kg · 4,15 g · W 199 |
| contemporanea 1+48+6 (65%) | 13,93 h · 1,39 g/kg · 1,39 g · W 339 | 12,51 h · 1,33 g/kg · 1,34 g · W 331 | 11,43 h · 1,49 g/kg · 1,49 g · W 325 |
| verace 24 h a 20 °C | 23,22 h · 0,78 g/kg · 0,71 g · W 297 | 24,00 h · 0,64 g/kg · 0,58 g · W 302 | 24,20 h · 0,63 g/kg · 0,57 g · W 303 |
| teglia 24 h frigo + 2 h (70%) | 5,95 h · 13,00 g/kg · 4,89 g · W 245 | 4,75 h · 16,08 g/kg · 6,05 g · W 238 | 4,90 h · 15,45 g/kg · 5,81 g · W 239 |

### Cosa si legge

- Lo scarto fra i tre motori sullo stesso caso va dal **9% al 29%**: è più grande di quasi tutte le correzioni discusse finora. **La scelta del motore conta più della calibrazione.**
- Sulle maturazioni a temperatura ambiente il vecchio chiede **più** lievito del nuovo (2,98 contro 2,31 g/kg a 8 ore; 0,78 contro 0,63 a 24 ore). Sulle maturazioni fredde la distanza si inverte e si stringe (1,90 contro 2,43 sul caso 1).
- **Il W è ora lo stesso per i due motori** (legge a due orologi, applicata anche al predefinito): cambia solo il modo di contare le ore, quindi il risultato resta diverso. Caso 1: 251 contro 240. 48 ore di frigo: 339 contro 325. 24 ore ambiente: 297 contro 303.
- Sulle maturazioni fredde il vecchio chiede ora **più** farina del nuovo, perché le sue ore equivalenti sono più alte (9,03 contro 7,08 sul caso 1): il fattore termico non normalizzato gli fa contare il frigo meno di quanto faccia l'inerzia.
- L'inerzia sposta le ore equivalenti fino a −22% (caso 1: 8,07 → 7,08) perché il rientro a temperatura ambiente costa: 5 ore di appretto valgono 4,3 ore equivalenti. Il motore «senza inerzia» resta quindi una lettura ottimistica su tutti gli schemi con frigo.

## 3. Caso 2 verso 1,50 g: si può?

Stato attuale: **1,34 g** su 487 g di farina (2,74 g/kg). Obiettivo: 1,50 g.

| Leva | Effetto | Costo |
|---|---|---|
| K 2,99 → 3,355 (+12,2%) | caso 2 = **1,50 g** · caso 1 = **2,72 g** (2,88 g/kg, ancora dentro 2,5–3) | scarto dal riferimento sulla contemporanea da **+15,9% a +30,1%** |
| h −0,30 → **−1,97** | muove solo il caso 2 | l'esponente misurato è −1,20: si contraddice il dato |
| E 1,225 → **4,27** | muove solo il caso 2 | curva quasi verticale: assurda alle altre durate |

**Perché non esiste una leva pulita:** i due schemi distano solo **3,9%** in ore equivalenti (7,08 contro 6,82). Con una differenza così piccola, qualunque parametro che alzi uno alza anche l'altro della stessa misura: separarli richiederebbe un esponente dell'idratazione di −1,97 o un esponente del tempo di 4,27.

**Verdetto:** la calibrazione attuale è già il miglior compromesso *se* si tiene riferimento entro il ±16%. Se invece si accetta di allontanarsi dal riferimento, l'opzione K = 3,355 soddisfa l'obiettivo dichiarato (1,50 g) e lascia il caso 1 al limite alto della fascia (2,88 contro 2,5–3). La differenza in gioco è **0,16 g su 487 g di farina**, sotto la risoluzione di una bilancia domestica e molto sotto la dispersione delle ricette (±50%). Non ho forzato nulla: la scelta è tua.

## 4. Teglia e Bonci: il problema documentato

| Fonte | 24 h con frigo, teglia ~70% | Note |
|---|---|---|
| motore attuale | **15,45 g/kg** | ramo invariato da questa calibrazione |
| riferimento, interpolato sulla sua curva | ~14,8 g/kg | il motore riproduce riferimento |
| Bonci, pizza in teglia 75% | **7,5 g/kg** (3 g secco) | l'autore dice di usarne anche 1 g/kg secco = 2,5 |

Non è un errore di taratura: il motore è coerente con il riferimento e diverge dalle ricette, esattamente come per la contemporanea ma in direzione opposta. La causa è che **le ore equivalenti contano 24 ore a 4 °C come 4,9 ore**, e una teglia dopo 24 ore di frigo non è una teglia da 5 ore.

### Proposta di calibrazione separata (non applicata)

Contare le ore di frigo anche nella dose, **solo per il ramo teglia**:

```
oreDose = oreEq + 0,143 · oreFrigo
```

| Controllo | Risultato |
|---|---|
| 24 h di frigo | eq' 8,33 → **7,50 g/kg** (Bonci 7,5) |
| 6 h a temperatura ambiente | **invariato** 11,04 g/kg (riferimento 12,1: +1,6% del modello) |
| 48–72 h | da verificare: il coefficiente è tarato su un solo punto |

Il coefficiente 0,143 è ricavato da un unico punto (Bonci) e non è una misura. **Prima di applicarlo serve almeno un secondo punto indipendente**, altrimenti si sostituisce una calibrazione con una coincidenza. La struttura però è coerente con il resto: è lo stesso «secondo orologio» già usato per il W, applicato alla dose di un solo ramo.

## 5. Costanti definitive (motore nuovo)

| Costante | Valore |
|---|---|
| `TEMP` (fattore di temperatura) | −2,843854 · 0,175803 · −0,00168741, normalizzato a 20 °C → **f(4) = 0,1148** |
| limiti temperatura | −2…42 °C, calo sopra 38 °C (0,68 a 42 °C) |
| `RAMI.verace` | K 2,8656 · E 1,1978 · h −1,20 |
| `RAMI.contemporanea` | K 2,99 · E 1,225 · h −0,30 |
| `RAMI.teglia` | K 14,0668 · E 1,3589 · h −1,20 |
| sale / olio / idratazione | 0–8% · 0–10% · 40–100% |
| dose | 0,15–30 g/kg |
| forza | `162,657 + 5,8044·oreEq + 2·oreFrigo`, tetto 365 — **vale per entrambi i motori** |
| inerzia | ρ 1.100 · cp 3.400 · h 5,5 · k 0,35 panetto / 0,50 massa (invariata) |

## 6. Casi di collaudo (motore nuovo con inerzia)

| caso | ore eq | dose | grammi | W |
|---|---|---|---|---|
| verace 8 h a 20 °C | 8,20 | 2,31 g/kg | 2,10 su 912 | 210 |
| contemporanea 1+18+5 · 75% | 7,08 | 2,57 g/kg | 2,43 su 946 | 240 |
| contemporanea 4+12+1 · 70% | 6,82 | 2,74 g/kg | 1,34 su 487 | 226 |
| teglia 30×40 · 6 h · 70% | 6,27 | 11,04 g/kg | 4,15 su 376 | 199 |
| contemporanea 1+48+6 · 65% | 11,43 | 1,49 g/kg | 1,49 su 1003 | 325 |

## 7. Differenze prima/dopo (motore nuovo)

| caso | prima | dopo |
|---|---|---|
| verace 8 h | 2,31 g/kg · 2,10 g · W 210 | **invariato** |
| contemporanea 1+18+5 | 2,19 g/kg · 2,07 g · W 204 | 2,57 g/kg · 2,43 g · W 240 |
| contemporanea 4+12+1 | 2,48 g/kg · 1,21 g · W 202 | 2,74 g/kg · 1,34 g · W 226 |
| teglia 6 h | 11,08 g/kg · 4,17 g · W 199 | **invariato** |
| contemporanea 1+48+6 | 1,46 g/kg · 1,47 g · W 229 | 1,49 g/kg · 1,49 g · W 325 |

## 8. Dove il motore nuovo è migliore

1. **Forza sulle lunghe fredde.** 48 h di frigo: W 325 contro 229 di prima (ricette: 320–350). Il vecchio ci arrivava per una via diversa, il nuovo ora ha la stessa informazione senza perdere il resto.
2. **Tre ricette distinte.** Verace e contemporanea non condividono più la curva: la differenza però è piccola (+17% a 75%, +4,7% a 66%), perché i dati non ne sostengono una più grande.
3. **Inerzia dipendente dalla massa.** Un panetto da 250 g e una massa da 1,5 kg non si raffreddano insieme; il vecchio non lo sapeva.
4. **Comportamento agli estremi.** Sale, idratazione, temperatura e dose hanno limiti dichiarati e continui; il vecchio non ne aveva nessuno (a 17,9% di sale il fattore cambiava segno, sopra i 38 °C diceva «più caldo è meglio»).
5. **Continuità dichiarata e collaudata** da 4 a 72 ore, con 19 test dedicati.

## 9. Dove resta margine di incertezza

1. **La contemporanea è deliberatamente fuori dal riferimento (+15,9%).** È una scommessa di prodotto, non un dato. Con K 3,355 diventerebbe +30,1%.
2. **La teglia sulle lunghe fredde sovrastima** (15,45 contro 7,5 di Bonci): proposta al punto 4, non applicata.
3. **Il modello non è commutativo.** Un'ora a 20 °C dopo 18 ore di frigo vale meno di un'ora a impasto fresco, perché lo zucchero è finito; le ore equivalenti sommano e basta. Spiega il ±10–15% residuo sui casi 1 e 2.
4. **La calibrazione della contemporanea poggia su ricette, non su misure.** Cinque ancore, scarti entro il 14%, ma la fonte è divulgativa: ±50% di dispersione.
5. **`f(4)` non è misurato**, è coerente con la letteratura (0,10–0,17) e con la quadratica, ma nessuno l'ha verificato con un rheofermentometro.
6. **Il malto non entra nella velocità**, solo nel peso: sulla teglia (1–2%) è una semplificazione accettata.

## 10. Raccomandazione sul default

**Non cambiarlo adesso.** Passerei al motore nuovo quando sono vere tutte e quattro:

1. **la teglia sulle lunghe fredde è chiusa** (punto 4) o accettata per iscritto;
2. **il responsabile approva la divergenza dal riferimento** sulla contemporanea, con la soglia scelta (+16% o +30%);
3. **esiste almeno una misura indipendente** di f(4) — basta un cilindro graduato e due impasti identici, uno a 4 °C e uno a 20 °C: è l'unica cosa che chiude il punto 5;
4. **l'interfaccia è aggiornata**: il motore nuovo espone costante di tempo, temperatura di uscita dal frigo e ore equivalenti in frigo, e chi apre il sito vedrebbe numeri nuovi senza una riga che li spieghi.

Nel frattempo il confronto è già disponibile nell'app (card «confronto modelli»), quindi si può raccogliere il parere di chi la usa senza cambiare il default.

## 11. Verifiche eseguite

- `npx tsc --noEmit`: pulito.
- `npx vitest run`: **383 test verdi**, 28 file.
- `calibrazione-c.test.ts`: 19 test (f(4), tre rami, continuità 4–72 h, limiti, due orologi, cinque casi).
- `riferimento.test.ts`: verace e teglia entro il 5% dal riferimento; divergenza della contemporanea in un test dedicato con soglia esplicita; l'emulazione storica del W riproduce ancora riferimento entro il 3%; i due motori usano la stessa legge a due orologi.
- `node scripts/confronto-motori.mjs`: rigenera le tabelle 2, 3 e 4.

Nessuna pubblicazione, nessun APK, nessuna modifica al default.
