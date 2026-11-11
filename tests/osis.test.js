const test = require('node:test');
const assert = require('node:assert/strict');

const { pickLimit, validatePicks, summarize } = require('../api/osis.js');

const CANDIDATES = [1, 2, 3, 4, 5];

test('semua peran memilih tepat 1 kandidat', () => {
  assert.equal(pickLimit('siswa'), 1);
  assert.equal(pickLimit('guru'), 1);
  assert.equal(validatePicks('siswa', [2], CANDIDATES), null);
  assert.equal(validatePicks('guru', [1], CANDIDATES), null);
  assert.match(validatePicks('guru', [1, 2], CANDIDATES), /tepat 1/);
  assert.match(validatePicks('siswa', [], CANDIDATES), /tepat 1/);
  assert.match(validatePicks('siswa', [1, 2], CANDIDATES), /tepat 1/);
});

test('kandidat ganda ditolak', () => {
  assert.match(validatePicks('guru', [2, 2], CANDIDATES), /dua kali/);
});

test('kandidat di luar daftar ditolak', () => {
  assert.match(validatePicks('siswa', [9], CANDIDATES), /tidak ditemukan/);
});

test('input bukan angka ditolak', () => {
  assert.match(validatePicks('siswa', ['abc'], CANDIDATES), /tidak valid/);
  assert.match(validatePicks('siswa', null, CANDIDATES), /tidak valid/);
});

const PANTAU_CANDIDATES = [
  { no_urut: 1, nama: 'A', foto_url: null },
  { no_urut: 2, nama: 'B', foto_url: null },
  { no_urut: 3, nama: 'C', foto_url: null },
  { no_urut: 4, nama: 'D', foto_url: null },
  { no_urut: 5, nama: 'E', foto_url: null },
];

test('pantau menghitung persentase kandidat dari seluruh pilihan', () => {
  const votes = [
    { voter_role: 'siswa', voter_kelas: '7A', candidate_nos: [1] },
    { voter_role: 'siswa', voter_kelas: '7B', candidate_nos: [2] },
    { voter_role: 'siswa', voter_kelas: '7A', candidate_nos: [1] },
    { voter_role: 'guru', voter_kelas: null, candidate_nos: [1] },
  ];
  const totals = { siswa: 10, guru: 5, classes: { '7A': 6, '7B': 4, '7C': 2 } };
  const result = summarize(PANTAU_CANDIDATES, votes, totals);

  assert.equal(result.picks, 5);
  assert.equal(result.candidates[0].no_urut, 1);
  assert.equal(result.candidates[0].votes, 4);
  assert.equal(result.candidates[0].percent, 80);
  assert.equal(result.candidates[1].no_urut, 2);
  assert.equal(result.candidates[1].votes, 1);
  assert.equal(result.candidates[4].votes, 0);

  assert.deepEqual(result.voters, { siswa: 3, guru: 1 });
  assert.equal(result.turnout.siswa.percent, 30);
  assert.equal(result.turnout.guru.percent, 20);
  assert.deepEqual(
    result.turnout.classes.map((row) => [row.kelas, row.voted, row.total]),
    [
      ['7A', 2, 6],
      ['7B', 1, 4],
      ['7C', 0, 2],
    ],
  );
  assert.equal(result.turnout.classes[0].percent, (2 / 6) * 100);
});

test('pantau tetap menghitung suara saat total pemilih belum tersedia', () => {
  const votes = [{ voter_role: 'siswa', voter_kelas: '8A', candidate_nos: [5] }];
  const result = summarize(PANTAU_CANDIDATES, votes, null);

  assert.equal(result.candidates[0].no_urut, 5);
  assert.equal(result.candidates[0].percent, 100);
  assert.equal(result.turnout.siswa.total, null);
  assert.equal(result.turnout.siswa.percent, null);
  assert.equal(result.turnout.classes[0].kelas, '8A');
  assert.equal(result.turnout.classes[0].total, null);
  assert.equal(result.turnout.classes[0].percent, null);
});

test('urutan tampil bilik suara mengikuti TAMPIL_URUT, bukan no_urut', () => {
  const { urutTampil } = require('../api/osis.js');
  const names = { 1: 'Ahmaddin', 2: 'Faruq', 3: 'Inas', 4: 'Kirana', 5: 'Kuni' };
  const input = [5, 3, 1, 4, 2].map((no) => ({ no_urut: no, nama: names[no] }));
  assert.deepEqual(
    urutTampil(input).map((c) => c.nama),
    ['Ahmaddin', 'Faruq', 'Kuni', 'Kirana', 'Inas'],
  );
});

test('suara guru berbobot 2, suara siswa berbobot 1', () => {
  const votes = [
    { voter_role: 'siswa', voter_kelas: '7A', candidate_nos: [1] },
    { voter_role: 'guru', voter_kelas: null, candidate_nos: [2] },
  ];
  const result = summarize(PANTAU_CANDIDATES, votes, null);

  assert.equal(result.picks, 3);
  const byNo = new Map(result.candidates.map((c) => [c.no_urut, c]));
  assert.equal(byNo.get(1).votes, 1);
  assert.equal(byNo.get(2).votes, 2);
  assert.equal(byNo.get(2).percent, (2 / 3) * 100);
  assert.deepEqual(result.voters, { siswa: 1, guru: 1 });
});
