// mushaf.js - Page-based Mushaf with audio

// Elements
const els = {
  status: document.getElementById('status'),
  display: document.getElementById('quran-display'),
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
  drawer: document.getElementById('control-drawer'),
  drawerOpen: document.getElementById('controls-open'),
  drawerClose: document.getElementById('drawer-close'),
  drawerBackdrop: document.getElementById('drawer-backdrop'),
  // Loop & bookmarks UI
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
  setStatus('Loading page…');
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
  if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total} (Page ${state.currentPage}${curV?` - ${curV.verse_key}`:''})` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(b => { if(b) b.disabled = !enabled; });
  if (els.pageInfo) {
    const v = curV; const label = state.currentPage ? `Page ${state.currentPage}${v?` - ${v.verse_key}`:''}` : '';
    els.pageInfo.textContent = label;
  }
  if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? 'Pause' : 'Play';
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
    const shouldRefocus = pendingRangeFocus && activeRange.start;
    if (shouldRefocus) {
      pendingRangeFocus = false;
      try { focusOnKey(activeRange.start, false, true).catch(()=>{}); } catch {}
    }


    if (els.toReader && verses[0]){
      const sid = String(verses[0].verse_key).split(':')[0];
      els.toReader.href = 'reader.html?surah=' + sid + '&controls=open';
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
  els.audio.addEventListener('play', ()=>{ try { if (window.QR && QR.streaks) QR.streaks.bump('play'); } catch {} });
}
// Page navigation (buttons keep labels: Prev=page-1, Next=page+1)
if (els.prevPage) els.prevPage.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));
if (els.nextPage) els.nextPage.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
// Overlay arrows: Right-to-left reading - left arrow goes forward (page+1), right arrow goes back (page-1)
if (els.navPrev) els.navPrev.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
if (els.navNext) els.navNext.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));

document.addEventListener("DOMContentLoaded", () => {
  adjustImageFit();
  loadPage(1);

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











































