const API_BASE = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://audio.qurancdn.com/';

const els = {
  themeToggle: document.getElementById('theme-toggle'),
  status: document.getElementById('status'),
  display: document.getElementById('quran-display'),
  audio: document.getElementById('audio'),
  prevAyah: document.getElementById('prev-ayah'),
  playPause: document.getElementById('play-pause'),
  nextAyah: document.getElementById('next-ayah'),
  playerInfo: document.getElementById('player-info'),
  toMushaf: document.getElementById('to-mushaf'),
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  drawer: document.getElementById('control-drawer'),
  drawerOpen: document.getElementById('controls-open'),
  drawerClose: document.getElementById('drawer-close'),
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  followToggle: document.getElementById('follow-mode'),
  surahSelect: document.getElementById('reader-surah-select'),
  // Landing page elements
  landing: document.getElementById('reader-landing'),
  toolbar: document.getElementById('reader-toolbar'),
  viewer: document.getElementById('reader-viewer'),
  readerContent: document.getElementById('reader-content'),
  surahGridLanding: document.getElementById('surah-grid-landing'),
  landingSearch: document.getElementById('landing-search'),
  backToLanding: document.getElementById('back-to-landing'),
  contextName: document.getElementById('context-name'),
  contextMeta: document.getElementById('context-meta'),
  prevPageNav: document.getElementById('prev-page-nav'),
  nextPageNav: document.getElementById('next-page-nav'),
  pageIndicator: document.getElementById('page-indicator'),
};

const state = {
  verses: [],
  translations: new Map(), // verse_key -> text (not used now)
  audioMap: new Map(), // verse_key -> url
  currentContext: null, // { type: 'surah'|'juz'|'hizb', id: number }
  currentReciterId: 7,
  fontSizePx: 36,
  playIndex: 0,
  translationEnabled: false,
  translationId: 0,
  pageIndex: 0,
  pageSize: 20, // fallback when page_number is unavailable
  pageNumbers: [], // sorted unique mushaf page numbers within current context
  targetPageNumber: null,
  isLoading: false,
  followMode: false,
  wbwOn: false,
  wbwHover: true,
  rootFilter: '',
};

try { window.state = state; } catch {}

const SURAH_VERSE_MAP = new Map();
const SURAH_META = (() => {
  if (Array.isArray(window.CHAPTERS_DATA)) {
    return window.CHAPTERS_DATA
      .map((entry, idx) => {
        if (!entry) return null;
        const id = Number(entry.id || idx + 1);
        if (!id || Number.isNaN(id)) return null;
        const label = `${id}. ${entry.name_simple || entry.name_arabic || `Surah ${id}`}`;
        return { id, label };
      })
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);
  }
  return Array.from({ length: 114 }, (_, i) => {
    const id = i + 1;
    return { id, label: `Surah ${id}` };
  });
})();

// Juz data (30 Juz)
const JUZ_DATA = [
  { id: 1, name: 'Juz 1', startSurah: 1, startVerse: 1 },
  { id: 2, name: 'Juz 2', startSurah: 2, startVerse: 142 },
  { id: 3, name: 'Juz 3', startSurah: 2, startVerse: 253 },
  { id: 4, name: 'Juz 4', startSurah: 3, startVerse: 93 },
  { id: 5, name: 'Juz 5', startSurah: 4, startVerse: 24 },
  { id: 6, name: 'Juz 6', startSurah: 4, startVerse: 148 },
  { id: 7, name: 'Juz 7', startSurah: 5, startVerse: 82 },
  { id: 8, name: 'Juz 8', startSurah: 6, startVerse: 111 },
  { id: 9, name: 'Juz 9', startSurah: 7, startVerse: 88 },
  { id: 10, name: 'Juz 10', startSurah: 8, startVerse: 41 },
  { id: 11, name: 'Juz 11', startSurah: 9, startVerse: 93 },
  { id: 12, name: 'Juz 12', startSurah: 11, startVerse: 6 },
  { id: 13, name: 'Juz 13', startSurah: 12, startVerse: 53 },
  { id: 14, name: 'Juz 14', startSurah: 15, startVerse: 1 },
  { id: 15, name: 'Juz 15', startSurah: 17, startVerse: 1 },
  { id: 16, name: 'Juz 16', startSurah: 18, startVerse: 75 },
  { id: 17, name: 'Juz 17', startSurah: 21, startVerse: 1 },
  { id: 18, name: 'Juz 18', startSurah: 23, startVerse: 1 },
  { id: 19, name: 'Juz 19', startSurah: 25, startVerse: 21 },
  { id: 20, name: 'Juz 20', startSurah: 27, startVerse: 56 },
  { id: 21, name: 'Juz 21', startSurah: 29, startVerse: 46 },
  { id: 22, name: 'Juz 22', startSurah: 33, startVerse: 31 },
  { id: 23, name: 'Juz 23', startSurah: 36, startVerse: 28 },
  { id: 24, name: 'Juz 24', startSurah: 39, startVerse: 32 },
  { id: 25, name: 'Juz 25', startSurah: 41, startVerse: 47 },
  { id: 26, name: 'Juz 26', startSurah: 46, startVerse: 1 },
  { id: 27, name: 'Juz 27', startSurah: 51, startVerse: 31 },
  { id: 28, name: 'Juz 28', startSurah: 58, startVerse: 1 },
  { id: 29, name: 'Juz 29', startSurah: 67, startVerse: 1 },
  { id: 30, name: 'Juz 30', startSurah: 78, startVerse: 1 }
];

// Hizb data (60 Hizb)
const HIZB_DATA = [
  { id: 1, name: 'Hizb 1', startSurah: 1, startVerse: 1, juz: 1 },
  { id: 2, name: 'Hizb 2', startSurah: 2, startVerse: 74, juz: 1 },
  { id: 3, name: 'Hizb 3', startSurah: 2, startVerse: 142, juz: 2 },
  { id: 4, name: 'Hizb 4', startSurah: 2, startVerse: 203, juz: 2 },
  { id: 5, name: 'Hizb 5', startSurah: 2, startVerse: 253, juz: 3 },
  { id: 6, name: 'Hizb 6', startSurah: 3, startVerse: 33, juz: 3 },
  { id: 7, name: 'Hizb 7', startSurah: 3, startVerse: 93, juz: 4 },
  { id: 8, name: 'Hizb 8', startSurah: 3, startVerse: 153, juz: 4 },
  { id: 9, name: 'Hizb 9', startSurah: 4, startVerse: 24, juz: 5 },
  { id: 10, name: 'Hizb 10', startSurah: 4, startVerse: 88, juz: 5 },
  { id: 11, name: 'Hizb 11', startSurah: 4, startVerse: 148, juz: 6 },
  { id: 12, name: 'Hizb 12', startSurah: 5, startVerse: 27, juz: 6 },
  { id: 13, name: 'Hizb 13', startSurah: 5, startVerse: 82, juz: 7 },
  { id: 14, name: 'Hizb 14', startSurah: 6, startVerse: 36, juz: 7 },
  { id: 15, name: 'Hizb 15', startSurah: 6, startVerse: 111, juz: 8 },
  { id: 16, name: 'Hizb 16', startSurah: 7, startVerse: 1, juz: 8 },
  { id: 17, name: 'Hizb 17', startSurah: 7, startVerse: 88, juz: 9 },
  { id: 18, name: 'Hizb 18', startSurah: 7, startVerse: 171, juz: 9 },
  { id: 19, name: 'Hizb 19', startSurah: 8, startVerse: 41, juz: 10 },
  { id: 20, name: 'Hizb 20', startSurah: 9, startVerse: 34, juz: 10 },
  { id: 21, name: 'Hizb 21', startSurah: 9, startVerse: 93, juz: 11 },
  { id: 22, name: 'Hizb 22', startSurah: 10, startVerse: 26, juz: 11 },
  { id: 23, name: 'Hizb 23', startSurah: 11, startVerse: 6, juz: 12 },
  { id: 24, name: 'Hizb 24', startSurah: 11, startVerse: 84, juz: 12 },
  { id: 25, name: 'Hizb 25', startSurah: 12, startVerse: 53, juz: 13 },
  { id: 26, name: 'Hizb 26', startSurah: 13, startVerse: 19, juz: 13 },
  { id: 27, name: 'Hizb 27', startSurah: 15, startVerse: 1, juz: 14 },
  { id: 28, name: 'Hizb 28', startSurah: 16, startVerse: 51, juz: 14 },
  { id: 29, name: 'Hizb 29', startSurah: 17, startVerse: 1, juz: 15 },
  { id: 30, name: 'Hizb 30', startSurah: 17, startVerse: 99, juz: 15 },
  { id: 31, name: 'Hizb 31', startSurah: 18, startVerse: 75, juz: 16 },
  { id: 32, name: 'Hizb 32', startSurah: 20, startVerse: 1, juz: 16 },
  { id: 33, name: 'Hizb 33', startSurah: 21, startVerse: 1, juz: 17 },
  { id: 34, name: 'Hizb 34', startSurah: 22, startVerse: 1, juz: 17 },
  { id: 35, name: 'Hizb 35', startSurah: 23, startVerse: 1, juz: 18 },
  { id: 36, name: 'Hizb 36', startSurah: 24, startVerse: 21, juz: 18 },
  { id: 37, name: 'Hizb 37', startSurah: 25, startVerse: 21, juz: 19 },
  { id: 38, name: 'Hizb 38', startSurah: 26, startVerse: 111, juz: 19 },
  { id: 39, name: 'Hizb 39', startSurah: 27, startVerse: 56, juz: 20 },
  { id: 40, name: 'Hizb 40', startSurah: 28, startVerse: 51, juz: 20 },
  { id: 41, name: 'Hizb 41', startSurah: 29, startVerse: 46, juz: 21 },
  { id: 42, name: 'Hizb 42', startSurah: 31, startVerse: 22, juz: 21 },
  { id: 43, name: 'Hizb 43', startSurah: 33, startVerse: 31, juz: 22 },
  { id: 44, name: 'Hizb 44', startSurah: 34, startVerse: 24, juz: 22 },
  { id: 45, name: 'Hizb 45', startSurah: 36, startVerse: 28, juz: 23 },
  { id: 46, name: 'Hizb 46', startSurah: 37, startVerse: 145, juz: 23 },
  { id: 47, name: 'Hizb 47', startSurah: 39, startVerse: 32, juz: 24 },
  { id: 48, name: 'Hizb 48', startSurah: 40, startVerse: 41, juz: 24 },
  { id: 49, name: 'Hizb 49', startSurah: 41, startVerse: 47, juz: 25 },
  { id: 50, name: 'Hizb 50', startSurah: 43, startVerse: 24, juz: 25 },
  { id: 51, name: 'Hizb 51', startSurah: 46, startVerse: 1, juz: 26 },
  { id: 52, name: 'Hizb 52', startSurah: 48, startVerse: 18, juz: 26 },
  { id: 53, name: 'Hizb 53', startSurah: 51, startVerse: 31, juz: 27 },
  { id: 54, name: 'Hizb 54', startSurah: 55, startVerse: 1, juz: 27 },
  { id: 55, name: 'Hizb 55', startSurah: 58, startVerse: 1, juz: 28 },
  { id: 56, name: 'Hizb 56', startSurah: 62, startVerse: 1, juz: 28 },
  { id: 57, name: 'Hizb 57', startSurah: 67, startVerse: 1, juz: 29 },
  { id: 58, name: 'Hizb 58', startSurah: 72, startVerse: 1, juz: 29 },
  { id: 59, name: 'Hizb 59', startSurah: 78, startVerse: 1, juz: 30 },
  { id: 60, name: 'Hizb 60', startSurah: 87, startVerse: 1, juz: 30 }
];

// Landing page functions
function showLanding() {
  if (els.landing) els.landing.style.display = 'flex';
  if (els.toolbar) els.toolbar.classList.remove('active');
  if (els.viewer) els.viewer.classList.remove('active');
  if (els.display) els.display.style.display = 'none';
  document.body.classList.remove('viewer-mode');
}

function hideLanding() {
  if (els.landing) els.landing.style.display = 'none';
  if (els.toolbar) els.toolbar.classList.add('active');
  if (els.viewer) els.viewer.classList.add('active');
  if (els.display) els.display.style.display = 'none'; // Keep old display hidden
  document.body.classList.add('viewer-mode');
}

function createSurahCard(meta) {
  const card = document.createElement('div');
  card.className = 'surah-card';
  card.dataset.surahId = meta.id;
  card.dataset.searchText = `${meta.id} ${meta.label.toLowerCase()}`;
  
  const verseCount = getSurahVerseCount(meta.id);
  
  card.innerHTML = `
    <div class="surah-card-header">
      <div class="surah-number">${meta.id}</div>
      <div class="surah-card-title">
        <h3 class="surah-name">${meta.label.split('. ')[1] || meta.label}</h3>
        <p class="surah-arabic">${getArabicName(meta.id)}</p>
      </div>
    </div>
    <div class="surah-card-meta">
      <span class="surah-meta-item">
        <ion-icon name="document-text-outline"></ion-icon>
        ${verseCount} verses
      </span>
    </div>
  `;
  
  card.addEventListener('click', async () => {
    await selectSurah(meta.id);
  });
  
  return card;
}

function getArabicName(surahId) {
  const list = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
  const entry = list.find(ch => ch && Number(ch.id) === surahId);
  return entry && entry.name_arabic ? entry.name_arabic : '';
}

function populateSurahGrid(container) {
  if (!container) return;
  container.innerHTML = '';
  SURAH_META.forEach(meta => {
    const card = createSurahCard(meta);
    container.appendChild(card);
  });
}

function filterSurahCards(searchText, container) {
  if (!container) return;
  const query = searchText.toLowerCase().trim();
  const cards = container.querySelectorAll('.surah-card');
  
  cards.forEach(card => {
    const searchable = card.dataset.searchText || '';
    if (!query || searchable.includes(query)) {
      card.dataset.hidden = 'false';
    } else {
      card.dataset.hidden = 'true';
    }
  });
}

async function selectSurah(surahId) {
  const sid = Number(surahId);
  if (!sid || Number.isNaN(sid)) return;
  
  hideLanding();
  await loadSurah(sid);
  
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {}
}

// Juz and Hizb grid functions
function createJuzCard(juz) {
  const card = document.createElement('div');
  card.className = 'juz-card';
  card.dataset.juzId = juz.id;
  card.dataset.searchText = `${juz.id} juz ${juz.id}`;
  
  const surahInfo = SURAH_META.find(s => s.id === juz.startSurah);
  const surahName = surahInfo ? surahInfo.label.split('. ')[1] : '';
  
  card.innerHTML = `
    <div class="juz-card-header">
      <div class="juz-number">${juz.id}</div>
      <div class="juz-title">Juz ${juz.id}</div>
    </div>
    <div class="juz-info">
      ${surahName ? `Starts at ${surahName} (${juz.startSurah}:${juz.startVerse})` : ''}
    </div>
  `;
  
  card.addEventListener('click', async () => {
    await selectJuz(juz.id);
  });
  
  return card;
}

function createHizbCard(hizb) {
  const card = document.createElement('div');
  card.className = 'hizb-card';
  card.dataset.hizbId = hizb.id;
  card.dataset.searchText = `${hizb.id} hizb ${hizb.id} juz ${hizb.juz}`;
  
  const surahInfo = SURAH_META.find(s => s.id === hizb.startSurah);
  const surahName = surahInfo ? surahInfo.label.split('. ')[1] : '';
  
  card.innerHTML = `
    <div class="hizb-card-header">
      <div class="hizb-number">${hizb.id}</div>
      <div class="hizb-title">Hizb ${hizb.id}</div>
    </div>
    <div class="hizb-info">
      Part of Juz ${hizb.juz}<br>
      ${surahName ? `Starts at ${surahName} (${hizb.startSurah}:${hizb.startVerse})` : ''}
    </div>
  `;
  
  card.addEventListener('click', async () => {
    await selectHizb(hizb.id);
  });
  
  return card;
}

function populateJuzGrid(container) {
  if (!container) return;
  container.innerHTML = '';
  JUZ_DATA.forEach(juz => {
    const card = createJuzCard(juz);
    container.appendChild(card);
  });
}

function populateHizbGrid(container) {
  if (!container) return;
  container.innerHTML = '';
  HIZB_DATA.forEach(hizb => {
    const card = createHizbCard(hizb);
    container.appendChild(card);
  });
}

function filterJuzCards(searchText, container) {
  if (!container) return;
  const query = searchText.toLowerCase().trim();
  const cards = container.querySelectorAll('.juz-card');
  
  cards.forEach(card => {
    const searchable = card.dataset.searchText || '';
    if (!query || searchable.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function filterHizbCards(searchText, container) {
  if (!container) return;
  const query = searchText.toLowerCase().trim();
  const cards = container.querySelectorAll('.hizb-card');
  
  cards.forEach(card => {
    const searchable = card.dataset.searchText || '';
    if (!query || searchable.includes(query)) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

async function selectJuz(juzId) {
  const juz = JUZ_DATA.find(j => j.id === Number(juzId));
  if (!juz) return;
  
  hideLanding();
  await loadJuz(juz.id);
  
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {}
}

async function selectHizb(hizbId) {
  const hizb = HIZB_DATA.find(h => h.id === Number(hizbId));
  if (!hizb) return;
  
  hideLanding();
  await loadHizb(hizb.id);
  
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {}
}

function updateContextInfo() {
  if (!state.currentContext) return;
  
  const { type, id } = state.currentContext;
  
  if (type === 'surah') {
    const meta = SURAH_META.find(m => m.id === id);
    if (meta && els.contextName && els.contextMeta) {
      els.contextName.textContent = meta.label.split('. ')[1] || meta.label;
      const verseCount = getSurahVerseCount(id);
      els.contextMeta.textContent = `${verseCount} verses`;
    }
  } else if (type === 'juz') {
    if (els.contextName && els.contextMeta) {
      els.contextName.textContent = `Juz ${id}`;
      const juz = JUZ_DATA.find(j => j.id === id);
      if (juz) {
        const surahInfo = SURAH_META.find(s => s.id === juz.startSurah);
        const surahName = surahInfo ? surahInfo.label.split('. ')[1] : '';
        els.contextMeta.textContent = surahName ? `Starts at ${surahName}` : '';
      }
    }
  } else if (type === 'hizb') {
    if (els.contextName && els.contextMeta) {
      els.contextName.textContent = `Hizb ${id}`;
      const hizb = HIZB_DATA.find(h => h.id === id);
      if (hizb) {
        els.contextMeta.textContent = `Part of Juz ${hizb.juz}`;
      }
    }
  }
}

function populateSurahSelect(select) {
  if (!select || select.dataset.populated === 'true') return;
  select.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select surah...';
  select.appendChild(placeholder);
  SURAH_META.forEach((meta) => {
    const opt = document.createElement('option');
    opt.value = String(meta.id);
    opt.textContent = meta.label;
    select.appendChild(opt);
  });
  select.dataset.populated = 'true';
}

function setSurahSelectValue(select, value) {
  if (!select) return;
  if (!value) {
    select.value = '';
    return;
  }
  const str = String(value);
  if (!select.dataset.populated || !select.querySelector(`option[value="${str}"]`)) {
    populateSurahSelect(select);
  }
  select.value = str;
}
function getSurahVerseCount(id) {
  const sid = Number(id);
  if (Number.isNaN(sid) || sid < 1) return 0;
  if (!SURAH_VERSE_MAP.has(sid)) {
    const list = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
    const entry = list.find(ch => ch && Number(ch.id) === sid) || null;
    const count = entry && Number(entry.verses_count) > 0 ? Number(entry.verses_count) : 286;
    SURAH_VERSE_MAP.set(sid, count);
  }
  return SURAH_VERSE_MAP.get(sid) || 0;
}

function parseVerseKey(key) {
  if (!key) return null;
  const parts = String(key).split(':');
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]);
  if (!surah || !ayah || Number.isNaN(surah) || Number.isNaN(ayah)) return null;
  return { surah, ayah };
}

function compareVerseKeys(a, b) {
  const pa = parseVerseKey(a);
  const pb = parseVerseKey(b);
  if (!pa || !pb) return 0;
  if (pa.surah !== pb.surah) return pa.surah - pb.surah;
  return pa.ayah - pb.ayah;
}

function normaliseRange(range) {
  if (!range || !range.start || !range.end) return null;
  const start = parseVerseKey(range.start);
  const end = parseVerseKey(range.end);
  if (!start || !end) return null;
  if (compareVerseKeys(range.start, range.end) <= 0) return { start: `${start.surah}:${start.ayah}`, end: `${end.surah}:${end.ayah}` };
  return { start: `${end.surah}:${end.ayah}`, end: `${start.surah}:${start.ayah}` };
}

function nextVerseKey(key) {
  const parts = parseVerseKey(key);
  if (!parts) return null;
  const total = getSurahVerseCount(parts.surah);
  if (parts.ayah < total) return `${parts.surah}:${parts.ayah + 1}`;
  if (parts.surah < 114) return `${parts.surah + 1}:1`;
  return null;
}

function prevVerseKey(key) {
  const parts = parseVerseKey(key);
  if (!parts) return null;
  if (parts.ayah > 1) return `${parts.surah}:${parts.ayah - 1}`;
  if (parts.surah > 1) {
    const prevSurah = parts.surah - 1;
    const count = getSurahVerseCount(prevSurah);
    return `${prevSurah}:${count || 1}`;
  }
  return null;
}

let controls = null;
let activeRange = { start: null, end: null };
let pendingRangeFocus = false;

function setStatus(text) { if (els.status) els.status.textContent = text || ''; }

function persistPrefs() {
  try {
    const theme = document.body.getAttribute('data-theme') || 'dark';
    if (window.QR && QR.prefs) {
      QR.prefs.set({ 
        theme,
        follow_mode_on: state.followMode
      });
    } else {
      let prefs = {}; 
      try { prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}'); } catch {}
      prefs.theme = theme;
      prefs.follow_mode_on = state.followMode;
      localStorage.setItem('qr_prefs', JSON.stringify(prefs));
    }
  } catch {}
}

async function ensureTranslationSource() {
  // If translations are enabled but no source was chosen, pick a sensible default
  if (!state.translationEnabled || state.translationId) return;
  try {
    const res = await fetch(`${API_BASE}/resources/translations?language=en`);
    const data = await res.json();
    const list = data.translations || [];
    const pick =
      list.find(t => ((t.language||t.language_name||'')+'' ).toLowerCase().startsWith('en') && /saheeh/i.test((t.name||t.translated_name?.name||'')+'')) ||
      list.find(t => ((t.language||t.language_name||'')+'' ).toLowerCase().startsWith('en')) ||
      list[0];
    if (pick && pick.id) {
      state.translationId = pick.id;
      // Keep translationEnabled as-is (user opted-in in Settings)
      try {
        const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
        prefs.translation_id = pick.id;
        if (state.translationEnabled) prefs.translation_on = true;
        localStorage.setItem('qr_prefs', JSON.stringify(prefs));
      } catch {}
    }
  } catch (e) {
    // ignore; translation remains off if none available
  }
}

function loadPrefs() {
  try {
    const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem('qr_prefs') || '{}');
    if (prefs.theme) document.body.setAttribute('data-theme', prefs.theme);
    if (typeof prefs.font_px === 'number' && prefs.font_px > 10) {
      applyFontSize(prefs.font_px);
    } else {
      applyFontSize(state.fontSizePx);
    }
    if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) {
      state.currentReciterId = prefs.reciter_id;
    }
    const hasTrId = typeof prefs.translation_id === 'number' && prefs.translation_id > 0;
    state.translationEnabled = !!prefs.translation_on;
    state.translationId = hasTrId ? prefs.translation_id : 0;
    if (typeof prefs.translation_px === 'number' && prefs.translation_px > 8) {
      applyTranslationFontSize(prefs.translation_px);
    }
    state.followMode = !!prefs.follow_mode_on;
    state.wbwOn = !!prefs.wbw_on;
    state.wbwHover = ('wbw_hover' in prefs) ? !!prefs.wbw_hover : true;
    if (els.themeToggle) els.themeToggle.textContent = (document.body.getAttribute('data-theme') === 'light') ? 'Dark' : 'Light';
    
    // Set follow mode checkbox to match saved preference
    if (els.followToggle) els.followToggle.checked = state.followMode;
  } catch {}
}

function applyFontSize(px) {
  state.fontSizePx = px;
  document.documentElement.style.setProperty('--arabic-size', px + 'px');
}

function applyTranslationFontSize(px) {
  document.documentElement.style.setProperty('--translation-size', px + 'px');
}

function recomputePageNumbers() {
  try {
    const pages = Array.from(new Set((state.verses || []).map(v => v && v.page_number).filter(p => typeof p === 'number' && p >= 1 && p <= 604))).sort((a, b) => a - b);
    state.pageNumbers = pages;
    if (state.pageIndex >= pages.length) state.pageIndex = Math.max(0, pages.length - 1);
  } catch { state.pageNumbers = []; }
}

function applyTargetPage(){
  const target = Number(state.targetPageNumber || 0);
  if (!target || Number.isNaN(target)) { state.targetPageNumber = null; return; }
  const pages = state.pageNumbers || [];
  if (pages.length){
    const idx = pages.indexOf(target);
    if (idx >= 0) state.pageIndex = idx;
  } else if (Array.isArray(state.verses) && state.verses.length){
    const idx = state.verses.findIndex(v => Number(v.page_number) === target);
    if (idx >= 0) state.pageIndex = Math.floor(idx / state.pageSize);
  }
  state.targetPageNumber = null;
}

function getVisibleVerses() {
  // Prefer strict mushaf page grouping when page_number is present
  const pages = state.pageNumbers || [];
  if (pages.length) {
    const p = pages[Math.max(0, Math.min(state.pageIndex, pages.length - 1))];
    return (state.verses || []).filter(v => v && v.page_number === p);
  }
  // Fallback to fixed-size paging if page_number unavailable
  const start = state.pageIndex * state.pageSize;
  return (state.verses || []).slice(start, start + state.pageSize);
}


async function fetchVersesTajweed(chapterNumber) {
  setStatus('Loading verses...');
  const res = await fetch(`${API_BASE}/quran/verses/uthmani_tajweed?chapter_number=${chapterNumber}`);
  if (!res.ok) throw new Error(`Verses HTTP ${res.status}`);
  const data = await res.json();
  const verses = data.verses || [];
  setStatus('');
  return verses;
}

function extractTranslationMapFromVerses(verses) {
  const map = new Map();
  (verses || []).forEach(v => {
    const arr = v.translations || v.translation || [];
    if (Array.isArray(arr) && arr.length) {
      // Prefer the first translation entry's text
      const txt = (arr[0] && (arr[0].text || arr[0].translation_text || '')) || '';
      if (txt) map.set(v.verse_key, txt);
    }
  });
  return map;
}

async function fetchTranslationsForChapter(translationId, chapterNumber) {
  if (!translationId) return new Map();
  setStatus('Loading translation...');
  
  const map = new Map();
  let page = 1;
  
  while (true) {
    const res = await fetch(`${API_BASE}/quran/translations/${translationId}?chapter_number=${chapterNumber}&per_page=300&page=${page}`);
    if (!res.ok) throw new Error(`Translation HTTP ${res.status}`);
    const data = await res.json();
    
    (data.translations || []).forEach((t, idx) => {
      const verseKey = `${chapterNumber}:${t.verse_number || (idx + 1)}`;
      map.set(verseKey, t.text);
    });
    
    const next = (data.pagination && data.pagination.next_page) || (data.meta && data.meta.next_page) || null;
    if (!next) break;
    page = next;
    if (page > 20) break;
  }
  
  setStatus('');
  return map;
}

async function fetchAudioMap(recitationId, chapterNumber) {
  if (!recitationId) return new Map();
  setStatus('Loading audio...');
  const merged = new Map();
  let page = 1;
  while (true) {
    const res = await fetch(`${API_BASE}/recitations/${recitationId}/by_chapter/${chapterNumber}?per_page=300&page=${page}`);
    if (!res.ok) throw new Error(`Audio HTTP ${res.status}`);
    const data = await res.json();
    (data.audio_files || []).forEach(a => merged.set(a.verse_key, AUDIO_CDN + a.url));
    const next = (data.pagination && data.pagination.next_page) || (data.meta && data.meta.next_page) || null;
    if (!next) break;
    page = next;
    if (page > 20) break; // safety cap
  }
  setStatus('');
  return merged;
}

// Player
function updatePlayerInfo() {
  const verses = getVisibleVerses();
  const total = verses.length;
  const current = Math.min(state.playIndex + 1, Math.max(1, total || 1));
  if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total}` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(btn => { if (btn) btn.disabled = !enabled; });
  if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? 'Pause' : 'Play';
}

function setAudioForIndex(i, autoplay = false) {
  const verses = getVisibleVerses();
  if (!verses.length) return;
  state.playIndex = Math.max(0, Math.min(i, verses.length - 1));
  const v = verses[state.playIndex];
  const url = state.audioMap.get(v.verse_key);
  if (!url) {
    setStatus(`Audio not available for ${v.verse_key}`);
    try { els.audio.pause(); } catch {}
    els.audio.removeAttribute('src');
    delete els.audio.dataset.current;
    updatePlayerInfo();
    return false;
  }
  els.audio.src = url;
  els.audio.dataset.current = url;
  if (autoplay) els.audio.play().catch(()=>{});
  try { if (window.QR && QR.review) QR.review.markSeen(v.verse_key); } catch {}
  updatePlayerInfo();
  setStatus('');
  
  // Highlight and scroll to the verse if follow mode is on
  if (state.followMode) {
    try { highlightAndFollow(); } catch {}
  }
  
  return true;
}
function getCurrentVerseKey() {
  const verses = getVisibleVerses();
  if (!verses.length) return '';
  const idx = Math.max(0, Math.min(state.playIndex, verses.length - 1));
  const verse = verses[idx];
  return verse && verse.verse_key ? String(verse.verse_key) : '';
}

function findGlobalIndexForKey(key) {
  if (!key) return -1;
  const verses = state.verses || [];
  for (let i = 0; i < verses.length; i += 1) {
    if (verses[i] && verses[i].verse_key === key) return i;
  }
  return -1;
}

function derivePageIndexForKey(key) {
  const globalIndex = findGlobalIndexForKey(key);
  if (globalIndex === -1) return { globalIndex: -1, pageIndex: -1, pageNumber: null };
  const verse = state.verses[globalIndex];
  const pageNumber = verse && typeof verse.page_number === 'number' ? verse.page_number : null;
  if (state.pageNumbers && state.pageNumbers.length && pageNumber) {
    const pageIdx = state.pageNumbers.indexOf(pageNumber);
    return { globalIndex, pageIndex: pageIdx, pageNumber };
  }
  const pageIdx = Math.floor(globalIndex / Math.max(1, state.pageSize));
  return { globalIndex, pageIndex: pageIdx, pageNumber };
}

async function ensureVerseAvailable(key) {
  if (!key) return false;
  if (findGlobalIndexForKey(key) !== -1) return true;
  const parts = parseVerseKey(key);
  if (!parts) return false;
  await loadSurah(parts.surah);
  return findGlobalIndexForKey(key) !== -1;
}

async function focusOnKey(key, autoplay = false, scrollToTop = false) {
  if (!key) return false;
  const available = await ensureVerseAvailable(key);
  if (!available) return false;
  const info = derivePageIndexForKey(key);
  let pageChanged = false;
  if (state.pageNumbers && state.pageNumbers.length) {
    const idx = info.pageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx !== state.pageIndex) {
      state.pageIndex = idx;
      renderVerses();
      pageChanged = true;
    }
  } else {
    const idx = info.pageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx !== state.pageIndex) {
      state.pageIndex = idx;
      renderVerses();
      pageChanged = true;
    }
  }
  let visible = getVisibleVerses();
  let localIndex = visible.findIndex(v => v && v.verse_key === key);
  if (localIndex === -1) {
    renderVerses();
    visible = getVisibleVerses();
    localIndex = visible.findIndex(v => v && v.verse_key === key);
  }
  if (localIndex === -1) return false;
  setAudioForIndex(localIndex, autoplay);
  if (scrollToTop && pageChanged) {
    try { window.scrollTo(0, 0); } catch {}
  }
  return true;
}
function highlightAndFollow() {
  if (!state.followMode) return;
  if (!state.verses || !state.verses.length) return;
  // Determine current verse key from audio, fallback to current page/index
  let currentKey = '';
  try {
    const curUrl = els.audio?.dataset?.current || '';
    if (curUrl) {
      for (const [k, u] of state.audioMap.entries()) { if (u === curUrl) { currentKey = k; break; } }
    }
  } catch {}
  if (!currentKey) {
    const vis = getVisibleVerses();
    const v = vis[Math.max(0, Math.min(state.playIndex, Math.max(0, vis.length - 1)))];
    currentKey = v && v.verse_key || '';
  }
  if (!currentKey) return;
  // Remove active class from all verses
  try { document.querySelectorAll('.verse-container.active').forEach(el => el.classList.remove('active')); } catch {}
  // Find and highlight the current verse
  const el = document.querySelector(`.verse-container[data-key="${CSS.escape(currentKey)}"]`);
  if (el) {
    el.classList.add('active');
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
  }
}

function ensureCurrentAudioPrepared(autoplay=false) {
  const verses = getVisibleVerses();
  if (!verses.length || !state.audioMap.size) return false;
  const v = verses[Math.max(0, Math.min(state.playIndex, verses.length-1))];
  const url = state.audioMap.get(v.verse_key);
  if (!url) { try { els.audio.pause(); } catch {}; els.audio.removeAttribute('src'); delete els.audio.dataset.current; updatePlayerInfo(); return false; }
  if (els.audio.dataset.current !== url) {
    els.audio.pause();
    els.audio.src = url;
    els.audio.dataset.current = url;
    if (autoplay) els.audio.play().catch(()=>{});
  }
  return true;
}

function togglePlay() {
  if (!ensureCurrentAudioPrepared(true)) return;
  if (els.audio.paused) els.audio.play().catch(()=>{});
  else els.audio.pause();
  updatePlayerInfo();
}

async function defaultNextAyah() {
  const verses = getVisibleVerses();
  if (state.playIndex < verses.length - 1) {
    // Move to next verse in current page
    setAudioForIndex(state.playIndex + 1, true);
    return;
  }
  // At the end of current page, try to advance to next page
  await nextPage();
}

async function defaultPrevAyah() {
  if (state.playIndex > 0) {
    // Move to previous verse in current page
    setAudioForIndex(state.playIndex - 1, true);
    return;
  }
  // At the start of current page, try to go to previous page
  await prevPage();
}

async function nextAyah() {
  const loopOne = (window.QR && QR.controlPanel && typeof QR.controlPanel.getLoopOne === 'function') ? QR.controlPanel.getLoopOne() : false;
  if (loopOne) {
    setAudioForIndex(state.playIndex, true);
    return;
  }
  const range = (window.QR && QR.controlPanel && typeof QR.controlPanel.getRange === 'function') ? normaliseRange(QR.controlPanel.getRange()) : null;
  const currentKey = getCurrentVerseKey();
  
  // Only use range if current verse is within the range
  if (range && range.start && range.end && currentKey) {
    const isInRange = compareVerseKeys(currentKey, range.start) >= 0 && compareVerseKeys(currentKey, range.end) <= 0;
    if (isInRange) {
      const nextKey = nextVerseKey(currentKey);
      const target = (nextKey && compareVerseKeys(nextKey, range.end) <= 0) ? nextKey : range.start;
      if (target) await focusOnKey(target, true, true);
      return;
    }
  }
  
  await defaultNextAyah();
}

async function prevAyah() {
  const threshold = 2;
  try {
    if (els.audio.currentTime > threshold) {
      els.audio.currentTime = 0;
      return;
    }
  } catch {}
  const loopOne = (window.QR && QR.controlPanel && typeof QR.controlPanel.getLoopOne === 'function') ? QR.controlPanel.getLoopOne() : false;
  if (loopOne) {
    setAudioForIndex(state.playIndex, true);
    return;
  }
  const range = (window.QR && QR.controlPanel && typeof QR.controlPanel.getRange === 'function') ? normaliseRange(QR.controlPanel.getRange()) : null;
  const currentKey = getCurrentVerseKey();
  
  // Only use range if current verse is within the range
  if (range && range.start && range.end && currentKey) {
    const isInRange = compareVerseKeys(currentKey, range.start) >= 0 && compareVerseKeys(currentKey, range.end) <= 0;
    if (isInRange) {
      const prevKey = prevVerseKey(currentKey);
      const target = (prevKey && compareVerseKeys(prevKey, range.start) >= 0) ? prevKey : range.end;
      if (target) await focusOnKey(target, true, true);
      return;
    }
  }
  
  await defaultPrevAyah();
}

async function nextPage() {
  const wasPlaying = els.audio && !els.audio.paused;
  const hasPageGroups = (state.pageNumbers && state.pageNumbers.length > 0);
  const hasNext = hasPageGroups ? (state.pageIndex < state.pageNumbers.length - 1) : ((state.pageIndex + 1) * state.pageSize < state.verses.length);
  if (hasNext) {
    if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; }
    state.pageIndex++;
    state.playIndex = 0;
    renderVerses();
    setAudioForIndex(0, !!wasPlaying);
    try { window.scrollTo(0, 0); } catch {}
    return;
  }
  // End of available pages: if reading a surah, load next surah
  if (state.currentContext && state.currentContext.type === 'surah') {
    const cur = parseInt(state.currentContext.id, 10) || 0;
    if (cur > 0 && cur < 114) {
      if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; }
      await loadSurah(cur + 1);
      state.playIndex = 0;
      setAudioForIndex(0, !!wasPlaying);
      try { window.scrollTo(0, 0); } catch {}
      return;
    }
  }
  // At the end, stop playback
  if (els.audio) { 
    els.audio.pause(); 
    els.audio.currentTime = 0; 
    els.audio.removeAttribute('src'); 
    delete els.audio.dataset.current; 
  }
  updatePlayerInfo();
}

async function fetchVersesByRange(range, id, withTr) {
  // range: 'juz' | 'hizb'
  const collected = [];
  let page = 1;
  while (true) {
    // Include page_number to allow strict page grouping in reader view
    const url = `${API_BASE}/verses/by_${range}/${id}?words=false&fields=text_uthmani,page_number&per_page=300&page=${page}${withTr ? `&translations=${state.translationId}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${range} HTTP ${res.status}`);
    const data = await res.json();
    const verses = data.verses || [];
    collected.push(...verses);
    const next = (data.pagination && data.pagination.next_page) || (data.meta && data.meta.next_page) || null;
    if (!next) break;
    page = next;
    if (page > 20) break; // safety cap
  }
  return collected;
}

async function prevPage() {
  const wasPlaying = els.audio && !els.audio.paused;
  if (state.pageIndex > 0) {
    if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; }
    state.pageIndex--;
    state.playIndex = 0;
    renderVerses();
    setAudioForIndex(0, !!wasPlaying);
    try { window.scrollTo(0, 0); } catch {}
    return;
  }
  if (state.currentContext && state.currentContext.type === 'surah') {
    const cur = parseInt(state.currentContext.id, 10) || 0;
    if (cur > 1) {
      if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; }
      await loadSurah(cur - 1);
      const hasPageGroups = (state.pageNumbers && state.pageNumbers.length > 0);
      const pages = hasPageGroups ? state.pageNumbers.length : Math.max(1, Math.ceil(state.verses.length / state.pageSize));
      state.pageIndex = Math.max(0, pages - 1);
      renderVerses();
      const lastIdx = Math.max(0, getVisibleVerses().length - 1);
      state.playIndex = lastIdx;
      setAudioForIndex(lastIdx, !!wasPlaying);
      try { window.scrollTo(0, 0); } catch {}
    }
  }
}

function renderVerses() {
  const verses = getVisibleVerses();
  const totalAll = state.verses.length;
  const hasPageGroups = (state.pageNumbers && state.pageNumbers.length > 0);
  const currentPageNumber = hasPageGroups ? state.pageNumbers[Math.max(0, Math.min(state.pageIndex, state.pageNumbers.length - 1))] : null;
  const start = hasPageGroups ? 0 : (state.pageIndex * state.pageSize);
  const end = hasPageGroups ? verses.length : (start + verses.length);
  
  // Use reader-content if available, otherwise fall back to display
  const container = els.readerContent || els.display;
  
  if (!totalAll) {
    if (container) container.innerHTML = '';
    if (els.display && els.display !== container) els.display.innerHTML = '';
    updatePlayerInfo();
    try { if (window.QR && QR.controlPanel && typeof QR.controlPanel.setCurrentPage === 'function') QR.controlPanel.setCurrentPage(null); } catch {}
    return;
  }

  const firstVerse = verses[0] || state.verses[0];
  if (els.surahSelect && firstVerse) {
    const sid = parseInt(String(firstVerse.verse_key).split(':')[0], 10);
    if (!Number.isNaN(sid) && sid > 0) setSurahSelectValue(els.surahSelect, sid);
  }

  const frag = document.createDocumentFragment();
  verses.forEach(v => {
    const hasTr = state.translations.has(v.verse_key);
    const card = document.createElement('article');
    card.className = 'verse-container';
    try { card.setAttribute('data-key', v.verse_key); } catch {}

    const head = document.createElement('div');
    head.className = 'verse-header';
    const meta = document.createElement('div');
    meta.className = 'verse-number';
    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', 'book-outline');
    meta.appendChild(icon);
    const keyText = document.createTextNode(' ' + v.verse_key);
    meta.appendChild(keyText);
    
    const actions = document.createElement('div');
    actions.className = 'verse-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'verse-btn';
    playBtn.title = 'Play';
    const playIcon = document.createElement('ion-icon');
    playIcon.setAttribute('name', 'play-outline');
    playBtn.appendChild(playIcon);
    playBtn.addEventListener('click', () => {
      const verses = getVisibleVerses();
      const idx = verses.findIndex(verse => verse.verse_key === v.verse_key);
      if (idx !== -1) {
        setAudioForIndex(idx, true);
      }
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'verse-btn';
    copyBtn.title = 'Copy';
    const copyIcon = document.createElement('ion-icon');
    copyIcon.setAttribute('name', 'copy-outline');
    copyBtn.appendChild(copyIcon);
    copyBtn.addEventListener('click', async () => {
      try {
        const text = v.text_uthmani || String(v.text_uthmani_tajweed || '').replace(/<[^>]+>/g, '');
        await navigator.clipboard.writeText(text);
        copyIcon.setAttribute('name', 'checkmark-outline');
        setTimeout(() => copyIcon.setAttribute('name', 'copy-outline'), 1500);
      } catch {}
    });
    
    actions.appendChild(playBtn);
    actions.appendChild(copyBtn);
    head.appendChild(meta);
    head.appendChild(actions);
    card.appendChild(head);

    const arabic = document.createElement('div');
    arabic.className = 'verse-text';
    if (state.wbwOn && Array.isArray(v.words) && v.words.length) {
      const words = (v.words || []).slice().sort((a, b) => {
        const ap = (typeof a.position === 'number') ? a.position : (a.id || 0);
        const bp = (typeof b.position === 'number') ? b.position : (b.id || 0);
        return ap - bp;
      });
      const fragTokens = document.createDocumentFragment();
      words.forEach(w => {
        const t = (w.text_uthmani || w.text || '').trim();
        if (!t) return;
        const span = document.createElement('span');
        span.className = 'wbw';
        span.textContent = t + ' ';
        span.dataset.key = String(v.verse_key || '');
        if (typeof w.position === 'number') span.dataset.pos = String(w.position);
        const root = (w.root && (w.root.text || w.root)) || '';
        if (root) span.dataset.root = String(root);
        const translSource = Array.isArray(w.translations) && w.translations.length ? w.translations[0] : (w.translation || null);
        const gloss = translSource && (translSource.text || translSource.translation_text || translSource.en || '');
        if (gloss) span.dataset.gloss = String(gloss);
        const translitSource = (w.transliteration && (w.transliteration.text || w.transliteration.en)) || (Array.isArray(w.transliterations) ? (w.transliterations[0]?.text || w.transliterations[0]?.en) : '');
        if (translitSource) span.dataset.translit = String(translitSource);
        fragTokens.appendChild(span);
      });
      arabic.appendChild(fragTokens);
    } else {
      // Sanitize Tajweed HTML from API
      if (v.text_uthmani) {
        arabic.textContent = v.text_uthmani;
      } else if (v.text_uthmani_tajweed) {
        const sanitized = window.QR && QR.utils && QR.utils.sanitizeTajweedHTML 
          ? QR.utils.sanitizeTajweedHTML(v.text_uthmani_tajweed) 
          : v.text_uthmani_tajweed;
        arabic.innerHTML = sanitized;
      }
    }
    card.appendChild(arabic);

    if (state.translationEnabled && hasTr) {
      const tr = document.createElement('div');
      tr.className = 'translation';
      // Sanitize translation text from API (could contain formatting)
      const translationText = state.translations.get(v.verse_key) || '';
      const sanitized = window.QR && QR.utils && QR.utils.sanitizeHTML 
        ? QR.utils.sanitizeHTML(translationText) 
        : translationText;
      tr.textContent = sanitized; // Use textContent since we escaped it
      card.appendChild(tr);
    }

    frag.appendChild(card);
  });

  if (container) {
    container.innerHTML = '';
    container.appendChild(frag);
  }
  
  // Clear old display if using new container
  if (els.display && els.display !== container) {
    els.display.innerHTML = '';
  }

  try { applyRootHighlight(); } catch {}

  if (els.pageInfo) {
    const labelPage = currentPageNumber || (verses[0] && verses[0].page_number);
    els.pageInfo.textContent = labelPage ? `Page ${labelPage}` : '';
  }

  if (els.toMushaf) {
    const linkPage = currentPageNumber || (verses[0] && verses[0].page_number);
    if (linkPage) {
      const qp = new URLSearchParams();
      if (state.currentContext) {
        if (state.currentContext.type === 'surah') qp.set('surah', state.currentContext.id);
        else if (state.currentContext.type === 'juz') qp.set('juz', state.currentContext.id);
        else if (state.currentContext.type === 'hizb') qp.set('hizb', state.currentContext.id);
      }
      qp.set('page', linkPage);
      qp.set('controls', 'open');
      els.toMushaf.href = `mushaf.html?${qp.toString()}`;
    }
  }

  try {
    const pageForControls = currentPageNumber || (verses[0] && verses[0].page_number);
    if (window.QR && QR.controlPanel && typeof QR.controlPanel.setCurrentPage === 'function') {
      QR.controlPanel.setCurrentPage(pageForControls || null);
    }
  } catch {}

  const inSurah = state.currentContext && state.currentContext.type === 'surah';
  const curSid = inSurah ? parseInt(state.currentContext.id, 10) || 0 : 0;
  const canPrev = hasPageGroups ? (state.pageIndex > 0 || (inSurah && curSid > 1)) : ((start > 0) || (inSurah && curSid > 1));
  const canNext = hasPageGroups ? (state.pageIndex < Math.max(0, state.pageNumbers.length - 1) || (inSurah && curSid < 114)) : ((end < totalAll) || (inSurah && curSid < 114));
  if (els.prevPage) els.prevPage.disabled = !canPrev;
  if (els.nextPage) els.nextPage.disabled = !canNext;
  
  // Update page navigation buttons
  if (els.prevPageNav) els.prevPageNav.disabled = !canPrev;
  if (els.nextPageNav) els.nextPageNav.disabled = !canNext;
  
  // Update page indicator
  if (els.pageIndicator && hasPageGroups) {
    els.pageIndicator.textContent = `Page ${state.pageIndex + 1} of ${state.pageNumbers.length}`;
  } else if (els.pageIndicator) {
    const currentPageNum = Math.floor(start / state.pageSize) + 1;
    const totalPages = Math.ceil(totalAll / state.pageSize);
    els.pageIndicator.textContent = `Page ${currentPageNum} of ${totalPages}`;
  }
  
  if (verses.length) state.playIndex = Math.max(0, Math.min(state.playIndex, verses.length - 1));
  else state.playIndex = 0;
  updatePlayerInfo();
  updateContextInfo();
  try { highlightAndFollow(); } catch {}
  if (pendingRangeFocus && activeRange.start) {
    pendingRangeFocus = false;
    try { focusOnKey(activeRange.start, false, true).catch(()=>{}); } catch {}
  }
}

async function buildAudioForVerses(verses) {
  const surahSet = new Set();
  (verses || []).forEach(v => {
    const sid = parseInt(String(v.verse_key).split(':')[0], 10);
    if (sid) surahSet.add(sid);
  });
  const tasks = Array.from(surahSet).map(sid => fetchAudioMap(state.currentReciterId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((url, key) => merged.set(key, url)));
  return merged;
}

async function buildTranslationsForVerses(verses, translationId){
  if (!translationId) return new Map();
  const surahSet = new Set();
  (verses || []).forEach(v => {
    const sid = parseInt(String(v.verse_key).split(':')[0], 10);
    if (sid) surahSet.add(sid);
  });
  const tasks = Array.from(surahSet).map(sid => fetchTranslationsForChapter(translationId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((txt, key) => merged.set(key, txt)));
  return merged;
}

async function loadSurah(surahId) {
  // Ensure surahId is a number
  const numericId = parseInt(surahId, 10);
  if (Number.isNaN(numericId) || numericId < 1 || numericId > 114) {
    console.error('Invalid surah ID:', surahId);
    return;
  }
  state.currentContext = { type: 'surah', id: numericId };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading...');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    // Build URL to include translations inline when enabled + id present
    const withTr = state.translationEnabled && !!state.translationId;
    let verses = [];
    if (state.wbwOn) {
      verses = await QR.api.fetchVersesByChapterWBW(numericId, 'translation,transliteration,root,lemma', 'page_number');
    } else {
      verses = await QR.api.fetchVersesByChapter(numericId, 'text_uthmani,page_number');
    }
    const [audioMap, trMap] = await Promise.all([
      fetchAudioMap(state.currentReciterId, numericId),
      (async ()=>{
        if (!withTr) return new Map();
        try { return await fetchTranslationsForChapter(state.translationId, surahId); } catch (e) { console.error('[Translation] Error:', e); return new Map(); }
      })()
    ]);
    state.verses = verses;
    state.translations = trMap || new Map();
    state.audioMap = audioMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    applyTargetPage();
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded ${verses.length} ayah(s).`);
  } catch (e) {
    console.error(e);
    alert('Failed to load data: ' + e.message);
    setStatus('Failed to load.');
  } finally { state.isLoading = false; }
}

async function loadJuz(juzNumber) {
  // Ensure juzNumber is a number
  const numericId = parseInt(juzNumber, 10);
  if (Number.isNaN(numericId) || numericId < 1 || numericId > 30) {
    console.error('Invalid juz number:', juzNumber);
    return;
  }
  state.currentContext = { type: 'juz', id: numericId };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading Juz...');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    // Pull all verses (handle pagination) with or without WBW; translations separately if enabled
    const withTr = state.translationEnabled && !!state.translationId;
    const juzVerses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('juz', numericId, 'translation,transliteration,root,lemma', 'page_number', 300)
                               : await fetchVersesByRange('juz', numericId, withTr);
    
    // Get all page numbers touched by this Juz
    const pageNumbers = Array.from(new Set(juzVerses.map(v => v.page_number).filter(p => typeof p === 'number'))).sort((a, b) => a - b);
    
    // Fetch complete pages to show full context
    const allVerses = [];
    for (const pageNum of pageNumbers) {
      const pageVerses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('page', pageNum, 'translation,transliteration,root,lemma', 'page_number', 300)
                                     : await fetchVersesByRange('page', pageNum, withTr);
      allVerses.push(...pageVerses);
    }
    
    // Build audio map across all verses
    const audioMap = await buildAudioForVerses(allVerses);
    const trMap = withTr ? await buildTranslationsForVerses(allVerses, state.translationId) : new Map();
    state.verses = allVerses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    
    // Always start at the first page where the Juz begins
    // Clear any target page from URL params to prevent jumping to wrong page
    state.targetPageNumber = null;
    
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Juz ${juzNumber} (${allVerses.length} ayah across ${pageNumbers.length} pages).`);
    // Update Mushaf link to this Juz context (keep controls open on arrival)
  } catch (e) {
    console.error(e);
    alert('Failed to load Juz: ' + e.message);
    setStatus('Failed to load Juz.');
  } finally { state.isLoading = false; }
}

async function loadHizb(hizbNumber) {
  // Ensure hizbNumber is a number
  const numericId = parseInt(hizbNumber, 10);
  if (Number.isNaN(numericId) || numericId < 1 || numericId > 60) {
    console.error('Invalid hizb number:', hizbNumber);
    return;
  }
  state.currentContext = { type: 'hizb', id: numericId };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading Hizb...');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    const withTr = state.translationEnabled && !!state.translationId;
    const hizbVerses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('hizb', numericId, 'translation,transliteration,root,lemma', 'page_number', 300)
                               : await fetchVersesByRange('hizb', numericId, withTr);
    
    // Get all page numbers touched by this Hizb
    const pageNumbers = Array.from(new Set(hizbVerses.map(v => v.page_number).filter(p => typeof p === 'number'))).sort((a, b) => a - b);
    
    // Fetch complete pages to show full context
    const allVerses = [];
    for (const pageNum of pageNumbers) {
      const pageVerses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('page', pageNum, 'translation,transliteration,root,lemma', 'page_number', 300)
                                     : await fetchVersesByRange('page', pageNum, withTr);
      allVerses.push(...pageVerses);
    }
    
    const audioMap = await buildAudioForVerses(allVerses);
    const trMap = withTr ? await buildTranslationsForVerses(allVerses, state.translationId) : new Map();
    state.verses = allVerses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    
    // Always start at the first page where the Hizb begins
    // Clear any target page from URL params to prevent jumping to wrong page
    state.targetPageNumber = null;
    
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Hizb ${hizbNumber} (${allVerses.length} ayah across ${pageNumbers.length} pages).`);
    // Update Mushaf link to this Hizb context (keep controls open on arrival)
  } catch (e) {
    console.error(e);
    alert('Failed to load Hizb: ' + e.message);
    setStatus('Failed to load Hizb.');
  } finally { state.isLoading = false; }
}

// Events
if (els.themeToggle) els.themeToggle.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  if (els.themeToggle) els.themeToggle.textContent = next === 'dark' ? 'Light' : 'Dark';
  persistPrefs();
});

// No Surah picker UI anymore

// Player events
if (els.prevAyah) els.prevAyah.addEventListener('click', () => { if (!state.isLoading) prevAyah(); });
if (els.playPause) els.playPause.addEventListener('click', () => { if (!state.isLoading) togglePlay(); });
if (els.nextAyah) els.nextAyah.addEventListener('click', () => { if (!state.isLoading) nextAyah(); });
if (els.followToggle) els.followToggle.addEventListener('change', (e) => {
  state.followMode = e.target.checked;
  persistPrefs();
  if (state.followMode) {
    try { highlightAndFollow(); } catch {}
  } else {
    // Remove highlight when follow mode is disabled
    try { document.querySelectorAll('.verse-container.active').forEach(el => el.classList.remove('active')); } catch {}
  }
});
if (els.audio) {
  els.audio.addEventListener('ended', () => { if (!state.isLoading) nextAyah(); });
  ['play','playing','timeupdate','seeked','loadedmetadata'].forEach(evt => {
    els.audio.addEventListener(evt, () => { if (state.followMode) try { highlightAndFollow(); } catch {} });
  });
}
if (els.prevPage) els.prevPage.addEventListener('click', () => { if (!state.isLoading) prevPage(); });
if (els.nextPage) els.nextPage.addEventListener('click', () => { if (!state.isLoading) nextPage(); });


document.addEventListener("DOMContentLoaded", async () => {
  if (!document.body.getAttribute("data-theme")) document.body.setAttribute("data-theme", "dark");
  loadPrefs();
  updatePlayerInfo();

  // Populate landing grids
  if (els.surahGridLanding) {
    populateSurahGrid(els.surahGridLanding);
  }
  
  const juzGrid = document.getElementById('juz-grid-landing');
  const hizbGrid = document.getElementById('hizb-grid-landing');
  if (juzGrid) populateJuzGrid(juzGrid);
  if (hizbGrid) populateHizbGrid(hizbGrid);
  
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update active tab content
      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
      
      // Update search placeholder
      if (els.landingSearch) {
        if (targetTab === 'surahs') {
          els.landingSearch.placeholder = 'Search surahs...';
        } else if (targetTab === 'juz') {
          els.landingSearch.placeholder = 'Search juz...';
        } else if (targetTab === 'hizb') {
          els.landingSearch.placeholder = 'Search hizb...';
        }
        els.landingSearch.value = '';
      }
    });
  });
  
  // Landing search - filter based on active tab
  if (els.landingSearch) {
    els.landingSearch.addEventListener('input', (e) => {
      const searchText = e.target.value;
      const activeTab = document.querySelector('.tab-btn.active');
      const tabType = activeTab ? activeTab.dataset.tab : 'surahs';
      
      if (tabType === 'surahs' && els.surahGridLanding) {
        filterSurahCards(searchText, els.surahGridLanding);
      } else if (tabType === 'juz' && juzGrid) {
        filterJuzCards(searchText, juzGrid);
      } else if (tabType === 'hizb' && hizbGrid) {
        filterHizbCards(searchText, hizbGrid);
      }
    });
  }
  
  // Back to landing button
  if (els.backToLanding) {
    els.backToLanding.addEventListener('click', () => {
      showLanding();
      history.replaceState(null, '', location.pathname);
    });
  }
  
  // Page navigation buttons
  if (els.prevPageNav) {
    els.prevPageNav.addEventListener('click', async () => {
      if (!state.isLoading) {
        await prevPage();
      }
    });
  }
  
  if (els.nextPageNav) {
    els.nextPageNav.addEventListener('click', async () => {
      if (!state.isLoading) {
        await nextPage();
      }
    });
  }

  if (els.surahSelect) {
    populateSurahSelect(els.surahSelect);
    els.surahSelect.addEventListener('change', async () => {
      const sid = parseInt(els.surahSelect.value, 10);
      if (!sid || Number.isNaN(sid)) return;
      if (state.isLoading) return;
      if (state.currentContext && state.currentContext.type === 'surah' && Number(state.currentContext.id) === sid) return;
      try {
        await loadSurah(sid);
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
      } catch (err) {
        console.error(err);
        alert('Unable to load the selected surah.');
      }
    });
  }

  if (window.QR && QR.controlPanel && typeof QR.controlPanel.init === "function") {
    controls = QR.controlPanel.init({
      onRangeChange: async (range) => {
        const prevStart = activeRange.start;
        const normalised = normaliseRange(range);
        const newStart = normalised ? normalised.start : null;
        const newEnd = normalised ? normalised.end : null;
        activeRange = { start: newStart, end: newEnd };
        const hasData = (state.verses || []).length > 0;
        if (newStart !== prevStart) {
          if (newStart) {
            if (!hasData) { pendingRangeFocus = true; return; }
            await focusOnKey(newStart, false, true);
          } else {
            pendingRangeFocus = false;
          }
        } else if (!hasData && newStart) {
          pendingRangeFocus = true;
        }
      },
    });
  }

  // WBW controls
  try {
    const wbwToggle = document.getElementById("wbw-toggle");
    const wbwHover = document.getElementById("wbw-hover");
    const rootClear = document.getElementById("root-clear");
    if (wbwToggle) {
      wbwToggle.checked = !!state.wbwOn;
      wbwToggle.addEventListener("change", async () => {
        state.wbwOn = !!wbwToggle.checked;
        try { if (window.QR && QR.prefs) QR.prefs.set({ wbw_on: state.wbwOn }); } catch {}
        await reloadCurrentContext();
      });
    }
    if (wbwHover) {
      wbwHover.checked = !!state.wbwHover;
      wbwHover.addEventListener("change", () => {
        state.wbwHover = !!wbwHover.checked;
        try { if (window.QR && QR.prefs) QR.prefs.set({ wbw_hover: state.wbwHover }); } catch {}
      });
    }
    if (rootClear) {
      rootClear.addEventListener("click", () => {
        state.rootFilter = "";
        applyRootHighlight();
        updateRootStatus();
      });
    }
  } catch {}

  // WBW tooltip + root events
  try {
    els.display.addEventListener("mouseover", (e) => {
      const t = e.target.closest(".wbw"); if (!t) return;
      if (!state.wbwHover) return;
      showWbwTip(t, e);
    });
    els.display.addEventListener("mousemove", (e) => {
      const t = e.target.closest(".wbw"); if (!t) { hideWbwTip(); return; }
      if (!state.wbwHover) return;
      showWbwTip(t, e);
    });
    els.display.addEventListener("mouseout", (e) => { const t = e.target.closest(".wbw"); if (t) hideWbwTip(); });
    els.display.addEventListener("click", (e) => {
      const t = e.target.closest(".wbw"); if (!t) return;
      const root = t.dataset.root || "";
      if (!root) return;
      state.rootFilter = (state.rootFilter === root) ? "" : root;
      applyRootHighlight();
      updateRootStatus();
    });
  } catch {}

  // Drawer controls
  try {
    const open = els.drawerOpen, closeBtn = els.drawerClose, drawer = els.drawer, backdrop = els.drawerBackdrop;
    const openDrawer = () => {
      if (!drawer) return;
      document.body.classList.add("drawer-open");
      drawer.removeAttribute("aria-hidden");
      if (backdrop) { backdrop.hidden = false; }
      try { drawer.focus(); } catch {}
    };
    const closeDrawer = () => {
      if (!drawer) return;
      document.body.classList.remove("drawer-open");
      drawer.setAttribute("aria-hidden", "true");
      if (backdrop) { backdrop.hidden = true; }
      if (open) try { open.focus(); } catch {}
    };
    if (open) open.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
    try {
      const qp = new URLSearchParams(location.search);
      const want = (qp.get("controls") || qp.get("drawer") || "").toLowerCase();
      if (want === "open" || want === "1" || want === "true") openDrawer();
    } catch {}
  } catch {}

  const params = new URLSearchParams(location.search);
  const surahParam = parseInt(params.get("surah") || "", 10);
  const juzParam = parseInt(params.get("juz") || "", 10);
  const hizbParam = parseInt(params.get("hizb") || "", 10);
  const pageParam = parseInt(params.get("page") || "", 10);
  state.targetPageNumber = (!Number.isNaN(pageParam) && pageParam >= 1 && pageParam <= 604) ? pageParam : null;

  // Check if we should show landing page
  let shouldShowLanding = true;

  try {
    const back = document.querySelector(".back-link");
    const modeParam = (params.get("mode") || "").toLowerCase() || (!Number.isNaN(juzParam) ? "juz" : !Number.isNaN(hizbParam) ? "hizb" : "surahs");
    if (back) {
      const backUrl = "surahs.html?mode=" + encodeURIComponent(modeParam);
      const labelSlot = back.querySelector("[data-label]");
      if (labelSlot) {
        labelSlot.textContent = "List";
      } else if (!back.dataset.keepLabel) {
        back.textContent = "List";
      }
      back.setAttribute("href", backUrl);
      const handler = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        if (document.referrer && /surahs\.html(\?|$)/.test(document.referrer)) {
          history.back();
        } else {
          location.href = backUrl;
        }
      };
      back.addEventListener("click", handler, true);
    }
  } catch {}

  try {
    if (!Number.isNaN(surahParam) && surahParam >= 1 && surahParam <= 114) {
      shouldShowLanding = false;
      hideLanding();
      await loadSurah(surahParam);
      updateContextInfo();
      return;
    }
    if (!Number.isNaN(juzParam) && juzParam >= 1 && juzParam <= 30) {
      shouldShowLanding = false;
      hideLanding();
      await loadJuz(juzParam);
      updateContextInfo();
      return;
    }
    if (!Number.isNaN(hizbParam) && hizbParam >= 1 && hizbParam <= 60) {
      shouldShowLanding = false;
      hideLanding();
      await loadHizb(hizbParam);
      updateContextInfo();
      return;
    }
  } catch (e) {
    console.error(e);
  }

  // Show landing page if no valid parameters
  if (shouldShowLanding) {
    showLanding();
    return;
  }

  location.replace("surahs.html");
});

// ----- WBW helpers -----
let _wbwTip;
function ensureTip(){ if (_wbwTip) return _wbwTip; const d = document.createElement('div'); d.id='wbw-tip'; d.style.position='fixed'; d.style.zIndex='50'; d.style.pointerEvents='none'; d.style.maxWidth='320px'; d.style.background='var(--surface)'; d.style.color='var(--text)'; d.style.border='1px solid var(--border)'; d.style.borderRadius='8px'; d.style.padding='8px 10px'; d.style.boxShadow='0 4px 18px rgba(0,0,0,.35)'; d.style.fontSize='13px'; d.style.lineHeight='1.35'; d.style.display='none'; document.body.appendChild(d); _wbwTip=d; return d; }
function showWbwTip(el, evt){ 
  const tip = ensureTip(); 
  const gloss = el.dataset.gloss||''; 
  const translit = el.dataset.translit||''; 
  const root = el.dataset.root||''; 
  const parts = [];
  // Escape user data to prevent XSS
  const esc = window.QR && QR.utils && QR.utils.escapeHTML ? QR.utils.escapeHTML : (s => s);
  if (gloss) parts.push(esc(gloss)); 
  if (translit) parts.push(`<span class="muted">${esc(translit)}</span>`); 
  if (root) parts.push(`<span class="muted">Root: ${esc(root)}</span>`); 
  tip.innerHTML = parts.join('<br>'); 
  if (!tip.innerHTML) { hideWbwTip(); return; } 
  tip.style.display='block'; 
  const x = Math.min(window.innerWidth-10, Math.max(10, evt.clientX+12)); 
  const y = Math.min(window.innerHeight-10, Math.max(10, evt.clientY+12)); 
  tip.style.left = x+'px'; 
  tip.style.top = y+'px'; 
}
function hideWbwTip(){ if (_wbwTip) _wbwTip.style.display='none'; }
function applyRootHighlight(){ try { document.querySelectorAll('.wbw').forEach(n=>n.classList.remove('root-hit')); if (!state.rootFilter) return; document.querySelectorAll(`.wbw[data-root="${CSS.escape(state.rootFilter)}"]`).forEach(n=>n.classList.add('root-hit')); } catch {} }
function updateRootStatus(){ try { const s = document.getElementById('root-status'); if (!s) return; if (!state.rootFilter) { s.textContent=''; return; } const count = document.querySelectorAll(`.wbw[data-root="${CSS.escape(state.rootFilter)}"]`).length; s.textContent = `Root ${state.rootFilter}: ${count} hit(s)`; } catch {} }

async function reloadCurrentContext(){
  if (!state.currentContext) return;
  const { type, id } = state.currentContext;
  if (type==='surah') return loadSurah(id);
  if (type==='juz') return loadJuz(id);
  if (type==='hizb') return loadHizb(id);
}

// Listen for preference changes (e.g., from settings page)
window.addEventListener('qr:prefs-changed', (event) => {
  const prefs = event.detail || {};
  
  // Update translation state
  const hasTrId = typeof prefs.translation_id === 'number' && prefs.translation_id > 0;
  const translationChanged = (state.translationEnabled !== !!prefs.translation_on) || 
                             (state.translationId !== (hasTrId ? prefs.translation_id : 0));
  
  state.translationEnabled = !!prefs.translation_on;
  state.translationId = hasTrId ? prefs.translation_id : 0;
  
  // Reload verses if translation settings changed and we have content loaded
  if (translationChanged && state.currentContext && state.verses.length > 0) {
    reloadCurrentContext();
  }
});
































