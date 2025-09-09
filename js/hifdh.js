const API_BASE = 'https://api.quran.com/api/v4';

// Elements
const els = {
  list: document.getElementById('list'),
  sAyah: document.getElementById('s-ayah'),
  sPerc: document.getElementById('s-perc'),
  sPages: document.getElementById('s-pages'),
  sLeft: document.getElementById('s-left'),
  reset: document.getElementById('reset-progress'),
  calcScope: document.getElementById('calc-scope'),
  scopeSurahsField: document.getElementById('scope-surahs-field'),
  scopeSurahsInput: document.getElementById('scope-surahs-input'),
  scopeJuzField: document.getElementById('scope-juz-field'),
  scopeJuzInput: document.getElementById('scope-juz-input'),
  scopeHizbField: document.getElementById('scope-hizb-field'),
  scopeHizbInput: document.getElementById('scope-hizb-input'),
  ratePages: document.getElementById('rate-pages'),
  minsPerPage: document.getElementById('mins-per-page'),
  cPagesLeft: document.getElementById('c-pages-left'),
  cDays: document.getElementById('c-days'),
  cDate: document.getElementById('c-date'),
  cTime: document.getElementById('c-time'),
};

const KEY = 'hifdh_progress';
const PREFS_KEY = 'qr_prefs';
let chapters = [];
let progress = {};
const surahPagesCache = new Map(); // sid -> [page_number per verse]

function readProgress(){ try { return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch { return {}; } }
function writeProgress(obj){ try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {} }
function readPrefs(){ try { return JSON.parse(localStorage.getItem(PREFS_KEY)||'{}')||{}; } catch { return {}; } }
function clamp(n,min,max){ n=Number(n)||0; if(n<min) return min; if(n>max) return max; return n; }

async function loadChapters(){
  try { const cached = JSON.parse(localStorage.getItem('qr_chapters_cache')||'null'); if (cached && Array.isArray(cached) && cached.length===114) { chapters = cached; return; } } catch {}
  try { const res = await fetch(`${API_BASE}/chapters?language=en`); const data = await res.json(); chapters = (data.chapters||[]).map(c => ({ id:c.id, name_en:c.name_simple, name_ar:c.name_arabic, verses:c.verses_count||0 })); try { localStorage.setItem('qr_chapters_cache', JSON.stringify(chapters)); } catch {} return; } catch {}
  if (Array.isArray(window.CHAPTERS_DATA)) chapters = window.CHAPTERS_DATA.map(c => ({ id:c.id, name_en:c.name_simple, name_ar:c.name_arabic, verses:c.verses_count||0 })); else chapters = [];
}

function totalAyahAll(){ return chapters.reduce((s,ch)=> s + (ch.verses||0), 0); }

async function getSurahPageNumbers(sid){
  sid = parseInt(String(sid),10);
  if (surahPagesCache.has(sid)) return surahPagesCache.get(sid);
  try { const cached = JSON.parse(localStorage.getItem(`qr_surah_pages_${sid}`)||'null'); if (Array.isArray(cached) && cached.length>0) { surahPagesCache.set(sid, cached); return cached; } } catch {}
  try {
    const res = await fetch(`${API_BASE}/verses/by_chapter/${sid}?per_page=300&words=false`);
    const data = await res.json();
    const arr = (data.verses||[]).map(v => v.page_number).filter(p => typeof p==='number' && p>=1 && p<=604);
    surahPagesCache.set(sid, arr);
    try { localStorage.setItem(`qr_surah_pages_${sid}`, JSON.stringify(arr)); } catch {}
    return arr;
  } catch { surahPagesCache.set(sid, []); return []; }
}

async function computeCoveredPagesSet(){
  const set = new Set();
  const entries = Object.entries(progress).filter(([sid,m]) => (Number(m)||0) > 0);
  await Promise.all(entries.map(async ([sid,m]) => {
    const pagesArr = await getSurahPageNumbers(sid);
    const upto = Math.max(0, Math.min(pagesArr.length, Number(m)||0));
    for(let i=0;i<upto;i++){ const p = pagesArr[i]; if (p>=1 && p<=604) set.add(p); }
  }));
  return set;
}

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
  [0,25,50,75,100].forEach(p => { const b = document.createElement('button'); b.textContent = p+'%'; b.addEventListener('click',()=>{ range.value = String(Math.round((ch.verses||0)*p/100)); range.dispatchEvent(new Event('input',{bubbles:true})); range.dispatchEvent(new Event('change',{bubbles:true})); }); quick.appendChild(b); });
  ctrls.appendChild(top); ctrls.appendChild(range); ctrls.appendChild(quick);

  row.appendChild(sid); row.appendChild(names); row.appendChild(ctrls);

  const sync = () => { const m = clamp(parseInt(range.value,10)||0,0,ch.verses||0); const pct = (ch.verses>0) ? Math.round((m/(ch.verses))*100) : 0; perc.textContent = `${pct}% • ${m}/${ch.verses}`; };
  sync();
  range.addEventListener('input', sync);
  range.addEventListener('change', async () => { const m = clamp(parseInt(range.value,10)||0,0,ch.verses||0); progress[ch.id] = m; writeProgress(progress); await updateSummary(); await updateCalculator(); });
  return row;
}

function render(){ const frag = document.createDocumentFragment(); (chapters||[]).forEach(ch => frag.appendChild(makeSurahRow(ch))); if (els.list) els.list.replaceChildren(frag); }

async function updateSummary(){
  const totalAll = chapters.reduce((s,ch)=> s + (ch.verses||0), 0);
  const memorized = Object.entries(progress).reduce((s,[sid,m])=>{ const ch = chapters.find(c=>String(c.id)===String(sid)); const cap = ch? ch.verses||0 : 0; return s + Math.min(cap, Number(m)||0); },0);
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

async function updateCalculator(){
  const set = await computeCoveredPagesSet();
  const pagesLeft = Math.max(0, 604 - set.size);
  const rate = Math.max(0, parseFloat(els.ratePages && els.ratePages.value || '0')) || 0;
  if (els.cPagesLeft) els.cPagesLeft.textContent = String(pagesLeft);
  if (rate <= 0){ if (els.cDays) els.cDays.textContent = '-'; if (els.cDate) els.cDate.textContent = '-'; if (els.cTime) els.cTime.textContent = '-'; return; }
  const days = Math.ceil(pagesLeft / rate); if (els.cDays) els.cDays.textContent = String(days);
  try { const d = new Date(); d.setDate(d.getDate()+days); if (els.cDate) els.cDate.textContent = d.toLocaleDateString(); } catch { if (els.cDate) els.cDate.textContent = '-'; }
  const mpp = Math.max(0, parseFloat(els.minsPerPage && els.minsPerPage.value || '0')) || 0;
  if (mpp>0){ const mins = pagesLeft * mpp; const h = Math.floor(mins/60), m = Math.round(mins%60); if (els.cTime) els.cTime.textContent = `${h}h ${m}m`; } else { if (els.cTime) els.cTime.textContent = '-'; }
}

function applyTheme(){ try { const prefs = readPrefs(); const t = prefs.theme||'dark'; document.body.setAttribute('data-theme', t); } catch { document.body.setAttribute('data-theme', 'dark'); } }

document.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  progress = readProgress();
  await loadChapters();
  render();
  await updateSummary();
  await updateCalculator();
  if (els.reset) els.reset.addEventListener('click', async () => { if (confirm('Reset all memorization progress?')) { progress = {}; writeProgress(progress); render(); await updateSummary(); await updateCalculator(); } });
  if (els.calcScope) els.calcScope.addEventListener('change', () => {
    const v = els.calcScope.value;
    if (els.scopeSurahsField) els.scopeSurahsField.hidden = (v!=='surahs');
    if (els.scopeJuzField) els.scopeJuzField.hidden = (v!=='juz');
    if (els.scopeHizbField) els.scopeHizbField.hidden = (v!=='hizb');
  });
  ['input','change'].forEach(ev => { if (els.ratePages) els.ratePages.addEventListener(ev, ()=>updateCalculator()); if (els.minsPerPage) els.minsPerPage.addEventListener(ev, ()=>updateCalculator()); });
});
