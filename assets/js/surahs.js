// surahs.js — Unified list logic for Surahs / Juz / Hizb
// - Tabs to switch lists
// - Search (by id or name)
// - Toggle links to Reader or Mushaf
// Expects window.CHAPTERS_DATA from chapters-data.js

(function () {
  const els = {
    tabSurahs: document.getElementById('tab-surahs'),
    tabJuz: document.getElementById('tab-juz'),
    tabHizb: document.getElementById('tab-hizb'),
    filter: document.getElementById('filter'),
    list: document.getElementById('list'),
    viewToggle: document.getElementById('view-toggle'),
  };

  const state = {
    mode: 'surahs',       // 'surahs' | 'juz' | 'hizb'
    targetView: 'reader', // 'reader' | 'mushaf'
    q: '',
  };

  // Read initial mode from URL (?mode=surahs|juz|hizb)
  try {
    const qp = new URLSearchParams(location.search);
    const m = (qp.get('mode') || '').toLowerCase();
    if (m === 'juz' || m === 'hizb' || m === 'surahs') state.mode = m;
  } catch {}

  function updateViewToggleUI() {
    if (!els.viewToggle) return;
    // Button text shows what you'll switch TO
    els.viewToggle.textContent = state.targetView === 'reader' ? 'Mushaf' : 'Reader';
  }

  function setActiveTab(which) {
    state.mode = which;
    const map = { surahs: els.tabSurahs, juz: els.tabJuz, hizb: els.tabHizb };
    Object.entries(map).forEach(([k, b]) => {
      if (!b) return;
      const on = (k === which);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    render();
  }

function linkTo(params) {
  const usp = new URLSearchParams(params || {});
  // preserve tab for "Back" behavior
  if (!usp.has('mode')) usp.set('mode', state.mode);
  // keep the drawer open on arrival
  if (!usp.has('controls')) usp.set('controls', 'open');

  // open correct page directly
  const target = (state.targetView === 'mushaf') ? 'mushaf.html' : 'reader.html';
  return `${target}?${usp.toString()}`;
}


  function renderSurahs() {
    const data = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
    const q = state.q.trim().toLowerCase();
    const frag = document.createDocumentFragment();

    data.forEach(ch => {
      const id = ch.id;
      const en = ch.name_simple || '';
      const ar = ch.name_arabic || '';
      const verses = ch.verses_count || ch.verses || 0;

      const matches =
        !q ||
        String(id).includes(q) ||
        en.toLowerCase().includes(q) ||
        (ar && ar.includes(state.q.trim()));

      if (!matches) return;

      const a = document.createElement('a');
      a.href = linkTo({ surah: id });
      a.className = 'block';
      a.setAttribute('role', 'listitem');

      a.innerHTML = `
        <div class="id">${id}</div>
        <div class="names">
          <div class="en">${en}</div>
          <div class="ar" style="font-family:'Amiri Quran',serif;">${ar}</div>
        </div>
        <div class="status muted">${verses} ayah</div>
      `;
      frag.appendChild(a);
    });

    els.list.replaceChildren(frag);
  }

  function renderJuz() {
    const q = state.q.trim();
    const frag = document.createDocumentFragment();

    for (let i = 1; i <= 30; i++) {
      if (q && !String(i).includes(q)) continue;
      const a = document.createElement('a');
      a.href = linkTo({ juz: i });
      a.className = 'block';
      a.setAttribute('role', 'listitem');
      a.innerHTML = `
        <div class="id">${i}</div>
        <div class="names">
          <div class="en">Juz ${i}</div>
          <div class="ar muted">الجزء ${i}</div>
        </div>
        <div class="status muted">Open</div>
      `;
      frag.appendChild(a);
    }

    els.list.replaceChildren(frag);
  }

  function renderHizb() {
    const q = state.q.trim();
    const frag = document.createDocumentFragment();

    for (let i = 1; i <= 60; i++) {
      if (q && !String(i).includes(q)) continue;
      const a = document.createElement('a');
      a.href = linkTo({ hizb: i });
      a.className = 'block';
      a.setAttribute('role', 'listitem');
      a.innerHTML = `
        <div class="id">${i}</div>
        <div class="names">
          <div class="en">Hizb ${i}</div>
          <div class="ar muted">الحزب ${i}</div>
        </div>
        <div class="status muted">Open</div>
      `;
      frag.appendChild(a);
    }

    els.list.replaceChildren(frag);
  }

  function render() {
    if (state.mode === 'juz') return renderJuz();
    if (state.mode === 'hizb') return renderHizb();
    return renderSurahs();
  }

  // Wire up UI
  if (els.tabSurahs) els.tabSurahs.addEventListener('click', () => setActiveTab('surahs'));
  if (els.tabJuz) els.tabJuz.addEventListener('click', () => setActiveTab('juz'));
  if (els.tabHizb) els.tabHizb.addEventListener('click', () => setActiveTab('hizb'));

  if (els.filter) {
    els.filter.addEventListener('input', () => {
      state.q = els.filter.value || '';
      render();
    });
  }

  if (els.viewToggle) {
    els.viewToggle.addEventListener('click', () => {
      state.targetView = state.targetView === 'reader' ? 'mushaf' : 'reader';
      updateViewToggleUI();
      render(); // rebuild links
    });
  }

  // Init
  updateViewToggleUI();
  setActiveTab(state.mode);
})();
