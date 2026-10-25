# Thomas' Pizza — v3

Sito gemello della v2 con due differenze: si può scegliere il **tema chiaro** o
**scuro** dell’interfaccia, e ogni ingrediente ha un’icona minima accanto alla
dose, uguale a schermo, nel JPG e nel PDF. In più, il pannello risultato segue
l’ordine resa, tre indicatori, ingredienti, note, salvataggi e sezione
richiudibile «Parametri e dettagli della ricetta», mentre il malto diastasico
delle ricette con biga è il 2% della farina della biga.

Online: <https://thomascalc.freebuff.page/> (anteprima:
<https://site-82456be856a94b12bb45d97a16daaa6f.freebuff.page>) — progetto Sites
«Thomas' Pizza v3», separato da v1 e v2, che restano invariati. Lo stato del
lavoro e le modifiche in sospeso sono in [`../HANDOVER.md`](../HANDOVER.md).

## Avvio in locale

```bash
cd thomas-pizza-v3
npm ci          # solo la prima volta
npm run dev     # http://localhost:3002
```

Build di produzione e anteprima della build:

```bash
npm run build
npm run preview   # http://localhost:3002
```

Test e controllo dei tipi:

```bash
npm test
npm run typecheck
```

## Pubblicazione

Il sito statico viene distribuito come Worker che serve la cartella `dist`:

```bash
npm run build
```

e poi deploy del manifest `sites.manifest.json` (assets `./dist`, worker
`./worker/index.js`) sull’ambiente `production` del progetto Sites
`c2f4a1d8-5b3e-4a97-8f61-2d7c9e0b4a35`. Dopo il deploy conviene controllare che
<https://thomascalc.freebuff.page/> serva il nuovo hash del bundle.

## Come funziona il tema

- `src/index.css`: tutti i colori sono token di Tailwind v4 (`--color-*`).
  Il tema scuro è il valore predefinito; `html[data-tema="chiaro"]` ridefinisce
  gli stessi token con carta avorio e inchiostro.
- `src/lib/tema.ts`: risolve la scelta (`risolviTema`), la applica
  (`applicaTema`) e la ricorda in `localStorage` con la chiave
  `thomas-pizza-tema`.
- `src/components/SelettoreTema.tsx`: pulsante nell’intestazione, con icona e
  nome del tema attivo.
- `index.html`: uno script minimo applica il tema prima del primo paint, quindi
  non si vede il lampo del tema sbagliato.

Al primo accesso vale la preferenza del sistema (`prefers-color-scheme`); da lì
in poi conta la scelta fatta con il pulsante, che resta valida dopo il reload.

Nel tema chiaro l’oro è scurito (`#7a5c10`, `#8c6b12`) così testi, bordi e
pulsanti restano sopra la soglia AA sul fondo crema `#f7f2e8`.

## Esportazioni

`src/export/jpg.ts` e `src/export/pdf.ts` usano colori propri, indipendenti dal
tema: restano **sempre chiari** come nella v2 (fondo crema, riquadri avorio,
oro scurito), qualunque tema sia attivo a schermo. Nessun export cambia con il
tema.

I due pulsanti dicono cosa contiene il file, non il formato: **Salva
ingredienti** (dosi e resa) e **Salva ricetta completa** (ingredienti e
procedimento, con Tips & Tricks e note).

Le icone degli ingredienti (spiga, goccia, granuli, cucchiaino, cristalli,
bottiglia, favo) stanno in `src/lib/icone.ts` e vengono disegnate con la stessa
geometria su una griglia 24 × 24: SVG nel sito (`IconaIngrediente`), canvas nel
JPG, vettoriale nel PDF.

## Note

- La chiave di salvataggio delle ricette resta `impasti-pizza:v1`, come nella
  v1 e nella v2; il tema ha una chiave separata e non tocca i dati delle
  ricette.
- Il progetto v1 e la v2 restano separati e invariati.
