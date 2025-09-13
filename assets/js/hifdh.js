// hifdh.js — Hifdh progress (refactored to use core modules)

// Elements
const els = {
  list: document.getElementById('list'),
  // Summary cards
  sAyah: document.getElementById('s-ayah'),
  sPerc: document.getElementById('s-perc'),
  sPages: document.getElementById('s-pages'),
  sLeft: document.getElementById('s-left'),
  // Reset
  reset: document.getElementById('reset-progress'),
  // Calculator scope
  calcScope: document.getElementById('calc-scope'),
  scopeSurahsField: document.getElementById('scope-surahs-field'),
  scopeSurahsInput: document.getElementById('scope-surahs-input'),
  scopeJuzField: document.getElementById('scope-juz-field'),
  scopeJuzInput: document.getElementById('scope-juz-input'),
  scopeHizbField: document.getElementById('scope-hizb-field'),
  scopeHizbInput: document.getElementById('scope-hizb-input'),
  // Calculator rate/time
  ratePages: document.getElementById('rate-pages'),
  minsPerPage: document.getElementById('mins-per-page'),
  cPagesLeft: document.getElementById('c-pages-left'),
  cDays: document.getElementById('c-days'),
  cDate: document.getElementById('c-date'),
  cTime: document.getElementById('c-time'),
};

const KEY = 'hifdh_progress';

let chapters = [];               // [{id, name_en, name_ar, verses}]
let progress = {};               // { [surahId]: memorizedCount }
const surahPagesCache = new Map();  // sid -> [page_number per verse]
const juzPagesCache = new Map();    // j -> Set(pages)
const hizbPagesCache = new Map();   // h -> Set(pages)

// Local storage helpers (progress only)
function readProgress(){ try { return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch { return {}; } }
function writeProgress(obj){ try { localStorage.setItem(KEY, JSON.stringify(obj||{})); } catch {} }

// Load chapters (API → cache → fallback CHAPTERS_DATA)
async function loadChapters(){
  try {
    const cached = JSON.parse(localStorage.getItem('qr_chapters_cache')||'null');
    if (cached && Array.isArray(cached) && cached.length === 114) { chapters = cached; return; }
  } catch {}

  try {
    const res = await fetch(`${QR.api.API_BASE}/chapters?language=en`);
    const data = await res.json();
    chapters = (data.chapters||[]).map(c => ({
      id: c.id,
      name_en: c.name_simple,
      name_ar: c.name_arabic,
      verses: c.verses_count || 0
    }));
    try { localStorage.setItem('qr_chapters_cache', JSON.stringify(chapters)); } catch {}
    return;
  } catch {}

  // Fallback to embedded static data if available
  if (Array.isArray(window.CHAPTERS_DATA)) {
    chapters = window.CHAPTERS_DATA.map(c => ({
      id: c.id,
      name_en: c.name_simple,
      name_ar: c.name_arabic,
      verses: c.verses_count || c.verses || 0
    }));
  } else {
    chapters = [];
  }
}

// Get list of page_numbers for a surah (cached)
async function getSurahPageNumbers(sid){
  sid = parseInt(String(sid), 10);
  if (surahPagesCache.has(sid)) return surahPagesCache.get(sid);

  try {
    const cached = JSON.parse(localStorage.getItem(`qr_surah_pages_${sid}`)||'null');
    if (Array.isArray(cached) && cached.length>0) {
      surahPagesCache.set(sid, cached);
      return cached;
    }
  } catch {}

  try {
    const verses = await QR.api.fetchVersesByChapter(sid, 'page_number');
    const arr = (verses||[]).map(v => v.page_number).filter(p => typeof p==='number' && p>=1 && p<=604);
    surahPagesCache.set(sid, arr);
    try { localStorage.setItem(`qr_surah_pages_${sid}`, JSON.stringify(arr)); } catch {}
    return arr;
  } catch {
    surahPagesCache.set(sid, []);
    return [];
  }
}

// Compute covered pages set from current per-surah progress
async function computeCoveredPagesSet(){
  const set = new Set();
  const entries = Object.entries(progress).filter(([sid,m]) => (Number(m)||0) > 0);
  await Promise.all(entries.map(async ([sid,m]) => {
    const pagesArr = await getSurahPageNumbers(sid);
    const upto = Math.max(0, Math.min(pagesArr.length, Number(m)||0));
    for(let i=0;i<upto;i++){
      const p = pagesArr[i];
      if (p>=1 && p<=604) set.add(p);
    }
  }));
  return set;
}

// Juz/Hizb page sets (cached)
async function getJuzPages(j){
  const jj = Math.max(1, Math.min(30, parseInt(String(j),10)||0));
  if (juzPagesCache.has(jj)) return juzPagesCache.get(jj);
  try {
    const cached = JSON.parse(localStorage.getItem(`qr_juz_pages_${jj}`)||'null');
    if (cached && Array.isArray(cached)) {
      const s = new Set(cached.filter(p=>p>=1 && p<=604));
      juzPagesCache.set(jj, s);
      return s;
    }
  } catch {}
  const verses = await QR.api.fetchVersesByRange('juz', jj, 'page_number');
  const pages = new Set((verses||[]).map(v=>v.page_number).filter(p=>typeof p==='number' && p>=1 && p<=604));
  juzPagesCache.set(jj, pages);
  try { localStorage.setItem(`qr_juz_pages_${jj}`, JSON.stringify(Array.from(pages))); } catch {}
  return pages;
}

async function getHizbPages(h){
  const hh = Math.max(1, Math.min(60, parseInt(String(h),10)||0));
  if (hizbPagesCache.has(hh)) return hizbPagesCache.get(hh);
  try {
    const cached = JSON.parse(localStorage.getItem(`qr_hizb_pages_${hh}`)||'null');
    if (cached && Array.isArray(cached)) {
      const s = new Set(cached.filter(p=>p>=1 && p<=604));
      hizbPagesCache.set(hh, s);
      return s;
    }
  } catch {}
  const verses = await QR.api.fetchVersesByRange('hizb', hh, 'page_number');
  const pages = new Set((verses||[]).map(v=>v.page_number).filter(p=>typeof p==='number' && p>=1 && p<=604));
  hizbPagesCache.set(hh, pages);
  try { localStorage.setItem(`qr_hizb_pages_${hh}`, JSON.stringify(Array.from(pages))); } catch {}
  return pages;
}

// Compute pages in scope for the calculator (treat selected units as covered)
async function computeScopePagesSet(){
  const kind = els.calcScope ? els.calcScope.value : 'all';
  if (kind === 'all'){
    const s = new Set(); for(let p=1;p<=604;p++) s.add(p); return s;
  }
  if (kind === 'surahs'){
    const ids = QR.utils.parseRangeList(els.scopeSurahsInput && els.scopeSurahsInput.value || '', 114);
    const set = new Set();
    await Promise.all(ids.map(async sid => {
      const arr = await getSurahPageNumbers(sid);
      arr.forEach(p=>{ if(p>=1 && p<=604) set.add(p); });
    }));
    return set;
  }
  if (kind === 'juz'){
    const js = QR.utils.parseRangeList(els.scopeJuzInput && els.scopeJuzInput.value || '', 30);
    const set = new Set();
    for (const j of js){ const s = await getJuzPages(j); s.forEach(p=>set.add(p)); }
    return set;
  }
  if (kind === 'hizb'){
    const hs = QR.utils.parseRangeList(els.scopeHizbInput && els.scopeHizbInput.value || '', 60);
    const set = new Set();
    for (const h of hs){ const s = await getHizbPages(h); s.forEach(p=>set.add(p)); }
    return set;
  }
  return new Set();
}

// UI
function makeSurahRow(ch){
  const row = document.createElement('div'); row.className='surah'; row.dataset.sid=String(ch.id);
  const sid = document.createElement('div'); sid.className='sid'; sid.textContent = ch.id;
  const names = document.createElement('div'); names.className='names';
  const en = document.createElement('div'); en.className='en'; en.textContent = ch.name_en;
  const ar = document.createElement('div'); ar.className='ar'; ar.textContent = ch.name_ar;
  names.appendChild(en); names.appendChild(ar);

  const ctrls = document.createElement('div'); ctrls.className='ctrls';
  const top = document.createElement('div'); top.className='top';
  const label = document.createElement('div'); label.className='muted'; label.textContent = `${ch.verses} ayah`;
  const perc = document.createElement('div'); perc.className='perc'; perc.textContent = '0%';
  top.appendChild(label); top.appendChild(perc);

  const range = document.createElement('input'); range.type='range'; range.min='0'; range.max=String(ch.verses||0); range.step='1'; range.value=String(progress[ch.id]||0);

  const quick = document.createElement('div'); quick.className='quick';
  [0,25,50,75,100].forEach(p => {
    const b = document.createElement('button'); b.textContent = p+'%';
    b.addEventListener('click', ()=>{
      range.value = String(Math.round((ch.verses||0)*p/100));
      range.dispatchEvent(new Event('input',{bubbles:true}));
      range.dispatchEvent(new Event('change',{bubbles:true}));
    });
    quick.appendChild(b);
  });

  ctrls.appendChild(top); ctrls.appendChild(range); ctrls.appendChild(quick);
  row.appendChild(sid); row.appendChild(names); row.appendChild(ctrls);

  const sync = () => {
    const m = QR.utils.clamp(parseInt(range.value,10)||0, 0, ch.verses||0);
    const pct = (ch.verses>0) ? Math.round((m/(ch.verses))*100) : 0;
    perc.textContent = `${pct}% • ${m}/${ch.verses}`;
  };
  sync();

  range.addEventListener('input', sync);
  range.addEventListener('change', async () => {
    const m = QR.utils.clamp(parseInt(range.value,10)||0, 0, ch.verses||0);
    progress[ch.id] = m; writeProgress(progress);
    await updateSummary(); await updateCalculator();
  });

  return row;
}

function render(){
  const frag = document.createDocumentFragment();
  (chapters||[]).forEach(ch => frag.appendChild(makeSurahRow(ch)));
  if (els.list) els.list.replaceChildren(frag);
}

// Summary cards
async function updateSummary(){
  const totalAll = chapters.reduce((s,ch)=> s + (ch.verses||0), 0);
  const memorized = Object.entries(progress).reduce((s,[sid,m])=>{
    const ch = chapters.find(c=>String(c.id)===String(sid));
    const cap = ch? ch.verses||0 : 0;
    return s + Math.min(cap, Number(m)||0);
  },0);
  const set = await computeCoveredPagesSet();
  const coveredPages = set.size; const pagesLeft = Math.max(0, 604 - coveredPages);

  if (els.sAyah) els.sAyah.textContent = String(memorized);
  if (els.sPerc) {
    const pagePct = Math.round((coveredPages/604) * 100);
    els.sPerc.textContent = pagePct + '%';
  }
  if (els.sPages) els.sPages.textContent = `${coveredPages} / 604`;
  if (els.sLeft) els.sLeft.textContent = String(pagesLeft);
}

// Calculator
async function updateCalculator(){
  const kind = els.calcScope ? els.calcScope.value : 'all';
  let pagesLeft = 0;

  if (kind === 'all'){
    const covered = await computeCoveredPagesSet();
    pagesLeft = Math.max(0, 604 - covered.size);
  } else {
    const covered = await computeScopePagesSet();
    pagesLeft = Math.max(0, 604 - covered.size);
  }

  const rate = Math.max(0, parseFloat(els.ratePages && els.ratePages.value || '0')) || 0;
  if (els.cPagesLeft) els.cPagesLeft.textContent = String(pagesLeft);

  if (rate <= 0){
    if (els.cDays) els.cDays.textContent = '-';
    if (els.cDate) els.cDate.textContent = '-';
    if (els.cTime) els.cTime.textContent = '-';
    return;
  }

  const days = Math.ceil(pagesLeft / rate);
  if (els.cDays) els.cDays.textContent = String(days);

  try {
    const d = new Date(); d.setDate(d.getDate()+days);
    if (els.cDate) els.cDate.textContent = d.toLocaleDateString();
  } catch { if (els.cDate) els.cDate.textContent = '-'; }

  const mpp = Math.max(0, parseFloat(els.minsPerPage && els.minsPerPage.value || '0')) || 0;
  if (mpp>0){
    const mins = pagesLeft * mpp;
    const h = Math.floor(mins/60), m = Math.round(mins%60);
    if (els.cTime) els.cTime.textContent = `${h}h ${m}m`;
  } else {
    if (els.cTime) els.cTime.textContent = '-';
  }
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  QR.prefs.ensureTheme();

  progress = readProgress();
  await loadChapters();
  render();
  await updateSummary();
  await updateCalculator();

  // Reset button
  if (els.reset) {
    els.reset.addEventListener('click', async () => {
      if (confirm('Reset all memorization progress?')) {
        progress = {}; writeProgress(progress);
        render(); await updateSummary(); await updateCalculator();
      }
    });
  }

  // Scope switches
  if (els.calcScope) els.calcScope.addEventListener('change', async () => {
    const v = els.calcScope.value;
    if (els.scopeSurahsField) els.scopeSurahsField.hidden = (v!=='surahs');
    if (els.scopeJuzField) els.scopeJuzField.hidden = (v!=='juz');
    if (els.scopeHizbField) els.scopeHizbField.hidden = (v!=='hizb');
    await updateCalculator();
  });

  // Inputs that affect calculator
  ['input','change'].forEach(ev => {
    if (els.ratePages) els.ratePages.addEventListener(ev, ()=>updateCalculator());
    if (els.minsPerPage) els.minsPerPage.addEventListener(ev, ()=>updateCalculator());
    if (els.scopeSurahsInput) els.scopeSurahsInput.addEventListener(ev, ()=>updateCalculator());
    if (els.scopeJuzInput) els.scopeJuzInput.addEventListener(ev, ()=>updateCalculator());
    if (els.scopeHizbInput) els.scopeHizbInput.addEventListener(ev, ()=>updateCalculator());
  });
});
