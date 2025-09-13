// mushaf.js — Page-based Mushaf with audio (restored)

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
};

// State
const state = {
  currentPage: 1,
  verses: [],
  audioMap: new Map(),
  playIndex: 0,
  reciterId: 7,
  // ✅ fixed path to assets/img/mushaf_pages/
  imageProviders: [ { base: '../assets/img/mushaf_pages/', exts: ['png'], padded: true } ],
  ctx: null, // { type: 'surah'|'juz'|'hizb', id: number }
};

// Load saved reciter from prefs
try {
  const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
  if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) state.reciterId = prefs.reciter_id;
} catch {}

// Helpers
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
  if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total} (Page ${state.currentPage})` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(b => { if(b) b.disabled = !enabled; });
  if (els.pageInfo) els.pageInfo.textContent = state.currentPage ? `Page ${state.currentPage} / 604` : '';
  if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? 'Pause' : 'Play';
}

function setAudioForIndex(i, autoplay=false){
  if(!state.verses.length) return;
  state.playIndex = Math.max(0, Math.min(i, state.verses.length-1));
  const v = state.verses[state.playIndex];
  const url = state.audioMap.get(v.verse_key);
  if(!url){ try{ els.audio.pause(); }catch{}; els.audio.removeAttribute('src'); updatePlayerInfo(); return; }
  els.audio.src = url;
  els.audio.dataset.current = url;
  if(autoplay) els.audio.play().catch(()=>{});
  updatePlayerInfo();
}

function togglePlay(){
  if(!state.verses.length || !state.audioMap.size) return;
  if(!els.audio.src){ setAudioForIndex(state.playIndex,true); return; }
  if(els.audio.paused) els.audio.play().catch(()=>{}); else els.audio.pause();
  updatePlayerInfo();
}

async function nextAyah(){
  const lastIdx = Math.max(0, state.verses.length - 1);
  if (state.playIndex < lastIdx) { setAudioForIndex(state.playIndex + 1, true); return; }
  // at last ayah: move to next page and continue
  if (state.currentPage < 604) {
    await loadPage(state.currentPage + 1, true);
  } else {
    try { els.audio.pause(); els.audio.currentTime = 0; } catch {}
  }
}

async function prevAyah(){
  const threshold = 2; // seconds to restart current
  try { if (els.audio.currentTime > threshold) { els.audio.currentTime = 0; return; } } catch {}
  if (state.playIndex > 0) { setAudioForIndex(state.playIndex - 1, true); return; }
  // at first ayah: move to previous page and continue from last
  if (state.currentPage > 1) {
    await loadPage(state.currentPage - 1, false);
    const lastIdx = Math.max(0, state.verses.length - 1);
    setAudioForIndex(lastIdx, true);
  }
}

async function loadPage(page, autoplayFirst=false){
  try {
    state.currentPage = page;
    const verses = await fetchPage(page);
    state.verses = verses;
    state.audioMap = await buildAudioForPage(verses);
    state.playIndex = 0;
    setAudioForIndex(0, !!autoplayFirst);

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
if (els.audio) els.audio.addEventListener('ended', ()=> nextAyah());
// Page navigation (buttons keep labels: Prev=page-1, Next=page+1)
if (els.prevPage) els.prevPage.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));
if (els.nextPage) els.nextPage.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
// Overlay arrows: Right-to-left reading — left arrow goes forward (page+1), right arrow goes back (page-1)
if (els.navPrev) els.navPrev.addEventListener('click', ()=> loadPage(Math.min(604,state.currentPage+1)));
if (els.navNext) els.navNext.addEventListener('click', ()=> loadPage(Math.max(1,state.currentPage-1)));

document.addEventListener('DOMContentLoaded', ()=>{
  adjustImageFit();
  // Move primary controls into the drawer to unify UX with Reader
  try {
    const drawerBody = document.querySelector('#control-drawer .drawer-body .card') || document.querySelector('#control-drawer .drawer-body');
    if (drawerBody) {
      // Move ayah control button group (container of #prev-ayah)
      try {
        const pa = document.getElementById('prev-ayah');
        if (pa && pa.parentElement) drawerBody.appendChild(pa.parentElement);
      } catch {}
      // Move page nav group
      try {
        const pn = document.getElementById('page-nav');
        if (pn) drawerBody.appendChild(pn);
      } catch {}
      // Move mode switch link into drawer
      try {
        const toR = document.getElementById('to-reader');
        if (toR) {
          const wrapRow = toR.closest('.row');
          drawerBody.appendChild(toR);
          if (wrapRow && wrapRow.parentElement && wrapRow.parentElement.classList.contains('list-shell')) {
            wrapRow.parentElement.setAttribute('hidden', '');
          }
        }
      } catch {}
    }
  } catch {}

  // Drawer interactions
  try {
    const open = els.drawerOpen, closeBtn = els.drawerClose, drawer = els.drawer, backdrop = els.drawerBackdrop;
    const openDrawer = () => {
      if (!drawer) return;
      document.body.classList.add('drawer-open');
      drawer.removeAttribute('aria-hidden');
      if (backdrop) { backdrop.hidden = false; }
      try { drawer.focus(); } catch {}
    };
    const closeDrawer = () => {
      if (!drawer) return;
      document.body.classList.remove('drawer-open');
      drawer.setAttribute('aria-hidden', 'true');
      if (backdrop) { backdrop.hidden = true; }
      if (open) try { open.focus(); } catch {}
    };
    if (open) open.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
    // Auto-open drawer based on URL parameter
    try {
      const qp = new URLSearchParams(location.search);
      const want = (qp.get('controls') || qp.get('drawer') || '').toLowerCase();
      if (want === 'open' || want === '1' || want === 'true') openDrawer();
    } catch {}
  } catch {}

  loadPage(1);
  updatePlayerInfo();
});
window.addEventListener('resize', adjustImageFit);
