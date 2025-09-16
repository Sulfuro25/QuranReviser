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
  isLoading: false,
  followMode: false,
  wbwOn: false,
  wbwHover: true,
  rootFilter: '',
};

try { window.state = state; } catch {}

const SURAH_VERSE_MAP = new Map();
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
    if (window.QR && QR.prefs) QR.prefs.set({ theme });
    else {
      let prefs = {}; try { prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}'); } catch {}
      prefs.theme = theme; localStorage.setItem('qr_prefs', JSON.stringify(prefs));
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
  const res = await fetch(`${API_BASE}/quran/translations/${translationId}?chapter_number=${chapterNumber}`);
  if (!res.ok) throw new Error(`Translation HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map();
  (data.translations || []).forEach(t => map.set(t.verse_key, t.text));
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
  // Only highlight/scroll if the current ayah exists on the visible page; do not change pages here
  try { document.querySelectorAll('.verse.active').forEach(el => el.classList.remove('active')); } catch {}
  const el = document.querySelector(`.verse[data-key="${CSS.escape(currentKey)}"]`);
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
  if (els.audio.paused) els.audio.play().then(()=>{ try { if (window.QR && QR.streaks) QR.streaks.bump('play'); } catch {} }).catch(()=>{});
  else els.audio.pause();
  updatePlayerInfo();
}

async function nextAyah() {
  const loopOne = (window.QR && QR.controlPanel && typeof QR.controlPanel.getLoopOne === 'function') ? QR.controlPanel.getLoopOne() : false;
  if (loopOne) {
    setAudioForIndex(state.playIndex, true);
    return;
  }
  const range = (window.QR && QR.controlPanel && typeof QR.controlPanel.getRange === 'function') ? normaliseRange(QR.controlPanel.getRange()) : null;
  const currentKey = getCurrentVerseKey();
  if (range && range.start && range.end) {
    let target = currentKey;
    if (!target || compareVerseKeys(target, range.start) < 0) {
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
  if (range && range.start && range.end) {
    let target = currentKey;
    if (!target || compareVerseKeys(target, range.start) <= 0) {
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
      setAudioForIndex(0, !!wasPlaying);
      try { window.scrollTo(0, 0); } catch {}
    }
  }
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
  if (!totalAll) {
    els.display.innerHTML = '';
    updatePlayerInfo();
    try { if (window.QR && QR.controlPanel && typeof QR.controlPanel.setCurrentPage === 'function') QR.controlPanel.setCurrentPage(null); } catch {}
    return;
  }

  const frag = document.createDocumentFragment();
  verses.forEach(v => {
    const hasTr = state.translations.has(v.verse_key);
    const card = document.createElement('article');
    card.className = 'verse';
    try { card.setAttribute('data-key', v.verse_key); } catch {}

    const head = document.createElement('div');
    head.className = 'verse-header';
    const meta = document.createElement('div');
    meta.className = 'ayah-meta';
    meta.textContent = v.verse_key;
    const actions = document.createElement('div');
    actions.className = 'verse-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', async () => {
      try {
        const text = v.text_uthmani || String(v.text_uthmani_tajweed || '').replace(/<[^>]+>/g, '');
        await navigator.clipboard.writeText(text);
      } catch {}
    });
    actions.appendChild(copyBtn);
    head.appendChild(meta);
    head.appendChild(actions);
    card.appendChild(head);

    const arabic = document.createElement('div');
    arabic.className = 'arabic';
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
      if (v.text_uthmani) arabic.textContent = v.text_uthmani; else arabic.innerHTML = v.text_uthmani_tajweed;
    }
    card.appendChild(arabic);

    if (state.translationEnabled && hasTr) {
      const tr = document.createElement('div');
      tr.className = 'translation';
      tr.innerHTML = state.translations.get(v.verse_key) || '';
      card.appendChild(tr);
    }

    frag.appendChild(card);
  });

  els.display.innerHTML = '';
  els.display.appendChild(frag);

  try { applyRootHighlight(); } catch {}

  if (els.pageInfo) {
    if (hasPageGroups && currentPageNumber) {
      const localIndex = Math.max(0, Math.min(state.pageIndex, state.pageNumbers.length - 1)) + 1;
      els.pageInfo.textContent = `Page ${currentPageNumber} (${localIndex}/${state.pageNumbers.length})`;
    } else {
      els.pageInfo.textContent = `${start + 1}-${end} / ${totalAll}`;
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
  if (verses.length) state.playIndex = Math.max(0, Math.min(state.playIndex, verses.length - 1));
  else state.playIndex = 0;
  updatePlayerInfo();
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
  state.currentContext = { type: 'surah', id: surahId };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading…');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    // Build URL to include translations inline when enabled + id present
    const withTr = state.translationEnabled && !!state.translationId;
    let verses = [];
    if (state.wbwOn) {
      verses = await QR.api.fetchVersesByChapterWBW(surahId, 'translation,transliteration,root,lemma', 'page_number');
    } else {
      verses = await QR.api.fetchVersesByChapter(surahId, 'text_uthmani,page_number');
    }
    const [audioMap, trMap] = await Promise.all([
      fetchAudioMap(state.currentReciterId, surahId),
      (async ()=>{
        if (!withTr) return new Map();
        // If WBW fetch omitted verse translations, fetch them by chapter
        try { return await fetchTranslationsForChapter(state.translationId, surahId); } catch { return new Map(); }
      })()
    ]);
    state.verses = verses;
    state.translations = trMap || new Map();
    state.audioMap = audioMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded ${verses.length} ayah(s).`);
  } catch (e) {
    console.error(e);
    alert('Failed to load data: ' + e.message);
    setStatus('Failed to load.');
  } finally { state.isLoading = false; }
  // update mushaf link to this surah (keep controls open on arrival)
  if (els.toMushaf) els.toMushaf.href = `mushaf.html?surah=${surahId}&controls=open`;
}

async function loadJuz(juzNumber) {
  state.currentContext = { type: 'juz', id: juzNumber };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading Juz…');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    // Pull all verses (handle pagination) with or without WBW; translations separately if enabled
    const withTr = state.translationEnabled && !!state.translationId;
    const verses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('juz', juzNumber, 'translation,transliteration,root,lemma', 'page_number', 300)
                               : await fetchVersesByRange('juz', juzNumber, withTr);
    // Build audio map across involved surahs
    const audioMap = await buildAudioForVerses(verses);
    const trMap = withTr ? await buildTranslationsForVerses(verses, state.translationId) : new Map();
    state.verses = verses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Juz ${juzNumber} (${verses.length} ayah).`);
    // Update Mushaf link to this Juz context (keep controls open on arrival)
    if (els.toMushaf) els.toMushaf.href = `mushaf.html?juz=${juzNumber}&controls=open`;
  } catch (e) {
    console.error(e);
    alert('Failed to load Juz: ' + e.message);
    setStatus('Failed to load Juz.');
  } finally { state.isLoading = false; }
}

async function loadHizb(hizbNumber) {
  state.currentContext = { type: 'hizb', id: hizbNumber };
  try {
    if (state.isLoading) return; state.isLoading = true;
    setStatus('Loading Hizb…');
    try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } } catch {}
    await ensureTranslationSource();
    const withTr = state.translationEnabled && !!state.translationId;
    const verses = state.wbwOn ? await QR.api.fetchVersesByRangeWBW('hizb', hizbNumber, 'translation,transliteration,root,lemma', 'page_number', 300)
                               : await fetchVersesByRange('hizb', hizbNumber, withTr);
    const audioMap = await buildAudioForVerses(verses);
    const trMap = withTr ? await buildTranslationsForVerses(verses, state.translationId) : new Map();
    state.verses = verses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.pageIndex = 0;
    recomputePageNumbers();
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Hizb ${hizbNumber} (${verses.length} ayah).`);
    // Update Mushaf link to this Hizb context (keep controls open on arrival)
    if (els.toMushaf) els.toMushaf.href = `mushaf.html?hizb=${hizbNumber}&controls=open`;
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
if (els.audio) {
  els.audio.addEventListener('ended', () => { if (!state.isLoading) nextAyah(); });
  els.audio.addEventListener('play', () => { try { if (window.QR && QR.streaks) QR.streaks.bump('play'); } catch {} });
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

  try {
    const back = document.querySelector(".back-link");
    const modeParam = (params.get("mode") || "").toLowerCase() || (!Number.isNaN(juzParam) ? "juz" : !Number.isNaN(hizbParam) ? "hizb" : "surahs");
    if (back) {
      const backUrl = "surahs.html?mode=" + encodeURIComponent(modeParam);
      back.textContent = "List";
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
      await loadSurah(surahParam);
      return;
    }
    if (!Number.isNaN(juzParam) && juzParam >= 1 && juzParam <= 30) {
      await loadJuz(juzParam);
      return;
    }
    if (!Number.isNaN(hizbParam) && hizbParam >= 1 && hizbParam <= 60) {
      await loadHizb(hizbParam);
      return;
    }
  } catch (e) {
    console.error(e);
  }

  location.replace("surahs.html");
});

// ----- WBW helpers -----
let _wbwTip;
function ensureTip(){ if (_wbwTip) return _wbwTip; const d = document.createElement('div'); d.id='wbw-tip'; d.style.position='fixed'; d.style.zIndex='50'; d.style.pointerEvents='none'; d.style.maxWidth='320px'; d.style.background='var(--surface)'; d.style.color='var(--text)'; d.style.border='1px solid var(--border)'; d.style.borderRadius='8px'; d.style.padding='8px 10px'; d.style.boxShadow='0 4px 18px rgba(0,0,0,.35)'; d.style.fontSize='13px'; d.style.lineHeight='1.35'; d.style.display='none'; document.body.appendChild(d); _wbwTip=d; return d; }
function showWbwTip(el, evt){ const tip = ensureTip(); const gloss = el.dataset.gloss||''; const translit = el.dataset.translit||''; const root = el.dataset.root||''; const parts=[]; if (gloss) parts.push(gloss); if (translit) parts.push(`<span class="muted">${translit}</span>`); if (root) parts.push(`<span class="muted">Root: ${root}</span>`); tip.innerHTML = parts.join('<br>'); if (!tip.innerHTML) { hideWbwTip(); return; } tip.style.display='block'; const x = Math.min(window.innerWidth-10, Math.max(10, evt.clientX+12)); const y = Math.min(window.innerHeight-10, Math.max(10, evt.clientY+12)); tip.style.left = x+'px'; tip.style.top = y+'px'; }
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



























