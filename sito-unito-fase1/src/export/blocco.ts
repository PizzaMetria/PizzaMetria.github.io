/*
 * QUANDO L'EXPORT PUÒ PARTIRE
 * ---------------------------
 * Il foglio prende i grammi dal risultato a schermo e il tipo di lievito dal
 * modulo. Se l'utente cambia il tipo — o l'idratazione, o l'ora — senza premere
 * «Ricalcola», le due cose non coincidono: il PDF direbbe «lievito secco» accanto
 * ai grammi del fresco.
 *
 * Il confronto è per identità: `calcolo` è l'oggetto messo da parte all'ultimo
 * calcolo, `esito` è quello ricalcolato dai dati attuali. Se sono lo stesso
 * oggetto i dati non sono cambiati; se sono due oggetti diversi, sì.
 */
export const MESSAGGIO_DATI_CAMBIATI =
  'Hai modificato i dati: premi «Ricalcola» prima di esportare, così il foglio e le dosi parlano dello stesso impasto.';

/**
 * Il motivo per cui non si esporta, oppure null se si può.
 * Senza nessun calcolo non c'è niente da bloccare: manca proprio il foglio.
 */
export function bloccoExport(calcolo: unknown, esito: unknown): string | null {
  if (calcolo === null || calcolo === undefined) return null;
  return calcolo === esito ? null : MESSAGGIO_DATI_CAMBIATI;
}
