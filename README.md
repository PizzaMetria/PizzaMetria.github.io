# PizzaMetria

Un calcolatore di impasti per pizza, in italiano, che gira interamente nel browser.
Niente account, niente server: quello che scrivi resta sul tuo dispositivo.

**Sito:** <https://pizzametria.github.io>

## A cosa serve

La domanda di partenza è sempre la stessa: con la farina che ho in casa e l'ora in
cui voglio mangiare la pizza, quanto lievito devo mettere? Quanta acqua? A che
temperatura? Quanto sale?

PizzaMetria risponde a queste domande e poi ti dà la ricetta pronta da seguire,
con i tempi delle varie fasi e il procedimento passo per passo. Se ti serve, la
salvi in JPG o in PDF e te la porti in cucina.

## Come si usa

1. Scegli il tipo di pizza.
2. Dì quante pizze vuoi, o quanta farina hai.
3. Indica l'ora in cui vuoi sfornare e le temperature di casa.
4. Leggi dosi, temperatura dell'acqua e tabella di marcia.
5. Salva la ricetta, se ti va.

C'è una **Modalità Facile** per chi vuole solo i numeri giusti, e una **Modalità
Pro** per chi vuole scegliere ogni passaggio, dal frigo alla puntata.

## Le ricette

Ci sono la pizza tonda **Verace**, la tonda **Contemporanea** e la **Pizza in
Teglia**, più i percorsi con biga e prefermenti. Ogni ricetta porta con sé
ingredienti, fasi, tempi, temperature e qualche consiglio pratico.

Le dosi si possono chiedere per numero di panetti, per chili di farina o per
teglie. Il lievito può essere fresco o secco, e l'autolisi si può accendere o
spegnere quando la ricetta lo permette.

## Cosa trovi dentro

- Dosi in grammi, con arrotondamenti leggibili e formato italiano.
- Temperatura dell'acqua consigliata, calcolata dalle temperature che hai scelto.
- Tabella di marcia con gli orari delle fasi, frigo compreso.
- Esportazione in **JPG** (dosi e resa) e in **PDF** (ricetta completa).
- Interfaccia pensata prima per il telefono, con caratteri grandi e nessuno
  scorrimento orizzontale.
- Installabile come app dal browser; nella cartella `apk/` c'è anche la versione
  Android.

## Provarlo sul tuo computer

Serve Node.js 22 o più recente.

```bash
cd sito-unito-fase1
npm ci
npm run dev
```

Poi apri <http://localhost:3000>. Con `npm test` girano i test automatici, con
`npm run build` si crea il sito compilato in `dist/`.

## Come è fatto

Il progetto attivo sta in [`sito-unito-fase1/`](sito-unito-fase1): React,
TypeScript e Vite, con i PDF generati nel browser. I calcoli sono funzioni pure,
separate dall'interfaccia, e i test automatici sono 490 su 35 file.

I file nella radice del repository (`index.html`, `assets/`, `sw.js`,
`manifest.webmanifest`) sono il sito pubblico servito da GitHub Pages.

Per lo stato del lavoro, i comandi e le cose ancora aperte c'è
[`HANDOVER.md`](HANDOVER.md).

## Una nota onesta

Le dosi sono stime ragionate, non verità assolute: cambiano con la farina, con
l'umidità e con il forno. La prima pizza serve a correggere la dose, non il
contrario.
