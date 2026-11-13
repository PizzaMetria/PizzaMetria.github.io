import { formatta } from './numeri';

export function istruzioneChiusura(temperatura: number): string {
  return `Chiudi l’impasto a ${formatta(temperatura, Number.isInteger(temperatura) ? 0 : 1)} °C.`;
}

/** Aggiunge ore a un orario ISO: null se la data non è valida. */
export function sommaOre(partenza: string, quante: number): Date | null {
  const data = new Date(partenza);
  if (Number.isNaN(data.getTime())) return null;
  return new Date(data.getTime() + quante * 3_600_000);
}

export function orarioFase(data: Date): { ora: string; giorno: string } {
  return {
    ora: data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    giorno: data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }),
  };
}

const AZIONI: Record<string, string> = {
  Impasto: 'Prepara l’impasto',
  'Staglio / Formazione panetti': 'Forma i panetti',
  'In frigorifero': 'Metti l’impasto in frigorifero',
  'Fuori dal frigorifero': 'Tira fuori l’impasto dal frigorifero',
  'Impasto pronto': 'Stendi e inforna',
};

export function titoloAzione(titolo: string): string {
  return AZIONI[titolo] ?? titolo;
}
