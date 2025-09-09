const API_BASE = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://audio.qurancdn.com/';

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
};

const state = {
  currentPage: 1,
  verses: [],
  audioMap: new Map(),
  playIndex: 0,
  reciterId: 7,
  imageProviders: [ { base: '../mushaf_pages/', exts: ['png'], padded: true } ],
};

// Load saved reciter from shared preferences
try {
  const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
  if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) state.reciterId = prefs.reciter_id;
} catch {}

function setStatus(text){ if (els.status) els.status.textContent = text || ''; }
function setCanvasVisible(v){ if(els.canvas) els.canvas.style.display = v ? 'block' : 'none'; }
function setImageVisible(v){ if(els.img) els.img.style.display = v ? 'block' : 'none'; }
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

async function fetchPage(pageNumber){
  setStatus('Loading page...');
  const res = await fetch(`${API_BASE}/verses/by_page/${pageNumber}?words=false&fields=text_uthmani`);
  if(!res.ok) throw new Error(`Page HTTP ${res.status}`);
  const data = await res.json();
  setStatus('');
  return data.verses || [];
}

async function fetchAudioMap(recitationId, chapterNumber) {
  // Paginate to be safe for very long surahs
  const merged = new Map();
  let page = 1;
  while (true) {
    const res = await fetch(`${API_BASE}/recitations/${recitationId}/by_chapter/${chapterNumber}?per_page=300&page=${page}`);
    if (!res.ok) throw new Error(`Audio HTTP ${res.status}`);
    const data = await res.json();
    (data.audio_files || []).forEach(a => merged.set(a.verse_key, AUDIO_CDN + a.url));
    const next = (data.pagination && data.pagination.next_page) || (data.meta && data.meta.next_page) || null;
    if (!next) break; page = next; if (page > 20) break;
  }
  return merged;
}

async function buildAudioForPage(verses){
  const surahSet = new Set();
  verses.forEach(v => { const s = parseInt(String(v.verse_key).split(':')[0], 10); if(s) surahSet.add(s); });
  const tasks = Array.from(surahSet).map(sid => fetchAudioMap(state.reciterId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((url, key) => merged.set(key, url)));
  return merged;
}

function updatePlayerInfo(){
  const total = state.verses.length;
  const current = Math.min(state.playIndex + 1, Math.max(1, total || 1));
  if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total} (Page ${state.currentPage})` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(b => { if(b) b.disabled = !enabled; });
  if (els.pageInfo) els.pageInfo.textContent = state.currentPage ? `Page ${state.currentPage} / 604` : '';
  if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? 'Pause' : 'Play';
}

function setAudioForIndex(i, autoplay=false){
  if(!state.verses.length) return;
  state.playIndex = Math.max(0, Math.min(i, state.verses.length - 1));
  const v = state.verses[state.playIndex];
  const url = state.audioMap.get(v.verse_key);
  if(!url) { try { els.audio.pause(); } catch {}; els.audio.removeAttribute('src'); updatePlayerInfo(); return; }
  els.audio.src = url;
  els.audio.dataset.current = url;
  if(autoplay) els.audio.play().catch(()=>{});
  updatePlayerInfo();
}

function togglePlay(){
  if(!state.verses.length || !state.audioMap.size) return;
  if(!els.audio.src) { setAudioForIndex(state.playIndex, true); return; }
  if(els.audio.paused) els.audio.play().catch(()=>{}); else els.audio.pause();
  updatePlayerInfo();
}

function nextAyah(){
  if(state.playIndex < state.verses.length - 1) { setAudioForIndex(state.playIndex + 1, true); return; }
  if (state.currentPage < 604) {
    loadPage(state.currentPage + 1).then(()=> setAudioForIndex(0, true));
  } else { els.audio.pause(); els.audio.currentTime = 0; updatePlayerInfo(); }
}

function prevAyah(){
  const threshold = 2;
  if(els.audio.currentTime > threshold) { els.audio.currentTime = 0; return; }
  if(state.playIndex > 0) { setAudioForIndex(state.playIndex - 1, true); return; }
  if (state.currentPage > 1) {
    loadPage(state.currentPage - 1).then(()=> { const last = Math.max(0, state.verses.length - 1); setAudioForIndex(last, true); });
  } else { els.audio.currentTime = 0; }
}

function loadPageImage(page){
  if (!els.img) return;
  const providers = state.imageProviders || [];
  const candidates = [];
  providers.forEach(pr => {
    const pageStr = pr.padded ? String(page).padStart(3,'0') : String(page);
    const exts = pr.exts && pr.exts.length ? pr.exts : ['png'];
    exts.forEach(ext => candidates.push(`${pr.base}${pageStr}.${ext}`));
  });
  let idx = 0;
  function tryNext(){
    if (idx >= candidates.length){ els.img.removeAttribute('src'); setCanvasVisible(false); setStatus('Page image unavailable.'); return; }
    const url = candidates[idx++];
    els.img.onerror = () => { tryNext(); };
    els.img.onload = () => { setCanvasVisible(false); setImageVisible(true); setStatus(''); adjustImageFit(); };
    els.img.src = url;
  }
  tryNext();
}

async function loadPage(pageNum){
  try {
    state.currentPage = pageNum;
    const verses = await fetchPage(pageNum);
    state.verses = verses;
    state.audioMap = await buildAudioForPage(verses);
    state.playIndex = 0;
    setAudioForIndex(0, false);
    // hide picker/text area if present
    if (els.display) { els.display.hidden = true; els.display.innerHTML = ''; }
    if (els.toReader && verses[0]) {
      const sid = String(verses[0].verse_key).split(':')[0];
      els.toReader.href = 'reader.html?surah=' + sid;
    }
    loadPageImage(pageNum);
    setStatus(`Loaded page ${pageNum}`);
  } catch(e){ console.error(e); setStatus('Failed to load page.'); alert('Failed to load: ' + e.message); }
}

async function initFromQuery(){
  const params = new URLSearchParams(location.search);
  const pageParam = parseInt(params.get('page')||'', 10);
  const surahParam = parseInt(params.get('surah')||'', 10);
  const juzParam = parseInt(params.get('juz')||'', 10);
  const hizbParam = parseInt(params.get('hizb')||'', 10);
  if(pageParam && pageParam >=1 && pageParam <=604){ await loadPage(pageParam); return; }
  if(surahParam){ try{ const r = await fetch(`${API_BASE}/verses/by_chapter/${surahParam}?per_page=1&page=1`); const j = await r.json(); const p = j?.verses?.[0]?.page_number; if(p){ await loadPage(p); return; } }catch{}
  }
  if(juzParam){ try{ const r = await fetch(`${API_BASE}/verses/by_juz/${juzParam}?per_page=1&words=false`); const j = await r.json(); const p = j?.verses?.[0]?.page_number; if(p){ await loadPage(p); return; } }catch{} }
  if(hizbParam){ try{ const r = await fetch(`${API_BASE}/verses/by_hizb/${hizbParam}?per_page=1&words=false`); const j = await r.json(); const p = j?.verses?.[0]?.page_number; if(p){ await loadPage(p); return; } }catch{} }
  setStatus('Pick a Surah, Juz, or Hizb');
}

// Events & wiring
if (els.navPrev) els.navPrev.addEventListener('click', ()=>{ const was = els.audio && !els.audio.paused; try { els.audio.pause(); } catch{}; const n = Math.max(1, state.currentPage-1); loadPage(n).then(()=>{ if (was) setAudioForIndex(0, true); }); });
if (els.navNext) els.navNext.addEventListener('click', ()=>{ const was = els.audio && !els.audio.paused; try { els.audio.pause(); } catch{}; const n = Math.min(604, state.currentPage+1); loadPage(n).then(()=>{ if (was) setAudioForIndex(0, true); }); });

if (els.prevAyah) els.prevAyah.addEventListener('click', prevAyah);
if (els.playPause) els.playPause.addEventListener('click', togglePlay);
if (els.nextAyah) els.nextAyah.addEventListener('click', nextAyah);
if (els.audio) els.audio.addEventListener('ended', nextAyah);

// Drawer controls
try {
  const open = els.drawerOpen, closeBtn = els.drawerClose, drawer = els.drawer, backdrop = els.drawerBackdrop;
  const openDrawer = () => { if (!drawer) return; document.body.classList.add('drawer-open'); drawer.removeAttribute('aria-hidden'); if (backdrop) backdrop.hidden = false; };
  const closeDrawer = () => { if (!drawer) return; document.body.classList.remove('drawer-open'); drawer.setAttribute('aria-hidden','true'); if (backdrop) backdrop.hidden = true; };
  if (open) open.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeDrawer(); });
} catch {}
if (els.prevPage) els.prevPage.addEventListener('click', ()=>{ const was = els.audio && !els.audio.paused; const n = Math.max(1, state.currentPage-1); loadPage(n).then(()=>{ if (was) setAudioForIndex(0, true); }); });
if (els.nextPage) els.nextPage.addEventListener('click', ()=>{ const was = els.audio && !els.audio.paused; const n = Math.min(604, state.currentPage+1); loadPage(n).then(()=>{ if (was) setAudioForIndex(0, true); }); });

document.addEventListener('DOMContentLoaded', () => { adjustImageFit(); initFromQuery(); updatePlayerInfo(); });
window.addEventListener('resize', () => { adjustImageFit(); if (state.currentPage) { loadPageImage(state.currentPage); } });

