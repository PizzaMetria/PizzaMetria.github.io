import { writeFileSync } from 'node:fs';
import { CASI, calcolaCaso, estraiValori } from '../src/lib/casi-fase1';

const out = CASI.map((c) => ({ id: c.id, valori: estraiValori(calcolaCaso(c)) }));
const path = new URL('./baseline-fase1.json', import.meta.url);
writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
console.log(`baseline: ${out.length} casi -> ${path.pathname}`);
