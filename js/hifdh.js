const API_BASE = 'https://api.quran.com/api/v4';

const els = {
  list: document.getElementById('list'),
  sAyah: document.getElementById('s-ayah'),
  sPerc: document.getElementById('s-perc'),
  sPages: document.getElementById('s-pages'),
  sLeft: document.getElementById('s-left'),
  reset: document.getElementById('reset-progress'),
  calcMode: document.getElementById('calc-mode'),
  customField: document.getElementById('custom-progress-field'),
  customProgress: document.getElementById('custom-progress'),
  ratePages: document.getElementById('rate-pages'),
  minsPerPage: document.getElementById('mins-per-page'),
  cPagesLeft: document.getElementById('c-pages-left'),
  cDays: document.getElementById('c-days'),
  cDate: document.getElementById('c-date'),
  cTime: document.getElementById('c-time'),
};

const KEY = 'hifdh_progress'; // { [surahId]: ayahMemorized }
const PREFS_KEY = 'qr_prefs';
let chapters = [];
let progress = {}; // in ayah counts per surah

function readProgress(){ try { return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch { return {}; } }
function writeProgress(obj){ try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch {} }
function readPrefs(){ try { return JSON.parse(localStorage.getItem(PREFS_KEY)||'{}')||{}; } catch { return {}; } }

function clamp(n,min,max){ n=Number(n)||0; if(n<min) return min; if(n>max) return max; return n; }

async function loadChapters(){
  // Try to reuse cached chapters in prefs to reduce calls
  try {
    const cached = JSON.parse(localStorage.getItem('qr_chapters_cache')||'null');
    if (cached && Array.isArray(cached) && cached.length===114) { chapters = cached; return; }
  } catch {}
  const res = await fetch(`${API_BASE}/chapters?language=en`);
  const data = await res.json();
  chapters = (data.chapters||[]).map(c => ({
    id: c.id,
    name_en: c.name_simple,
    name_ar: c.name_arabic,
    verses: c.verses_count || 0,
    pages: Array.isArray(c.pages) && c.pages.length===2 ? (c.pages[1] - c.pages[0] + 1) : null,
  }));
  try { localStorage.setItem('qr_chapters_cache', JSON.stringify(chapters)); } catch {}
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

  const sync = () => {
    const m = clamp(parseInt(range.value,10)||0,0,ch.verses||0);
    const pct = (ch.verses>0) ? Math.round((m/(ch.verses))*100) : 0;
    perc.textContent = `${pct}% · ${m}/${ch.verses}`;
  };
  sync();
  range.addEventListener('input', sync);
  range.addEventListener('change', () => {
    const m = clamp(parseInt(range.value,10)||0,0,ch.verses||0);
    progress[ch.id] = m;
    writeProgress(progress);
    updateSummary();
    updateCalculator();
  });
  return row;
}

function totalAyah(){ return chapters.reduce((s,ch)=> s + (ch.verses||0), 0); }

function pagesCoveredApprox(){
  // Prefer exact pages per surah if available, else proportional to 604 pages
  const totalPages = 604;
  let hasPageData = chapters.every(ch => ch.pages && ch.pages>0);
  if (hasPageData){
    // Sum per-surah pages multiplied by its completion ratio
    return chapters.reduce((sum,ch)=>{
      const mem = clamp(progress[ch.id]||0,0,ch.verses||0);
      const frac = (ch.verses>0) ? (mem / ch.verses) : 0;
      const pages = ch.pages || 0;
      return sum + (pages * frac);
    }, 0);
  }
  // Fallback proportional to overall ayah progress
  const totAyah = totalAyah() || 6236;
  const memAyah = Object.entries(progress).reduce((s,[sid,m])=> s + clamp(m,0,(chapters.find(c=>c.id==sid)?.verses||0)), 0);
  const ratio = memAyah / totAyah;
  return ratio * totalPages;
}

function updateSummary(){
  const totAyah = totalAyah() || 6236;
  const memAyah = Object.entries(progress).reduce((s,[sid,m])=> s + clamp(m,0,(chapters.find(c=>c.id==sid)?.verses||0)), 0);
  const ratio = (totAyah>0) ? (memAyah / totAyah) : 0;
  const pages = pagesCoveredApprox();
  const pagesLeft = Math.max(0, Math.ceil(604 - pages));
  els.sAyah.textContent = `${memAyah}`;
  els.sPerc.textContent = `${Math.round(ratio*100)}%`;
  els.sPages.textContent = `${Math.floor(pages)} / 604`;
  els.sLeft.textContent = `${pagesLeft}`;
}

function updateCalculator(){
  const mode = els.calcMode.value;
  const currentPerc = parseInt(els.sPerc.textContent||'0',10) || 0;
  const customPerc = clamp(parseInt(els.customProgress.value||'0',10)||0, 0, 100);
  const basePerc = (mode==='current') ? currentPerc : customPerc;
  const pagesLeft = Math.max(0, Math.ceil(604 * (1 - (basePerc/100))));
  const rate = Math.max(0, parseFloat(els.ratePages.value||'0')) || 0;
  els.cPagesLeft.textContent = String(pagesLeft);
  if (rate <= 0){
    els.cDays.textContent = '—';
    els.cDate.textContent = '—';
    els.cTime.textContent = '—';
    return;
  }
  const days = Math.ceil(pagesLeft / rate);
  els.cDays.textContent = String(days);
  try {
    const d = new Date(); d.setDate(d.getDate()+days);
    els.cDate.textContent = d.toLocaleDateString();
  } catch { els.cDate.textContent = '—'; }
  const mpp = Math.max(0, parseFloat(els.minsPerPage.value||'0')) || 0;
  if (mpp>0){
    const mins = pagesLeft * mpp;
    const h = Math.floor(mins/60), m = Math.round(mins%60);
    els.cTime.textContent = `${h}h ${m}m`;
  } else {
    els.cTime.textContent = '—';
  }
}

function render(){
  const frag = document.createDocumentFragment();
  chapters.forEach(ch => frag.appendChild(makeSurahRow(ch)));
  els.list.replaceChildren(frag);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Theme
  try { const prefs = readPrefs(); const theme = prefs.theme||'dark'; document.body.setAttribute('data-theme', theme); } catch {}
  // Data
  progress = readProgress();
  try { await loadChapters(); } catch { chapters = []; }
  render();
  updateSummary();
  updateCalculator();
  // Events
  if (els.reset) els.reset.addEventListener('click', () => { if (confirm('Reset all memorization progress?')) { progress = {}; writeProgress(progress); render(); updateSummary(); updateCalculator(); } });
  els.calcMode.addEventListener('change', ()=>{ const useCustom = (els.calcMode.value==='custom'); els.customField.hidden = !useCustom; updateCalculator(); });
  ['input','change'].forEach(ev => { els.customProgress.addEventListener(ev, updateCalculator); els.ratePages.addEventListener(ev, updateCalculator); els.minsPerPage.addEventListener(ev, updateCalculator); });
});

