// Rekap statis tanpa password: render window.PANTAU_SNAPSHOT (pantau/data.js),
// tampilan sama dengan pantau.js tapi tanpa gate, polling, dan fetch API.
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const number = new Intl.NumberFormat('id-ID');

  let currentGuru = null;
  let activeGuruTab = 'sudah';

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

  function renderPodium(candidates, started) {
    const box = $('podium');
    box.replaceChildren();

    if (!candidates.length) {
      box.appendChild(el('p', 'empty-state', 'Belum ada kandidat aktif.'));
      return;
    }

    if (!started) {
      for (const candidate of candidates) {
        const card = el('article', 'podium-card flat');
        card.append(
          avatar(candidate, 'podium-photo'),
          el('h3', 'podium-name', candidate.nama),
          el('p', 'podium-percent', pctText(candidate.percent)),
        );
        box.appendChild(card);
      }
      return;
    }

    // Urutan podium 5 besar: 4 · 2 · 1 · 3 · 5 (juara 1 di tengah, paling tinggi).
    const order = [
      candidates[3],
      candidates[1],
      candidates[0],
      candidates[2],
      candidates[4],
    ].filter(Boolean);

    for (const candidate of order) {
      const rank = candidates.indexOf(candidate) + 1;
      const card = el('article', `podium-card place-${rank}`);
      card.append(
        el('span', 'podium-rank', String(rank)),
        avatar(candidate, 'podium-photo'),
        el('h3', 'podium-name', candidate.nama),
        el('p', 'podium-percent', pctText(candidate.percent)),
      );
      box.appendChild(card);
    }
  }

  function renderBars(candidates, started) {
    const list = $('barList');
    list.replaceChildren();
    list.classList.toggle('is-flat', !started);

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

      if (started) row.appendChild(el('span', 'bar-rank', String(index + 1)));
      row.append(main, el('span', 'bar-percent', pctText(candidate.percent)));
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

  function renderGuru(guru) {
    if (!guru) return;
    currentGuru = guru;

    const sudah = guru.sudah || [];
    const belum = guru.belum || [];

    const countSudah = $('countGuruSudah');
    const countBelum = $('countGuruBelum');
    if (countSudah) countSudah.textContent = number.format(sudah.length);
    if (countBelum) countBelum.textContent = number.format(belum.length);

    const list = $('guruList');
    if (!list) return;
    list.replaceChildren();

    const isSudah = activeGuruTab === 'sudah';
    const items = isSudah ? sudah : belum;

    if (!items.length) {
      list.appendChild(
        el(
          'p',
          'empty-state',
          isSudah ? 'Belum ada guru yang memilih.' : 'Semua guru sudah memilih.',
        ),
      );
      return;
    }

    items.forEach((item, index) => {
      const row = el('div', `guru-row is-${activeGuruTab}`);
      const num = el('span', 'guru-num', String(index + 1));
      const info = el('div', 'guru-info');
      info.appendChild(el('span', 'guru-name', item.nama));

      const badgeWrap = el('div', 'guru-badge-wrap');
      if (isSudah) {
        badgeWrap.appendChild(el('span', 'guru-badge badge-sudah', '✓ Sudah'));
        if (item.waktu) {
          const time = new Date(item.waktu).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          });
          badgeWrap.appendChild(el('span', 'guru-time', `${time} WIB`));
        }
      } else {
        badgeWrap.appendChild(el('span', 'guru-badge badge-belum', 'Belum'));
      }

      row.append(num, info, badgeWrap);
      list.appendChild(row);
    });
  }

  function render(data) {
    const started = data.picks > 0;
    renderPodium(data.candidates, started);
    renderBars(data.candidates, started);
    $('turnoutCards').replaceChildren(
      turnoutCard('Siswa', data.turnout.siswa, 'mint'),
      turnoutCard('Guru', data.turnout.guru, 'gold'),
    );
    renderClasses(data.turnout.classes);
    renderGuru(data.guru);

    $('totalPicks').textContent = number.format(data.picks);
    $('totalVoters').textContent = number.format(data.voters.siswa + data.voters.guru);
    $('updatedAt').textContent = new Date(data.updated_at).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const tabSudah = $('tabGuruSudah');
  const tabBelum = $('tabGuruBelum');

  function setGuruTab(tab) {
    activeGuruTab = tab;
    if (tabSudah) {
      tabSudah.classList.toggle('is-active', tab === 'sudah');
      tabSudah.setAttribute('aria-selected', String(tab === 'sudah'));
    }
    if (tabBelum) {
      tabBelum.classList.toggle('is-active', tab === 'belum');
      tabBelum.setAttribute('aria-selected', String(tab === 'belum'));
    }
    if (currentGuru) renderGuru(currentGuru);
  }

  if (tabSudah) tabSudah.addEventListener('click', () => setGuruTab('sudah'));
  if (tabBelum) tabBelum.addEventListener('click', () => setGuruTab('belum'));

  render(window.PANTAU_SNAPSHOT || {});
})();
