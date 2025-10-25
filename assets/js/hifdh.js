// hifdh.js - Hifdh progress (refactored to use core modules)

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
  // Strength map
  smStrengthFilter: document.getElementById('sm-strength-filter'),
  smScope: document.getElementById('sm-scope'),
  smScopeJuzField: document.getElementById('sm-scope-juz-field'),
  smScopeJuzInput: document.getElementById('sm-scope-juz-input'),
  smScopeHizbField: document.getElementById('sm-scope-hizb-field'),
  smScopeHizbInput: document.getElementById('sm-scope-hizb-input'),
  smScopeSurahField: document.getElementById('sm-scope-surah-field'),
  smScopeSurahInput: document.getElementById('sm-scope-surah-input'),
  smLegend: document.getElementById('sm-legend'),
  smTotals: document.getElementById('sm-totals'),
  smCanvas: document.getElementById('sm-canvas'),
  smJuzSelectField: document.getElementById('sm-juz-select-field'),
  smJuzSelect: document.getElementById('sm-juz-select'),
  smEmpty: document.getElementById('sm-empty'),
  smExport: document.getElementById('sm-export-pdf'),
  // Daily plan
  planSetup: document.getElementById('plan-setup'),
  planActive: document.getElementById('plan-active'),
  planSave: document.getElementById('plan-save'),
  planUnit: document.getElementById('plan-unit'),
  planAmount: document.getElementById('plan-amount'),
  planStartPage: document.getElementById('plan-start-page'),
  planStartJuz: document.getElementById('plan-start-juz'),
  planStartHizb: document.getElementById('plan-start-hizb'),
  planTrackedSummary: document.getElementById('plan-tracked-summary'),
  planDayLabel: document.getElementById('plan-day-label'),
  planAssignmentText: document.getElementById('plan-assignment-text'),
  planStartCustom: document.getElementById('plan-start-custom'),
  planStartLabel: document.getElementById('plan-start-label'),
  planAssignmentCard: document.getElementById('plan-assignment-card'),
  planStatusText: document.getElementById('plan-status-text'),
  planStarted: document.getElementById('plan-started'),
  planBack: document.getElementById('plan-back'),
  planDone: document.getElementById('plan-done'),
  planReset: document.getElementById('plan-reset'),
  heroAyah: document.getElementById('hero-total-ayah'),
  heroPercent: document.getElementById('hero-percent'),
  heroPages: document.getElementById('hero-pages-covered'),
};

const KEY = (window.QR && QR.profiles && QR.profiles.key('hifdh_progress')) || 'hifdh_progress';

const PLAN_KEY = 'qr_daily_revision_plan';
const TOTAL_SURAHS = 114;

let chapters = [];               // [{id, name_en, name_ar, verses}]
let progress = {};               // { [surahId]: memorizedCount }
const surahPagesCache = new Map();  // sid -> [page_number per verse]
const juzPagesCache = new Map();    // j -> Set(pages)
const hizbPagesCache = new Map();   // h -> Set(pages)
let trackedPagesCache = null;

// Local storage helpers (progress only)
function readProgress(){ try { return JSON.parse((QR.profiles?QR.profiles.getItem('hifdh_progress'):localStorage.getItem(KEY))||'{}')||{}; } catch { return {}; } }
function writeProgress(obj){ try { const s = JSON.stringify(obj||{}); if (QR.profiles) QR.profiles.setItem('hifdh_progress', s); else localStorage.setItem(KEY, s); } catch {} }

// Load chapters (API cache -> fallback CHAPTERS_DATA)
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
    perc.textContent = `${pct}% - ${m}/${ch.verses}`;
  };
  sync();

  range.addEventListener('input', sync);
  range.addEventListener('change', async () => {
    const m = QR.utils.clamp(parseInt(range.value,10)||0, 0, ch.verses||0);
    progress[ch.id] = m; writeProgress(progress);
    invalidateTrackedPagesCache();
    await updateSummary();
    await updateCalculator();
    await updateTrackedSummary();
    await refreshPlanUI();
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
  const coveredPages = set.size; 
  const pagesLeft = Math.max(0, 604 - coveredPages);

  if (els.sAyah) els.sAyah.textContent = String(memorized);
  if (els.sPerc) {
    const pagePct = Math.round((coveredPages/604) * 100);
    els.sPerc.textContent = pagePct + '%';
  }
  if (els.sPages) els.sPages.textContent = `${coveredPages} / 604`;
  if (els.sLeft) els.sLeft.textContent = String(pagesLeft);
  if (els.heroAyah) els.heroAyah.textContent = String(memorized);
  if (els.heroPercent) {
    const totalAyah = totalAll || 1;
    const pctAyah = Math.round((memorized / totalAyah) * 100);
    els.heroPercent.textContent = `${pctAyah}%`;
  }
  if (els.heroPages) els.heroPages.textContent = String(coveredPages);
  
  // Update hero progress bar
  const heroProgressBar = document.getElementById('hero-progress-bar');
  if (heroProgressBar) {
    const percentage = totalAll ? Math.round((memorized / totalAll) * 100) : 0;
    heroProgressBar.style.width = `${percentage}%`;
  }
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
  await updateTrackedSummary();

  // Reset button
  if (els.reset) {
    els.reset.addEventListener('click', async () => {
      if (confirm('Reset all memorization progress?')) {
        progress = {}; writeProgress(progress);
        invalidateTrackedPagesCache();
        render();
        await updateSummary();
        await updateCalculator();
        await updateTrackedSummary();
        await refreshPlanUI();
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

  // Strength map init
  try {
    await initStrengthMap();
  } catch (err) { console.error(err); }

  // Daily plan init
  try {
    await initDailyPlan();
  } catch (err) {
    console.error(err);
  }
});


let dailyPlan = null;
let planMidnightTimer = null;
let planNotificationTimer = null;
let pageToHizbCache = null;

// ---- Strength map rendering ----
const STRENGTH_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'weak', label: 'Weak' },
  { value: 'okay', label: 'Okay' },
  { value: 'strong', label: 'Strong' },
  { value: 'unset', label: 'Unset' },
];
const STRENGTH_ORDER = ['weak', 'okay', 'strong', 'unset'];
const STRENGTH_STYLES = {
  weak: { label: 'Weak', color: '#ef4444', text: '#ffffff', symbol: '-' },
  okay: { label: 'Okay', color: '#f59e0b', text: '#111111', symbol: '~' },
  strong: { label: 'Strong', color: '#22c55e', text: '#ffffff', symbol: '+' },
  unset: { label: 'Unset', color: '#9ca3af', text: '#111111', symbol: '' },
};
const MAP_COLS = 22;
const MAP_ROWS = 28;
const MAP_GAP = 4;
const MAP_PADDING = 24;

const strengthMapState = {
  canvas: null,
  ctx: null,
  layout: null,
  pageStats: [],
  pageToJuz: [],
  filter: 'all',
  scope: 'all',
  selectedJuz: null,
  hoverPage: null,
  focusPage: null,
  hasData: false,
  scopeSummary: 'All Quran',
  filterSummary: 'All',
  lastTotals: null,
  lastPerJuz: null,
  renderRunning: false,
  renderQueued: false,
  tooltipEl: null,
  liveEl: null,
  chipButtons: new Map(),
  activePages: [],
  activePageSet: new Set(),
  jsPdfPromise: null,
};

function readPageStrengths(){
  const arr = Array.from({ length: 605 }, () => ({ strength: 'unset', lastReviewedAt: null }));
  let source = null;
  try {
    const raw = (QR.profiles && typeof QR.profiles.getItem === 'function') ? QR.profiles.getItem('page_strengths') : localStorage.getItem('page_strengths');
    if (raw) source = JSON.parse(raw);
  } catch {}
  if (!source){
    try {
      const raw = (QR.profiles && typeof QR.profiles.getItem === 'function') ? QR.profiles.getItem('qr_page_data') : localStorage.getItem('qr_page_data');
      if (raw) source = JSON.parse(raw);
    } catch {}
  }
  if (!source){
    try {
      if (window.QR && QR.pageData && typeof QR.pageData.read === 'function'){
        source = QR.pageData.read();
      }
    } catch {}
  }
  if (source && typeof source === 'object'){
    Object.keys(source).forEach((key) => {
      const entry = source[key] || {};
      const pageKey = String(key).includes(':') ? String(key).split(':').pop() : key;
      const page = parseInt(pageKey, 10);
      if (!page || page < 1 || page > 604) return;
      let level = (entry.strength || entry.confidence || '').toString().toLowerCase();
      if (level === 'ok') level = 'okay';
      if (!STRENGTH_ORDER.includes(level)) level = 'unset';
      let last = null;
      if (entry.lastReviewedAt && typeof entry.lastReviewedAt === 'string') last = entry.lastReviewedAt;
      else if (entry.updatedAt && typeof entry.updatedAt === 'string') last = entry.updatedAt;
      arr[page] = { strength: level, lastReviewedAt: last };
    });
  }
  return arr;
}

async function ensurePageToJuz(){
  if (strengthMapState.pageToJuz && strengthMapState.pageToJuz.length >= 605) return strengthMapState.pageToJuz;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem('qr_page_to_juz') || 'null'); } catch {}
  if (Array.isArray(cached) && cached.length >= 605){
    strengthMapState.pageToJuz = cached;
    return cached;
  }
  const arr = new Array(605).fill(0);
  for (let j = 1; j <= 30; j += 1){
    // eslint-disable-next-line no-await-in-loop
    const pages = await getJuzPages(j);
    pages.forEach((p) => { if (p >= 1 && p <= 604) arr[p] = j; });
  }
  try { localStorage.setItem('qr_page_to_juz', JSON.stringify(arr)); } catch {}
  strengthMapState.pageToJuz = arr;
  return arr;
}

async function ensurePageToHizb(){
  if (Array.isArray(pageToHizbCache) && pageToHizbCache.length >= 605) return pageToHizbCache;
  const arr = new Array(605).fill(0);
  for (let h = 1; h <= 60; h += 1){
    // eslint-disable-next-line no-await-in-loop
    const pages = await getHizbPages(h);
    pages.forEach((p) => { if (p >= 1 && p <= 604) arr[p] = h; });
  }
  pageToHizbCache = arr;
  return arr;
}

function buildTileLayout(){
  const canvas = strengthMapState.canvas;
  if (!canvas) return null;
  const width = canvas.width;
  const height = canvas.height;
  const availableW = width - MAP_PADDING * 2;
  const availableH = height - MAP_PADDING * 2;
  const size = Math.min(
    Math.floor((availableW - MAP_GAP * (MAP_COLS - 1)) / MAP_COLS),
    Math.floor((availableH - MAP_GAP * (MAP_ROWS - 1)) / MAP_ROWS),
  );
  const gridW = size * MAP_COLS + MAP_GAP * (MAP_COLS - 1);
  const gridH = size * MAP_ROWS + MAP_GAP * (MAP_ROWS - 1);
  const offsetX = MAP_PADDING + (availableW - gridW) / 2;
  const offsetY = MAP_PADDING + (availableH - gridH) / 2;
  const rects = new Array(605);
  for (let page = 1; page <= 604; page += 1){
    const idx = page - 1;
    const col = idx % MAP_COLS;
    const row = Math.floor(idx / MAP_COLS);
    const x = offsetX + col * (size + MAP_GAP);
    const y = offsetY + row * (size + MAP_GAP);
    rects[page] = { x, y, size };
  }
  return { rects, offsetX, offsetY, width: gridW, height: gridH };
}

function ensureStrengthTooltip(){
  if (strengthMapState.tooltipEl) return strengthMapState.tooltipEl;
  const tip = document.createElement('div');
  tip.id = 'sm-tooltip';
  tip.style.position = 'fixed';
  tip.style.zIndex = '80';
  tip.style.pointerEvents = 'none';
  tip.style.maxWidth = '260px';
  tip.style.background = getCssVar('--surface');
  tip.style.color = getCssVar('--text');
  tip.style.border = `1px solid ${getCssVar('--border')}`;
  tip.style.borderRadius = '8px';
  tip.style.padding = '6px 8px';
  tip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
  tip.style.fontSize = '12px';
  tip.style.lineHeight = '1.35';
  tip.style.display = 'none';
  document.body.appendChild(tip);
  strengthMapState.tooltipEl = tip;
  return tip;
}

function ensureStrengthLiveRegion(){
  if (strengthMapState.liveEl) return strengthMapState.liveEl;
  const live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.style.position = 'absolute';
  live.style.left = '-9999px';
  live.style.top = 'auto';
  live.style.width = '1px';
  live.style.height = '1px';
  document.body.appendChild(live);
  strengthMapState.liveEl = live;
  return live;
}

function announceStrength(textContent){
  const live = ensureStrengthLiveRegion();
  if (live) live.textContent = textContent || '';
}

function setStrengthFilter(value){
  if (!STRENGTH_FILTERS.some((opt) => opt.value === value)) value = 'all';
  strengthMapState.filter = value;
  strengthMapState.filterSummary = value === 'all' ? 'All' : STRENGTH_STYLES[value].label;
  strengthMapState.chipButtons.forEach((btn, key) => {
    const pressed = key === value;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    if (pressed) btn.classList.add('active'); else btn.classList.remove('active');
  });
  refreshStrengthMap();
}

function setStrengthScope(mode){
  const allowed = ['all', 'juz', 'hizb', 'surah'];
  if (!allowed.includes(mode)) mode = 'all';
  strengthMapState.scope = mode;
  if (mode !== 'juz') strengthMapState.selectedJuz = null;
  if (els.smScopeJuzField) els.smScopeJuzField.hidden = mode !== 'juz';
  if (els.smJuzSelectField) els.smJuzSelectField.hidden = mode !== 'juz';
  if (mode !== 'juz' && els.smJuzSelect) els.smJuzSelect.value = '';
  if (els.smScopeHizbField) els.smScopeHizbField.hidden = mode !== 'hizb';
  if (els.smScopeSurahField) els.smScopeSurahField.hidden = mode !== 'surah';
  refreshStrengthMap();
}

function parseStrengthRanges(inputEl, max){
  const raw = inputEl ? inputEl.value : '';
  const nums = QR.utils.parseRangeList(raw || '', max);
  return nums.sort((a, b) => a - b);
}

function formatNumberRanges(nums){
  if (!nums || !nums.length) return '';
  const sorted = Array.from(new Set(nums)).sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1){
    const current = sorted[i];
    if (current === prev + 1){
      prev = current;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    start = current;
    prev = current;
  }
  parts.push(start === prev ? String(start) : `${start}-${prev}`);
  return parts.join(', ');
}

function getAgeDays(iso){
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function shadeColor(hex, amt){
  const normalized = normaliseColor(hex);
  if (!normalized.startsWith('#')) return normalized;
  let r = parseInt(normalized.slice(1, 3), 16);
  let g = parseInt(normalized.slice(3, 5), 16);
  let b = parseInt(normalized.slice(5, 7), 16);
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function normaliseColor(val){
  if (!val) return '#9ca3af';
  const trimmed = String(val).trim();
  if (trimmed.startsWith('#')) return trimmed;
  const match = trimmed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
  if (match){
    const [r, g, b] = match.slice(1).map((n) => parseInt(n, 10));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return trimmed;
}

function getInactiveColor(){
  return shadeColor(getCssVar('--muted') || '#6b7280', -20);
}

function buildFilterDescription(){
  return `Scope: ${strengthMapState.scopeSummary}, Strength: ${strengthMapState.filterSummary}`;
}

async function refreshStrengthMap(){
  if (!strengthMapState.canvas || !strengthMapState.ctx) return;
  if (strengthMapState.renderRunning){
    strengthMapState.renderQueued = true;
    return;
  }
  strengthMapState.renderRunning = true;
  try {
    const scopeSet = await computeStrengthScopePages();
    await drawStrengthMap(scopeSet);
  } finally {
    strengthMapState.renderRunning = false;
    if (strengthMapState.renderQueued){
      strengthMapState.renderQueued = false;
      refreshStrengthMap();
    }
  }
}

async function drawStrengthMap(scopeSet){
  const ctx = strengthMapState.ctx;
  const canvas = strengthMapState.canvas;
  const pageStats = strengthMapState.pageStats;
  const filter = strengthMapState.filter;
  strengthMapState.layout = buildTileLayout();
  const layout = strengthMapState.layout;
  const rects = layout ? layout.rects : new Array(605);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const totals = { weak: 0, okay: 0, strong: 0, unset: 0, total: 0 };
  const perJuz = Array.from({ length: 31 }, () => ({ weak: 0, okay: 0, strong: 0, unset: 0, total: 0 }));
  const pageToJuz = strengthMapState.pageToJuz;
  const activePages = [];
  const activeSet = new Set();
  const inactiveColor = getInactiveColor();

  const separators = [];
  if (layout){
    let prevJuz = pageToJuz[1] || 0;
    for (let page = 2; page <= 604; page += 1){
      const currentJuz = pageToJuz[page] || 0;
      if (currentJuz && currentJuz !== prevJuz){
        separators.push(page);
        prevJuz = currentJuz;
      }
    }
  }

  for (let page = 1; page <= 604; page += 1){
    const rect = rects[page];
    if (!rect) continue;
    const stat = pageStats[page] || { strength: 'unset', lastReviewedAt: null };
    const inScope = !scopeSet || scopeSet.has(page);
    const matchesStrength = filter === 'all' ? true : (filter === 'unset' ? stat.strength === 'unset' : stat.strength === filter);
    const isActive = inScope && matchesStrength;
    const style = STRENGTH_STYLES[stat.strength] || STRENGTH_STYLES.unset;
    const fillColor = isActive ? style.color : (inScope ? inactiveColor : getCssVar('--surface'));
    ctx.fillStyle = fillColor;
    roundRect(ctx, rect.x, rect.y, rect.size, rect.size, 4, true, false);

    if (isActive && style.symbol){
      ctx.fillStyle = style.text;
      ctx.font = `${Math.max(10, Math.round(rect.size * 0.55))}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.symbol, rect.x + rect.size / 2, rect.y + rect.size / 2 + 0.5);
    }

    if (isActive){
      totals[stat.strength] += 1;
      totals.total += 1;
      const j = pageToJuz[page] || 0;
      const bucket = perJuz[j];
      if (bucket){
        bucket[stat.strength] += 1;
        bucket.total += 1;
      }
      activePages.push(page);
      activeSet.add(page);
    }

    if (inScope){
      const age = getAgeDays(stat.lastReviewedAt);
      if (age !== null && age > 14){
        ctx.save();
        ctx.lineWidth = age > 30 ? 2 : 1;
        ctx.strokeStyle = shadeColor(fillColor, -40);
        ctx.setLineDash(age > 30 ? [] : [3, 3]);
        roundRect(ctx, rect.x + 1, rect.y + 1, rect.size - 2, rect.size - 2, 4, false, true);
        ctx.restore();
      }
    }
  }

  if (layout && separators.length){
    ctx.save();
    ctx.strokeStyle = shadeColor(getCssVar('--border') || '#374151', -20);
    ctx.lineWidth = 1;
    separators.forEach((page) => {
      const rect = rects[page];
      if (!rect) return;
      const lineX = rect.x - (MAP_GAP / 2);
      ctx.beginPath();
      ctx.moveTo(lineX, layout.offsetY - (MAP_GAP / 2));
      ctx.lineTo(lineX, layout.offsetY + layout.height + (MAP_GAP / 2));
      ctx.stroke();
    });
    ctx.restore();
  }

  strengthMapState.lastTotals = totals;
  strengthMapState.lastPerJuz = perJuz;
  strengthMapState.activePages = activePages;
  strengthMapState.activePageSet = activeSet;

  renderStrengthLegend(totals);
  renderStrengthTotalsText(totals);
  renderJuzSelect(perJuz);
  updateStrengthEmptyState(totals, scopeSet);
}

function updateStrengthEmptyState(totals, scopeSet){
  if (!els.smEmpty) return;
  if (!strengthMapState.hasData){
    els.smEmpty.innerHTML = '<ion-icon name="bar-chart-outline"></ion-icon><p>Mark pages as Weak/Okay/Strong in the Mushaf viewer to populate this strength heatmap.</p>';
    els.smEmpty.hidden = false;
    return;
  }
  if (!totals.total || (scopeSet && !scopeSet.size)){
    els.smEmpty.innerHTML = '<ion-icon name="filter-outline"></ion-icon><p>No pages match the current filter. Try adjusting your scope or strength filter.</p>';
    els.smEmpty.hidden = false;
    return;
  }
  els.smEmpty.hidden = true;
}

function renderStrengthLegend(totals){
  if (!els.smLegend) return;
  const frag = document.createDocumentFragment();
  STRENGTH_ORDER.forEach((key) => {
    const style = STRENGTH_STYLES[key];
    const item = document.createElement('div');
    item.className = 'sm-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'sm-legend-swatch';
    swatch.style.background = style.color;
    const label = document.createElement('span');
    label.textContent = style.label;
    const count = document.createElement('span');
    count.className = 'sm-legend-count';
    count.textContent = String(totals[key] || 0);
    item.appendChild(swatch);
    item.appendChild(label);
    item.appendChild(count);
    frag.appendChild(item);
  });
  els.smLegend.replaceChildren(frag);
}

function renderStrengthTotalsText(totals){
  if (!els.smTotals) return;
  const total = totals.total || 0;
  const parts = STRENGTH_ORDER.map((key) => {
    const count = totals[key] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `${STRENGTH_STYLES[key].label} ${count} (${pct}%)`;
  });
  els.smTotals.textContent = parts.join(' | ');
}

function renderJuzSelect(perJuz){
  if (!els.smJuzSelect) return;
  const select = els.smJuzSelect;
  const previous = select.value;
  select.innerHTML = '';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'All Juz';
  select.appendChild(defaultOption);
  for (let j = 1; j <= 30; j += 1){
    const data = perJuz[j] || { weak: 0, okay: 0, strong: 0, unset: 0, total: 0 };
    const option = document.createElement('option');
    option.value = String(j);
    option.textContent = `Juz ${j} - Weak ${data.weak || 0} | Okay ${data.okay || 0} | Strong ${data.strong || 0}`;
    select.appendChild(option);
  }
  const desired = strengthMapState.selectedJuz ? String(strengthMapState.selectedJuz) : previous;
  if (desired && select.querySelector(`option[value="${desired}"]`)) select.value = desired;
  else select.value = '';
}

function setupStrengthChips(){
  if (!els.smStrengthFilter) return;
  els.smStrengthFilter.innerHTML = '';
  STRENGTH_FILTERS.forEach((opt) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'segmented-btn';
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    const isActive = opt.value === strengthMapState.filter;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) btn.classList.add('active');
    btn.addEventListener('click', () => setStrengthFilter(opt.value));
    els.smStrengthFilter.appendChild(btn);
    strengthMapState.chipButtons.set(opt.value, btn);
  });
}

function setupScopeControls(){
  if (els.smScope) els.smScope.addEventListener('change', () => setStrengthScope(els.smScope.value || 'all'));
  ['input', 'change'].forEach((evt) => {
    if (els.smScopeJuzInput) els.smScopeJuzInput.addEventListener(evt, () => { strengthMapState.selectedJuz = null; refreshStrengthMap(); });
    if (els.smScopeHizbInput) els.smScopeHizbInput.addEventListener(evt, () => refreshStrengthMap());
    if (els.smScopeSurahInput) els.smScopeSurahInput.addEventListener(evt, () => refreshStrengthMap());
  });
  if (els.smJuzSelect) els.smJuzSelect.addEventListener('change', () => {
    const val = els.smJuzSelect.value;
    strengthMapState.selectedJuz = val ? parseInt(val, 10) || null : null;
    if (els.smScope) els.smScope.value = 'juz';
    if (els.smScopeJuzInput) els.smScopeJuzInput.value = val || '';
    setStrengthScope('juz');
  });
}

function setupCanvasInteractions(){
  if (!strengthMapState.canvas) return;
  const canvas = strengthMapState.canvas;
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'application');
  canvas.addEventListener('mousemove', handleCanvasMove);
  canvas.addEventListener('mouseleave', hideStrengthHover);
  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('focus', () => {
    if (!strengthMapState.focusPage){
      const first = strengthMapState.activePages[0] || 1;
      strengthMapState.focusPage = first;
      refreshStrengthMap();
    }
  });
  canvas.addEventListener('keydown', handleCanvasKey);
}

function canvasCoords(ev){
  const rect = strengthMapState.canvas.getBoundingClientRect();
  const scaleX = strengthMapState.canvas.width / rect.width;
  const scaleY = strengthMapState.canvas.height / rect.height;
  return {
    x: (ev.clientX - rect.left) * scaleX,
    y: (ev.clientY - rect.top) * scaleY,
  };
}

function pageFromPoint(x, y){
  const rects = strengthMapState.layout ? strengthMapState.layout.rects : [];
  for (let page = 1; page <= 604; page += 1){
    const rect = rects[page];
    if (!rect) continue;
    if (x >= rect.x && x <= rect.x + rect.size && y >= rect.y && y <= rect.y + rect.size){
      return { page, rect };
    }
  }
  return null;
}

function handleCanvasMove(ev){
  const coords = canvasCoords(ev);
  const hit = pageFromPoint(coords.x, coords.y);
  if (!hit){
    hideStrengthHover();
    return;
  }
  setHoverPage(hit.page, hit.rect, ev.clientX, ev.clientY);
}

function setHoverPage(page, rect, clientX, clientY){
  const tip = ensureStrengthTooltip();
  const stat = strengthMapState.pageStats[page] || { strength: 'unset', lastReviewedAt: null };
  const juz = strengthMapState.pageToJuz[page] || '?';
  const style = STRENGTH_STYLES[stat.strength] || STRENGTH_STYLES.unset;
  const last = stat.lastReviewedAt ? new Date(stat.lastReviewedAt).toISOString().slice(0, 10) : "--";
  tip.style.display = 'block';
  const offsetX = 16;
  const offsetY = 16;
  tip.style.left = `${clientX + offsetX}px`;
  tip.style.top = `${clientY + offsetY}px`;
  strengthMapState.hoverPage = page;
}

function hideStrengthHover(){
  const tip = ensureStrengthTooltip();
  if (tip) tip.style.display = 'none';
  strengthMapState.hoverPage = null;
}

function handleCanvasClick(ev){
  const coords = canvasCoords(ev);
  const hit = pageFromPoint(coords.x, coords.y);
  if (hit) location.href = `reader.html?page=${hit.page}&controls=open`;
}

function moveFocusBy(delta){
  if (!strengthMapState.activePages.length) return;
  const current = strengthMapState.focusPage || strengthMapState.activePages[0];
  const idx = strengthMapState.activePages.indexOf(current);
  const nextIdx = Math.max(0, Math.min(strengthMapState.activePages.length - 1, idx + delta));
  strengthMapState.focusPage = strengthMapState.activePages[nextIdx];
  announceStrength(`Page ${strengthMapState.focusPage}`);
  refreshStrengthMap();
}

function moveFocusGrid(deltaRow, deltaCol){
  if (!strengthMapState.activePages.length) return;
  const current = strengthMapState.focusPage || strengthMapState.activePages[0];
  let idx = current - 1;
  let col = idx % MAP_COLS;
  let row = Math.floor(idx / MAP_COLS);
  col = Math.max(0, Math.min(MAP_COLS - 1, col + deltaCol));
  row = Math.max(0, Math.min(MAP_ROWS - 1, row + deltaRow));
  let target = row * MAP_COLS + col + 1;
  if (target < 1) target = 1;
  if (target > 604) target = 604;
  if (!strengthMapState.activePageSet.has(target)){
    const direction = (deltaRow > 0 || deltaCol > 0) ? 1 : -1;
    let search = target - 1 + direction;
    while (search >= 0 && search < MAP_COLS * MAP_ROWS){
      const page = search + 1;
      if (page >= 1 && page <= 604 && strengthMapState.activePageSet.has(page)){
        target = page;
        break;
      }
      search += direction;
    }
  }
  strengthMapState.focusPage = target;
  announceStrength(`Page ${target}`);
  refreshStrengthMap();
}

function handleCanvasKey(ev){
  switch (ev.key){
    case 'ArrowRight':
      ev.preventDefault();
      moveFocusBy(1);
      return;
    case 'ArrowLeft':
      ev.preventDefault();
      moveFocusBy(-1);
      return;
    case 'ArrowDown':
      ev.preventDefault();
      moveFocusGrid(1, 0);
      return;
    case 'ArrowUp':
      ev.preventDefault();
      moveFocusGrid(-1, 0);
      return;
    case 'Home':
      ev.preventDefault();
      strengthMapState.focusPage = strengthMapState.activePages[0] || 1;
      announceStrength(`Page ${strengthMapState.focusPage}`);
      refreshStrengthMap();
      return;
    case 'End':
      ev.preventDefault();
      strengthMapState.focusPage = strengthMapState.activePages[strengthMapState.activePages.length - 1] || 604;
      announceStrength(`Page ${strengthMapState.focusPage}`);
      refreshStrengthMap();
      return;
    case 'Enter':
    case ' ':
      ev.preventDefault();
      if (strengthMapState.focusPage) location.href = `reader.html?page=${strengthMapState.focusPage}&controls=open`;
      return;
    default:
  }
}

async function computeStrengthScopePages(){
  const set = new Set();
  if (strengthMapState.scope === 'all'){
    for (let p = 1; p <= 604; p += 1) set.add(p);
    strengthMapState.scopeSummary = 'All Quran';
    return set;
  }
  if (strengthMapState.scope === 'juz'){
    let list = strengthMapState.selectedJuz ? [strengthMapState.selectedJuz] : parseStrengthRanges(els.smScopeJuzInput, 30);
    if (!list.length) list = Array.from({ length: 30 }, (_, idx) => idx + 1);
    for (const j of list){
      if (j >= 1 && j <= 30){
        // eslint-disable-next-line no-await-in-loop
        const pages = await getJuzPages(j);
        pages.forEach((p) => set.add(p));
      }
    }
    strengthMapState.scopeSummary = list.length && list.length !== 30 ? `Juz ${formatNumberRanges(list)}` : 'Juz';
    return set;
  }
  if (strengthMapState.scope === 'hizb'){
    let list = parseStrengthRanges(els.smScopeHizbInput, 60);
    if (!list.length) list = Array.from({ length: 60 }, (_, idx) => idx + 1);
    for (const h of list){
      if (h >= 1 && h <= 60){
        // eslint-disable-next-line no-await-in-loop
        const pages = await getHizbPages(h);
        pages.forEach((p) => set.add(p));
      }
    }
    strengthMapState.scopeSummary = list.length && list.length !== 60 ? `Hizb ${formatNumberRanges(list)}` : 'Hizb';
    return set;
  }
  if (strengthMapState.scope === 'surah'){
    const list = parseStrengthRanges(els.smScopeSurahInput, 114);
    if (!list.length) list.push(...Array.from({ length: 114 }, (_, idx) => idx + 1));
    await Promise.all(list.map(async (sid) => {
      const pages = await getSurahPageNumbers(sid);
      pages.forEach((p) => { if (p >= 1 && p <= 604) set.add(p); });
    }));
    strengthMapState.scopeSummary = list.length && list.length !== 114 ? `Surah ${formatNumberRanges(list)}` : 'Surahs';
    return set;
  }
  return set;
}

function ensureJsPdf(){
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!strengthMapState.jsPdfPromise){
    strengthMapState.jsPdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.async = true;
      script.onload = () => resolve(window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null);
      script.onerror = () => reject(new Error('Failed to load jsPDF'));
      document.head.appendChild(script);
    });
  }
  return strengthMapState.jsPdfPromise.then((Ctor) => {
    if (!Ctor) throw new Error('jsPDF not available');
    return Ctor;
  });
}

async function exportStrengthPdf(){
  if (!strengthMapState.canvas) return;
  try {
    const jsPDF = await ensureJsPdf();
    if (!jsPDF) throw new Error('jsPDF missing');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const margin = 40;
    const headingY = margin + 10;
    const dateStr = new Date().toISOString().slice(0, 10);
    const totals = strengthMapState.lastTotals || { weak: 0, okay: 0, strong: 0, unset: 0, total: 0 };
    const perJuz = strengthMapState.lastPerJuz || [];
    const mapUrl = strengthMapState.canvas.toDataURL('image/png', 1);

    const totalsText = STRENGTH_ORDER.map((key) => {
      const count = totals[key] || 0;
      const pct = totals.total ? Math.round((count / totals.total) * 100) : 0;
      return `${STRENGTH_STYLES[key].label}: ${count} (${pct}%)`;
    }).join(' | ');

    doc.setFontSize(22);
    doc.text('Mushaf Strength Report', margin, headingY);
    doc.setFontSize(12);
    doc.text(`Generated on ${dateStr}`, margin, headingY + 20);
    doc.text(buildFilterDescription(), margin, headingY + 38);
    doc.text(totalsText, margin, headingY + 56);

    const imgWidth = width - margin * 2;
    const imgHeight = imgWidth * (strengthMapState.canvas.height / strengthMapState.canvas.width);
    doc.addImage(mapUrl, 'PNG', margin, headingY + 70, imgWidth, imgHeight);

    doc.addPage();
    doc.setFontSize(18);
    doc.text('Juz Summary', margin, margin + 12);
    doc.setFontSize(11);
    let cursorY = margin + 32;
    for (let j = 1; j <= 30; j += 1){
      const data = perJuz[j] || { weak: 0, okay: 0, strong: 0, unset: 0, total: 0 };
      const line = `Juz ${j}: Weak ${data.weak || 0}, Okay ${data.okay || 0}, Strong ${data.strong || 0}, Unset ${data.unset || 0}, Total ${data.total || 0}`;
      if (cursorY > height - margin){
        doc.addPage();
        doc.setFontSize(11);
        cursorY = margin + 12;
      }
      doc.text(line, margin, cursorY);
      cursorY += 18;
    }

    doc.save(`quran-reviser-strength-report-${dateStr}.pdf`);
  } catch (error) {
    console.error(error);
    alert('Failed to export strength report.');
  }
}

async function initStrengthMap(){
  if (!els.smCanvas) return;
  strengthMapState.canvas = els.smCanvas;
  strengthMapState.ctx = els.smCanvas.getContext('2d');
  strengthMapState.pageStats = readPageStrengths();
  strengthMapState.hasData = strengthMapState.pageStats.some((entry, idx) => idx > 0 && entry && entry.strength && entry.strength !== 'unset');
  await ensurePageToJuz();
  strengthMapState.layout = buildTileLayout();
  setupStrengthChips();
  setupScopeControls();
  setupCanvasInteractions();
  if (els.smExport) els.smExport.addEventListener('click', () => exportStrengthPdf());
  window.addEventListener('resize', () => {
    strengthMapState.layout = buildTileLayout();
    refreshStrengthMap();
  });
  await refreshStrengthMap();
}

function getCssVar(name){
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

function roundRect(ctx, x, y, w, h, r, fill, stroke){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function invalidateTrackedPagesCache(){
  trackedPagesCache = null;
}

async function getTrackedPagesArray(){
  if (Array.isArray(trackedPagesCache)) return trackedPagesCache;
  const set = await computeCoveredPagesSet();
  const arr = Array.from(set).sort((a, b) => a - b);
  trackedPagesCache = arr;
  return arr;
}

function formatRange(arr){
  if (!arr || !arr.length) return '-';
  const first = arr[0];
  const last = arr[arr.length - 1];
  return first === last ? String(first) : `${first}-${last}`;
}

async function updateTrackedSummary(){
  if (!els.planTrackedSummary) return;
  try {
    const pages = await getTrackedPagesArray();
    if (!pages.length) {
      els.planTrackedSummary.innerHTML = '<ion-icon name="alert-circle-outline"></ion-icon> Track your memorization above to unlock the daily revision plan.';
      els.planTrackedSummary.dataset.empty = '1';
      if (els.heroPages) els.heroPages.textContent = '0';
      
      // Update hero daily target
      const heroTarget = document.getElementById('hero-daily-target');
      if (heroTarget) heroTarget.textContent = 'Set up your plan';
      
      return;
    }
    const count = pages.length;
    const first = pages[0];
    const last = pages[count - 1];
    const pageToJuz = await ensurePageToJuz();
    const pageToHizb = await ensurePageToHizb();
    const juzSet = new Set();
    const hizbSet = new Set();
    pages.forEach((page) => {
      const j = pageToJuz[page];
      if (j) juzSet.add(j);
      const h = pageToHizb[page];
      if (h) hizbSet.add(h);
    });
    const juzSummary = formatRange(Array.from(juzSet).sort((a, b) => a - b));
    const hizbSummary = formatRange(Array.from(hizbSet).sort((a, b) => a - b));
    els.planTrackedSummary.innerHTML = `<ion-icon name="checkmark-circle-outline"></ion-icon> Tracked ${count} page${count === 1 ? '' : 's'} | Pages ${first}-${last} | Juz ${juzSummary} | Hizb ${hizbSummary}`;
    els.planTrackedSummary.dataset.empty = '0';
    if (els.heroPages) els.heroPages.textContent = String(count);
  } catch (err) {
    console.error(err);
    els.planTrackedSummary.textContent = '';
  }
}

function getPlanStartMode(){
  const radios = Array.from(document.querySelectorAll('input[name="plan-start-mode"]'));
  const hit = radios.find((radio) => radio.checked);
  return hit ? hit.value : 'first';
}

function setPlanStartMode(mode){
  const radios = Array.from(document.querySelectorAll('input[name="plan-start-mode"]'));
  radios.forEach((radio) => { radio.checked = radio.value === mode; });
  if (els.planStartCustom) els.planStartCustom.hidden = mode !== 'custom';
}

function getPlanStartInput(unit){
  if (unit === 'juz') return els.planStartJuz;
  if (unit === 'hizb') return els.planStartHizb;
  return els.planStartPage;
}

function updatePlanStartInputs(){
  if (!els.planUnit || !els.planStartLabel) return;
  const unit = els.planUnit.value || 'pages';
  if (unit === 'pages') els.planStartLabel.textContent = 'Starting page';
  else if (unit === 'juz') els.planStartLabel.textContent = 'Starting Juz';
  else els.planStartLabel.textContent = 'Starting Hizb';
  if (els.planStartPage) els.planStartPage.hidden = unit !== 'pages';
  if (els.planStartJuz) els.planStartJuz.hidden = unit !== 'juz';
  if (els.planStartHizb) els.planStartHizb.hidden = unit !== 'hizb';
}

function readStoredPlan(){
  try {
    const raw = (QR.profiles && typeof QR.profiles.getItem === 'function')
      ? QR.profiles.getItem(PLAN_KEY)
      : localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(err);
    return null;
  }
}

function writeStoredPlan(value){
  try {
    if (!value) {
      if (QR.profiles && typeof QR.profiles.removeItem === 'function') QR.profiles.removeItem(PLAN_KEY);
      else localStorage.removeItem(PLAN_KEY);
      return;
    }
    const raw = JSON.stringify(value);
    if (QR.profiles && typeof QR.profiles.setItem === 'function') QR.profiles.setItem(PLAN_KEY, raw);
    else localStorage.setItem(PLAN_KEY, raw);
  } catch (err) {
    console.error(err);
  }
}

function normalisePlan(stored){
  if (!stored || typeof stored !== 'object') return null;
  const unit = stored.unit === 'juz' ? 'juz' : stored.unit === 'hizb' ? 'hizb' : 'pages';
  const maxStart = unit === 'pages' ? 604 : unit === 'juz' ? 30 : 60;
  let startValue = Number(stored.startValue);
  if (!startValue || Number.isNaN(startValue) || startValue < 1) startValue = 1;
  startValue = Math.min(startValue, maxStart);
  const amount = Math.max(1, Number(stored.amount) || 1);
  return {
    version: 1,
    unit,
    amount,
    startMode: stored.startMode === 'custom' ? 'custom' : 'first',
    startValue,
    createdAt: stored.createdAt || new Date().toISOString().slice(0, 10),
    completedAssignments: Math.max(0, Number(stored.completedAssignments) || 0),
    lastCompletedAt: stored.lastCompletedAt || null,
  };
}

function loadDailyPlan(){
  dailyPlan = normalisePlan(readStoredPlan());
}

function saveDailyPlan(){
  if (!dailyPlan) {
    writeStoredPlan(null);
    return;
  }
  writeStoredPlan(dailyPlan);
}

async function buildPlanPool(plan){
  const pages = await getTrackedPagesArray();
  if (!pages.length) return [];
  const unit = plan.unit || 'pages';
  const start = Math.max(1, Number(plan.startValue) || 1);
  if (unit === 'pages') {
    return pages.filter((p) => p >= start);
  }
  if (unit === 'juz') {
    const pageToJuz = await ensurePageToJuz();
    const set = new Set();
    pages.forEach((p) => {
      const j = pageToJuz[p];
      if (j) set.add(j);
    });
    return Array.from(set).sort((a, b) => a - b).filter((j) => j >= start);
  }
  const pageToHizb = await ensurePageToHizb();
  const set = new Set();
  pages.forEach((p) => {
    const h = pageToHizb[p];
    if (h) set.add(h);
  });
  return Array.from(set).sort((a, b) => a - b).filter((h) => h >= start);
}

function formatUnitLabel(unit){
  if (unit === 'juz') return 'Juz';
  if (unit === 'hizb') return 'Hizb';
  return 'Page';
}

function formatPlanAssignment(plan, items){
  if (!items || !items.length) return 'All assignments completed. Adjust or reset the plan to continue.';
  const unitLabel = formatUnitLabel(plan.unit);
  if (items.length === 1) return `Review ${unitLabel.toLowerCase()} ${items[0]}`;
  return `Review ${unitLabel.toLowerCase()}s ${items[0]}-${items[items.length - 1]}`;
}

async function refreshPlanUI(){
  if (!els.planSetup || !els.planActive) return;
  if (!dailyPlan) {
    if (els.planSetup) els.planSetup.hidden = false;
    if (els.planActive) els.planActive.hidden = true;
    if (els.planAssignmentText) els.planAssignmentText.textContent = '';
    if (els.planStatusText) els.planStatusText.textContent = '';
    if (els.planDayLabel) els.planDayLabel.textContent = '';
    if (els.planStarted) els.planStarted.textContent = '';
    if (els.planDone) els.planDone.disabled = true;
    if (els.planBack) els.planBack.disabled = true;
    
    // Update hero daily target
    const heroTarget = document.getElementById('hero-daily-target');
    if (heroTarget) heroTarget.textContent = 'Set up your plan';
    
    return;
  }

  const pool = await buildPlanPool(dailyPlan);
  const amount = Math.max(1, Number(dailyPlan.amount) || 1);
  const totalAssignments = pool.length ? Math.ceil(pool.length / amount) : 0;
  if (dailyPlan.completedAssignments > totalAssignments) {
    dailyPlan.completedAssignments = totalAssignments;
    saveDailyPlan();
  }

  if (els.planSetup) els.planSetup.hidden = true;
  if (els.planActive) els.planActive.hidden = false;

  if (!pool.length) {
    if (els.planAssignmentText) els.planAssignmentText.textContent = 'No tracked pages match this plan. Update your progress or reset the plan.';
    if (els.planStatusText) els.planStatusText.textContent = '';
    if (els.planDayLabel) els.planDayLabel.textContent = 'Plan status';
    if (els.planAssignmentCard) els.planAssignmentCard.classList.add('completed');
    if (els.planDone) els.planDone.disabled = true;
    if (els.planBack) els.planBack.disabled = dailyPlan.completedAssignments === 0;
    
    // Update hero
    const heroTarget = document.getElementById('hero-daily-target');
    if (heroTarget) heroTarget.textContent = 'Update progress';
    
    return;
  }

  const offset = Math.min(dailyPlan.completedAssignments * amount, pool.length);
  const segment = pool.slice(offset, offset + amount);
  const remainingAssignments = Math.max(0, totalAssignments - dailyPlan.completedAssignments);
  const remainingUnits = Math.max(0, pool.length - offset);

  if (els.planAssignmentText) els.planAssignmentText.textContent = formatPlanAssignment(dailyPlan, segment);
  if (els.planAssignmentCard) {
    if (segment.length) els.planAssignmentCard.classList.remove('completed');
    else els.planAssignmentCard.classList.add('completed');
  }
  if (els.planStatusText) {
    if (!segment.length) {
      els.planStatusText.textContent = '🎉 Plan complete! Adjust your pace or reset to continue.';
    } else {
      const afterAssignments = Math.max(0, remainingAssignments - 1);
      const afterUnits = Math.max(0, remainingUnits - segment.length);
      if (afterAssignments > 0) {
        els.planStatusText.textContent = `${afterAssignments} assignment${afterAssignments === 1 ? '' : 's'} remain after today | ${afterUnits} unit${afterUnits === 1 ? '' : 's'} left`;
      } else if (remainingAssignments > 0) {
        els.planStatusText.textContent = '🏁 Finish this assignment to complete the plan!';
      } else {
        els.planStatusText.textContent = '';
      }
    }
  }

  if (els.planDone) els.planDone.disabled = !segment.length;
  if (els.planBack) els.planBack.disabled = dailyPlan.completedAssignments <= 0;

  if (els.planDayLabel) {
    if (!segment.length) {
      els.planDayLabel.textContent = 'Completed! 🎉';
    } else {
      const dayNumber = dailyPlan.completedAssignments + 1;
      let label = `Day ${dayNumber}`;
      try {
        if (dailyPlan.createdAt) {
          const startDate = new Date(dailyPlan.createdAt);
          if (!Number.isNaN(startDate.getTime())) {
            const assignmentDate = new Date(startDate);
            assignmentDate.setDate(startDate.getDate() + dailyPlan.completedAssignments);
            const formatter = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            label = `Day ${dayNumber} - ${formatter.format(assignmentDate)}`;
          }
        }
      } catch {}
      els.planDayLabel.textContent = label;
    }
  }

  if (els.planStarted) {
    try {
      const startDate = dailyPlan.createdAt ? new Date(dailyPlan.createdAt) : null;
      if (startDate && !Number.isNaN(startDate.getTime())) {
        const formatter = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
        els.planStarted.textContent = `Plan started on ${formatter.format(startDate)}`;
      } else {
        els.planStarted.textContent = '';
      }
    } catch {
      els.planStarted.textContent = '';
    }
  }
  
  // Update hero daily target
  const heroTarget = document.getElementById('hero-daily-target');
  if (heroTarget && segment.length) {
    heroTarget.textContent = formatPlanAssignment(dailyPlan, segment);
  } else if (heroTarget) {
    heroTarget.textContent = 'Plan complete!';
  }
}

async function handlePlanSave(){
  if (!els.planUnit || !els.planAmount) return;
  const unit = els.planUnit.value || 'pages';
  let amount = Math.max(1, Number(els.planAmount.value) || 1);
  const maxAmount = unit === 'pages' ? 50 : unit === 'juz' ? 30 : 60;
  if (amount > maxAmount) amount = maxAmount;
  els.planAmount.value = String(amount);

  const startMode = getPlanStartMode();
  const trackedPages = await getTrackedPagesArray();
  if (!trackedPages.length) {
    alert('Track your progress before creating a daily revision plan.');
    return;
  }

  let startValue = null;
  if (startMode === 'custom') {
    const input = getPlanStartInput(unit);
    const raw = input ? input.value : '';
    startValue = parseInt(raw || '', 10);
    const limit = unit === 'pages' ? 604 : unit === 'juz' ? 30 : 60;
    if (!startValue || Number.isNaN(startValue) || startValue < 1 || startValue > limit) {
      alert(`Enter a valid ${unit === 'pages' ? 'page (1-604)' : unit === 'juz' ? 'Juz (1-30)' : 'Hizb (1-60)'} to start from.`);
      return;
    }
  } else {
    if (unit === 'pages') {
      startValue = trackedPages[0];
    } else if (unit === 'juz') {
      const pageToJuz = await ensurePageToJuz();
      const arr = Array.from(new Set(trackedPages.map((p) => pageToJuz[p] || 0))).filter(Boolean).sort((a, b) => a - b);
      if (!arr.length) {
        alert('None of your tracked pages map to a Juz yet.');
        return;
      }
      startValue = arr[0];
    } else {
      const pageToHizb = await ensurePageToHizb();
      const arr = Array.from(new Set(trackedPages.map((p) => pageToHizb[p] || 0))).filter(Boolean).sort((a, b) => a - b);
      if (!arr.length) {
        alert('None of your tracked pages map to a Hizb yet.');
        return;
      }
      startValue = arr[0];
    }
  }

  const candidate = {
    version: 1,
    unit,
    amount,
    startMode,
    startValue,
    createdAt: new Date().toISOString().slice(0, 10),
    completedAssignments: 0,
    lastCompletedAt: null,
  };
  const pool = await buildPlanPool(candidate);
  if (!pool.length) {
    alert('No tracked content found for this plan setup. Update your progress and try again.');
    return;
  }
  dailyPlan = candidate;
  saveDailyPlan();
  await refreshPlanUI();
}

async function handlePlanDone(){
  if (!dailyPlan) return;
  const pool = await buildPlanPool(dailyPlan);
  if (!pool.length) {
    alert('No tracked pages available for this plan.');
    return;
  }
  const amount = Math.max(1, Number(dailyPlan.amount) || 1);
  const totalAssignments = Math.ceil(pool.length / amount);
  if (dailyPlan.completedAssignments >= totalAssignments) {
    alert('The plan is already complete.');
    return;
  }
  dailyPlan.completedAssignments += 1;
  dailyPlan.lastCompletedAt = new Date().toISOString();
  saveDailyPlan();
  await refreshPlanUI();
}

async function handlePlanBack(){
  if (!dailyPlan) return;
  if (dailyPlan.completedAssignments <= 0) return;
  dailyPlan.completedAssignments -= 1;
  saveDailyPlan();
  await refreshPlanUI();
}

async function handlePlanReset(){
  if (!dailyPlan) return;
  if (!confirm('Reset the daily revision plan?')) return;
  dailyPlan = null;
  saveDailyPlan();
  if (els.planSetup) els.planSetup.hidden = false;
  if (els.planActive) els.planActive.hidden = true;
  await refreshPlanUI();
}

async function initDailyPlan(){
  loadDailyPlan();
  updatePlanStartInputs();
  const radios = Array.from(document.querySelectorAll('input[name="plan-start-mode"]'));
  radios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const mode = getPlanStartMode();
      if (els.planStartCustom) els.planStartCustom.hidden = mode !== 'custom';
    });
  });
  if (els.planUnit) {
    els.planUnit.addEventListener('change', () => {
      updatePlanStartInputs();
    });
  }
  if (els.planSave) {
    els.planSave.addEventListener('click', async (ev) => {
      ev.preventDefault();
      await handlePlanSave();
    });
  }
  if (els.planDone) els.planDone.addEventListener('click', async () => { await handlePlanDone(); });
  if (els.planBack) els.planBack.addEventListener('click', async () => { await handlePlanBack(); });
  if (els.planReset) els.planReset.addEventListener('click', async () => { await handlePlanReset(); });

  const initialMode = getPlanStartMode();
  setPlanStartMode(initialMode);
  await refreshPlanUI();
}


