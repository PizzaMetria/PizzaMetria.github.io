# Design system e uniformità delle 8 voci

Documento di lavoro della fase «avvisi di idratazione + uniformità grafica e
funzionale». Riguarda solo interfaccia, avvisi e output: **il motore di calcolo
non è stato toccato** (né `miniricette.ts`, né `fermentazione.ts`, né `idroRif`,
ancore o esponenti).

## 1. Audit delle 8 voci

Le voci del sito sono tre gruppi: le tre dirette (nuovo calcolatore), le quattro
ricette di casa, la biga.

| Voce | Gruppo | Come si sceglie | Idro di lavoro | Intervallo sicuro | Avviso |
|---|---|---|---|---|---|
| Pizza tonda Verace | Calcola la tua Pizza | elenco ricette | 62% | 58–65% | attivo |
| Pizza tonda Contemporanea | Calcola la tua Pizza | elenco ricette | 75% | 65–78% | attivo |
| Pizza in Teglia | Calcola la tua Pizza | elenco ricette | 75% | 70–85% | attivo |
| Pizza in teglia con biga | Le mie ricette | elenco ricette | 80% | 70–88% | disattivato (ricetta semi-fissa) |
| Trancio Milanese | Le mie ricette | elenco ricette | 60% | 55–65% | disattivato (ricetta semi-fissa) |
| Pizza contemporanea con biga | Le mie ricette | elenco ricette | 77% | 68–80% | disattivato (ricetta semi-fissa) |
| Impasto Tuttofare | Le mie ricette | elenco ricette | 60% | 55–65% | disattivato (ricetta semi-fissa) |
| Biga | Calcola il prefermento | voce unica | 55% (decisa dal motore) | 45–60% | disattivato (non c'è un campo) |

### Cosa era già uguale

- Palette, font e raggi: una sola pelle in `src/index.css` (token `@theme`).
- Elenco delle ricette: `components/ElencoRicette.tsx`, usato da tutti e tre i
  gruppi.
- Navigazione a passi del telefono: `components/Passi.tsx`.
- Foglio di esportazione: `export/foglio.ts` (JPG) e `export/pdf.ts` (PDF)
  leggono lo stesso `DatiFoglio`; le ricette lo riempiono con
  `vecchio/export/foglio-ricetta.ts`.
- Anteprima e salvataggio del file: `components/AnteprimaExport.tsx`.

### Cosa era diverso (e ora non lo è più)

| Ruolo | Prima | Ora |
|---|---|---|
| Pulsanti JPG/PDF | due blocchi distinti con testi diversi («La tua ricetta senza procedimento» / «Dosi e resa, senza procedimento»), spinner solo nelle ricette | un solo `BloccoEsporta`, stessi testi, stesso spinner, `aria-busy` ovunque |
| Campo numerico | due copie con tasti da 36 px e da 44 px, errore solo nelle ricette | un solo `CampoNumero` (tasti 40 px, errore e centratura), il vecchio file lo re-esporta |
| Riquadro con titolo | definito dentro `App.tsx` | `ui/Pannello.tsx`, usato dal calcolatore |
| Avvisi | nessun banner condiviso; ogni messaggio aveva il suo stile | `ui/Avviso.tsx` (attenzione / errore / info) |
| Avviso idratazione | assente | `AvvisoIdratazione`, collegato a `config/idratazioni.ts` |
| Risoluzione JPG | 1× nel calcolatore nuovo, 1,5× nelle ricette | una costante `SCALA_JPG = 1.5` per tutto il sito |
| Piede di PDF e JPG | «calcolatore libero» nel nuovo, «le mie ricette» nelle ricette | un solo `FIRMA_FOGLIO` |
| Occhiello di PDF e JPG | fisso per gruppo, assente per la biga | parametro per gruppo: `CALCOLA LA TUA PIZZA`, `LE MIE RICETTE`, `PREFERMENTO` |

### Differenze necessarie (da NON unificare)

- Ingredienti e fasi: olio e malto solo dove previsti, biga/autolisi/rinfresco
  solo nelle ricette indirette.
- Procedimento: biga, autolisi, rinfresco, staglio e cottura sono testi della
  ricetta.
- Tempi e temperature: ogni ricetta ha il suo programma.
- Formati: panetti per le tonde, teglie per teglia e Trancio, prodotti misti per
  il Tuttofare.
- La biga non ha un campo idratazione: la decide il motore.

## 2. Design system

### Palette (token in `src/index.css`)

| Ruolo | Token | Valore |
|---|---|---|
| Fondo | `crema` | `#f5f1ea` |
| Superficie | `carta` | `#ffffff` |
| Superficie alterna | `crema-scuro` | `#faf6ef` |
| Testo | `inchiostro` | `#3a342c` |
| Testo tenue | `inchiostro-tenue` | `#7a7064` |
| Accento | `terracotta` | `#b99b77` |
| Accento scuro (testo) | `oro-chiaro` | `#8a6d4e` |
| Accento tenue (fondo) | `terracotta-tenue` | `#f2e8da` |
| Bordo | `bordo` | `#e4dcce` |
| Stato attenzione | `avviso` / `avviso-tenue` | `#8a5a00` / `#f6ead8` |
| Stato errore | `errore` | `#a5261b` |
| Stato ok | `terracotta` + `oro-chiaro` | come l'accento |

Nessun colore è scritto a mano nei componenti: si usano solo i token.

### Tipografia

- Un solo carattere: Inter (variable), `--font-sans` e `--font-serif`.
- `h1` di pagina: `text-[1.65rem]` → `sm:text-[2.6rem]` → `lg:text-5xl`.
- Titolo di riquadro (`Pannello`): `font-serif text-xl font-bold`.
- Titolo di voce negli elenchi: `text-[0.9375rem] font-bold font-serif`.
- Testo: `text-sm` / `text-base`; note: `text-xs`, `leading-relaxed`.
- Didascalie e pillole: `text-[10px]`–`text-[11px]`, maiuscolo con
  `tracking-wide`.
- Numeri: sempre `tabular-nums`.

### Spaziature e griglia

- Scala 4 / 8 / 16 / 24 / 32 px (Tailwind `1`, `2`, `4`, `6`, `8`).
- Contenitore: `max-w-3xl` su telefono e tablet, `lg:max-w-4xl`.
- Griglia dei campi: `grid gap-3 sm:grid-cols-2`.
- Riquadri: `gap-4` fra l'uno e l'altro, `p-3.5 sm:p-5` all'interno.
- Raggi: `rounded-lg` (compatto), `rounded-xl` (campi e banner),
  `rounded-2xl` (riquadri e testata).

### Componenti condivisi

| Componente | File | Ruolo |
|---|---|---|
| `Pannello` | `components/ui/Pannello.tsx` | riquadro con titolo serif e nota |
| `Pulsante` | `components/ui/Pulsante.tsx` | primario / secondario / tenue, compatto / normale / alto |
| `Avviso` | `components/ui/Avviso.tsx` | banner attenzione / errore / info, con dettaglio |
| `BloccoEsporta` | `components/ui/BloccoEsporta.tsx` | casella smartphone, JPG, PDF, anteprima, messaggi |
| `CampoNumero` | `components/CampoNumero.tsx` | campo numerico con tasti, errore, unità |
| `ElencoRicette` | `components/ElencoRicette.tsx` | elenco a scelta singola delle ricette |
| `Passi` | `components/Passi.tsx` | barra e tasti del percorso guidato |
| `AvvisoIdratazione` | `components/AvvisoIdratazione.tsx` | avviso fuori intervallo, legato alla voce |

Stati dei componenti: hover con bordo `terracotta/60`, focus con
`outline-2` `terracotta`, disabilitato con `opacity-50` e nessuna ombra, errore
con bordo `errore` e `ring-errore/20`.

## 3. Layout comune (wireframe testuale)

```
┌──────────────────────────────────────────────┐
│ TESTATA   marchio · PizzaMetria · menu       │
├──────────────────────────────────────────────┤
│ H1 della pagina + sottotitolo                │
├──────────────────────────────────────────────┤
│ FISARMONICA: categoria (3 gruppi)            │
│  └ ELENCO RICETTE (nome, pillola, testo)     │
│     └ RICETTA APERTA                        │
│        [Torna a tutte le ricette]            │
│        1. INTESTAZIONE (nome, tipo, resa)    │
│        2. INGREDIENTI / DOSI (per fase)      │
│        3. TEMPI E TEMPERATURE                │
│        4. RISULTATO (lievito, farina, totale,│
│           W, ore equivalenti)                │
│        5. AVVISI (idratazione, forza, dati)  │
│        6. DOWNLOAD (JPG · PDF, anteprima)    │
│        7. NOTE E CONSIGLI                     │
│        8. NAVIGAZIONE A PASSI (telefono)     │
└──────────────────────────────────────────────┘
```

Lo stesso ordine vale per il foglio esportato: intestazione (marchio, titolo,
gruppo, data) → tre riquadri (lievito, farina, impasto) → riepilogo/dosi →
totale → piede unico.

## 4. Avvisi di idratazione

- Configurazione unica: `src/config/idratazioni.ts` (intervallo, messaggio
  sopra e sotto, testo dell'intervallo consigliato).
- Regola: l'avviso compare **solo** fuori intervallo, non blocca il calcolo,
  non cambia lievito, W o ore.
- Dove è attivo: solo sulle tre dirette (verace, contemporanea, teglia), dove
  sotto il campo Idratazione della Modalità Pro compare il banner. Le quattro
  ricette di casa sono «semi-fisse» — sono un caso canonico già bilanciato —
  quindi lì l'avviso è spento; la biga non ha un campo e la decide il motore.
- Regola strutturale: **l'intervallo contiene sempre il default della ricetta**.
  Il test lo verifica leggendo i default veri da `config/impasti.ts` e
  `vecchio/config/ricette.ts`, non da una lista scritta a mano.
- Aspetto: `Avviso` variante «attenzione», `role="status"`, testo breve più
  «Intervallo consigliato: X–Y%.».

## 5. Verifiche

- `npx tsc --noEmit`: nessun errore.
- `npx vitest run`: 36 file, 470 test verdi (compresi i 9 nuovi su intervalli e
  avviso a schermo).
- La logica di calcolo non è stata modificata: `lib/miniricette.ts`,
  `lib/fermentazione.ts`, `lib/calcolo.ts`, `config/impasti.ts` (valori),
  `vecchio/lib/calcolo.ts` e i CSV non compaiono fra i file toccati.
