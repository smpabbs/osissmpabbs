// Generate snapshot hasil pemilihan untuk pantau/laporan.html (halaman statis tanpa password).
// Jalankan: node --env-file=.env.local tools/snapshot.mjs  lalu commit pantau/data.js
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const osis = require(join(root, 'api', 'osis.js'));

if (!process.env.VOTE_SUPABASE_URL || !process.env.VOTE_SUPABASE_SERVICE_KEY) {
  console.error('env Supabase belum lengkap (.env.local)');
  process.exit(1);
}

const [candidates, votes, totals] = await Promise.all([
  osis.getCandidates(),
  osis.getVotes(),
  osis.getEligibleTotals(),
]);
const data = osis.summarize(candidates, votes, totals);

const target = join(root, 'pantau', 'data.js');
writeFileSync(
  target,
  '// Snapshot hasil pemilihan — digenerate oleh tools/snapshot.mjs, jangan edit manual.\n' +
    'window.PANTAU_SNAPSHOT = ' + JSON.stringify(data, null, 2) + ';\n',
);
console.log(`OK: ${data.picks} suara, ${data.voters.siswa + data.voters.guru} pemilih -> pantau/data.js`);
