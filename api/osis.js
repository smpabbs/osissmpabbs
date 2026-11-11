// API Pemilihan Ketua OSIS SMP ABBS Surakarta.
// Login diverifikasi ke Supabase LMS (project A); suara disimpan ke project B.
// Kedua service key hanya dipakai di server, tidak pernah dikirim ke browser.

const crypto = require('node:crypto');

const LMS_URL = process.env.LMS_SUPABASE_URL;
const LMS_ANON = process.env.LMS_SUPABASE_ANON_KEY;
const LMS_SERVICE = process.env.LMS_SUPABASE_SERVICE_KEY;
const VOTE_URL = process.env.VOTE_SUPABASE_URL;
const VOTE_KEY = process.env.VOTE_SUPABASE_SERVICE_KEY;

const SEKOLAH_ID = '503a0f26-abeb-4a0f-94a4-2f4a23fc96d2'; // SMP ABBS Surakarta
const COOKIE = 'osis_session';
const SESSION_MAX_AGE = 3600;
// shortcut: default di kode, ganti lewat env PANTAU_PASSWORD bila perlu.
const PANTAU_PASSWORD = process.env.PANTAU_PASSWORD || 'osis2627';

// Urutan tampil kartu di bilik suara. Nomor di kartu = posisi di daftar ini;
// no_urut database tidak diubah supaya suara yang sudah masuk tetap valid.
const TAMPIL_URUT = [1, 2, 5, 4, 3];

// Daftar induk guru & tendik SMP ABBS Surakarta untuk rekap partisipasi di /pantau.
const GURU_MASTER = [
  'Adila Rahmah, S.Pd., M.Pd.',
  'Ahmad Bayu Abdulloh, S.Ag.',
  'Alla Junia Nurdin, M.Kom',
  'Amien Nur Wicaksono, S.Ag',
  'Andi wijayanto, S.Pd',
  'Arif Hidayat, M.Pd',
  'Arvino Nurvieri Kusuma, S.Pd',
  'Asnia Novitasari, AM, M.E',
  'Aulia Qisthi Rosyada, S.Pd.',
  'Binti Qoeroti, S.Pd., M.Si',
  'Charlieta Nova Putri Fedito, S.Kom',
  'Daffa Danendra Rizqi Nugraha, S.Pd.',
  'Danang Dwi Pambudi, S. Pd',
  'Fadlan Rifai AL-Irsyad',
  'Farida Nur Hidayati,S.Pd',
  'Fatma Roudhotul Rafida Kolis, S.Pd',
  'Febri Cahya Syahputra, S.Pd., M.Pd.',
  'Fitri Nur Kolifah, S.Pd.',
  'Hang Sakti Abdullah, S.Pd.',
  'Hari Rohmah, S.Pd',
  'Ida Aryani,S.Sos',
  'Ifan Destya Adi Tama, S.Pd.',
  'Iin Indah Saputri, S.Pd.',
  'Isti Qomah Nurul Izzati, S.Pd.',
  'Joko Ariyanto, S.T.',
  'Muamar Fariq Salafy, S.Pd, Gr.',
  'Muhammad Fahmi Aziz, S.Psi',
  'Muhammad Jauhari Ahmad',
  'Muhammad Syafiq, S.Pd.',
  'Musfiq Amrulloh, S.Pd.',
  'Nur Rohmah Hidayanti',
  'Ramadanti Prativi,S.Pd.,M.Pd',
  'Scundy Nourma Pratiwi, S.Pd., M.Pd',
  'Sharih Shadri, S.S.',
  'Sinta Fitriana, S.Pd',
  'Siti Asiyah W.J. S,Pd.',
  'Siti Khoimah, S. Pd.',
  'Siti Robiatul Adawiyah, S.Si',
  'Siti Sirril Inayah',
  'Siti Zamronah Rizqiah, S.Pd.',
  'Syahrul Abdi Narotama',
  'Syarah Karina Putri, S.Pd',
  'Tri Wijayanti, S.Pd., M.Pd',
  'Wafda Salsabila,S.Pd',
  'Yoki Wirawan, S.Pd',
  'Yona Puspa Ningtias, S.Pd.',
];

function normGuru(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[\.,]/g, ' ')
    .replace(
      /\b(s\s*pd|m\s*pd|s\s*si|m\s*si|s\s*kom|m\s*kom|m\s*e|s\s*t|st|gr|s\s*sos|sos|s\s*ag|s\s*psi|s\s*s|am)\b/g,
      '',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function matchGuru(masterList, guruVotes) {
  const list = Array.isArray(masterList) && masterList.length ? masterList : GURU_MASTER;
  const matchedVoteIndices = new Set();
  const sudah = [];
  const belum = [];

  for (const masterName of list) {
    const cm = normGuru(masterName);
    let matchedVote = null;

    for (let i = 0; i < guruVotes.length; i++) {
      if (matchedVoteIndices.has(i)) continue;
      const cv = normGuru(guruVotes[i].voter_nama);
      if (cm === cv || (cm.length >= 6 && (cm.includes(cv) || cv.includes(cm)))) {
        matchedVote = guruVotes[i];
        matchedVoteIndices.add(i);
        break;
      }
    }

    if (matchedVote) {
      sudah.push({
        nama: matchedVote.voter_nama || masterName,
        master_nama: masterName,
        waktu: matchedVote.created_at || null,
      });
    } else {
      belum.push({
        nama: masterName,
      });
    }
  }

  for (let i = 0; i < guruVotes.length; i++) {
    if (!matchedVoteIndices.has(i)) {
      sudah.push({
        nama: guruVotes[i].voter_nama || 'Guru',
        master_nama: guruVotes[i].voter_nama,
        waktu: guruVotes[i].created_at || null,
      });
    }
  }

  sudah.sort((a, b) => {
    if (a.waktu && b.waktu) return new Date(b.waktu) - new Date(a.waktu);
    return a.nama.localeCompare(b.nama, 'id');
  });
  belum.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

  return { sudah, belum };
}

function urutTampil(candidates) {
  const posisi = new Map(TAMPIL_URUT.map((no, i) => [no, i]));
  return [...candidates].sort(
    (a, b) => (posisi.get(a.no_urut) ?? 99) - (posisi.get(b.no_urut) ?? 99),
  );
}

// Semua pemilih memilih 1 kandidat. Suara guru dihitung berbobot 2.
function pickLimit() {
  return 1;
}

function voteWeight(role) {
  return role === 'guru' ? 2 : 1;
}

function validatePicks(role, picks, validNos) {
  if (!Array.isArray(picks)) return 'Pilihan tidak valid.';
  const nums = picks.map(Number);
  if (nums.some((n) => !Number.isInteger(n))) return 'Pilihan tidak valid.';
  if (new Set(nums).size !== nums.length) return 'Kandidat tidak boleh dipilih dua kali.';
  if (nums.length !== pickLimit()) {
    return 'Pilih tepat 1 kandidat.';
  }
  if (!nums.every((n) => validNos.includes(n))) return 'Kandidat tidak ditemukan.';
  return null;
}

async function rpc(name, payload) {
  const res = await fetch(`${LMS_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: LMS_ANON,
      Authorization: `Bearer ${LMS_ANON}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      'Accept-Profile': 'public',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error('rpc gagal', name, res.status, await res.text());
    return null;
  }
  const value = await res.json();
  return typeof value === 'string' && value ? value : null;
}

async function resolveEmail(identifier) {
  return (
    (await rpc('get_email_by_nis', { p_nis: identifier, p_sekolah_id: SEKOLAH_ID })) ||
    (await rpc('get_email_by_username', { p_username: identifier }))
  );
}

async function verifyToken(token) {
  const res = await fetch(`${LMS_URL}/auth/v1/user`, {
    headers: { apikey: LMS_ANON, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.id ? user : null;
}

async function getVoter(token, userId) {
  const res = await fetch(
    `${LMS_URL}/rest/v1/profiles?select=id,nama,role,kelas,nis,sekolah_id,status&id=eq.${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: LMS_ANON,
        Authorization: `Bearer ${token}`,
        'Accept-Profile': 'public',
      },
    },
  );
  if (!res.ok) {
    console.error('baca profil gagal', res.status, await res.text());
    return { ok: false, status: 502, error: 'Gagal membaca data akun. Coba lagi.' };
  }
  const rows = await res.json();
  const profile = rows[0];
  if (!profile) return { ok: false, status: 403, error: 'Akun belum terdaftar di LMS.' };
  if (profile.role !== 'siswa' && profile.role !== 'guru') {
    return { ok: false, status: 403, error: 'Hanya siswa dan guru yang dapat memilih.' };
  }
  if (profile.sekolah_id !== SEKOLAH_ID) {
    return { ok: false, status: 403, error: 'Akun ini bukan warga SMP ABBS Surakarta.' };
  }
  if (profile.status !== 'aktif') {
    return { ok: false, status: 403, error: 'Akun ini tidak aktif. Hubungi admin sekolah.' };
  }
  return { ok: true, voter: profile };
}

async function getCandidates() {
  const res = await fetch(
    `${VOTE_URL}/rest/v1/osis_candidates?select=no_urut,nama,kelas,foto_url,visi,misi&aktif=eq.true&order=no_urut.asc`,
    {
      headers: {
        apikey: VOTE_KEY,
        Authorization: `Bearer ${VOTE_KEY}`,
        'Accept-Profile': 'public',
      },
    },
  );
  if (!res.ok) throw new Error(`baca kandidat gagal: ${res.status}`);
  return res.json();
}

async function hasVoted(voterId) {
  const res = await fetch(
    `${VOTE_URL}/rest/v1/osis_votes?select=voter_id&voter_id=eq.${encodeURIComponent(voterId)}`,
    {
      headers: {
        apikey: VOTE_KEY,
        Authorization: `Bearer ${VOTE_KEY}`,
        'Accept-Profile': 'public',
      },
    },
  );
  if (!res.ok) throw new Error(`cek suara gagal: ${res.status}`);
  const rows = await res.json();
  return rows.length > 0;
}

async function getVotes() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${VOTE_URL}/rest/v1/osis_votes?select=candidate_nos,voter_role,voter_kelas,voter_nama,created_at&limit=1000&offset=${offset}`,
      {
        headers: {
          apikey: VOTE_KEY,
          Authorization: `Bearer ${VOTE_KEY}`,
          'Accept-Profile': 'public',
        },
      },
    );
    if (!res.ok) throw new Error(`baca suara gagal: ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

// Total siswa/guru aktif per kelas dari LMS. Butuh service key karena RLS
// menolak enumerasi profiles dengan anon key.
let eligibleCache = { at: 0, value: null };
async function getEligibleTotals() {
  if (!LMS_SERVICE) return null;
  if (eligibleCache.value && Date.now() - eligibleCache.at < 5 * 60 * 1000) {
    return eligibleCache.value;
  }

  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${LMS_URL}/rest/v1/profiles?select=role,kelas&sekolah_id=eq.${SEKOLAH_ID}` +
        `&status=eq.aktif&role=in.(siswa,guru)&limit=1000&offset=${offset}`,
      {
        headers: {
          apikey: LMS_SERVICE,
          Authorization: `Bearer ${LMS_SERVICE}`,
          'Accept-Profile': 'public',
        },
      },
    );
    if (!res.ok) {
      console.error('baca total pemilih gagal', res.status, await res.text());
      return null;
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }

  const totals = { siswa: 0, guru: 0, classes: {} };
  for (const row of rows) {
    if (row.role === 'guru') {
      totals.guru += 1;
    } else {
      totals.siswa += 1;
      if (row.kelas) totals.classes[row.kelas] = (totals.classes[row.kelas] || 0) + 1;
    }
  }

  eligibleCache = { at: Date.now(), value: totals };
  return totals;
}

function percentOf(value, total) {
  if (!total || total <= 0) return null;
  return (value / total) * 100;
}

function summarize(candidates, votes, totals, guruMaster = GURU_MASTER) {
  const counts = new Map(candidates.map((candidate) => [candidate.no_urut, 0]));
  const classVotes = new Map();
  const guruVotes = [];
  let picks = 0;
  let siswaVoted = 0;
  let guruVoted = 0;

  for (const vote of votes) {
    const nos = Array.isArray(vote.candidate_nos) ? vote.candidate_nos : [];
    const weight = voteWeight(vote.voter_role);
    for (const no of nos) {
      if (counts.has(no)) counts.set(no, counts.get(no) + weight);
      picks += weight;
    }

    if (vote.voter_role === 'guru') {
      guruVoted += 1;
      guruVotes.push(vote);
    } else {
      siswaVoted += 1;
      const kelas = String(vote.voter_kelas || '').trim();
      if (kelas) classVotes.set(kelas, (classVotes.get(kelas) || 0) + 1);
    }
  }

  const candidateRows = candidates
    .map((candidate) => {
      const count = counts.get(candidate.no_urut) || 0;
      return {
        no_urut: candidate.no_urut,
        nama: candidate.nama,
        kelas: candidate.kelas,
        foto_url: candidate.foto_url,
        votes: count,
        percent: percentOf(count, picks),
      };
    })
    .sort((a, b) => b.votes - a.votes || a.no_urut - b.no_urut);

  const classNames = new Set(Object.keys(totals ? totals.classes : {}));
  for (const kelas of classVotes.keys()) classNames.add(kelas);
  const classes = [...classNames]
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
    .map((kelas) => {
      const voted = classVotes.get(kelas) || 0;
      const total = totals ? totals.classes[kelas] || 0 : null;
      return { kelas, voted, total, percent: percentOf(voted, total) };
    });

  const rekapGuru = matchGuru(guruMaster, guruVotes);
  const guruTotal =
    totals && totals.guru != null
      ? totals.guru
      : guruMaster
        ? guruMaster.length
        : null;

  return {
    candidates: candidateRows,
    picks,
    voters: { siswa: siswaVoted, guru: guruVoted },
    turnout: {
      siswa: {
        voted: siswaVoted,
        total: totals ? totals.siswa : null,
        percent: percentOf(siswaVoted, totals ? totals.siswa : null),
      },
      guru: {
        voted: guruVoted,
        total: guruTotal,
        percent: percentOf(guruVoted, guruTotal),
      },
      classes,
    },
    guru: rekapGuru,
    updated_at: new Date().toISOString(),
  };
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function pantau(req, res, body) {
  if (!safeEqual(body.password, PANTAU_PASSWORD)) {
    return json(res, 401, { error: 'Password salah.' });
  }
  const [candidates, votes, totals] = await Promise.all([
    getCandidates(),
    getVotes(),
    getEligibleTotals(),
  ]);
  return json(res, 200, summarize(candidates, votes, totals));
}

function publicVoter(profile) {
  return { nama: profile.nama, role: profile.role, kelas: profile.kelas };
}

function isHttps(req) {
  return req.headers['x-forwarded-proto'] === 'https';
}

function setSessionCookie(req, res, token) {
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`,
  );
}

function clearSessionCookie(req, res) {
  const secure = isHttps(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq > -1 && part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

async function login(req, res, body) {
  const identifier = String(body.identifier || '').trim();
  const password = String(body.password || '');
  if (!identifier || !password) {
    return json(res, 400, { error: 'NIS/username dan password wajib diisi.' });
  }

  const email = identifier.includes('@') ? identifier : await resolveEmail(identifier);
  if (!email) return json(res, 401, { error: 'NIS atau username tidak ditemukan.' });

  const authRes = await fetch(`${LMS_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: LMS_ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!authRes.ok) return json(res, 401, { error: 'Password salah.' });

  const auth = await authRes.json();
  const voter = await getVoter(auth.access_token, auth.user.id);
  if (!voter.ok) return json(res, voter.status, { error: voter.error });

  const voted = await hasVoted(auth.user.id);
  if (!voted) setSessionCookie(req, res, auth.access_token);

  return json(res, 200, {
    voter: publicVoter(voter.voter),
    candidates: urutTampil(await getCandidates()),
    voted,
  });
}

async function session(req, res) {
  const token = readCookie(req, COOKIE);
  if (!token) return json(res, 401, { error: 'Belum login.' });

  const user = await verifyToken(token);
  if (!user) return json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });

  const voter = await getVoter(token, user.id);
  if (!voter.ok) return json(res, voter.status, { error: voter.error });

  return json(res, 200, {
    voter: publicVoter(voter.voter),
    candidates: urutTampil(await getCandidates()),
    voted: await hasVoted(user.id),
  });
}

async function vote(req, res, body) {
  const token = readCookie(req, COOKIE);
  if (!token) return json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });

  const user = await verifyToken(token);
  if (!user) return json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });

  const voter = await getVoter(token, user.id);
  if (!voter.ok) return json(res, voter.status, { error: voter.error });

  const candidates = await getCandidates();
  const picks = Array.isArray(body.candidate_nos) ? body.candidate_nos.map(Number) : [];
  const problem = validatePicks(
    voter.voter.role,
    picks,
    candidates.map((c) => c.no_urut),
  );
  if (problem) return json(res, 400, { error: problem });

  const insert = await fetch(`${VOTE_URL}/rest/v1/osis_votes`, {
    method: 'POST',
    headers: {
      apikey: VOTE_KEY,
      Authorization: `Bearer ${VOTE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'public',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      voter_id: user.id,
      voter_nama: voter.voter.nama,
      voter_role: voter.voter.role,
      voter_nis: voter.voter.nis,
      voter_kelas: voter.voter.kelas,
      candidate_nos: picks,
    }),
  });

  if (insert.status === 409) {
    clearSessionCookie(req, res);
    return json(res, 409, { error: 'Kamu sudah memilih sebelumnya.' });
  }
  if (!insert.ok) {
    console.error('simpan suara gagal', insert.status, await insert.text());
    return json(res, 502, { error: 'Gagal menyimpan suara. Coba lagi.' });
  }

  clearSessionCookie(req, res);
  return json(res, 200, { ok: true });
}

async function handler(req, res) {
  try {
    if (!LMS_URL || !LMS_ANON || !VOTE_URL || !VOTE_KEY) {
      console.error('env Supabase belum lengkap');
      return json(res, 500, { error: 'Server belum dikonfigurasi.' });
    }

    if (req.method === 'GET') return await session(req, res);

    if (req.method === 'POST') {
      const body = parseBody(req);
      if (body.action === 'pantau') return await pantau(req, res, body);
      if (body.action === 'login') return await login(req, res, body);
      if (body.action === 'vote') return await vote(req, res, body);
      if (body.action === 'logout') {
        clearSessionCookie(req, res);
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: 'Aksi tidak dikenal.' });
    }

    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Metode tidak diizinkan.' });
  } catch (error) {
    console.error('osis api error', error);
    return json(res, 500, { error: 'Terjadi kesalahan. Coba lagi.' });
  }
}

module.exports = handler;
module.exports.pickLimit = pickLimit;
module.exports.validatePicks = validatePicks;
module.exports.summarize = summarize;
module.exports.urutTampil = urutTampil;
module.exports.GURU_MASTER = GURU_MASTER;
module.exports.normGuru = normGuru;
module.exports.matchGuru = matchGuru;
