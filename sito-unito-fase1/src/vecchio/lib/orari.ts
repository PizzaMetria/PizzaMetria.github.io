/**
 * GIORNO E ORA DELLA BIGA
 * =======================
 * Nel modulo della biga si sceglie giorno e ora, non solo l'ora: un'attesa di
 * 24 ore cambia giorno, e con il solo «HH:MM» l'interfaccia non poteva dirlo.
 * Qui stanno i formati di `input type="datetime-local"` e le conversioni
 * condivise dal calcolatore della sola biga e dal pannello delle ricette.
 */

/** «YYYY-MM-DDTHH:MM» nel fuso locale, come lo vuole input datetime-local. */
export function testoDataLocale(data: Date): string {
  const due = (valore: number) => String(valore).padStart(2, '0');
  return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(
    data.getDate(),
  )}T${due(data.getHours())}:${due(data.getMinutes())}`;
}

/** Vero se la stringa porta anche il giorno: «2026-11-04T08:00». */
export function haGiorno(valore: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(valore);
}

/** L'orario predefinito: oggi alle 8, domani alle 8 e così via. */
export function orarioPredefinito(
  giorniDopo: number,
  ora = 8,
  adesso = new Date(),
): string {
  const data = new Date(adesso);
  data.setHours(ora, 0, 0, 0);
  data.setDate(data.getDate() + giorniDopo);
  return testoDataLocale(data);
}

/**
 * L'impasto predefinito: quindici minuti dopo l'apertura, arrotondati ai
 * cinque minuti più vicini. Chi apre alle 18:59 impasta alle 19:15; chi apre
 * alle 19:42 impasta alle 19:55. `oreDopo` serve alla biga pronta, che di
 * norma parte a ventiquattro ore di distanza.
 */
export function impastoPredefinito(oreDopo = 0, adesso = new Date()): string {
  const data = new Date(adesso.getTime() + (15 + oreDopo * 60) * 60_000);
  data.setSeconds(0, 0);
  data.setMinutes(Math.round(data.getMinutes() / 5) * 5);
  return testoDataLocale(data);
}

/**
 * Ore fra due istanti completi. Una fine che non viene dopo l'inizio è un
 * errore, non un'attesa: si restituisce `null`.
 */
export function oreTraIstanti(inizio: string, fine: string): number | null {
  const a = new Date(inizio);
  const b = new Date(fine);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  const ore = (b.getTime() - a.getTime()) / 3_600_000;
  return ore >= 0 ? ore : null;
}

/**
 * «martedì 5 novembre»: il giorno dell'istante, o `null` quando la data non
 * c'è (i vecchi stati salvati con il solo orario).
 */
export function giornoDi(valore: string): string | null {
  if (!haGiorno(valore)) return null;
  const data = new Date(valore);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(data);
}

/** «08:00» dell'istante, o `null` se la stringa non ha l'ora. */
export function oraDi(valore: string): string | null {
  const ora = /T(\d{2}:\d{2})/.exec(valore);
  return ora ? ora[1] : /^\d{2}:\d{2}$/.test(valore) ? valore : null;
}

/**
 * Un vecchio «HH:MM» senza giorno prende oggi; la fine, se finirebbe prima
 * dell'inizio, prende il giorno dopo. È la lettura degli stati salvati prima
 * che il modulo mostrasse il giorno.
 */
export function completaCoppia(
  inizio: string,
  fine: string,
  adesso = new Date(),
): { inizio: string; fine: string } {
  if (haGiorno(inizio) && haGiorno(fine)) return { inizio, fine };

  const base = new Date(adesso);
  base.setSeconds(0, 0);

  const conGiorno = (valore: string, giornoDopo: boolean): string => {
    if (haGiorno(valore)) return valore;
    const parti = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(valore);
    if (!parti) return valore;
    const data = new Date(base);
    data.setHours(Number(parti[1]), Number(parti[2]), 0, 0);
    if (giornoDopo) data.setDate(data.getDate() + 1);
    return testoDataLocale(data);
  };

  const partenza = conGiorno(inizio, false);
  let arrivo = conGiorno(fine, false);
  const ore = oreTraIstanti(partenza, arrivo);
  // Con il solo orario la fine uguale all'inizio valeva un'attesa intera (la
  // vecchia lettura a cavallo della mezzanotte): 08:00 → 08:00 sono 24 ore.
  if (ore === null || (ore === 0 && !haGiorno(fine))) {
    arrivo = conGiorno(fine, true);
  }

  return { inizio: partenza, fine: arrivo };
}
