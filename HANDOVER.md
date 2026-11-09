# PizzaMetria — nota di passaggio

> **Cartella rinominata il 27 ottobre 2026:** il progetto attivo è il sito unico, che prima aveva un altro nome. Le note di consegna dentro `artifacts/consegna-*/` e i vecchi log citano ancora il nome precedente.

Questo file serve a riprendere il lavoro in una nuova chat senza ricostruire il
contesto. Aggiornalo quando cambia qualcosa di importante.

## Stato attuale — 9 novembre 2026 (PizzaMetria, `sito-unito-fase1/`)

Le sezioni sotto sono storiche (v8, ottobre 2026). Il progetto
attivo oggi è **PizzaMetria** in `sito-unito-fase1/`.

| Voce | Valore |
| --- | --- |
| Progetto attivo | `sito-unito-fase1/` (Vite + React + TypeScript) |
| Sito di prova | <https://test-pizzametria.freebuff.page/> |
| Ambiente | `production` del progetto Sites `4a7f3c2e-9b18-4d5a-8e63-1c0b7a5d2f94` |
| Bundle online | `assets/index-DIvAM-CT.js` |
| Ultimo deploy | `4cbdb50b-b6db-45f9-8f5c-5dce11178b01` (9/11/2026 19:53 UTC) |
| Sito pubblico GitHub | **non toccato**: `main` fermo a `db370f1` |
| Test | 490 test in 35 file, tutti verdi |
| Typecheck e build | puliti; build in `sito-unito-fase1/dist/` |

### Cosa è stato fatto il 9 novembre 2026

- Partenza dell'impasto: ora corrente + 15 minuti, arrotondata ai 5 minuti più
  vicini (19:42 → 19:55), in `src/App.tsx` e `src/vecchio/lib/orari.ts`.
- Biga: tolta ", la decide il motore con l'attesa scelta"; paragrafo "Lascia
  maturare" riscritto con la maturazione in frigorifero; occhiello
  `PREFERMENTO`.
- Fogli JPG/PDF: titolo unico "Ingredienti", icone nel JPG, sezione
  "PROCEDIMENTO" per le ricette, acqua consigliata solo nel PDF, simboli
  WinAnsi per ≥, ≤ e •.
- Focacce: "Focaccia rotonda" e "Focaccia in teglia" 30 × 40 = 530 g, stesso
  procedimento; formati a fisarmonica chiusa e tutti a zero.
- Modelli: "Modello frazionario" (predefinito), "Inerziale", "Vecchio".
- Test aggiornati e riportati a 490 in 35 file.

### Cosa resta aperto

- Allineare il sito pubblico GitHub quando l'utente darà il via: commit e push
  su `main`, poi `bash scripts/pubblica-github.sh "messaggio"` (nel repository
  lo script si chiama così, non `pubblica-pages.sh`). Oggi non è stato fatto.
- I vecchi bundle in `assets/` alla radice contengono ancora "PREFERIMENTO":
  sono build storiche di GitHub Pages e la pubblicazione del sito di prova non
  li usa (`sites.manifest.json` serve `./dist`).
- La card "Tabella di marcia" a schermo mostra inizio e nota, non fine e durata:
  scelta da confermare con l'utente.

## Progetto precedente (v8, ottobre 2026)

**La cartella del progetto di allora** — contiene la **v8**, pubblicata sul sito pubblico il
27 ottobre 2026. Comprende tutti gli aggiornamenti precedenti (5.1, 5.2, 5.3,
5.4, 5.23, 5.25, 5.26, 5.27), gli aggiornamenti 5.5–5.10 della v6,
l'aggiornamento v6.1, il procedimento del Trancio e la v7 (pulsanti).

| Voce | Valore |
| --- | --- |
| Sito pubblico (v8) | vecchio dominio, oggi dismesso |
| Bundle in produzione | `assets/index-Bv_kPAgU.js`, `assets/index-BZPVRzqs.css` |
| Deploy di pubblicazione | `09181f32-fe7c-468a-8690-0e0835a679e7` (27/10/2026 08:38 UTC) |
| Sito di prova `preview` (v5.3) | <https://site-82456be856a94b12bb45d97a16daaa6f.freebuff.page/> |
| Bundle in prova | `assets/index-bBNKfUJr.js`, `assets/index-C5R3Oam1.css` |
| Progetto Sites | `c2f4a1d8-5b3e-4a97-8f61-2d7c9e0b4a35` (progetto precedente, v3) |
| Ambienti | `production` = v5.27 · `preview` = v5.3 (non più necessaria) |
| Backup v4 | `artifacts/pubblicazione-2026-10-25/` |
| Backup v5 | `artifacts/consegna-v5-2026-10-25/` |
| Consegna v5.1 (versione precedente) | `artifacts/consegna-v51-2026-10-25/` |
| Consegna v5.2 | `artifacts/consegna-v52-2026-10-25/` |
| Consegna v5.3 | `artifacts/consegna-v53-2026-10-26/` |
| Consegna v5.4 | `artifacts/consegna-v54-2026-10-26/` |
| Consegna v5.25 | `artifacts/consegna-v525-2026-10-26/` |
| Consegna v5.26 | `artifacts/consegna-v526-2026-10-26/` |
| Consegna v5.27 | `artifacts/consegna-v527-2026-10-26/` |
| Consegna v6 | `artifacts/consegna-v6-2026-10-26/` |
| Consegna v6.1 | `artifacts/consegna-v61-2026-10-26/` |
| Consegna v6 (27/10) | `artifacts/consegna-v6-2026-10-27/` |
| Consegna v7 (27/10) | `artifacts/consegna-v7-2026-10-27/` |
| Consegna v8 (attuale, 27/10) | `artifacts/consegna-v8-2026-10-27/` |
| Backup v7 prima della v8 | `artifacts/backup-v7-prima-v8-2026-10-27/` (dist pubblicato scaricato dal sito) |

Le altre cartelle non vanno toccate:

- `src/`, `index.html`, `package.json` alla radice e `backup-v1/`: la v1;
- `v2/` e `v3/`: versioni storiche, non più presenti;
- `dist/`, `freebuff-sites-build/`, `artifacts/`, `.wrangler/`: output di build e
  file di lavoro, ignorati da Git.

## Stato attuale (27 ottobre 2026)

Verificato sui sorgenti di allora con le dipendenze installate:

- `npm test` → 201 test, 13 file, tutti verdi;
- `npm run typecheck` → nessun errore;
- `npm run build` → `index-Bv_kPAgU.js` e `index-BZPVRzqs.css`, gli stessi file
  serviti dal sito pubblico (SHA-256 identici).

La v8 è pubblicata in `production`; l'ambiente `preview` ospita ancora la
v5.3 e non serve più. La versione precedente (v5.1) resta ricostruibile dagli
archivi in `artifacts/consegna-v51-2026-10-25/` (copiati anche in
`artifacts/consegna-v54-2026-10-26/archivi-versione-precedente-v5.1/`).

Nella v6.1 la quarta ricetta si chiama **Impasto Tuttofare** (slug
`impasto-tuttofare`, usato nei nomi dei file scaricati; l'id interno resta
`diretto-tuttofare` per non invalidare il salvataggio locale degli utenti). Il
Trancio Milanese non mostra più la nota sull'olio nel tab «Risultato» e, al
posto della frase sulla teglia 30 × 40 cm, riporta la durata complessiva. I due
pulsanti della Home hanno i colori invertiti.

Funzioni: quattro ricette (Pizza in teglia con biga, Trancio Milanese, Pizza
contemporanea con biga, Impasto Tuttofare), calcolo per panetti / farina /
teglie / prodotti, lievito fresco o secco, autolisi dove prevista,
**personalizzazione delle percentuali con il pannello «Modifica ricetta» e
cursori**, **quota di biga 25–100%**, avanzo dell'impasto nel risultato, tema
chiaro e scuro, icone degli ingredienti, esportazione JPG e PDF, salvataggio
locale, layout mobile-first.

## Comandi

```bash
cd sito-unito-fase1    # il progetto attivo
npm ci                    # solo la prima volta (o dopo un ripristino della macchina)
npm run dev               # http://localhost:3000
npm test
npm run typecheck
npm run build
```

## Pubblicare una modifica

1. Applicare la modifica in `sito-unito-fase1/`, che è il progetto attivo.
2. `npm test && npm run typecheck && npm run build`.
3. Controllare la build con `npm run preview` (porta 3000) o l'anteprima della chat.
4. Deploy del manifest `sites.manifest.json` (assets `./dist`, worker
   `./worker/index.js`) sull'ambiente giusto del progetto
   `c2f4a1d8-5b3e-4a97-8f61-2d7c9e0b4a35`: `production` è il sito pubblico,
   **aggiornarlo solo su autorizzazione**.
5. Dopo il deploy verificare hash e `content-type` del bundle servito
   (`curl -s <url> | grep assets/` e confronto SHA-256 con `dist/`).
6. Aggiornare in questo file le righe dei bundle e la data dello stato.

## Modifiche richieste, da eseguire

L'autore indicherà qui le modifiche una per una e chiederà di applicarle in un
secondo momento. Non applicare nulla finché non lo dice.

Elenco delle richieste ricevute ma non ancora eseguite:

_(nessuna al momento)_

Quando una richiesta viene eseguita, spostala in fondo con la data e l'esito.

## Punti da decidere

Rimasti aperti dopo l’aggiornamento dei testi del 23 ottobre, da confermare prima
di pubblicare o in un secondo momento:

- **Autolisi, dato interno dei tempi**: nelle due ricette con biga il badge
  dice «Prima di impastare» (come richiesto). Il campo `tempiETemperature`
  contiene ancora «La sera prima, fino al momento dell'impastamento finale»,
  ma non viene mostrato né sul sito né nelle esportazioni (lo usano solo i
  test): da confermare se allineare anche il dato.
- **Trancio in modalità farina**: non prevede il peso del panetto (usa la stima
  delle teglie), quindi non mostra l'avanzo; la resa esatta resta nella modalità
  panetti. Da confermare se serve il peso panetto anche qui.
- **Temperatura di chiusura 25 °C**: resta nei parametri del pannello risultato
  (dato necessario), ma non più nella scheda in home.
- **Diretto Tuttofare, parametri**: il riquadro «Parametri della ricetta» di PDF
  e JPG elenca farina, idratazione, lievito, sale e olio ma non lo zucchero
  (che compare comunque fra gli ingredienti al 4%). Comportamento preesistente,
  non toccato nella 5.4: da confermare se aggiungerlo.

## Fatto in questa sessione

- Sorgenti della v3 allineati alla versione pubblicata e committati
  sul branch `freebuff/3e8da9f944cbe470e8ed6e43`, così una nuova chat li ritrova.
- README della v3 aggiornato con gli URL reali e le istruzioni di pubblicazione
  (prima citava URL di anteprima vecchi).
- 23 ottobre, aggiornamento dei testi di teglia e Canotto: tempi della biga senza
  «circa», voce «Chiusura della biga» rimossa, nuova cottura della teglia in
  paragrafi ed elenco, nuovi Tips & Tricks su riposo iniziale e autolisi (testi
  unici in `TIP_RIPOSO_BIGA` e `TIP_AUTOLISI`), `VoceConfig` esteso con
  `paragrafi` ed `elenco`. Test 116 verdi, build ok, verifiche DOM e PDF ok.
  Pubblicato sul sito di prova di allora con il bundle `index-BAHTDgUT.js`
  (deploy `d6801d39`); le stesse verifiche DOM passano sulla build servita.
- 23 ottobre, seconda passata: rimossi dalla home i due riquadri richiudibili
  («Tempi e temperature» e «Tips & Tricks») su richiesta, che vuole la
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
- 25 ottobre: pubblicata la **v4** sul sito di prova di allora (deploy
  `1f5ee909`, bundle `index-CiwIKTXC.js`), con le rifiniture grafiche delle
  esportazioni. Archivi: `artifacts/pubblicazione-2026-10-25/` (sorgenti + FTP).
- 25 ottobre: creata la **v5 «Personalizzazione percentuali»** in
  nella cartella del progetto: pannello «Modifica ricetta» nelle tre ricette, parametri
  per ricetta salvati in `impasti-pizza:v1`, export basati sul risultato
  calcolato. 160 test verdi, 74 controlli browser locali e 74 sul sito di prova.
  Pubblicata solo sull'ambiente `preview` (deploy `29fb9d51`, bundle
  `index-C8QVwZkW.js`). Archivi e riepilogo:
  `artifacts/consegna-v5-2026-10-25/`.
- 25 ottobre, aggiornamento **5.2 «Correzioni al procedimento»** (punti 21–30
  dell'ordine tuttofare, solo quelli): etichetta autolisi «Prima di impastare»
  nelle due ricette con biga, biga con formulazione unica e dosi dinamiche, un
  solo passo di rinfresco nella contemporanea (prima era doppio con autolisi
  attiva), puntata/appretto/panetti e cottura riscritti, «Basi da farcire»
  spostata nei Tips, cottura del Trancio con nota salamino al posto di quella
  sulla mozzarella. 174 test verdi, 43 controlli browser+export. Deploy di
  prova `b60b6676` su `preview` (bundle `index-KC9yMxsk.js`); **production non
  toccata**. Dettagli e checklist: `artifacts/consegna-v52-2026-10-25/`.
- 26 ottobre, aggiornamento **5.3** (punti 1–20 dell'ordine tuttofare, non
  ancora applicati, più le correzioni A e B): biga della teglia al 55%,
  consiglio unico sulla farina forte, rinomina in «Pizza contemporanea con
  biga» (slug `pizza-contemporanea-con-biga`, migrazione dello stato salvato e
  del vecchio id), quarta ricetta **Diretto Tuttofare** con calcolatore misto a
  quattro formati e formula fissa (1,752 / 1,740 di peso per farina), avanzo
  dell'impasto nella resa, badge autolisi unico, «Farina» al posto di «Farina 00
  forte», staglio e Tips allineati, Trancio a 6 g di lievito (1,6%) e W 180–220.
  188 test verdi, typecheck e build ok, 43 controlli browser locali su desktop e
  mobile nei due temi, 4 PDF e 2 JPG riletti (margini, sovrapposizioni e glifi
  controllati). Deploy di prova `69943277` su `preview` (bundle
  `index-bBNKfUJr.js`, `index-C5R3Oam1.css`, hash SHA-256 identici fra sito e
  `dist/`); **production non toccata**. Dettagli e checklist:
  `artifacts/consegna-v53-2026-10-26/README.md`.
- 25 ottobre, aggiornamento **5.1**: controllo **«% biga» 25–100%** nelle due
  ricette con biga, cursore cliccabile e trascinabile sotto ogni percentuale,
  valore e % sempre visibili, autolisi e procedimento coerenti al 100% di biga.
  166 test verdi, 55 controlli browser nuovi e 74 di regressione. Pubblicata in
  `production` su autorizzazione (deploy `1cd1d6a3`, bundle `index-CVvSX4wk.js`,
  `index-DNRGziW7.css`); hash identici fra sito e `dist/`. Archivi ZIP sorgenti
  e FTP in `artifacts/consegna-v51-2026-10-25/`, backup v4 e v5 invariati.
- 26 ottobre, aggiornamento **5.4** (punti 1–4 e relative note): Trancio
  Milanese con procedimento e Tips & Tricks riscritti e quantità dinamiche nel
  punto 1 (lievito, malto, miele, acqua iniziale, olio in tre riprese, acqua
  finale restante), nota sulla mozzarella spostata nella sequenza di cottura;
  riquadro del Diretto Tuttofare riscritto e modalità **Prodotti/Farina** con
  ripartizione indicativa fra i formati; **tasti − e +** su tutti i campi
  numerici configurabili fuori da «Modifica ricetta» (passo 1, 5 g, 50 g, 1 cm);
  nuovo **ordine delle ricette** e badge **«Indiretto»/«Diretto»** in alto a
  destra del riquadro «Ricetta selezionata». 196 test verdi (13 file),
  typecheck e build ok; 80 controlli browser sul sito pubblicato (65 della
  suite 5.4 più 15 mirati sulle righe prodotto), 5 PDF riletti (margini,
  sovrapposizioni e glifi) e JPG ispezionati. Pubblicata in `production`
  **insieme alla 5.3**, come autorizzato (deploy `851fce4f`, bundle
  `index-zIILGMat.js` e `index-7qqx2L1W.css`, hash identici fra sito e `dist/`).
  Archivi, checklist e controlli: `artifacts/consegna-v54-2026-10-26/`;
  la v5.1 precedente resta in `artifacts/consegna-v51-2026-10-25/`.
- 26 ottobre, aggiornamento **5.23**: nel Diretto Tuttofare il punto «Bauletti
  / pane in cassetta» diventa un unico paragrafo con il riferimento allo stampo
  **dinamico** («{pesoBauletti}», es. 500 g o il peso scelto), lievitazione ai
  tre quarti dello stampo e cottura 180 °C per circa 40 minuti fino a doratura.
  196 test verdi, typecheck e build ok, 14 controlli su sito pubblicato e PDF.
  Pubblicata in `production` (deploy `67d73c10`).
- 26 ottobre, aggiornamento **5.25**: Tips & Tricks del Diretto Tuttofare
  ripuliti dai doppioni — istruzione dei semi solo nel punto 5, condimento
  delle focacce solo nel punto 7, rimossa la nota sullo stampo del bauletto con
  il vecchio riferimento al **formato quadrato** e all'adattamento manuale.
  Badge del Diretto Tuttofare confermato **«Diretto»** (il file chiedeva
  «Indiretto», in contrasto con il tipo di impasto e con la 5.4: scelta
  confermata dall'utente). 196 test verdi, typecheck e build ok, 17 controlli
  sul sito pubblicato + PDF (3 pagine) e JPG. Pubblicata in `production`
  (deploy `d8856fa3`, bundle `index-9fPx1X-m.js` e `index-7qqx2L1W.css`, hash
  identici fra sito e `dist/`). Archivi in
  `artifacts/consegna-v525-2026-10-26/`.
- 26 ottobre, aggiornamento **5.26**: il consiglio del bauletto nei Tips &
  Tricks torna presente con il peso **dinamico** del formato
  (`{pesoBauletti}`), allineato al punto 4: 750 g con bauletti da 750 g,
  500 g in modalità Farina. Per sostenerlo `tipsRicetta` risolve i segnaposto
  `{peso<Formato>}` con i pesi effettivi. Badge in home riverificati
  (teglia/contemporanea «Indiretto», Trancio/Tuttofare «Diretto»). 196 test
  verdi, typecheck e build ok, 18 controlli sul sito pubblicato + 2 PDF in due
  modalità + JPG. Pubblicata in `production` (deploy `2ff4831e`, bundle
  `index-rZw2sLaS.js`, hash identici fra sito e `dist/`). Archivi in
  `artifacts/consegna-v526-2026-10-26/`.
- 26 ottobre, versione **6** (aggiornamenti 5.5–5.10): Trancio Milanese con il
  punto 1 «Impasto» e acqua iniziale senza «fredda»; badge confermati in
  elenco, PDF e JPG; righe prodotto del Diretto Tuttofare con titoli più
  evidenti, etichette centrate, campi impilati su smartphone e terza variabile
  per formato; **diametro** delle focacce (24 cm = 200 g) e **stampo** dei
  bauletti (20 × 10 cm = 500 g) con ±1 cm e peso ricalcolato dalla superficie
  (arrotondato ai 5 g, sempre modificabile); formati in ordine di peso e punto
  4 «Prodotti lievitati» in ordine di infornata; lievitazione dopo la formatura
  in una sola frase; tip sulla farina senza la tipologia 00. Il punto 1
  «Impasto in giornata» del Tuttofare è diventato «Impasto», come richiesto
  dalla stessa voce di lavoro. 199 test verdi, typecheck e build ok, 40
  controlli su build locale e 40 sul sito pubblicato (con PDF e JPG riletti e
  pagine ispezionate). Pubblicata in `production` (deploy `e7054d9d`, bundle
  `index-zG4KrO50.js` e `index-B0Opfl6H.css`, hash identici fra sito e
  `dist/`). Archivi in `artifacts/consegna-v6-2026-10-26/`.
- 26 ottobre, aggiornamento **5.27**: badge «Diretto»/«Indiretto» anche nella
  tab «Scegli la ricetta» e nelle intestazioni di **PDF** e **JPG**; il
  procedimento del Diretto Tuttofare ha un unico punto numerato **«Prodotti»**
  con i formati come **elenco puntato rientrato** (Pizzette, Panini, Focacce,
  Bauletti) al posto dei punti 5–7; pizzette con la formulazione sulla **pietra
  refrattaria**; focacce con «Riferimento dinamico»; rimosso il tip duplicato
  della carta forno. Introdotto `voci` in `PassoProcedimento` (filtro per
  condizione e segnaposto risolti a qualsiasi profondità) e resa PDF dedicata.
  196 test verdi, typecheck e build ok; PDF e JPG ispezionati su desktop e
  smartphone; 21 controlli sul sito pubblicato. Pubblicata in `production`
  (deploy `088dccef`, bundle `index-BUobZs2n.js` e `index-DxWExYAy.css`, hash
  identici fra sito e `dist/`). Archivi in
  `artifacts/consegna-v527-2026-10-26/`.
