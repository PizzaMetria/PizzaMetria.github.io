# Thomas' Pizza — v2

Sito gemello del calcolatore, con la nuova identità visiva scura e oro.
Online: <https://site-a7e82877b4b0499b8afec839123b4e7f.freebuff.page>
(anteprima: <https://site-5529be8ecdc042dfba990caec92b3be9.freebuff.page>). È una
copia funzionale del progetto v1: **la logica di calcolo è identica** (cartelle
`src/lib`, `src/config`, `src/types`), cambiano solo interfaccia, JPG e PDF.

Il progetto originale è intatto. Il backup completo pre-restyling è in
`../backup-v1/` (sorgenti, build, configurazioni ed esempi esportati).

## Avvio in locale

```bash
cd thomas-pizza-v2
npm ci          # solo la prima volta
npm run dev     # http://localhost:3001
```

Build di produzione e anteprima della build:

```bash
npm run build
npm run preview   # http://localhost:3001
```

Test e controllo dei tipi:

```bash
npm test
npm run typecheck
```

## Identità visiva

- Fondo `#23262a`, superfici `#1b1d20` / `#2c3036`.
- Accento oro `#d4af37` (chiaro `#f3e0aa`, scuro `#b89428`).
- Rosso `#ce3a2b` riservato agli errori e agli avvisi critici.
- Titoli in **Playfair Display**, testi in **Inter**, entrambi self-hosted
  (`src/assets/fonts/`, subset latin): nessuna richiesta a CDN.
- Card arrotondate, bordi sottili, ombre morbide, nessuna fotografia.

I token sono definiti in `src/index.css` (@theme di Tailwind v4) e mantengono i
nomi storici (`crema`, `carta`, `terracotta`…) così i componenti restano
leggibili senza toccare la logica.

## Superfici ristilizzate

- **Web**: header sticky, hero, selettore ricette, scheda ricetta, form,
  risultati, tabelle dosi, stati hover/focus, messaggi, footer.
- **JPG** (`src/export/jpg.ts`): pannello avorio su fondo crema, marchio e
  filetto oro, titolo Playfair in inchiostro, dosi leggibili a colpo d’occhio.
- **PDF** (`src/export/pdf.ts`): pagine chiare color crema, riquadri avorio,
  titoli di sezione in oro scuro, passi numerati con cerchio oro, testo
  selezionabile. I font incorporati di jsPDF sono Times (titoli) e Helvetica
  (testo): gerarchia serif/sans coerente, file leggeri.

Gli export **non** usano il fondo scuro del sito: su schermo e in stampa un
foglio chiaro si legge meglio. L’identità resta quella del marchio — Playfair,
oro, filetti sottili, card arrotondate — con testo `#23262a` su crema
`#f5efe4` e oro scurito `#7a5c10` per mantenere il contrasto (AA).

## Autolisi della Canotto

Nella Pizza contemporanea Canotto l’autolisi è **facoltativa** e attiva di
default. Se la disattivi, la farina del rinfresco (25%) entra nell’impastamento
finale con l’acqua restante e il procedimento sostituisce il passo dell’autolisi
con quello dell’impasto diretto con la biga. La scelta viene salvata per ricetta
insieme al tipo di lievito.

## Note

- La chiave di salvataggio locale resta `impasti-pizza:v1`: chi ha già usato il
  sito ritrova ricetta, modalità e opzioni.
- Le esportazioni sono volutamente chiare (PDF e JPG) per leggibilità e
  stampa; il sito resta scuro.
- Il sito v2 è pubblicato; il progetto v1 resta separato e con il suo storico.
