(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const DONE_SECONDS = 6;

  const views = {
    loading: $('loadingView'),
    login: $('loginView'),
    ballot: $('ballotView'),
    done: $('doneView'),
  };

  const state = {
    voter: null,
    candidates: [],
    picks: [],
    submitting: false,
    finishing: false,
  };

  let doneTicker = null;

  function showView(name) {
    for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
    $('ballotBar').hidden = name !== 'ballot';
    document.body.classList.toggle('is-ballot', name === 'ballot');
    window.scrollTo(0, 0);
  }

  function pickLimit() {
    return state.voter && state.voter.role === 'siswa' ? 1 : 2;
  }

  async function api(method, body) {
    try {
      const res = await fetch('/api/osis', {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        // respons kosong / bukan JSON
      }
      return { ok: res.ok, status: res.status, data };
    } catch {
      return { ok: false, status: 0, data: { error: 'Tidak dapat terhubung ke server.' } };
    }
  }

  function setLoginError(message) {
    const box = $('loginError');
    box.textContent = message || '';
    box.hidden = !message;
    if (message) {
      const notice = $('loginNotice');
      notice.textContent = '';
      notice.hidden = true;
    }
  }

  function setLoginNotice(message) {
    const box = $('loginNotice');
    box.textContent = message || '';
    box.hidden = !message;
    if (message) {
      const error = $('loginError');
      error.textContent = '';
      error.hidden = true;
    }
  }

  function setVoteError(message) {
    const box = $('voteError');
    box.textContent = message || '';
    box.hidden = !message;
  }

  function initialsOf(name) {
    const words = String(name || '?')
      .replace(/[^A-Za-zÀ-ɏ\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);
    return words.map((word) => word[0]).join('').toUpperCase() || '?';
  }

  function firstName(name) {
    return String(name || '').trim().split(/[\s,]+/)[0] || 'kawan';
  }

  function roleLabel(voter) {
    if (voter.role === 'guru') return 'Guru';
    return voter.kelas ? `Siswa · ${voter.kelas}` : 'Siswa';
  }

  function sessionChip(voter) {
    $('sessionName').textContent = voter.nama;
    $('sessionWrap').hidden = false;
  }

  function clearDoneTicker() {
    if (doneTicker) {
      clearInterval(doneTicker);
      doneTicker = null;
    }
  }

  function startDoneTicker() {
    clearDoneTicker();
    const deadline = Date.now() + DONE_SECONDS * 1000;

    const update = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      $('logoutCount').textContent = String(left);
      if (left <= 0) {
        clearDoneTicker();
        finishSession('Sesi berakhir. Silakan masuk untuk pemilih berikutnya.');
      }
    };

    update();
    doneTicker = setInterval(update, 250);
  }

  function finishSession(message = 'Sesi berakhir. Silakan masuk lagi.') {
    if (state.finishing) return;
    state.finishing = true;
    clearDoneTicker();

    api('POST', { action: 'logout' });

    state.voter = null;
    state.candidates = [];
    state.picks = [];
    state.submitting = false;
    $('sessionWrap').hidden = true;
    $('identifier').value = '';
    $('password').value = '';
    setVoteError('');
    showView('login');
    setLoginNotice(message);
    $('identifier').focus();
    state.finishing = false;
  }

  function addMission(list, item) {
    const separator = ' — ';
    const splitAt = item.indexOf(separator);
    const li = document.createElement('li');

    if (splitAt > -1) {
      const title = document.createElement('strong');
      title.textContent = item.slice(0, splitAt).trim();
      const description = document.createElement('span');
      description.className = 'mission-desc';
      description.textContent = item.slice(splitAt + separator.length).trim();
      li.append(title, description);
    } else {
      const text = document.createElement('span');
      text.className = 'mission-text';
      text.textContent = item;
      li.appendChild(text);
    }

    list.appendChild(li);
  }

  function openCandidateDialog(no) {
    const candidate = state.candidates.find((item) => item.no_urut === no);
    if (!candidate) return;

    const photo = $('dialogPhoto');
    photo.src = candidate.foto_url || '';
    photo.alt = `Foto ${candidate.nama}`;

    $('dialogName').textContent = candidate.nama;
    $('dialogVisi').textContent = candidate.visi || 'Visi belum tersedia.';

    const misiBox = $('dialogMisi');
    misiBox.replaceChildren();
    const items = String(candidate.misi || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (items.length) {
      const list = document.createElement('ul');
      list.className = 'misi-list';
      for (const item of items) addMission(list, item);
      misiBox.appendChild(list);
    } else {
      const missing = document.createElement('p');
      missing.className = 'dialog-missing';
      missing.textContent = 'Misi kandidat ini belum tersedia.';
      misiBox.appendChild(missing);
    }

    $('candidateDialog').showModal();
  }

  function renderCandidates() {
    const gallery = $('candidateGrid');
    gallery.replaceChildren();

    if (!state.candidates.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Belum ada kandidat aktif. Hubungi panitia pemilihan.';
      gallery.appendChild(empty);
      return;
    }

    state.candidates.forEach((candidate, index) => {
      const card = document.createElement('article');
      card.className = 'candidate-card';
      card.tabIndex = 0;
      card.dataset.no = String(candidate.no_urut);
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', 'false');
      card.setAttribute('aria-label', `Pilih ${candidate.nama}`);
      card.style.setProperty('--i', String(index));

      const initials = document.createElement('span');
      initials.className = 'candidate-initials';
      initials.textContent = initialsOf(candidate.nama);
      initials.setAttribute('aria-hidden', 'true');
      card.appendChild(initials);

      if (candidate.foto_url) {
        const img = document.createElement('img');
        img.className = 'candidate-photo';
        img.src = candidate.foto_url;
        img.alt = `Foto ${candidate.nama}`;
        img.loading = 'lazy';
        img.addEventListener('error', () => img.remove());
        card.appendChild(img);
      }

      const number = document.createElement('span');
      number.className = 'candidate-no';
      number.textContent = String(candidate.no_urut).padStart(2, '0');
      card.appendChild(number);

      const check = document.createElement('span');
      check.className = 'candidate-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      card.appendChild(check);

      const info = document.createElement('div');
      info.className = 'candidate-info';

      const name = document.createElement('h3');
      name.className = 'candidate-name';
      name.textContent = candidate.nama;

      const sub = document.createElement('span');
      sub.className = 'candidate-sub';
      sub.textContent = candidate.kelas || 'Calon Ketua OSIS';

      const details = document.createElement('button');
      details.type = 'button';
      details.className = 'candidate-details';
      details.textContent = 'Visi & Misi';
      details.addEventListener('click', (event) => {
        event.stopPropagation();
        openCandidateDialog(candidate.no_urut);
      });

      info.append(name, sub, details);
      card.appendChild(info);

      card.addEventListener('click', () => toggle(candidate.no_urut));
      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle(candidate.no_urut);
        }
      });

      gallery.appendChild(card);
    });
  }

  function toggle(no) {
    if (state.submitting || !state.voter) return;

    const limit = pickLimit();
    const index = state.picks.indexOf(no);

    if (index > -1) {
      state.picks.splice(index, 1);
    } else if (state.picks.length < limit) {
      state.picks.push(no);
    } else if (limit === 1) {
      state.picks = [no];
    } else {
      setVoteError('Batalkan salah satu pilihan dulu.');
      return;
    }

    setVoteError('');
    syncSelection();
  }

  function syncSelection() {
    for (const card of document.querySelectorAll('.candidate-card')) {
      const selected = state.picks.includes(Number(card.dataset.no));
      card.setAttribute('aria-checked', selected ? 'true' : 'false');
    }

    const limit = pickLimit();
    $('pickCount').textContent = String(state.picks.length);
    $('pickTotal').textContent = `/${limit}`;
    $('pickFill').style.width = `${limit ? (state.picks.length / limit) * 100 : 0}%`;
    $('voteBtn').disabled = state.picks.length !== limit || state.submitting;
  }

  function showBallot() {
    const voter = state.voter;
    sessionChip(voter);
    $('voterName').textContent = firstName(voter.nama);
    $('roleChip').textContent = roleLabel(voter);
    $('ballotInstruction').textContent =
      'Pilih kandidat yang menurutmu paling tepat. Pilihan tidak bisa diubah setelah dikirim.';

    state.picks = [];
    renderCandidates();
    syncSelection();
    setVoteError('');
    showView('ballot');
  }

  function showDone() {
    clearDoneTicker();
    if (state.voter) sessionChip(state.voter);
    $('doneName').textContent = firstName(state.voter.nama);
    $('doneMessage').textContent =
      'Pilihanmu sudah tercatat. Terima kasih sudah ikut menentukan arah OSIS.';
    showView('done');
    startDoneTicker();
  }

  function setBusy(button, label, busy, busyText, idleText) {
    state.submitting = busy;
    button.disabled = busy;
    label.textContent = busy ? busyText : idleText;
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (state.submitting) return;

    const identifier = $('identifier').value.trim();
    const password = $('password').value;

    if (!identifier || !password) {
      setLoginError('Isi NIS/username dan password terlebih dahulu.');
      return;
    }

    setLoginNotice('');
    setLoginError('');
    setBusy($('loginBtn'), $('loginBtnLabel'), true, 'Memeriksa…', 'Masuk dan pilih');

    const result = await api('POST', { action: 'login', identifier, password });

    setBusy($('loginBtn'), $('loginBtnLabel'), false, 'Memeriksa…', 'Masuk dan pilih');

    if (!result.ok) {
      setLoginError(result.data.error || 'Login gagal. Coba lagi.');
      return;
    }

    clearDoneTicker();
    state.voter = result.data.voter;
    state.candidates = Array.isArray(result.data.candidates) ? result.data.candidates : [];
    $('password').value = '';

    if (result.data.voted) showDone();
    else showBallot();
  }

  async function handleVote() {
    if (state.submitting || state.picks.length !== pickLimit()) return;

    setVoteError('');
    setBusy($('voteBtn'), $('voteBtnLabel'), true, 'Mengirim…', 'Kirim suara');

    const picks = [...state.picks].sort((a, b) => a - b);
    const result = await api('POST', { action: 'vote', candidate_nos: picks });

    setBusy($('voteBtn'), $('voteBtnLabel'), false, 'Mengirim…', 'Kirim suara');

    if (result.ok || result.status === 409) {
      showDone();
      return;
    }

    if (result.status === 401 || result.status === 403) {
      clearDoneTicker();
      state.voter = null;
      state.candidates = [];
      state.picks = [];
      $('sessionWrap').hidden = true;
      showView('login');
      setLoginError(result.data.error || 'Sesi berakhir. Silakan masuk lagi.');
      return;
    }

    setVoteError(result.data.error || 'Gagal mengirim suara. Coba lagi.');
    syncSelection();
  }

  async function boot() {
    const result = await api('GET');

    if (result.ok) {
      state.voter = result.data.voter;
      state.candidates = Array.isArray(result.data.candidates) ? result.data.candidates : [];
      if (result.data.voted) showDone();
      else showBallot();
      return;
    }

    showView('login');
    if (result.status !== 401) {
      setLoginError(result.data.error || 'Bilik suara sedang tidak dapat diakses. Coba muat ulang.');
    }
  }

  $('loginForm').addEventListener('submit', handleLogin);
  $('voteBtn').addEventListener('click', handleVote);
  $('doneBtn').addEventListener('click', () => finishSession('Sesi berakhir. Silakan masuk untuk pemilih berikutnya.'));

  $('dialogClose').addEventListener('click', () => $('candidateDialog').close());
  $('candidateDialog').addEventListener('click', (event) => {
    if (event.target === $('candidateDialog')) $('candidateDialog').close();
  });

  $('logoutBtn').addEventListener('click', () => {
    if (state.submitting) return;
    finishSession('Kamu sudah keluar.');
  });

  for (const id of ['identifier', 'password']) {
    $(id).addEventListener('input', () => {
      setLoginError('');
      setLoginNotice('');
    });
  }

  boot();
})();
