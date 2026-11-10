(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const STORE = 'osis_pantau_password';
  const POLL_MS = 5000;
  const number = new Intl.NumberFormat('id-ID');

  let password = '';
  let timer = null;
  let busy = false;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function pctText(value) {
    if (value == null) return '—';
    const rounded = (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
    return `${rounded}%`;
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

  function avatar(candidate, className) {
    const fallback = el('span', `${className} avatar-fallback`, initialsOf(candidate.nama));
    if (!candidate.foto_url) return fallback;

    const img = el('img', className);
    img.src = candidate.foto_url;
    img.alt = `Foto ${candidate.nama}`;
    img.addEventListener('error', () => img.replaceWith(fallback), { once: true });
    return img;
  }

  function renderPodium(candidates) {
    const box = $('podium');
    box.replaceChildren();
    // Urutan podium 5 besar: 4 · 2 · 1 · 3 · 5 (juara 1 di tengah, paling tinggi).
    const order = [
      candidates[3],
      candidates[1],
      candidates[0],
      candidates[2],
      candidates[4],
    ].filter(Boolean);

    if (!order.length) {
      box.appendChild(el('p', 'empty-state', 'Belum ada kandidat aktif.'));
      return;
    }

    for (const candidate of order) {
      const rank = candidates.indexOf(candidate) + 1;
      const card = el('article', `podium-card place-${rank}`);
      card.append(
        el('span', 'podium-rank', String(rank)),
        avatar(candidate, 'podium-photo'),
        el('h3', 'podium-name', candidate.nama),
        el('p', 'podium-percent', pctText(candidate.percent)),
        el('p', 'podium-votes', `${number.format(candidate.votes)} suara`),
      );
      box.appendChild(card);
    }
  }

  function renderBars(candidates) {
    const list = $('barList');
    list.replaceChildren();

    candidates.forEach((candidate, index) => {
      const row = el('div', 'bar-row');
      const main = el('div', 'bar-main');
      const head = el('div', 'bar-head');
      head.append(
        el('span', 'bar-name', candidate.nama),
        el('span', 'bar-votes', `${number.format(candidate.votes)} suara`),
      );

      const track = el('div', 'bar-track');
      const fill = el('span', 'bar-fill');
      fill.style.width = `${Math.max(candidate.percent || 0, 0)}%`;
      track.appendChild(fill);
      main.append(head, track);

      row.append(
        el('span', 'bar-rank', String(index + 1)),
        main,
        el('span', 'bar-percent', pctText(candidate.percent)),
      );
      list.appendChild(row);
    });
  }

  function turnoutCard(label, data, tone) {
    const card = el('div', `turnout-card${tone ? ` ${tone}` : ''}`);
    const meta =
      data.total == null
        ? `${number.format(data.voted)} suara · total belum tersedia`
        : `${number.format(data.voted)} dari ${number.format(data.total)}`;
    card.append(
      el('span', 'turnout-label', label),
      el('strong', 'turnout-percent', pctText(data.percent)),
      el('span', 'turnout-meta', meta),
    );
    return card;
  }

  function renderClasses(rows) {
    const list = $('classList');
    list.replaceChildren();

    if (!rows.length) {
      list.appendChild(el('p', 'empty-state', 'Belum ada data kelas.'));
      return;
    }

    for (const row of rows) {
      const item = el('div', 'class-row');
      const track = el('div', 'bar-track');
      const fill = el('span', 'bar-fill');
      fill.style.width = `${row.percent == null ? 0 : row.percent}%`;
      track.appendChild(fill);

      const meta =
        row.total == null
          ? `${number.format(row.voted)} suara`
          : `${number.format(row.voted)}/${number.format(row.total)}`;

      item.append(
        el('span', 'class-name', row.kelas),
        track,
        el('span', 'class-meta', meta),
        el('span', 'class-percent', pctText(row.percent)),
      );
      list.appendChild(item);
    }
  }

  function render(data) {
    $('gateView').hidden = true;
    $('dashboard').hidden = false;

    renderPodium(data.candidates);
    renderBars(data.candidates);
    $('turnoutCards').replaceChildren(
      turnoutCard('Siswa', data.turnout.siswa, 'mint'),
      turnoutCard('Guru', data.turnout.guru, 'gold'),
    );
    renderClasses(data.turnout.classes);

    $('totalPicks').textContent = number.format(data.picks);
    $('totalVoters').textContent = number.format(data.voters.siswa + data.voters.guru);
    $('updatedAt').textContent = new Date(data.updated_at).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    $('liveChip').hidden = false;
    $('liveChip').classList.remove('is-stale');
  }

  function setGateError(message) {
    const box = $('gateError');
    box.textContent = message || '';
    box.hidden = !message;
  }

  async function request(value) {
    try {
      const res = await fetch('/api/osis', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pantau', password: value }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        // respons kosong / bukan JSON
      }
      return { status: res.status, ok: res.ok, data };
    } catch {
      return { status: 0, ok: false, data: { error: 'Tidak dapat terhubung ke server.' } };
    }
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function lock(message) {
    stopPolling();
    sessionStorage.removeItem(STORE);
    password = '';
    $('dashboard').hidden = true;
    $('gateView').hidden = false;
    $('liveChip').hidden = true;
    setGateError(message || '');
    $('pantauPassword').focus();
  }

  async function refresh({ silent = true } = {}) {
    if (busy || !password) return;
    busy = true;
    const result = await request(password);
    busy = false;

    if (result.status === 401) {
      lock('Sesi pantau berakhir. Masukkan password lagi.');
      return;
    }

    if (!result.ok) {
      $('liveChip').classList.add('is-stale');
      $('updatedAt').textContent = 'terputus';
      if (!silent) setGateError(result.data.error || 'Gagal memuat data. Coba lagi.');
      return;
    }

    setGateError('');
    render(result.data);
  }

  function startPolling() {
    stopPolling();
    timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, POLL_MS);
  }

  async function handleGate(event) {
    event.preventDefault();
    const input = $('pantauPassword');
    const value = input.value;
    if (!value) return;

    const button = $('gateSubmit');
    button.disabled = true;
    button.textContent = 'Memeriksa…';

    const result = await request(value);

    button.disabled = false;
    button.textContent = 'Masuk';

    if (result.status === 401) {
      setGateError('Password salah.');
      input.select();
      return;
    }
    if (!result.ok) {
      setGateError(result.data.error || 'Gagal memuat data. Coba lagi.');
      return;
    }

    password = value;
    sessionStorage.setItem(STORE, value);
    input.value = '';
    setGateError('');
    render(result.data);
    startPolling();
  }

  $('gateForm').addEventListener('submit', handleGate);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && password) refresh();
  });

  const saved = sessionStorage.getItem(STORE);
  if (saved) {
    password = saved;
    refresh({ silent: false }).then(() => {
      if (password) startPolling();
    });
  } else {
    $('pantauPassword').focus();
  }
})();
