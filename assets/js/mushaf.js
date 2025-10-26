// mushaf.js - Page-based Mushaf with audio

// Elements
const els = {
  canvas: document.getElementById('mushaf-canvas'),
  img: document.getElementById('mushaf-img'),
  audio: document.getElementById('audio'),
  prevAyah: document.getElementById('prev-ayah'),
  playPause: document.getElementById('play-pause'),
  nextAyah: document.getElementById('next-ayah'),
  playerInfo: document.getElementById('player-info'),
  toReader: document.getElementById('to-reader'),
  navPrev: document.getElementById('nav-prev'),
  navNext: document.getElementById('nav-next'),
  prevPage: document.getElementById('prev-page'),
  nextPage: document.getElementById('next-page'),
  pageInfo: document.getElementById('page-info'),
  currentPageNum: document.getElementById('current-page-num'),
  currentSurahName: document.getElementById('current-surah-name'),
  pageRangeText: document.getElementById('page-range-text'),
  drawer: document.getElementById('control-drawer'),
  drawerOpen: document.getElementById('controls-open'),
  drawerClose: document.getElementById('drawer-close'),
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  header: document.getElementById('mushaf-header'),
  // Landing page elements
  landing: document.getElementById('mushaf-landing'),
  toolbar: document.getElementById('mushaf-toolbar'),
  viewer: document.getElementById('mushaf-viewer'),
  surahGridLanding: document.getElementById('surah-grid-landing'),
  landingSearch: document.getElementById('landing-search'),
  backToLanding: document.getElementById('back-to-landing'),
};

// State
const state = {
  currentPage: 1,
  verses: [],
  audioMap: new Map(),
  playIndex: 0,
  reciterId: 7,
  imageProviders: [
    { base: '../assets/img/mushaf_pages/', exts: ['png'], padded: true },
    { base: './assets/img/mushaf_pages/', exts: ['png'], padded: true },
    { base: 'assets/img/mushaf_pages/', exts: ['png'], padded: true },
    { base: '/assets/img/mushaf_pages/', exts: ['png'], padded: true }
  ],
  ctx: null
};

// Load saved reciter from prefs
try {
  const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem('qr_prefs') || '{}');
  if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) state.reciterId = prefs.reciter_id;
}
catch {}

// Helpers
const SURAH_VERSE_MAP = new Map();
const SURAH_PAGE_CACHE = new Map();
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

// Juz data (30 Juz, each with starting page)
const JUZ_DATA = [
  { id: 1, name: 'Juz 1', startPage: 1, startSurah: 1, startVerse: 1 },
  { id: 2, name: 'Juz 2', startPage: 22, startSurah: 2, startVerse: 142 },
  { id: 3, name: 'Juz 3', startPage: 42, startSurah: 2, startVerse: 253 },
  { id: 4, name: 'Juz 4', startPage: 62, startSurah: 3, startVerse: 93 },
  { id: 5, name: 'Juz 5', startPage: 82, startSurah: 4, startVerse: 24 },
  { id: 6, name: 'Juz 6', startPage: 102, startSurah: 4, startVerse: 148 },
  { id: 7, name: 'Juz 7', startPage: 121, startSurah: 5, startVerse: 82 },
  { id: 8, name: 'Juz 8', startPage: 142, startSurah: 6, startVerse: 111 },
  { id: 9, name: 'Juz 9', startPage: 162, startSurah: 7, startVerse: 88 },
  { id: 10, name: 'Juz 10', startPage: 182, startSurah: 8, startVerse: 41 },
  { id: 11, name: 'Juz 11', startPage: 201, startSurah: 9, startVerse: 93 },
  { id: 12, name: 'Juz 12', startPage: 222, startSurah: 11, startVerse: 6 },
  { id: 13, name: 'Juz 13', startPage: 242, startSurah: 12, startVerse: 53 },
  { id: 14, name: 'Juz 14', startPage: 262, startSurah: 15, startVerse: 1 },
  { id: 15, name: 'Juz 15', startPage: 282, startSurah: 17, startVerse: 1 },
  { id: 16, name: 'Juz 16', startPage: 302, startSurah: 18, startVerse: 75 },
  { id: 17, name: 'Juz 17', startPage: 322, startSurah: 21, startVerse: 1 },
  { id: 18, name: 'Juz 18', startPage: 342, startSurah: 23, startVerse: 1 },
  { id: 19, name: 'Juz 19', startPage: 362, startSurah: 25, startVerse: 21 },
  { id: 20, name: 'Juz 20', startPage: 382, startSurah: 27, startVerse: 56 },
  { id: 21, name: 'Juz 21', startPage: 402, startSurah: 29, startVerse: 46 },
  { id: 22, name: 'Juz 22', startPage: 422, startSurah: 33, startVerse: 31 },
  { id: 23, name: 'Juz 23', startPage: 442, startSurah: 36, startVerse: 28 },
  { id: 24, name: 'Juz 24', startPage: 462, startSurah: 39, startVerse: 32 },
  { id: 25, name: 'Juz 25', startPage: 482, startSurah: 41, startVerse: 47 },
  { id: 26, name: 'Juz 26', startPage: 502, startSurah: 46, startVerse: 1 },
  { id: 27, name: 'Juz 27', startPage: 522, startSurah: 51, startVerse: 31 },
  { id: 28, name: 'Juz 28', startPage: 542, startSurah: 58, startVerse: 1 },
  { id: 29, name: 'Juz 29', startPage: 562, startSurah: 67, startVerse: 1 },
  { id: 30, name: 'Juz 30', startPage: 582, startSurah: 78, startVerse: 1 }
];

// Hizb data (60 Hizb, each half of a Juz)
const HIZB_DATA = [
  { id: 1, name: 'Hizb 1', startPage: 1, juz: 1 },
  { id: 2, name: 'Hizb 2', startPage: 10, juz: 1 },
  { id: 3, name: 'Hizb 3', startPage: 21, juz: 2 },
  { id: 4, name: 'Hizb 4', startPage: 31, juz: 2 },
  { id: 5, name: 'Hizb 5', startPage: 41, juz: 3 },
  { id: 6, name: 'Hizb 6', startPage: 51, juz: 3 },
  { id: 7, name: 'Hizb 7', startPage: 61, juz: 4 },
  { id: 8, name: 'Hizb 8', startPage: 71, juz: 4 },
  { id: 9, name: 'Hizb 9', startPage: 81, juz: 5 },
  { id: 10, name: 'Hizb 10', startPage: 91, juz: 5 },
  { id: 11, name: 'Hizb 11', startPage: 101, juz: 6 },
  { id: 12, name: 'Hizb 12', startPage: 111, juz: 6 },
  { id: 13, name: 'Hizb 13', startPage: 121, juz: 7 },
  { id: 14, name: 'Hizb 14', startPage: 131, juz: 7 },
  { id: 15, name: 'Hizb 15', startPage: 141, juz: 8 },
  { id: 16, name: 'Hizb 16', startPage: 151, juz: 8 },
  { id: 17, name: 'Hizb 17', startPage: 161, juz: 9 },
  { id: 18, name: 'Hizb 18', startPage: 171, juz: 9 },
  { id: 19, name: 'Hizb 19', startPage: 181, juz: 10 },
  { id: 20, name: 'Hizb 20', startPage: 191, juz: 10 },
  { id: 21, name: 'Hizb 21', startPage: 201, juz: 11 },
  { id: 22, name: 'Hizb 22', startPage: 211, juz: 11 },
  { id: 23, name: 'Hizb 23', startPage: 221, juz: 12 },
  { id: 24, name: 'Hizb 24', startPage: 231, juz: 12 },
  { id: 25, name: 'Hizb 25', startPage: 241, juz: 13 },
  { id: 26, name: 'Hizb 26', startPage: 251, juz: 13 },
  { id: 27, name: 'Hizb 27', startPage: 261, juz: 14 },
  { id: 28, name: 'Hizb 28', startPage: 271, juz: 14 },
  { id: 29, name: 'Hizb 29', startPage: 281, juz: 15 },
  { id: 30, name: 'Hizb 30', startPage: 291, juz: 15 },
  { id: 31, name: 'Hizb 31', startPage: 301, juz: 16 },
  { id: 32, name: 'Hizb 32', startPage: 311, juz: 16 },
  { id: 33, name: 'Hizb 33', startPage: 321, juz: 17 },
  { id: 34, name: 'Hizb 34', startPage: 331, juz: 17 },
  { id: 35, name: 'Hizb 35', startPage: 341, juz: 18 },
  { id: 36, name: 'Hizb 36', startPage: 351, juz: 18 },
  { id: 37, name: 'Hizb 37', startPage: 361, juz: 19 },
  { id: 38, name: 'Hizb 38', startPage: 371, juz: 19 },
  { id: 39, name: 'Hizb 39', startPage: 381, juz: 20 },
  { id: 40, name: 'Hizb 40', startPage: 391, juz: 20 },
  { id: 41, name: 'Hizb 41', startPage: 401, juz: 21 },
  { id: 42, name: 'Hizb 42', startPage: 411, juz: 21 },
  { id: 43, name: 'Hizb 43', startPage: 421, juz: 22 },
  { id: 44, name: 'Hizb 44', startPage: 431, juz: 22 },
  { id: 45, name: 'Hizb 45', startPage: 441, juz: 23 },
  { id: 46, name: 'Hizb 46', startPage: 451, juz: 23 },
  { id: 47, name: 'Hizb 47', startPage: 461, juz: 24 },
  { id: 48, name: 'Hizb 48', startPage: 471, juz: 24 },
  { id: 49, name: 'Hizb 49', startPage: 481, juz: 25 },
  { id: 50, name: 'Hizb 50', startPage: 491, juz: 25 },
  { id: 51, name: 'Hizb 51', startPage: 501, juz: 26 },
  { id: 52, name: 'Hizb 52', startPage: 511, juz: 26 },
  { id: 53, name: 'Hizb 53', startPage: 521, juz: 27 },
  { id: 54, name: 'Hizb 54', startPage: 531, juz: 27 },
  { id: 55, name: 'Hizb 55', startPage: 541, juz: 28 },
  { id: 56, name: 'Hizb 56', startPage: 551, juz: 28 },
  { id: 57, name: 'Hizb 57', startPage: 561, juz: 29 },
  { id: 58, name: 'Hizb 58', startPage: 571, juz: 29 },
  { id: 59, name: 'Hizb 59', startPage: 581, juz: 30 },
  { id: 60, name: 'Hizb 60', startPage: 591, juz: 30 }
];

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

// Landing page functions
function showLanding() {
  if (els.landing) els.landing.style.display = 'flex';
  if (els.toolbar) els.toolbar.style.display = 'none';
  if (els.viewer) els.viewer.style.display = 'none';
  if (els.header) els.header.style.removeProperty('transform');
  document.body.classList.remove('viewer-mode');
}

function hideLanding() {
  if (els.landing) els.landing.style.display = 'none';
  if (els.toolbar) els.toolbar.style.display = 'block';
  if (els.viewer) els.viewer.style.display = 'block';
  document.body.classList.add('viewer-mode');
}

function createSurahCard(meta) {
  const card = document.createElement('div');
  card.className = 'surah-card';
  card.dataset.surahId = meta.id;
  card.dataset.searchText = `${meta.id} ${meta.label.toLowerCase()}`;
  
  // Get verse count and page info
  const verseCount = getSurahVerseCount(meta.id);
  const startPage = getSurahStartPage(meta.id);
  const pageInfo = startPage ? `Page ${startPage}` : '';
  
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
      ${pageInfo ? `<span class="surah-meta-item">
        <ion-icon name="bookmark-outline"></ion-icon>
        ${pageInfo}
      </span>` : ''}
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
  
  const startPage = getSurahStartPage(sid) || 1;
  state.ctx = { type: 'surah', id: sid };
  
  hideLanding();
  await loadPage(startPage);
  
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
      Starts at page ${juz.startPage}<br>
      ${surahName ? `${surahName} (${juz.startSurah}:${juz.startVerse})` : ''}
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
  
  card.innerHTML = `
    <div class="hizb-card-header">
      <div class="hizb-number">${hizb.id}</div>
      <div class="hizb-title">Hizb ${hizb.id}</div>
    </div>
    <div class="hizb-info">
      Part of Juz ${hizb.juz}<br>
      Starts at page ${hizb.startPage}
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
  
  state.ctx = { type: 'juz', id: juz.id };
  
  hideLanding();
  await loadPage(juz.startPage);
  
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {}
}

async function selectHizb(hizbId) {
  const hizb = HIZB_DATA.find(h => h.id === Number(hizbId));
  if (!hizb) return;
  
  state.ctx = { type: 'hizb', id: hizb.id };
  
  hideLanding();
  await loadPage(hizb.startPage);
  
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {}
}

function updateViewerInfo() {
  // Update current surah name
  if (els.currentSurahName && state.verses && state.verses[0]) {
    const sid = parseInt(String(state.verses[0].verse_key).split(':')[0], 10);
    if (!Number.isNaN(sid)) {
      const meta = SURAH_META.find(m => m.id === sid);
      if (meta) {
        const name = meta.label.split('. ')[1] || meta.label;
        els.currentSurahName.textContent = name;
      }
    }
  }
  
  // Update page info
  if (els.currentPageNum) {
    els.currentPageNum.textContent = state.currentPage || '1';
  }
  
  if (els.pageRangeText) {
    els.pageRangeText.textContent = `Page ${state.currentPage || 1}`;
  }
}

function setStatus(txt) {
  // Status messages now silent
}

let controls = null;
let activeRange = { start: null, end: null };
let pendingRangeFocus = false;


function getSurahVerseCount(id){
  const sid = Number(id);
  if (Number.isNaN(sid) || sid < 1) return 0;
  if (!SURAH_VERSE_MAP.has(sid)){
    const list = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
    const entry = list.find(ch => ch && Number(ch.id) === sid) || null;
    const count = entry && Number(entry.verses_count) > 0 ? Number(entry.verses_count) : 286;
    SURAH_VERSE_MAP.set(sid, count);
  }
  return SURAH_VERSE_MAP.get(sid) || 0;
}

function getSurahStartPage(id){
  const sid = Number(id);
  if (!sid || Number.isNaN(sid)) return null;
  const list = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
  const entry = list.find(ch => ch && Number(ch.id) === sid) || null;
  if (entry && Array.isArray(entry.pages) && entry.pages.length){
    const start = Number(entry.pages[0]);
    if (!Number.isNaN(start) && start >= 1 && start <= 604) return start;
  }
  return null;
}

function parseVerseKey(key){
  if (!key) return null;
  const parts = String(key).split(':');
  const surah = Number(parts[0]);
  const ayah = Number(parts[1]);
  if (!surah || !ayah || Number.isNaN(surah) || Number.isNaN(ayah)) return null;
  return { surah, ayah };
}

function compareVerseKeys(a, b){
  const pa = parseVerseKey(a);
  const pb = parseVerseKey(b);
  if (!pa || !pb) return 0;
  if (pa.surah !== pb.surah) return pa.surah - pb.surah;
  return pa.ayah - pb.ayah;
}

function normaliseRange(range){
  if (!range || !range.start || !range.end) return null;
  const start = parseVerseKey(range.start);
  const end = parseVerseKey(range.end);
  if (!start || !end) return null;
  if (compareVerseKeys(range.start, range.end) <= 0) return { start: `${start.surah}:${start.ayah}`, end: `${end.surah}:${end.ayah}` };
  return { start: `${end.surah}:${end.ayah}`, end: `${start.surah}:${start.ayah}` };
}

function nextVerseKey(key){
  const parts = parseVerseKey(key);
  if (!parts) return null;
  const total = getSurahVerseCount(parts.surah);
  if (parts.ayah < total) return `${parts.surah}:${parts.ayah + 1}`;
  if (parts.surah < 114) return `${parts.surah + 1}:1`;
  return null;
}

function prevVerseKey(key){
  const parts = parseVerseKey(key);
  if (!parts) return null;
  if (parts.ayah > 1) return `${parts.surah}:${parts.ayah - 1}`;
  if (parts.surah > 1){
    const prevSurah = parts.surah - 1;
    const count = getSurahVerseCount(prevSurah);
    return `${prevSurah}:${count || 1}`;
  }
  return null;
}

async function getPageNumberForKey(key){
  const parts = parseVerseKey(key);
  if (!parts) return null;
  if (!SURAH_PAGE_CACHE.has(parts.surah)){
    try {
      const verses = await QR.api.fetchVersesByChapter(parts.surah, 'page_number');
      const map = new Map();
      (verses || []).forEach(v => { if (v && v.verse_key) map.set(String(v.verse_key), v.page_number); });
      SURAH_PAGE_CACHE.set(parts.surah, map);
    } catch {
      SURAH_PAGE_CACHE.set(parts.surah, new Map());
    }
  }
  const map = SURAH_PAGE_CACHE.get(parts.surah) || new Map();
  return map.get(String(key)) || null;
}
function setStatus(txt){ if (els.status) els.status.textContent = txt || ''; }
function adjustImageFit(){
  try {
    const header = document.querySelector('.app-header');
    const toolbar = document.querySelector('.toolbar');
    const extra = 40;
    const avail = Math.max(300, window.innerHeight - ((header?.offsetHeight)||0) - ((toolbar?.offsetHeight)||0) - extra);
    if (els.img) els.img.style.maxHeight = avail + 'px';
    if (els.canvas) els.canvas.style.maxHeight = avail + 'px';
  } catch {}
}

// Fetch page data
async function fetchPage(page){
  setStatus('Loading page...');
  const verses = await QR.api.fetchVersesByPage(page, 'text_uthmani');
  setStatus('');
  return verses || [];
}

async function buildAudioForPage(verses){
  const surahSet = new Set();
  verses.forEach(v => {
    const sid = parseInt(String(v.verse_key).split(':')[0], 10);
    if (sid) surahSet.add(sid);
  });
  const tasks = Array.from(surahSet).map(sid => QR.api.fetchAudioMap(state.reciterId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((url, key) => merged.set(key, url)));
  return merged;
}

function updatePlayerInfo(){
  const total = state.verses.length;
  const current = Math.min(state.playIndex+1, Math.max(1,total||1));
  const curV = (state.verses||[])[Math.max(0,Math.min(state.playIndex,(state.verses.length||1)-1))];
  
  // Update player info in drawer
  if (els.playerInfo) {
    if (total && curV) {
      els.playerInfo.innerHTML = `
        <ion-icon name="radio-outline"></ion-icon>
        <span>Playing ayah ${current} of ${total}</span>
      `;
    } else {
      els.playerInfo.innerHTML = `
        <ion-icon name="radio-outline"></ion-icon>
        <span>No audio loaded</span>
      `;
    }
  }
  
  // Update page info badge in drawer
  if (els.pageInfo) {
    const label = state.currentPage ? `Page ${state.currentPage}` : 'Page -';
    els.pageInfo.textContent = label;
  }
  
  // Update play/pause button with icon only
  if (els.playPause) {
    const isPlaying = els.audio && !els.audio.paused;
    const iconName = isPlaying ? 'pause' : 'play';
    els.playPause.innerHTML = `<ion-icon name="${iconName}"></ion-icon>`;
    els.playPause.title = isPlaying ? 'Pause' : 'Play';
  }
  
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(b => { if(b) b.disabled = !enabled; });
}
function setAudioForIndex(index, autoplay=false){
  if (!state.verses.length || !els.audio) return false;
  const clamped = Math.max(0, Math.min(index, state.verses.length - 1));
  state.playIndex = clamped;
  const verse = state.verses[clamped];
  if (!verse || !verse.verse_key) { updatePlayerInfo(); return false; }
  const url = state.audioMap.get(verse.verse_key);
  if (!url) {
    try { els.audio.pause(); } catch {}
    try { els.audio.removeAttribute('src'); delete els.audio.dataset.current; } catch {}
    updatePlayerInfo();
    return false;
  }
  if (els.audio.dataset.current !== url) {
    els.audio.src = url;
    els.audio.dataset.current = url;
  }
  if (autoplay) {
    try { els.audio.play(); } catch {}
  }
  updatePlayerInfo();
  return true;
}

function getCurrentVerseKey(){
  const verses = state.verses || [];
  if (!verses.length) return '';
  const idx = Math.max(0, Math.min(state.playIndex, verses.length - 1));
  const verse = verses[idx];
  return verse && verse.verse_key ? String(verse.verse_key) : '';
}

async function ensureVerseOnPage(key){
  if (!key) return false;
  if ((state.verses || []).some(v => v && v.verse_key === key)) return true;
  const page = await getPageNumberForKey(key);
  if (!page) return false;
  await loadPage(page);
  return (state.verses || []).some(v => v && v.verse_key === key);
}

async function focusOnKey(key, autoplay=false, scrollTop=false){
  if (!key) return false;
  const available = await ensureVerseOnPage(key);
  if (!available) return false;
  const verses = state.verses || [];
  const idx = verses.findIndex(v => v && v.verse_key === key);
  if (idx === -1) return false;
  setAudioForIndex(idx, autoplay);
  if (scrollTop) {
    try { window.scrollTo(0, 0); } catch {}
  }
  return true;
}

async function defaultNextAyah(){
  const lastIdx = Math.max(0, state.verses.length - 1);
  if (state.playIndex < lastIdx) {
    setAudioForIndex(state.playIndex + 1, true);
    return;
  }
  if (state.currentPage < 604) {
    await loadPage(state.currentPage + 1, true);
  } else {
    try { els.audio.pause(); els.audio.currentTime = 0; } catch {}
  }
}

async function defaultPrevAyah(){
  const threshold = 2;
  try {
    if (els.audio.currentTime > threshold) {
      els.audio.currentTime = 0;
      return;
    }
  } catch {}
  if (state.playIndex > 0) {
    setAudioForIndex(state.playIndex - 1, true);
    return;
  }
  if (state.currentPage > 1) {
    await loadPage(state.currentPage - 1, false);
    const lastIdx = Math.max(0, state.verses.length - 1);
    setAudioForIndex(lastIdx, true);
  }
}
function togglePlay(){
  if(!state.verses.length || !state.audioMap.size) return;
  if(!els.audio.src){ setAudioForIndex(state.playIndex,true); return; }
  if(els.audio.paused) els.audio.play().catch(()=>{}); else els.audio.pause();
  updatePlayerInfo();
}

async function nextAyah(){
  const loopOne = (window.QR && QR.controlPanel && typeof QR.controlPanel.getLoopOne === 'function') ? QR.controlPanel.getLoopOne() : false;
  if (loopOne){ setAudioForIndex(state.playIndex, true); return; }
  const range = (window.QR && QR.controlPanel && typeof QR.controlPanel.getRange === 'function') ? normaliseRange(QR.controlPanel.getRange()) : null;
  const currentKey = getCurrentVerseKey();
  if (range && range.start && range.end){
    let target = currentKey;
    if (!target || compareVerseKeys(target, range.start) < 0){
      target = range.start;
    } else {
      const nextKey = nextVerseKey(target);
      target = (nextKey && compareVerseKeys(nextKey, range.end) <= 0) ? nextKey : range.start;
    }
    if (target) await focusOnKey(target, true, true);
    return;
  }
  await defaultNextAyah();
}

async function prevAyah(){
  const threshold = 2;
  try { if (els.audio.currentTime > threshold) { els.audio.currentTime = 0; return; } } catch {}
  const loopOne = (window.QR && QR.controlPanel && typeof QR.controlPanel.getLoopOne === 'function') ? QR.controlPanel.getLoopOne() : false;
  if (loopOne){ setAudioForIndex(state.playIndex, true); return; }
  const range = (window.QR && QR.controlPanel && typeof QR.controlPanel.getRange === 'function') ? normaliseRange(QR.controlPanel.getRange()) : null;
  const currentKey = getCurrentVerseKey();
  if (range && range.start && range.end){
    let target = currentKey;
    if (!target || compareVerseKeys(target, range.start) <= 0){
      target = range.end;
    } else {
      const prevKey = prevVerseKey(target);
      target = (prevKey && compareVerseKeys(prevKey, range.start) >= 0) ? prevKey : range.end;
    }
    if (target) await focusOnKey(target, true, true);
    return;
  }
  await defaultPrevAyah();
}

async function loadPage(page, autoplayFirst=false){
  try {
    state.currentPage = page;
    const verses = await fetchPage(page);
    state.verses = verses;
    state.audioMap = await buildAudioForPage(verses);
    state.playIndex = 0;
    setAudioForIndex(0, !!autoplayFirst);
    if (controls && typeof controls.setCurrentPage === "function") controls.setCurrentPage(page);
    
    // Update viewer info
    updateViewerInfo();
    
    const shouldRefocus = pendingRangeFocus && activeRange.start;
    if (shouldRefocus) {
      pendingRangeFocus = false;
      try { focusOnKey(activeRange.start, false, true).catch(()=>{}); } catch {}
    }


    if (els.toReader && verses[0]){
      const sid = String(verses[0].verse_key).split(':')[0];
      const qp = new URLSearchParams();
      if (state.ctx && state.ctx.type && state.ctx.id){
        if (state.ctx.type === 'surah') qp.set('surah', state.ctx.id);
        else if (state.ctx.type === 'juz') qp.set('juz', state.ctx.id);
        else if (state.ctx.type === 'hizb') qp.set('hizb', state.ctx.id);
      } else if (sid){
        qp.set('surah', sid);
      }
      qp.set('page', page);
      qp.set('controls', 'open');
      els.toReader.href = `reader.html?${qp.toString()}`;
    }

    loadPageImage(page);

    setStatus(`Loaded page ${page}`);
  } catch(e){ console.error(e); setStatus('Failed to load page.'); }
}

function loadPageImage(page){
  if (!els.img) return;
  const providers = state.imageProviders || [];
  const candidates = [];
  providers.forEach(pr=>{
    const pstr = pr.padded ? String(page).padStart(3,'0') : String(page);
    (pr.exts?.length?pr.exts:['png']).forEach(ext=>candidates.push(`${pr.base}${pstr}.${ext}`));
  });
  let idx=0;
  function tryNext(){
    if (idx>=candidates.length){ els.img.removeAttribute('src'); setStatus('Page image unavailable.'); return; }
    const url = candidates[idx++];
    els.img.onerror=()=>tryNext();
    els.img.onload=()=>{ setStatus(''); adjustImageFit(); };
    els.img.src=url;
  }
  tryNext();
}

// Events
if (els.prevAyah) els.prevAyah.addEventListener('click', ()=> prevAyah());
if (els.nextAyah) els.nextAyah.addEventListener('click', ()=> nextAyah());
if (els.playPause) els.playPause.addEventListener('click', togglePlay);
if (els.audio) {
  els.audio.addEventListener('ended', ()=> nextAyah());
}
// Page navigation (buttons keep labels: Prev=page-1, Next=page+1)
if (els.prevPage) els.prevPage.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));
if (els.nextPage) els.nextPage.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
// Overlay arrows: Right-to-left reading - left arrow goes forward (page+1), right arrow goes back (page-1)
if (els.navPrev) els.navPrev.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
if (els.navNext) els.navNext.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (els.drawer && !els.drawer.hasAttribute('aria-hidden')) return; // Don't navigate if drawer is open
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  
  // Arrow keys for page navigation (RTL: left=next, right=prev)
  if (e.key === 'ArrowLeft' && state.currentPage < 604) {
    e.preventDefault();
    loadPage(state.currentPage + 1);
  } else if (e.key === 'ArrowRight' && state.currentPage > 1) {
    e.preventDefault();
    loadPage(state.currentPage - 1);
  }
  // Space bar for play/pause
  else if (e.key === ' ' && els.playPause && !els.playPause.disabled) {
    e.preventDefault();
    togglePlay();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  adjustImageFit();
  
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
  
  // Check if we have URL parameters to skip landing
  let shouldShowLanding = true;
  let initialPage = 1; // Default to page 1, will be overridden by URL params
  let skipFirstRangeChange = false; // Skip control panel's initial range restoration if we have URL params
  
  try {
    const params = new URLSearchParams(location.search);
    const pageParam = parseInt(params.get("page") || "", 10);
    const surahParam = parseInt(params.get("surah") || "", 10);
    const juzParam = parseInt(params.get("juz") || "", 10);
    const hizbParam = parseInt(params.get("hizb") || "", 10);
    const viewParam = params.get("view");
    
    // If view=viewer is explicitly set, skip landing
    if (viewParam === "viewer") {
      shouldShowLanding = false;
      skipFirstRangeChange = true; // Don't restore saved range when explicitly navigating to a page
    }
    
    if (!Number.isNaN(surahParam) && surahParam >= 1 && surahParam <= 114) {
      state.ctx = { type: 'surah', id: surahParam };
      shouldShowLanding = false;
      skipFirstRangeChange = true;
    } else if (!Number.isNaN(juzParam) && juzParam >= 1 && juzParam <= 30) {
      state.ctx = { type: 'juz', id: juzParam };
      shouldShowLanding = false;
      skipFirstRangeChange = true;
    } else if (!Number.isNaN(hizbParam) && hizbParam >= 1 && hizbParam <= 60) {
      state.ctx = { type: 'hizb', id: hizbParam };
      shouldShowLanding = false;
      skipFirstRangeChange = true;
    } else {
      state.ctx = null;
    }
    
    if (!Number.isNaN(pageParam) && pageParam >= 1 && pageParam <= 604) {
      initialPage = pageParam;
      shouldShowLanding = false;
      skipFirstRangeChange = true;
    } else if (state.ctx && state.ctx.type === 'surah') {
      const maybePage = getSurahStartPage(state.ctx.id);
      if (maybePage) initialPage = maybePage;
    } else if (state.ctx && state.ctx.type === 'juz') {
      const juz = JUZ_DATA.find(j => j.id === state.ctx.id);
      if (juz) initialPage = juz.startPage;
    } else if (state.ctx && state.ctx.type === 'hizb') {
      const hizb = HIZB_DATA.find(h => h.id === state.ctx.id);
      if (hizb) initialPage = hizb.startPage;
    }
  } catch {}
  
  // Show landing or load page based on URL params
  if (shouldShowLanding) {
    showLanding();
  } else {
    hideLanding();
    await loadPage(initialPage);
  }

  if (window.QR && QR.controlPanel && typeof QR.controlPanel.init === "function") {
    controls = QR.controlPanel.init({
      onRangeChange: async (range) => {
        // Skip range change if we just loaded from URL params
        if (skipFirstRangeChange) {
          skipFirstRangeChange = false;
          return;
        }
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
    if (controls && typeof controls.setCurrentPage === "function") controls.setCurrentPage(state.currentPage || null);
  }

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

  updatePlayerInfo();
});
window.addEventListener('resize', adjustImageFit);











































