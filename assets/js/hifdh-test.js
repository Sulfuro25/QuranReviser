// hifdh-test.js — Hifdh practice modes (recite, MCQ, order)
// Uses shared core: QR.prefs, QR.utils, QR.api

// Elements
const els = {
  reciteShowMeta: document.getElementById('recite-show-meta'),
  setupSection: document.getElementById('setup-section'),

  // Scope inputs
  scopeKind: document.getElementById('scope-kind'),
  scopeSurahs: document.getElementById('scope-surahs'),
  scopeSurahsInput: document.getElementById('scope-surahs-input'),
  scopeJuz: document.getElementById('scope-juz'),
  scopeJuzInput: document.getElementById('scope-juz-input'),
  scopeHizb: document.getElementById('scope-hizb'),
  scopeHizbInput: document.getElementById('scope-hizb-input'),

  // Mode + controls
  mode: document.getElementById('mode'),
  xWrapper: document.getElementById('x-wrapper'),
  fontWrapper: document.getElementById('font-wrapper'),
  xCount: document.getElementById('x-count'),
  fontPx: document.getElementById('font-px'),
  tajweed: document.getElementById('tajweed'),
  // seed removed
  start: document.getElementById('start'),

  // Recite mode
  reciteSection: document.getElementById('recite-section'),
  recPrompt: document.getElementById('recite-prompt'),
  recMainBtn: document.getElementById('rec-main-btn'),
  recAudio: document.getElementById('rec-audio'),
  recAnswer: document.getElementById('rec-answer'),

  // MCQ mode
  mcqSection: document.getElementById('mcq-section'),
  mcqPrompt: document.getElementById('mcq-prompt'),
  mcqChoices: document.getElementById('mcq-choices'),
  mcqNext: document.getElementById('mcq-next'),

  // Order mode
  orderSection: document.getElementById('order-section'),
  orderList: document.getElementById('order-list'),
  orderCheck: document.getElementById('order-check'),
  orderNext: document.getElementById('order-next'),
  orderResult: document.getElementById('order-result'),

  // Optional wrapper used in original file; keep if present
  reciteMetaWrapper: document.getElementById('recite-meta-wrapper'),
  // Fill-in-the-blank
  fillSection: document.getElementById('fill-section'),
  fillQuestion: document.getElementById('fill-question'),
  fillCheck: document.getElementById('fill-check'),
  fillNext: document.getElementById('fill-next'),
  fillResult: document.getElementById('fill-result'),
  // Audio-only
  audioOnlySection: document.getElementById('audioonly-section'),
  audioPlay: document.getElementById('audio-play'),
  audioReplay: document.getElementById('audio-replay'),
  audioReveal: document.getElementById('audio-reveal'),
  audioNext: document.getElementById('audio-next'),
  audioStatus: document.getElementById('audio-status'),
  audioAnswer: document.getElementById('audio-answer'),
  // Timer
  timerView: document.getElementById('timer-view'),
  timerOn: document.getElementById('timer-on'),
  timerSec: document.getElementById('timer-sec'),
};

const PREFS_KEY = (window.QR && QR.prefs && QR.prefs.storageKey && QR.prefs.storageKey()) || 'qr_prefs';
const HIFDH_KEY = (window.QR && QR.profiles && QR.profiles.key && QR.profiles.key('hifdh_progress')) || 'hifdh_progress';

const state = {
  rng: Math.random,
  versesFlat: [],     // array of { verse_key, text_uthmani, page_number }
  orderCorrect: [],   // correct order keys for Order mode
  orderUser: [],      // current user order keys
  // fill
  fillCurrent: null,
  // audio-only
  audioPrompt: null,
  audioEl: null,
  // timer
  tRemain: 0,
  tId: null,
};

// ---------- utilities bound to UI ----------

function applyFontSize(px){
  const n = Math.max(18, Math.min(60, parseInt(px,10)||36));
  document.documentElement.style.setProperty('--arabic-size', n + 'px');
}

function verseKeyToTuple(k){ const [s,v] = String(k).split(':').map(n=>parseInt(n,10)||0); return [s,v]; }
function cmpVerseKey(a,b){ const [sa,va] = verseKeyToTuple(a); const [sb,vb] = verseKeyToTuple(b); return sa===sb ? (va-vb) : (sa-sb); }
function pickRandom(arr){ if(!arr||!arr.length) return undefined; const i = Math.floor(state.rng()*arr.length); return arr[i]; }

function ensureFont(){
  try {
    const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem(PREFS_KEY)||'{}');
    const px = prefs.font_px || 36;
    applyFontSize(px);
  } catch { applyFontSize(36); }
}

function setVisible(section){
  [els.reciteSection, els.mcqSection, els.orderSection, els.fillSection, els.audioOnlySection].forEach(el => { if (el) el.hidden = (el !== section); });
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){ const j = Math.floor(state.rng()*(i+1)); [arr[i],arr[j]] = [arr[j],arr[i]]; }
  return arr;
}

function stripDiacritics(s){ try { return String(s||'').replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g,''); } catch { return s; } }
function tokenizeArabic(s){ return String(s||'').trim().split(/\s+/).filter(Boolean); }

function stopTimer(){ if (state.tId){ clearInterval(state.tId); state.tId=null; } state.tRemain=0; if (els.timerView) els.timerView.style.display='none'; }
function startTimer(seconds, onTimeout){ stopTimer(); const sec = Math.max(5, parseInt(seconds,10)||30); state.tRemain = sec; const update=()=>{ if (els.timerView){ els.timerView.style.display='block'; els.timerView.textContent = `⏳ ${state.tRemain}s`; } if (state.tRemain<=0){ stopTimer(); try { onTimeout&&onTimeout(); } catch {} } state.tRemain--; }; update(); state.tId = setInterval(update, 1000); }

// ---------- scope building ----------

async function buildScopeVerses(){
  const kind = els.scopeKind.value;

  if (kind === 'progress'){
    // Read saved hifdh progress: sid -> memorized count
    let progress = {};
    try { progress = JSON.parse((QR.profiles?QR.profiles.getItem('hifdh_progress'):localStorage.getItem(HIFDH_KEY))||'{}')||{}; } catch {}
    const chapters = Object.keys(progress).map(k=>parseInt(k,10)).filter(n=>n>=1&&n<=114);
    const all = [];
    for (const sid of chapters){
      const verses = await QR.api.fetchVersesByChapter(sid, 'text_uthmani,page_number');
      const upto = Math.max(0, Math.min(verses.length, Number(progress[sid])||0));
      all.push(...verses.slice(0, upto));
    }
    return all.sort((a,b)=>cmpVerseKey(a.verse_key,b.verse_key));
  }

  if (kind === 'surahs'){
    const ids = QR.utils.parseRangeList(els.scopeSurahsInput.value||'', 114);
    const all = [];
    for (const sid of ids){ all.push(...await QR.api.fetchVersesByChapter(sid, 'text_uthmani,page_number')); }
    return all.sort((a,b)=>cmpVerseKey(a.verse_key,b.verse_key));
  }

  if (kind === 'juz'){
    const ids = QR.utils.parseRangeList(els.scopeJuzInput.value||'', 30);
    const all = [];
    for (const j of ids){ all.push(...await QR.api.fetchVersesByRange('juz', j, 'text_uthmani,page_number')); }
    return all.sort((a,b)=>cmpVerseKey(a.verse_key,b.verse_key));
  }

  if (kind === 'hizb'){
    const ids = QR.utils.parseRangeList(els.scopeHizbInput.value||'', 60);
    const all = [];
    for (const h of ids){ all.push(...await QR.api.fetchVersesByRange('hizb', h, 'text_uthmani,page_number')); }
    return all.sort((a,b)=>cmpVerseKey(a.verse_key,b.verse_key));
  }

  return [];
}

// ---------- modes ----------

// Mode 1: Recite next X
function runRecite(){
  setVisible(els.reciteSection);
  const list = state.versesFlat;
  if (!list.length) { els.recPrompt.textContent = 'No verses in scope.'; return; }

  const X = Math.max(1, Math.min(20, parseInt(els.xCount.value,10)||3));
  let idx = -1;
  for (let tries=0; tries<50; tries++){
    const i = Math.floor(state.rng() * list.length);
    if (i + X < list.length) { idx = i; break; }
  }
  if (idx < 0) idx = Math.max(0, list.length - (X+1));

  const start = list[idx];
  const follow = list.slice(idx+1, idx+1+X);

  // Optional meta display
  let meta = '';
  if (els.reciteShowMeta && els.reciteShowMeta.checked) {
    let surahName = '';
    if (window.CHAPTERS_DATA && Array.isArray(window.CHAPTERS_DATA)) {
      const sid = start.verse_key.split(':')[0]*1;
      const surah = window.CHAPTERS_DATA.find(c => c.id === sid);
      if (surah) surahName = surah.name_simple + ' (' + surah.name_arabic + ')';
    }
    meta = `<span class='muted' style='font-size:18px;display:block;'>[${start.verse_key}] ${surahName}</span>`;
  }

  els.recPrompt.innerHTML = meta + (start.text_uthmani || '—');
  els.recAnswer.classList.add('hidden');
  els.recAnswer.innerHTML = follow.map(v=>v.text_uthmani).join('<br>');

  // Single button recording/playback flow
  let mediaRec = null; let chunks = [];
  let stateStep = 'idle'; // 'idle' | 'recording' | 'next'
  els.recAudio.classList.add('hidden'); els.recAudio.removeAttribute('src');

  if (els.recMainBtn) {
    els.recMainBtn.disabled = false;
    els.recMainBtn.textContent = 'Start Recording';

    els.recMainBtn.onclick = async function() {
      if (stateStep === 'idle') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRec = new MediaRecorder(stream);
          chunks = [];
          mediaRec.ondataavailable = e => { if (e.data && e.data.size>0) chunks.push(e.data); };
          mediaRec.onstop = () => {
            try {
              const blob = new Blob(chunks, { type: 'audio/webm' });
              const url = URL.createObjectURL(blob);
              els.recAudio.src = url;
              els.recAudio.classList.remove('hidden');
              // Show next X verses and play back
              els.recAnswer.classList.remove('hidden');
              els.recMainBtn.textContent = 'Next';
              stateStep = 'next';
              setTimeout(()=>{ els.recAudio.play().catch(()=>{}); }, 200);
            } catch {}
          };
          mediaRec.start();
          els.recMainBtn.textContent = 'Stop Recording';
          stateStep = 'recording';
        } catch(e){ alert('Microphone not available.'); }
      } else if (stateStep === 'recording') {
        try { mediaRec && mediaRec.stop(); } catch {}
        els.recMainBtn.disabled = true;
        setTimeout(()=>{ els.recMainBtn.disabled = false; }, 500);
      } else if (stateStep === 'next') {
        runRecite();
      }
    };
  }
}

// Mode 2: MCQ Next Verse
function runMcq(){
  setVisible(els.mcqSection);
  if (els.timerOn && els.timerOn.checked) startTimer(els.timerSec && els.timerSec.value, ()=>{ try { els.mcqPrompt.textContent += ' (Time up)'; } catch {}; try { els.mcqNext.style.display=''; } catch {}; }); else stopTimer();
  const list = state.versesFlat;
  if (list.length < 2) { els.mcqPrompt.textContent = 'Not enough verses in scope.'; els.mcqChoices.innerHTML=''; return; }

  let idx = -1;
  for(let tries=0; tries<50; tries++){
    const i = Math.floor(state.rng()*list.length);
    if (i+1 < list.length) { idx = i; break; }
  }
  if (idx<0) idx = 0;

  const promptV = list[idx];
  const correct = list[idx+1];
  els.mcqPrompt.textContent = promptV.text_uthmani || '—';

  const pool = list.filter((_,i)=> i!==idx+1);
  const distract = shuffle(pool.slice()).slice(0,4);
  const options = shuffle([correct, ...distract]);

  els.mcqChoices.innerHTML = '';
  const btns = [];

  // Font size from settings
  let fontPx = 36;
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)||'{}');
    if (typeof prefs.font_px === 'number') fontPx = prefs.font_px;
  } catch {}

  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn secondary';
    btn.textContent = opt.text_uthmani || '—';
    btn.style.fontSize = fontPx + 'px';
    btn.style.fontFamily = "'Amiri Quran', serif";
    btns.push(btn);

    btn.addEventListener('click', () => {
      btns.forEach(b => { b.disabled = true; });
      btns.forEach((b, i) => {
        if (options[i] === correct) {
          b.classList.remove('secondary');
          b.classList.add('primary');
          b.textContent = '✓ ' + b.textContent;
        } else if (b === btn && options[i] !== correct) {
          b.classList.add('danger');
          b.textContent = '✗ ' + b.textContent;
        }
      });
      if (els.mcqNext) els.mcqNext.style.display = '';
    }, { once: true });

    els.mcqChoices.appendChild(btn);
  });

  if (els.mcqNext) {
    els.mcqNext.style.display = 'none';
    els.mcqNext.onclick = ()=> runMcq();
  }
}

// Mode 3: Order the page
async function runOrder(){
  ensureFont();
  setVisible(els.orderSection);
  if (els.timerOn && els.timerOn.checked) startTimer(els.timerSec && els.timerSec.value, ()=>{ try { checkOrder(); els.orderResult.textContent += ' (Time up)'; } catch {} }); else stopTimer();

  const pages = Array.from(new Set((state.versesFlat||[]).map(v=>v.page_number).filter(p=>typeof p==='number' && p>=1 && p<=604)));
  if (!pages.length) { els.orderList.innerHTML=''; els.orderResult.textContent='No page in scope.'; return; }

  const page = pickRandom(pages);
  const verses = await QR.api.fetchVersesByPage(page, 'text_uthmani,page_number');

  const ordered = verses.slice().sort((a,b)=>cmpVerseKey(a.verse_key,b.verse_key));
  state.orderCorrect = ordered.map(v=>v.verse_key);

  const first = ordered[0];
  const rest = ordered.slice(1);
  shuffle(rest);
  state.orderUser = [first.verse_key, ...rest.map(v=>v.verse_key)];

  renderOrderList(ordered, rest);
  els.orderResult.textContent = `Page ${page}: arrange verses`;
}

function renderOrderList(correct, restShuffled){
  els.orderList.innerHTML='';
  const li0 = document.createElement('li'); li0.textContent = correct[0].text_uthmani || '—'; li0.className='locked'; li0.setAttribute('draggable','false'); li0.dataset.key = correct[0].verse_key; els.orderList.appendChild(li0);
  restShuffled.forEach(v => {
    const li = document.createElement('li'); li.textContent = v.text_uthmani || '—'; li.dataset.key = v.verse_key; li.setAttribute('draggable','true'); els.orderList.appendChild(li);
  });

  let dragEl = null;
  els.orderList.querySelectorAll('li:not(.locked)').forEach(li => {
    li.addEventListener('dragstart', (e)=>{ dragEl = li; e.dataTransfer.effectAllowed = 'move'; });
    li.addEventListener('dragover', (e)=>{ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    li.addEventListener('drop', (e)=>{ 
      e.preventDefault();
      if (!dragEl || dragEl===li) return;
      const list = Array.from(els.orderList.children);
      const idxFrom = list.indexOf(dragEl);
      const idxTo = list.indexOf(li);
      if (idxFrom<0||idxTo<0) return;
      if (idxTo===0) return; // cannot drop before locked
      if (idxFrom < idxTo) els.orderList.insertBefore(dragEl, li.nextSibling);
      else els.orderList.insertBefore(dragEl, li);
    });
  });
}

function checkOrder(){
  const items = Array.from(els.orderList.children);
  const keys = items.map(li=>li.dataset.key).filter(Boolean);
  const correct = state.orderCorrect;
  let ok = 0;
  for (let i=0;i<Math.min(keys.length, correct.length);i++){
    const li = items[i];
    const isCorrect = (keys[i] === correct[i]);
    if (isCorrect) {
      ok++;
      li.classList.add('correct', 'locked');
      li.setAttribute('draggable','false');
    }
  }
  els.orderResult.textContent = `${ok}/${correct.length} in correct position.`;
}

// ---------- start flow ----------

async function startTest(){
  ensureFont();
  // use default RNG (seed input removed)
  const verses = await buildScopeVerses();
  state.versesFlat = verses;

  if (els.setupSection) els.setupSection.hidden = true;

  const mode = els.mode.value;
  if (mode === 'recite') runRecite();
  else if (mode === 'mcq') runMcq();
  else if (mode === 'order') runOrder();
  else if (mode === 'fill') runFill();
  else runAudioOnly();
}

// ---------- wiring ----------

els.scopeKind.addEventListener('change', ()=>{
  const v = els.scopeKind.value;
  els.scopeSurahs.hidden = v !== 'surahs';
  els.scopeJuz.hidden = v !== 'juz';
  els.scopeHizb.hidden = v !== 'hizb';
});

els.mode.addEventListener('change', ()=>{
  const v = els.mode.value;
  els.xWrapper.hidden = (v !== 'recite');
  if (els.fontWrapper) els.fontWrapper.hidden = true;
  if (els.fontPx) els.fontPx.disabled = true;
  ensureFont();

  if (els.reciteMetaWrapper) {
    els.reciteMetaWrapper.style.display = (v === 'recite') ? '' : 'none';
  }
});

if (els.fontPx) els.fontPx.addEventListener('change', ()=> ensureFont());
els.start.addEventListener('click', ()=> startTest());
if (els.orderCheck) els.orderCheck.addEventListener('click', checkOrder);
if (els.orderNext) els.orderNext.addEventListener('click', ()=> runOrder());

// ---- Fill-in-the-blank ----
function runFill(){
  ensureFont();
  setVisible(els.fillSection);
  if (!state.versesFlat || !state.versesFlat.length){ els.fillQuestion.textContent='No verses in scope.'; return; }
  const v = pickRandom(state.versesFlat);
  const tokens = tokenizeArabic(v.text_uthmani||'');
  const count = Math.max(1, Math.min(3, Math.floor(tokens.length/7)));
  const idxs = new Set();
  let guard=0;
  while (idxs.size < count && guard++<200){ const i = Math.floor(state.rng()*tokens.length); if (tokens[i] && stripDiacritics(tokens[i]).length>0) idxs.add(i); }
  els.fillQuestion.innerHTML='';
  const inputs=[];
  tokens.forEach((tok,i)=>{
    if (idxs.has(i)){
      const inp = document.createElement('input'); inp.type='text'; inp.style.minWidth='80px'; inp.style.margin='0 6px'; inp.dataset.answer = tok;
      els.fillQuestion.appendChild(inp); inputs.push(inp);
    } else {
      const span = document.createElement('span'); span.textContent = tok + ' '; els.fillQuestion.appendChild(span);
    }
  });
  state.fillCurrent = { verse: v, blanks: Array.from(idxs.values()).sort((a,b)=>a-b), inputs };
  els.fillResult.textContent='';
  if (els.fillCheck) els.fillCheck.onclick = checkFill;
  if (els.fillNext) els.fillNext.onclick = runFill;
  if (els.timerOn && els.timerOn.checked) startTimer(els.timerSec && els.timerSec.value, ()=>{ try { els.fillResult.textContent='Time up'; revealFillAnswer(); } catch {} }); else stopTimer();
}

function checkFill(){
  const cur = state.fillCurrent; if (!cur) return;
  let ok = 0;
  cur.inputs.forEach(inp => {
    const a = stripDiacritics(inp.dataset.answer||'').replace(/\s+/g,'').toLowerCase();
    const v = stripDiacritics(inp.value||'').replace(/\s+/g,'').toLowerCase();
    const pass = a && v && a===v;
    inp.style.borderColor = pass ? 'var(--primary)' : '#ef4444';
    if (pass) ok++;
  });
  els.fillResult.textContent = `${ok}/${cur.inputs.length} correct.`;
}

function revealFillAnswer(){ const cur=state.fillCurrent; if (!cur) return; cur.inputs.forEach(inp=>{ inp.value = inp.dataset.answer||''; inp.style.borderColor='var(--primary)'; }); }

// ---- Audio-only prompt ----
async function runAudioOnly(){
  ensureFont();
  setVisible(els.audioOnlySection);
  const list = state.versesFlat||[];
  if (!list.length){ if (els.audioStatus) els.audioStatus.textContent='No verses in scope.'; return; }
  // pick a verse that has a next verse in same surah
  let idx = 0; let tries=0;
  for(;tries<50;tries++){
    const j = Math.floor(state.rng()*list.length);
    const [sj,vj]=verseKeyToTuple(list[j].verse_key);
    const hasNext = list.some(x=>{ const [sx,vx]=verseKeyToTuple(x.verse_key); return sx===sj && vx===vj+1; });
    if (hasNext){ idx=j; break; }
  }
  const prev = list[idx]; const [sid,vid]=verseKeyToTuple(prev.verse_key);
  const next = list.find(x=>{ const [sx,vx]=verseKeyToTuple(x.verse_key); return sx===sid && vx===vid+1; });
  let url='';
  try { const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : {}; const rid = prefs.reciter_id||7; const map = await QR.api.fetchAudioMap(rid, sid); url = map.get(prev.verse_key)||''; } catch {}
  state.audioPrompt = { prev, next, audioUrl: url };
  if (els.audioStatus) els.audioStatus.textContent = `Prompt: ${prev.verse_key}`;
  if (els.audioAnswer){ els.audioAnswer.classList.add('hidden'); els.audioAnswer.textContent = next ? (next.text_uthmani||'') : '(no next ayah)'; }
  if (!state.audioEl){ try { state.audioEl = document.getElementById('audio'); } catch {} }
  if (els.audioPlay) els.audioPlay.onclick = ()=>{ try { state.audioEl.src = state.audioPrompt.audioUrl||''; state.audioEl.play().catch(()=>{}); } catch {} };
  if (els.audioReplay) els.audioReplay.onclick = ()=>{ try { state.audioEl.currentTime=0; state.audioEl.play().catch(()=>{}); } catch {} };
  if (els.audioReveal) els.audioReveal.onclick = ()=>{ try { els.audioAnswer.classList.remove('hidden'); } catch {} };
  if (els.audioNext) els.audioNext.onclick = runAudioOnly;
  if (els.timerOn && els.timerOn.checked) startTimer(els.timerSec && els.timerSec.value, ()=>{ try { els.audioStatus.textContent += ' (Time up)'; els.audioAnswer.classList.remove('hidden'); } catch {} }); else stopTimer();
}

// Initial UI
try {
  const prefs = JSON.parse(localStorage.getItem(PREFS_KEY)||'{}');
  if (typeof prefs.font_px==='number' && els.fontPx) els.fontPx.value = prefs.font_px;
} catch {}
ensureFont();
els.xWrapper.hidden = (els.mode.value !== 'recite');
if (els.fontWrapper) els.fontWrapper.hidden = true;
if (els.fontPx) els.fontPx.disabled = true;
if (els.reciteMetaWrapper) els.reciteMetaWrapper.style.display = (els.mode.value === 'recite') ? '' : 'none';
