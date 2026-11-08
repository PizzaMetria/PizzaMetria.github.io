# Le misure, una per una

Tutte fatte il 3 novembre 2026 sul riferimento. Dosi in percentuale sulla farina,
perché è l'unità del motore; fra parentesi i grammi letti dallo strumento.

## 1. Durata, a parità di tutto (62%, sale 2,5%, niente olio)

Programma: 4 h a 20 °C, frigorifero a 4 °C, 4 h a 20 °C dopo, impasto a 21 °C.
Tonda: 3 panetti da 250 g. Teglia: un pezzo unico da 750 g.

| ore | ore eq (modello vecchio) | tonda | teglia (1 pezzo) |
|---|---|---|---|
| 12 | 9,11 | 0,2110% (0,96 g) | 0,7974% (3,62 g) |
| 16 | 9,70 | 0,2066% (0,94 g) | 0,7621% (3,46 g) |
| 20 | 10,24 | 0,2022% (0,92 g) | 0,7181% (3,26 g) |
| 24 | 10,76 | 0,1978% (0,90 g) | 0,6784% (3,08 g) |
| 28,7 | 11,38 | 0,1934% (0,88 g) | 0,6344% (2,88 g) |
| 36 | 12,34 | 0,1868% (0,85 g) | 0,5727% (2,60 g) |
| 48 | 13,91 | 0,1758% (0,80 g) | 0,4813% (2,19 g) |

Fit della teglia a pezzo unico: `11,755 · eq^-1,2059`, scarto massimo 2,7%.

Nello sweep il frigorifero dura `ore − 8` (20,7 h a 28,7 h di totale); nelle tre
ricette del punto 6 sono 20,5 h. È il motivo per cui qui la tonda segna 0,88 g e
là 0,86 g: mezz'ora di freddo in meno vale un paio di centesimi di grammo.

Lo stesso sweep fatto con 3 panetti dà `9,287 · eq^-1,1591`: la differenza fra i
due fit è la geometria, non il tempo — vedi il punto 5.

## 2. Idratazione (farina fissa 455 g, 28,7 h)

| idratazione | tonda | teglia |
|---|---|---|
| 55% | 0,2181% | 0,6380% |
| 62% | 0,1894% | 0,5519% |
| 75% | 0,1495% | 0,4383% |
| 80% | 0,1385% | 0,4075% |

Fit: tonda `0,1888% · (idro/62)^-1,218`, teglia `0,5521% · (idro/62)^-1,200`.
Rifatto a massa fissa (3 × 250 g) dà −1,197 e −1,178: la legge non dipende da
come si tiene ferma la farina.

Il rapporto teglia/tonda resta 2,91–2,94 su tutta la scala: il ramo è un
moltiplicatore puro, non tocca l'esponente dell'acqua.

## 3. Olio (farina fissa 455 g, 28,7 h)

| olio | 62% tonda | 62% teglia | 70% tonda | 70% teglia |
|---|---|---|---|---|
| 0% | 0,1894% | 0,5519% | 0,1626% | 0,4758% |
| 1% | 0,1982% | 0,5828% | 0,1696% | 0,5000% |
| 2% | 0,2093% | 0,6115% | 0,1780% | 0,5220% |
| 3% | 0,2181% | 0,6402% | 0,1846% | 0,5441% |
| 4% | 0,2291% | 0,6689% | 0,1934% | 0,5661% |

Fit: `dose × (1 + 0,05 · olio)`, scarti sotto lo 0,5%.
La retta vecchia dava +6,6% al 2% invece di +10%: frenava meno della metà.

## 4. Il W non si muove con gli ingredienti

| prova | W |
|---|---|
| 62%, olio 0 / 2 / 4% | 258 / 258 / 258 |
| 62%, sale 20 / 40 / 60 g/l | 258 / 258 / 258 |
| 62% contro 75% (stessi orari) | 258 / 258 |
| teglia 70% con olio 2% | 254 |
| 6 ore (tonda) | 197 |
| 24 ore senza frigo | 302 |
| 48 ore con 40 in frigo | 302 |

Il W dipende solo dai tempi. La correzione `idratazione^0,6 · olio · sale ·
malto` che stava nel motore era una scelta, non una misura: alzava il W del 12%
sulla contemporanea e del 21% sulla teglia ed è stata tolta.

## 5. Geometria: il pezzo unico vale più lievito

Farina fissa 455 g, 62%, 28,7 h, tonda:

| pezzi | grammi per pezzo | dose |
|---|---|---|
| 1 | 748,5 | 0,2115% |
| 2 | 374,2 | 0,1960% |
| 3 | 249,5 | 0,1894% |
| 6 | 124,8 | 0,1802% |

Teglia: 1 × 794 g → 0,5894%, 3 × 264,7 g → 0,5220% (+12,9% col pezzo unico).

Il nostro motore non ha questo termine. Per questo ogni ramo è tarato sulla
geometria con cui si usa: tonda su tre panetti, teglia su una teglia sola.

## 6. Le tre ricette, alla fine

Programma del PDF (4 h + 20,5 h frigo + 4,2 h), lievito fresco:

| ricetta | farina | riferimento | nostro (vecchio) | scarto |
|---|---|---|---|---|
| verace 3 × 250 g, 62% | 456 g | 0,1890% (0,86 g) | 0,1860% (0,85 g) | −1,6% |
| contemporanea 3 × 280 g, 75% | 473 g | 0,1501% (0,71 g) | 0,1480% (0,70 g) | −1,4% |
| teglia 30 × 40, 70% + olio 2% | 376 g | 0,5915% (2,23 g) | 0,5852% (2,20 g) | −1,1% |

W: 257 / 257 / 257 contro 258 / 258 / 254 (−0,4%, −0,4%, +1,2%).

## 7. Cosa non è ancora a posto

- **Il W del modello nuovo** dà 219 sulla verace contro 258 (−15%): la sua retta
  è tarata su un asse di ore equivalenti diverso da quello che produce il
  modello a inerzia (9,7 invece di 11,5). Serve un rifit, non una cancellazione.
- **La legge a potenza unica non tiene su tutte le famiglie di programma**: le
  otto prove storiche stanno dentro l'8%, ma su schemi diversi (per esempio
  22 h con 16 in frigo) lo scarto arriva al 20%. È un limite del modello
  vecchio, non introdotto dalle correzioni di oggi.
