// API Pemilihan Ketua OSIS SMP ABBS Surakarta.
// Login diverifikasi ke Supabase LMS (project A); suara disimpan ke project B.
// Kedua service key hanya dipakai di server, tidak pernah dikirim ke browser.

const LMS_URL = process.env.LMS_SUPABASE_URL;
const LMS_ANON = process.env.LMS_SUPABASE_ANON_KEY;
const VOTE_URL = process.env.VOTE_SUPABASE_URL;
const VOTE_KEY = process.env.VOTE_SUPABASE_SERVICE_KEY;

const SEKOLAH_ID = '503a0f26-abeb-4a0f-94a4-2f4a23fc96d2'; // SMP ABBS Surakarta
const COOKIE = 'osis_session';
const SESSION_MAX_AGE = 3600;

function pickLimit(role) {
  return role === 'siswa' ? 1 : 2;
}

function validatePicks(role, picks, validNos) {
  if (!Array.isArray(picks)) return 'Pilihan tidak valid.';
  const nums = picks.map(Number);
  if (nums.some((n) => !Number.isInteger(n))) return 'Pilihan tidak valid.';
  if (new Set(nums).size !== nums.length) return 'Kandidat tidak boleh dipilih dua kali.';
  if (nums.length !== pickLimit(role)) {
    return role === 'siswa' ? 'Pilih tepat 1 kandidat.' : 'Pilih tepat 2 kandidat.';
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
    candidates: await getCandidates(),
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
    candidates: await getCandidates(),
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
