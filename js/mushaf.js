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
  pkPanel: document.getElementById('picker'),
  pkList: document.getElementById('pk-list'),
  pkFilter: document.getElementById('pk-filter'),
  pkSurahs: document.getElementById('pk-surahs'),
  pkJuz: document.getElementById('pk-juz'),
  pkHizb: document.getElementById('pk-hizb'),
};

const state = {
  currentPage: 1,
  verses: [],
  audioMap: new Map(),
  playIndex: 0,
  reciterId: 7,
  // Use only local Tajwid Mushaf images (001.png..604.png)
  imageProviders: [
    { base: '../mushaf_pages/', exts: ['png'], padded: true },
  ],
  pdfUrl: '',
  pdfDoc: null,
  pdfOffset: 0,
  pdfOffsetExplicit: false,
  // Picker state
  pkMode: 'surahs',
  chapters: [],
};

// Load persisted offset if any
try {
  const saved = parseInt(localStorage.getItem('mushaf_pdf_offset')||'', 10);
  if (!Number.isNaN(saved)) { state.pdfOffset = saved; state.pdfOffsetExplicit = true; }
} catch {}

// Load saved reciter from shared preferences
try {
  const prefs = JSON.parse(localStorage.getItem('qr_prefs')||'{}');
  if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) state.reciterId = prefs.reciter_id;
} catch {}

function setCanvasVisible(v){ if(els.canvas) els.canvas.style.display = v ? 'block' : 'none'; }
function setImageVisible(v){ if(els.img) els.img.style.display = v ? 'block' : 'none'; }
function adjustImageFit(){
  try {
    const header = document.querySelector('.app-header');
    const toolbar = document.querySelector('.toolbar');
    const extra = 40; // padding/margins
    const avail = Math.max(300, window.innerHeight - ((header?.offsetHeight)||0) - ((toolbar?.offsetHeight)||0) - extra);
    if (els.img) els.img.style.maxHeight = avail + 'px';
    if (els.canvas) els.canvas.style.maxHeight = avail + 'px';
  } catch {}
}

async function ensurePdfLoaded(){
  try {
    if (state.pdfDoc) return state.pdfDoc;
    if (window['pdfjsLib']) {
      const pdfjsLib = window['pdfjsLib'];
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      state.pdfDoc = await pdfjsLib.getDocument(state.pdfUrl).promise;
      // Guess offset if PDF has extra pages and none explicitly provided
      if (!state.pdfOffsetExplicit && state.pdfDoc?.numPages && state.pdfDoc.numPages !== 604) {
        const guess = state.pdfDoc.numPages - 604;
        if (guess >= 0 && guess <= 50) state.pdfOffset = guess;
      }
      return state.pdfDoc;
    }
  } catch (e) {
    console.error('PDF load failed', e);
    setStatus('Failed to load PDF.');
  }
  return null;
}

async function renderPdfPage(page){
  // PDF disabled: always render via images
  setCanvasVisible(false);
  loadPageImage(page);
}

function setStatus(text){ els.status.textContent = text || ''; }

async function fetchPage(pageNumber){
  setStatus('Loading page...');
  const res = await fetch(`${API_BASE}/verses/by_page/${pageNumber}?words=false&fields=text_uthmani_tajweed`);
  if(!res.ok) throw new Error(`Page HTTP ${res.status}`);
  const data = await res.json();
  setStatus('');
  return data.verses || [];
}

async function fetchAudioMap(recitationId, chapterNumber) {
  const res = await fetch(`${API_BASE}/recitations/${recitationId}/by_chapter/${chapterNumber}`);
  if (!res.ok) throw new Error(`Audio HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map();
  (data.audio_files || []).forEach(a => map.set(a.verse_key, AUDIO_CDN + a.url));
  return map;
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
  els.playerInfo.textContent = total ? `Ayah ${current} / ${total} (Page ${state.currentPage})` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(b => { if(b) b.disabled = !enabled; });
  els.playPause.textContent = (els.audio && !els.audio.paused) ? '⏸ Pause' : '▶ Play';
}

function setAudioForIndex(i, autoplay=false){
  if(!state.verses.length) return;
  state.playIndex = Math.max(0, Math.min(i, state.verses.length - 1));
  const v = state.verses[state.playIndex];
  const url = state.audioMap.get(v.verse_key);
  if(!url) return;
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
  if(state.playIndex < state.verses.length - 1) setAudioForIndex(state.playIndex + 1, true);
  else { els.audio.pause(); els.audio.currentTime = 0; updatePlayerInfo(); }
}

function prevAyah(){
  const threshold = 2;
  if(els.audio.currentTime > threshold) { els.audio.currentTime = 0; return; }
  if(state.playIndex > 0) setAudioForIndex(state.playIndex - 1, true); else els.audio.currentTime = 0;
}

function loadPageImage(page){
  if (!els.img) return;
  const providers = state.imageProviders || [];
  const candidates = [];
  providers.forEach(pr => {
    const pageStr = pr.padded ? String(page).padStart(3,'0') : String(page);
    const exts = pr.exts && pr.exts.length ? pr.exts : ['png'];
    exts.forEach(ext => {
      const url = `${pr.base}${pageStr}.${ext}`;
      candidates.push(url);
    });
  });
  let idx = 0;
  function tryNext(){
    if (idx >= candidates.length){
      els.img.removeAttribute('src');
      setCanvasVisible(false);
      if (els.display) { els.display.hidden = true; els.display.innerHTML = ''; }
      setStatus('Page image unavailable.');
      return;
    }
    const url = candidates[idx++];
    els.img.onerror = () => { tryNext(); };
    els.img.onload = () => { if (els.display) els.display.hidden = true; setCanvasVisible(false); setImageVisible(true); setStatus(''); adjustImageFit(); };
    els.img.src = url;
  }
  tryNext();
}

// Picker helpers
function setPickerMode(m){
  state.pkMode = m;
  const setPressed = (btn, on) => { if (!btn) return; btn.setAttribute('aria-pressed', on ? 'true':'false'); btn.setAttribute('aria-selected', on ? 'true':'false'); };
  setPressed(els.pkSurahs, m==='surahs');
  setPressed(els.pkJuz, m==='juz');
  setPressed(els.pkHizb, m==='hizb');
  if (els.pkFilter) els.pkFilter.style.display = (m==='surahs') ? 'block' : 'none';
  renderPicker();
}

async function loadChaptersOnce(){
  if (state.chapters && state.chapters.length) return;
  try{
    const res = await fetch(`${API_BASE}/chapters?language=en`);
    const data = await res.json();
    state.chapters = data.chapters || [];
  }catch(e){ console.error(e); }
}

function renderPicker(){
  if (!els.pkList) return;
  const frag = document.createDocumentFragment();
  if (state.pkMode === 'surahs'){
    const term = (els.pkFilter?.value||'').trim().toLowerCase();
    const norm = s => (s||'').toString().toLowerCase();
    (state.chapters||[]).filter(ch => {
      if (!term) return true;
      return norm(ch.id).startsWith(term)||norm(ch.name_simple).includes(term)||norm(ch.name_arabic).includes(term);
    }).forEach(ch => {
      const a = document.createElement('a');
      a.className = 'block'; a.href = '#'; a.setAttribute('role','listitem');
      a.addEventListener('click', async (e)=>{ e.preventDefault(); await jumpToSurah(ch.id); togglePicker(false); });
      const id = document.createElement('div'); id.className='id'; id.textContent=ch.id;
      const names = document.createElement('div'); names.className='names';
      const en = document.createElement('div'); en.className='en'; en.textContent = ch.name_simple;
      const ar = document.createElement('div'); ar.className='ar'; ar.textContent = ch.name_arabic;
      names.appendChild(en); names.appendChild(ar);
      a.appendChild(id); a.appendChild(names); frag.appendChild(a);
    });
  } else if (state.pkMode === 'juz'){
    for(let i=1;i<=30;i++){
      const a = document.createElement('a'); a.className='block'; a.href='#'; a.setAttribute('role','listitem');
      a.textContent = `Juz ${i}`;
      a.addEventListener('click', async (e)=>{ e.preventDefault(); await jumpToJuz(i); togglePicker(false); });
      frag.appendChild(a);
    }
  } else {
    for(let i=1;i<=60;i++){
      const a = document.createElement('a'); a.className='block'; a.href='#'; a.setAttribute('role','listitem');
      a.textContent = `Hizb ${i}`;
      a.addEventListener('click', async (e)=>{ e.preventDefault(); await jumpToHizb(i); togglePicker(false); });
      frag.appendChild(a);
    }
  }
  els.pkList.replaceChildren(frag);
}

function togglePicker(show){ if(!els.pkPanel) return; const v = (show===undefined) ? els.pkPanel.hasAttribute('hidden') : show; if(v){ els.pkPanel.removeAttribute('hidden'); } else { els.pkPanel.setAttribute('hidden',''); } }

async function jumpToSurah(surah){
  try{
    const r = await fetch(`${API_BASE}/verses/by_chapter/${surah}?per_page=1&page=1`);
    const j = await r.json();
    const p = j?.verses?.[0]?.page_number;
    if(p){ stopAudio(); await loadPage(p); togglePicker(false); }
  }catch(e){ console.error(e); }
}

async function jumpToJuz(juz){
  try{
    const r = await fetch(`${API_BASE}/verses/by_juz/${juz}?per_page=1&words=false`);
    const j = await r.json();
    const p = j?.verses?.[0]?.page_number;
    if(p){ stopAudio(); await loadPage(p); togglePicker(false); }
  }catch(e){ console.error(e); }
}

async function jumpToHizb(hizb){
  try{
    const r = await fetch(`${API_BASE}/verses/by_hizb/${hizb}?per_page=1&words=false`);
    const j = await r.json();
    const p = j?.verses?.[0]?.page_number;
    if(p){ stopAudio(); await loadPage(p); togglePicker(false); }
  }catch(e){ console.error(e); }
}

function renderTextFallback(){
  // Disabled: no text fallback in Mushaf view.
  if (els.display) { els.display.hidden = true; els.display.innerHTML = ''; }
  updatePlayerInfo();
}

async function loadPage(pageNum){
  pageNum = parseInt(pageNum || state.currentPage, 10);
  if(isNaN(pageNum) || pageNum < 1 || pageNum > 604){ setStatus('Enter a page between 1 and 604'); return; }
  state.currentPage = pageNum;
  try{
    setStatus('Loading…');
    const verses = await fetchPage(pageNum);
    state.verses = verses;
    state.audioMap = await buildAudioForPage(verses);
    state.playIndex = 0;
    // Prepare audio at the first ayah of the page
    setAudioForIndex(0, false);
  // Do not render verse cards in Mushaf view
  if (els.display) { els.display.hidden = true; els.display.innerHTML = ''; }
    // Hide picker (search + Surah/Juz/Hizb) once a page is displayed
    if (els.pkPanel) {
      try { els.pkPanel.setAttribute('hidden', ''); } catch {}
    }
  // Update Reader link to first surah on page
  if (els.toReader) {
      const first = state.verses[0];
      const sid = first && String(first.verse_key).split(':')[0];
      els.toReader.href = 'reader.html?surah=' + sid;
    }
    await renderPdfPage(pageNum);
    setStatus(`Loaded page ${pageNum}`);
  } catch(e){
    console.error(e); setStatus('Failed to load page.'); alert('Failed to load: ' + e.message);
  }
}

async function initFromQuery(){
  const params = new URLSearchParams(location.search);
  const pageParam = parseInt(params.get('page')||'', 10);
  const surahParam = parseInt(params.get('surah')||'', 10);
  const juzParam = parseInt(params.get('juz')||'', 10);
  const hizbParam = parseInt(params.get('hizb')||'', 10);
  const offsetParam = params.get('offset');
  if (offsetParam !== null && offsetParam !== '') {
    const off = parseInt(offsetParam, 10);
    if (!Number.isNaN(off)) { 
      state.pdfOffset = off; 
      state.pdfOffsetExplicit = true; 
      try { localStorage.setItem('mushaf_pdf_offset', String(off)); } catch {}
    }
  }
  if(pageParam && pageParam >=1 && pageParam <=604){ await loadPage(pageParam); return; }
  if(surahParam){
    // Find first page of this surah by fetching its first ayah
    try{
      const r = await fetch(`${API_BASE}/verses/by_chapter/${surahParam}?per_page=1&page=1`);
      const j = await r.json();
      const p = j?.verses?.[0]?.page_number;
      if(p){ await loadPage(p); return; }
    }catch{}
  }
  if(juzParam){
    try{
      const r = await fetch(`${API_BASE}/verses/by_juz/${juzParam}?per_page=1&words=false`);
      const j = await r.json();
      const p = j?.verses?.[0]?.page_number;
      if(p){ await loadPage(p); return; }
    }catch{}
  }
  if(hizbParam){
    try{
      const r = await fetch(`${API_BASE}/verses/by_hizb/${hizbParam}?per_page=1&words=false`);
      const j = await r.json();
      const p = j?.verses?.[0]?.page_number;
      if(p){ await loadPage(p); return; }
    }catch{}
  }
  // default: show picker first, do not load a page
  await loadChaptersOnce();
  if (els.pkPanel) els.pkPanel.removeAttribute('hidden');
  setPickerMode('surahs');
  setStatus('Select Surah, Juz, or Hizb');
}

// Events
// Page navigation via side arrows
if (els.navPrev) els.navPrev.addEventListener('click', ()=>{ stopAudio(); const n = Math.max(1, state.currentPage-1); loadPage(n); });
if (els.navNext) els.navNext.addEventListener('click', ()=>{ stopAudio(); const n = Math.min(604, state.currentPage+1); loadPage(n); });

if (els.prevAyah) els.prevAyah.addEventListener('click', prevAyah);
if (els.playPause) els.playPause.addEventListener('click', togglePlay);
if (els.nextAyah) els.nextAyah.addEventListener('click', nextAyah);
if (els.audio) els.audio.addEventListener('ended', nextAyah);

document.addEventListener('DOMContentLoaded', () => { adjustImageFit(); initFromQuery(); updatePlayerInfo(); });
window.addEventListener('resize', () => { adjustImageFit(); if (state.currentPage) { renderPdfPage(state.currentPage); } });

// Clean mode helpers: toggle chrome visibility
function toggleUI(){ document.body.classList.toggle('mushaf-clean'); }

// Keyboard shortcuts for page-only navigation
function stopAudio(){ try { if (els.audio) { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); } } catch {} }

document.addEventListener('keydown', (e) => {
  // ignore when focused in inputs
  if (['INPUT','TEXTAREA','SELECT'].includes((document.activeElement||{}).tagName)) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); stopAudio(); const n = Math.max(1, state.currentPage-1); loadPage(n); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); stopAudio(); const n = Math.min(604, state.currentPage+1); loadPage(n); }
  else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  else if (e.key.toLowerCase() === 'u') { e.preventDefault(); toggleUI(); }
});

// Click navigation: left half prev, right half next
function wireClickNav(el){ if(!el) return; el.addEventListener('click', (ev) => {
  const rect = el.getBoundingClientRect();
  const x = ev.clientX - rect.left; const mid = rect.width/2;
  if (x < mid) { const n = Math.max(1, state.currentPage-1); loadPage(n); }
  else { const n = Math.min(604, state.currentPage+1); loadPage(n); }
}); }
// Disable click-to-navigate on the image/canvas; use arrows instead

// Picker event wiring
if (els.pkSurahs) els.pkSurahs.addEventListener('click', ()=> setPickerMode('surahs'));
if (els.pkJuz) els.pkJuz.addEventListener('click', ()=> setPickerMode('juz'));
if (els.pkHizb) els.pkHizb.addEventListener('click', ()=> setPickerMode('hizb'));
if (els.pkFilter) els.pkFilter.addEventListener('input', ()=> renderPicker());
