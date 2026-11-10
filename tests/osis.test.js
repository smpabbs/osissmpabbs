const test = require('node:test');
const assert = require('node:assert/strict');

const { pickLimit, validatePicks } = require('../api/osis.js');

const CANDIDATES = [1, 2, 3, 4, 5];

test('siswa memilih tepat 1 kandidat', () => {
  assert.equal(pickLimit('siswa'), 1);
  assert.equal(validatePicks('siswa', [2], CANDIDATES), null);
  assert.match(validatePicks('siswa', [], CANDIDATES), /tepat 1/);
  assert.match(validatePicks('siswa', [1, 2], CANDIDATES), /tepat 1/);
});

test('guru memilih tepat 2 kandidat', () => {
  assert.equal(pickLimit('guru'), 2);
  assert.equal(validatePicks('guru', [1, 4], CANDIDATES), null);
  assert.match(validatePicks('guru', [1], CANDIDATES), /tepat 2/);
  assert.match(validatePicks('guru', [1, 2, 3], CANDIDATES), /tepat 2/);
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
