# Thomas' Pizza — nota di passaggio

Questo file serve a riprendere il lavoro in una nuova chat senza ricostruire il
contesto. Aggiornalo quando cambia qualcosa di importante.

## Progetto attivo

**`thomas-pizza-v3/`** — è la versione online e l'unica da modificare.

| Voce | Valore |
| --- | --- |
| Sito pubblicato | <https://thomascalc.freebuff.page/> |
| Anteprima pubblicata | <https://site-82456be856a94b12bb45d97a16daaa6f.freebuff.page> |
| Progetto Sites | `c2f4a1d8-5b3e-4a97-8f61-2d7c9e0b4a35` («Thomas' Pizza v3») |
| Ambiente di produzione | `production`, sottodominio `thomascalc` |
| Bundle in produzione | `assets/index-OOibmodH.js`, `assets/index-Xwr3EGh0.css` |

Le altre cartelle non vanno toccate:

- `src/`, `index.html`, `package.json` alla radice e `backup-v1/`: la v1;
- `thomas-pizza-v2/`: la v2, con il suo sito pubblicato separato;
- `dist/`, `freebuff-sites-build/`, `artifacts/`, `.wrangler/`: output di build e
  file di lavoro, ignorati da Git.

## Stato attuale (23 ottobre 2026)

Verificato sui sorgenti di `thomas-pizza-v3` con le dipendenze installate
(`npm ci`):

- `npm test` → 106 test, 10 file, tutti verdi;
- `npm run typecheck` → nessun errore;
- `npm run build` → genera esattamente `index-BnUpGoKR.js` e
  `index-D5Ws0A6U.css`, cioè gli stessi file che servono oggi
  `thomascalc.freebuff.page`. **I sorgenti corrispondono alla versione
  pubblicata**: non c'è lavoro non ancora online.

Funzioni presenti: tre ricette (Pizza in teglia con biga, Trancio Milanese,
Pizza contemporanea Canotto), calcolo per panetti / farina / teglie, lievito
fresco o secco, autolisi dove prevista, tema chiaro e scuro, icone degli
ingredienti, esportazione JPG e PDF, salvataggio locale, layout mobile-first.

## Comandi

```bash
cd thomas-pizza-v3
npm ci            # solo la prima volta (o dopo un ripristino della macchina)
npm run dev       # http://localhost:3002
npm test
npm run typecheck
npm run build
```

## Pubblicare una modifica

1. Applicare la modifica in `thomas-pizza-v3/src` (o `index.html`, `src/index.css`).
2. `npm test && npm run typecheck && npm run build`.
3. Controllare che la build serva davvero la pagina: `npm run preview` e aprire
   <http://localhost:3002>, oppure usare l'anteprima della chat.
4. Deploy del manifest `thomas-pizza-v3/sites.manifest.json` (assets `./dist`,
   worker `./worker/index.js`) sull'ambiente `production` del progetto
   `c2f4a1d8-5b3e-4a97-8f61-2d7c9e0b4a35`.
5. Dopo il deploy, verificare che `https://thomascalc.freebuff.page/` serva il
   nuovo hash del bundle (`curl -s https://thomascalc.freebuff.page/ | grep assets/`).
6. Aggiornare in questo file la riga «Bundle in produzione».

Il sito è già pubblicato: un deploy nuovo codice non richiede di ripubblicare,
ma se l'ambiente risultasse non pubblicato va riattivato.

## Modifiche richieste, da eseguire

Thomas indicherà qui le modifiche una per una e chiederà di applicarle in un
secondo momento. Non applicare nulla finché non lo dice.

Elenco delle richieste ricevute ma non ancora eseguite:

_(nessuna al momento)_

Quando una richiesta viene eseguita, spostala in fondo con la data e l'esito.

## Punti da decidere

Rimasti aperti dopo l’aggiornamento dei testi del 23 ottobre, da confermare prima
di pubblicare o in un secondo momento:

- **Autolisi del Canotto**: i Tips & Tricks non indicano più la temperatura di
  conservazione, ma tempi e procedimento dicono ancora «a temperatura ambiente
  per tutta la notte». Serve una decisione, non una correzione automatica.
- **Temperatura di chiusura 25 °C**: resta nei parametri del pannello risultato
  (dato necessario), ma non più nella scheda in home.

## Fatto in questa sessione

- Sorgenti di `thomas-pizza-v3` allineati alla versione pubblicata e committati
  sul branch `freebuff/3e8da9f944cbe470e8ed6e43`, così una nuova chat li ritrova.
- README della v3 aggiornato con gli URL reali e le istruzioni di pubblicazione
  (prima citava URL di anteprima vecchi).
- 23 ottobre, aggiornamento dei testi di teglia e Canotto: tempi della biga senza
  «circa», voce «Chiusura della biga» rimossa, nuova cottura della teglia in
  paragrafi ed elenco, nuovi Tips & Tricks su riposo iniziale e autolisi (testi
  unici in `TIP_RIPOSO_BIGA` e `TIP_AUTOLISI`), `VoceConfig` esteso con
  `paragrafi` ed `elenco`. Test 116 verdi, build ok, verifiche DOM e PDF ok.
  Pubblicato su `thomascalc.freebuff.page` con il bundle `index-BAHTDgUT.js`
  (deploy `d6801d39`); le stesse verifiche DOM passano sulla build servita.
- 23 ottobre, seconda passata: rimossi dalla home i due riquadri richiudibili
  («Tempi e temperature» e «Tips & Tricks») su richiesta di Thomas, che vuole la
  home dedicata al calcolo. Pubblicato con il bundle `index-C0jOyM04.js`
  (deploy `c820bf40`). Test 116 verdi, nessun errore in console, calcolo intatto.
- 23 ottobre, quinta passata: anche il Trancio Milanese si può calcolare **per
  panetti** (numero e peso), con la modalità «per teglie» che resta la
  predefinita. Pubblicato con il bundle `index-CiWY64Yr.js` (deploy `802130ec`).
  Test 126 verdi.
- 23 ottobre, quarta passata: la nota sotto la scheda è un testo unico per le due
  ricette con biga, con le rispettive percentuali (85/15 teglia, 75/25 Canotto) e
  la formula «acqua restante tra autolisi e rinfresco», perché l’acqua della biga
  è già fissata dall’idratazione della biga. Pubblicato con il bundle
  `index-Bv4F_Be1.js` (deploy `8e444a8f`).
- 23 ottobre, terza passata: tolta la sezione «Note» dal PDF, rimosso dal
  procedimento il passo del forno statico (resta «Stesura in teglia»), aggiunta
  la modalità **Per teglie** anche alla pizza in teglia con biga (una teglia
  30 × 40 = 710 g di impasto, scalata per superficie e numero di teglie).
  Pubblicato con il bundle `index-BlrIcbJZ.js` (deploy `6c1896db`). Test 123
  verdi, verifiche DOM e PDF ok.
- 23 ottobre, sesta passata: pulsanti nell’ordine «Per teglie · Per panetti ·
  Per farina» su teglia e Trancio (stato e calcoli invariati); dalla scheda della
  pizza in teglia con biga spariscono la nota sull’olio, la nota sul peso teorico
  e i cinque chiarimenti dei parametri (parametri e valori restano); i totali
  delle fasi sono arrotondati all’intero solo in visualizzazione; testi unici di
  biga, autolisi, rinfresco e stesura in teglia in entrambe le ricette con biga,
  senza il riposo di 30 minuti a temperatura ambiente. 125 test verdi, build ok,
  verifiche DOM e PDF con quantità dinamiche ok.
- 23 ottobre, settima passata: il passo «Completa l’impasto» (biga + autolisi)
  usa lo stesso testo su teglia e Canotto, con l’acqua restante dinamica; per la
  Canotto spariscono le note su 21 °C, 15 minuti e acqua già compresa nel totale.
  Totali di fase arrotondati all’intero restano invariati, così come biga,
  autolisi e stesura. 125 test verdi, build ok, verifiche PDF con autolisi
  attiva su entrambe le ricette. Pubblicato con il bundle `index-B146GiQ6.js`
  (deploy `b683a997`).
- 23 ottobre, ottava passata: il procedimento della pizza in teglia con biga
  diventa quello del PDF, in otto passi (nove con autolisi): completamento
  dell’impasto, rigenero/pieghe/puntata, staglio, appretto a 25 °C, stesura con
  fori, prima cottura F1 P134H su pietra e seconda cottura in forno di casa.
  L’acqua restante usa la dose del rinfresco (421 g) quando l’autolisi è spenta
  e quella dell’impastamento finale (329 g) quando è accesa. Test 126 verdi,
  PDF generati e riletti (8/9 passi, nessun «spezzetta»). Pubblicato con il
  bundle `index-tFO_Zhdi.js` (deploy `4243ff6e`).
- 23 ottobre, nona passata: il secondo Tips & Tricks della teglia spiega che il
  prefermento freddo può chiudere l’impasto sotto 20 °C e consiglia acqua
  tiepida o calda nel rinfresco per tornare a 22–23 °C. Primo e terzo consiglio
  invariati. Test 127 verdi, PDF riletto. Pubblicato con il bundle
  `index-OOibmodH.js` (deploy `50ac2b1f`).
