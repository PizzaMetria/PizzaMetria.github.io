# La base di calcolo: come è stata misurata

Questa cartella è il foglio di lavoro con cui sono nate le leggi del motore. Non
è documentazione del prodotto: è il materiale. Se un numero del calcolatore
sembra sbagliato, la risposta sta qui dentro — e se manca, va aggiunta qui prima
che nel codice.

## Lo strumento di riferimento

riferimento, `https://www.sito di riferimento/calcola.php`, interrogato via GET.
Non ha un'API: è un form che risponde con una stringa di campi separati da `-`.

| parametro | significato |
|---|---|
| `text1` | numero di pezzi |
| `text2` | grammi per pezzo |
| `text3` | idratazione in % |
| `textA` | sale in g per litro d'acqua (2,5% sulla farina al 62% = 40 g/l) |
| `textB` | olio in g per litro d'acqua |
| `textC` | ore totali |
| `textD` | ore in frigorifero |
| `text4` / `text5` | temperatura ambiente / frigorifero |
| `pNapol` | `1` tonda, `0` teglia: è l'unico interruttore di formato |

La risposta si legge per posizione:

| campo | cosa è |
|---|---|
| 2 | farina in grammi |
| 4 | sale in grammi |
| 6 | lievito fresco in grammi |
| 8 | lievito in % sulla farina |
| 9 | W consigliato |

Conversione delle dosi: `g/l = percentuale × 10 / (idratazione / 100)`, quindi
2,5% di sale al 62% = 40,3 g/l.

**Attenzione ai campi 12 e 13** (per esempio `270-378`): *non* sono una finestra
di W. Valgono il 36,0% e il 50,4% della massa d'impasto e si muovono solo con
quella: 750 g danno 270–378, 1.500 g danno 540–756. A 28,7 ore il W consigliato
è 258, non 270. L'errore è stato fatto una volta: non rifarlo.

## Le cinque cose che sono uscite dalle misure

1. **L'acqua abbassa la dose** (esponente −1,2), non la alza.
2. **L'olio la alza** del 5% per punto: il doppio di quanto diceva la retta vecchia.
3. **La teglia chiede circa 3,3 volte la tonda** a parità di ore, con un esponente suo.
4. **Il W non guarda gli ingredienti**: riferimento lo tiene a 258 cambiando acqua, sale e olio.
5. **Il pezzo unico vale +12% di lievito** a parità di farina: per questo la teglia
   è tarata su una teglia sola e la tonda su tre panetti.

## Se cambi una costante

Le stesse correzioni vivono in due progetti: `calcolatore-libero` (la base) e
`sito-unito` (il sito di prova). Vanno cambiate **in tutti e due**, insieme a
`src/lib/riferimento.test.ts` e a questo file. Il test di confronto è la rete di
sicurezza: se un numero si muove, lo dice.
