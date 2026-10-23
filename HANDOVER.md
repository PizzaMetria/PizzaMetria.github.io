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
| Bundle in produzione | `assets/index-BnUpGoKR.js`, `assets/index-D5Ws0A6U.css` |

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

- **Cottura della teglia**: la scheda in home descrive il forno F1 P134H, mentre
  il procedimento (PDF) ha ancora il passo «Stesura e cottura in due fasi» con
  forno statico alla massima temperatura e condimenti aggiunti a metà cottura.
  Le due indicazioni non coincidono; non inventare i passaggi mancanti.
- **Autolisi del Canotto**: i Tips & Tricks non indicano più la temperatura di
  conservazione, ma tempi e procedimento dicono ancora «a temperatura ambiente
  per tutta la notte». Serve una decisione, non una correzione automatica.
- **Temperatura di chiusura 25 °C**: resta nei parametri del pannello risultato
  (dato necessario), ma non più nella scheda in home.
- **Procedimento della teglia**: conserva «Porta la biga a circa 25 °C … per
  circa 24 ore», lasciato com’era perché la richiesta riguardava solo la voce
  «Tempi e temperature».

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
  **Da pubblicare** su `thomascalc.freebuff.page`.
