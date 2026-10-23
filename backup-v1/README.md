# Thomas' Pizza

Web app in italiano per calcolare tre impasti: **Pizza in teglia con biga**,
**Trancio Milanese** e **Pizza contemporanea Canotto**. Tutti i calcoli e le
esportazioni avvengono nel browser: nessun backend, nessun account, nessuna API
esterna.

## Ricette

1. **Pizza in teglia con biga** — idratazione totale 80%, biga all’85% della
   farina, farina 00 forte W 300–320, malto diastasico al 2%, rinfresco con la
   farina residua. Autolisi facoltativa con ripartizione automatica dell’acqua.
   Riferimento: tre panetti da 710 g, uno per teglia 40 × 30 cm.
2. **Trancio Milanese** — impasto diretto al 60% di idratazione con farina
   debole W 180–220, cotto in teglia. Dose di riferimento: teglia 30 × 40 cm con
   375 g di farina.
3. **Pizza contemporanea Canotto** — idratazione totale 77%, biga al 75% della
   farina, autolisi della farina del rinfresco, malto all’1%. Riferimento: tre
   panetti da 280 g.

Ogni ricetta ha ingredienti, fasi, procedimento, tempi e temperature e Tips &
Tricks dedicati. Il nome “Trancio Milanese” è usato in tutta l’app, nei PDF, nei
JPG e nei nomi dei file.

## Funzioni

- Selettore fra tre ricette, ognuna con modalità, dosi, fasi e procedimento
  propri. Al cambio ricetta il risultato precedente viene invalidato e gli
  input validi di ciascuna ricetta restano memorizzati.
- Calcolo **per panetti** (numero e peso), **per farina** (kg, con peso panetto
  facoltativo per panetti interi e residuo) e **per teglie** (lati e numero di
  teglie per il Trancio Milanese).
- **Lievito fresco o secco** scelto in fase di configurazione della ricetta. Il
  lievito secco è ricavato internamente dal dosaggio del fresco: fattore 0,6 per
  le ricette con biga e 0,67 per il Trancio Milanese e gli impasti diretti. La
  conversione non compare nell’interfaccia, nelle note o nel PDF.
- **Autolisi facoltativa** per la pizza in teglia con biga: il calcolatore
  ripartisce automaticamente l’acqua totale tra biga, autolisi e rinfresco.
  Nella Canotto l’autolisi è parte della ricetta.
- Motore di calcolo unico, in grammi e a piena precisione; arrotondamento solo
  nella visualizzazione, con formattazione italiana.
  - Lievito e malto: sempre un decimale.
  - Farina e acqua: numeri interi.
  - Sale e olio: interi da 10 g in su, un decimale sotto i 10 g.
  Lo stesso formato vale per schermo, PDF e JPG.
- Risultato completo: riepilogo, ingredienti divisi per fase, parametri e note
  operative. La scheda della ricetta espone anche tempi, temperature e Tips &
  Tricks.
- Esportazione reale in **JPG** (solo nome, resa e dosi; layout dedicato su
  canvas verticale, 1520 px di larghezza) e **PDF** A4 multipagina con dosi,
  procedimento completo, Tips & Tricks, testo selezionabile e numeri di pagina.
  Entrambe le generazioni sono sincrone, così il download parte nello stesso
  gesto utente anche su Safari e iOS.
- Salvataggio locale della ricetta selezionata, della modalità, del tipo di
  lievito, dell’autolisi e degli ultimi valori validi di ciascuna ricetta.
- Interfaccia mobile-first accessibile (etichette, focus visibile, errori
  associati ai campi, messaggi con `aria-live`, nessuno scorrimento orizzontale
  da 320 px).
- Risultati ed esportazioni disattivati quando i dati vengono modificati dopo un
  calcolo: si scarica solo la ricetta corrispondente ai dati aggiornati.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, jsPDF, Vitest.

## Avvio

```bash
npm install
npm run dev        # http://localhost:3000
```

## Comandi

```bash
npm run dev        # sviluppo
npm run build      # controllo TypeScript + build di produzione in dist/
npm run preview    # anteprima della build
npm test           # test del motore, arrotondamenti, validazione, persistenza, PDF
npm run typecheck  # solo controllo TypeScript
```

## Struttura

```
src/
  config/ricette.ts            configurazione delle tre ricette e testi editoriali
  lib/calcolo.ts               funzioni pure di calcolo, in grammi
  lib/validazione.ts           parsing di virgola/punto e validazione dei campi
  lib/formato.ts               formattazione italiana e arrotondamenti per ingrediente
  lib/vista.ts                 modello formattato condiviso da schermo ed export
  lib/procedimento.ts          procedimento con quantità dinamiche e passi condizionali
  lib/persistenza.ts           localStorage difensivo e valori iniziali
  lib/nomeFile.ts              nomi file normalizzati
  lib/download.ts              download Blob e revoca degli object URL
  export/jpg.ts                rendering canvas sincrono del layout JPG
  export/pdf.ts                generazione PDF A4 multipagina con jsPDF
  components/                  interfaccia dell'app
  types.ts                     tipi del dominio
  App.tsx                      stato dell'app, validazione, export
```

## Aggiungere una ricetta

Aggiungere un oggetto `RicettaConfig` a `RICETTE` in `src/config/ricette.ts` e
scegliere una `famiglia`:

- `biga-rinfresco`: biga + rinfresco, con autolisi eventualmente facoltativa,
  come la Pizza in teglia con biga.
- `biga-autolisi`: biga, autolisi e impastamento finale, come la Canotto.
- `diretto`: impasto diretto con dosi di riferimento per teglia, come il Trancio
  Milanese.

La configurazione contiene identificativo stabile, nome, descrizione, modalità
supportate, fasi, percentuali, tipo di farina, procedimento strutturato, tempi e
temperature, note e Tips & Tricks. Il motore ricava da queste le dosi;
l'interfaccia e le esportazioni usano lo stesso risultato formattato. Nel
procedimento i segnaposto come `{farinaBiga}`, `{acquaFinale}` e
`{formazionePanetti}` vengono risolti con le quantità effettive del calcolo; i
passi con `condizione: 'autolisi'` o `'senzaAutolisi'` compaiono solo nello
scenario corrispondente.

## Note sui calcoli

- Tutti gli importi sono in grammi; l'idratazione totale è acqua totale / farina
  totale (olio, sale e lievito non sono acqua).
- Pizza in teglia con biga: biga all’85% della farina con idratazione 50%;
  l’acqua del rinfresco è il resto dell’acqua totale. Fattore di peso `1,8985`
  con lievito fresco. L’autolisi usa il 55% di idratazione sulla farina del
  rinfresco.
- Trancio Milanese: percentuali sulla farina totale ricavate dalla dose di
  riferimento (375 g di farina, 60% di acqua, 5,5 g di lievito fresco, 4 g di
  malto, 10 g di miele, 8 g di sale, 22 g di olio). Fattore di peso `1,732` con
  lievito fresco.
- Canotto 77%: fattore di peso `1,8375` con lievito fresco. Acqua finale =
  acqua totale − acqua della biga − acqua dell'autolisi.
- Il peso teorico non include perdite di lavorazione, condimenti facoltativi o
  olio q.b. per ungere.
- Il peso della biga pronta e quello dell'autolisi non vengono sommati una
  seconda volta al totale.

## Dati locali

La chiave `impasti-pizza:v1` contiene ricetta selezionata, modalità, opzioni
(tipo di lievito e autolisi) e valori validi dei campi di ciascuna ricetta; il
formato salvato è la versione 3, con migrazione dal vecchio stato della sola
Biga. Non vengono salvati file esportati. La lettura e la scrittura sono
protette da `try/catch`: dati corrotti o storage non disponibile non bloccano
l'app.
