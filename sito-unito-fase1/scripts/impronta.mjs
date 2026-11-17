/**
 * Stampa l'impronta SHA-256 di una password, da copiare in .env.prova.
 *
 *   npm run impronta -- "la mia password"
 *
 * La password non viene scritta in nessun file: nel progetto resta solo
 * l'impronta, e il confronto avviene nel browser all'apertura del sito.
 */
import { createHash } from 'node:crypto';

const password = process.argv.slice(2).join(' ');

if (!password) {
  console.error('Uso: npm run impronta -- "la password"');
  process.exit(1);
}

console.log(createHash('sha256').update(password, 'utf8').digest('hex'));
