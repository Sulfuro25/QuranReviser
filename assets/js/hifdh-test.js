// hifdh-test.js — Hifdh practice modes (recite, MCQ, order)
// Uses shared core: QR.prefs, QR.utils, QR.api

// Elements
const els = {
  // Landing page
  landing: document.getElementById('test-landing'),
  viewer: document.getElementById('test-viewer'),
  modeCards: null, // Will be populated after DOM ready
  backToLanding: document.getElementById('back-to-landing'),
  
  // Toolbar
  currentModeName: document.getElementById('current-mode-name'),
  currentScopeInfo: document.getElementById('current-scope-info'),
  progressIndicator: document.getElementById('progress-indicator'),
  progressText: document.getElementById('progress-text'),
  timerDisplay: document.getElementById('timer-display'),
  timerText: document.getElementById('timer-text'),
  optionsBtn: document.getElementById('options-btn'),
  
  // Test content
  testContent: document.getElementById('test-content'),
  
  // Audio element
  audio: document.getElementById('audio'),
  
  // Legacy elements (kept for compatibility)
  reciteShowMeta: document.getElementById('recite-show-meta'),
  scopeKind: document.getElementById('scope-kind'),
  scopeSurahs: document.getElementById('scope-surahs'),
  scopeSurahsInput: document.getElementById('scope-surahs-input'),
  scopeJuz: document.getElementById('scope-juz'),
  scopeJuzInput: document.getElementById('scope-juz-input'),
  scopeHizb: document.getElementById('scope-hizb'),
  scopeHizbInput: document.getElementById('scope-hizb-input'),
  xCount: document.getElementById('x-count'),
  fontPx: document.getElementById('font-px'),
  tajweed: document.getElementById('tajweed'),
  timerOn: document.getElementById('timer-on'),
  timerSec: document.getElementById('timer-sec'),
};

const PREFS_KEY = (window.QR && QR.prefs && QR.prefs.storageKey && QR.prefs.storageKey()) || 'qr_prefs';
const HIFDH_KEY = (window.QR && QR.profiles && QR.profiles.key && QR.profiles.key('hifdh_progress')) || 'hifdh_progress';

const state = {
  selectedMode: null,
  currentQuestion: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  rng: Math.random,
  versesFlat: [],
  orderCorrect: [],
  orderUser: [],
  fillCurrent: null,
  audioPrompt: null,
  audioEl: null,
  tRemain: 0,
  tId: null,
  mediaRecorder: null,
  recordedChunks: [],
};

// ---------- Landing Page Functions ----------

function showLanding() {
  if (els.landing) {
    els.landing.style.display = 'flex';
  }
  if (els.viewer) {
    els.viewer.classList.remove('active');
  }
  stopTimer();
}

function hideLanding() {
  if (els.landing) {
    els.landing.style.display = 'none';
  }
  if (els.viewer) {
    els.viewer.classList.add('active');
  }
}

function selectMode(mode) {
  state.selectedMode = mode;
  
  // Update mode name in toolbar
  const modeNames = {
    recite: 'Recite Mode',
    mcq: 'Multiple Choice',
    order: 'Order the Page',
    fill: 'Fill in the Blanks',
    audio: 'Audio Prompt'
  };
  
  if (els.currentModeName) {
    els.currentModeName.textContent = modeNames[mode] || 'Test Mode';
  }
  
  // Show configuration modal or start directly
  showConfigModal(mode);
}

function showConfigModal(mode) {
  // Create a configuration panel in the test content area
  const config = createConfigPanel(mode);
  if (els.testContent) {
    els.testContent.innerHTML = '';
    els.testContent.appendChild(config);
  }
  hideLanding();
}

function createConfigPanel(mode) {
  const panel = document.createElement('div');
  panel.className = 'config-panel';
  
  panel.innerHTML = `
    <div class="config-section">
      <h3 class="config-section-title">
        <ion-icon name="compass-outline"></ion-icon>
        Select Scope
      </h3>
      <div class="config-grid">
        <div class="form-field">
          <label class="form-label">
            <ion-icon name="list-outline"></ion-icon>
            Scope Type
          </label>
          <select id="config-scope-kind" class="form-select">
            <option value="progress">My Hifdh Progress</option>
            <option value="surahs">Specific Surahs</option>
            <option value="juz">Juz Range</option>
            <option value="hizb">Hizb Range</option>
          </select>
        </div>
        <div class="form-field" id="config-surahs" style="display: none;">
          <label class="form-label">
            <ion-icon name="book-outline"></ion-icon>
            Surahs (e.g., 1, 36, 67-70)
          </label>
          <input id="config-surahs-input" type="text" class="form-input" placeholder="1, 36, 67-70">
        </div>
        <div class="form-field" id="config-juz" style="display: none;">
          <label class="form-label">
            <ion-icon name="layers-outline"></ion-icon>
            Juz (e.g., 1-3)
          </label>
          <input id="config-juz-input" type="text" class="form-input" placeholder="1-3">
        </div>
        <div class="form-field" id="config-hizb" style="display: none;">
          <label class="form-label">
            <ion-icon name="git-network-outline"></ion-icon>
            Hizb (e.g., 1, 10-15)
          </label>
          <input id="config-hizb-input" type="text" class="form-input" placeholder="1, 10-15">
        </div>
      </div>
    </div>
    
    <div class="config-section">
      <h3 class="config-section-title">
        <ion-icon name="settings-outline"></ion-icon>
        Test Options
      </h3>
      <div class="config-grid">
        ${mode === 'recite' ? `
        <div class="form-field">
          <label class="form-label">
            <ion-icon name="list-outline"></ion-icon>
            Number of verses to recite
          </label>
          <input id="config-x-count" type="number" class="form-input" min="1" max="20" value="3">
        </div>
        <div class="form-field">
          <label class="form-checkbox">
            <input type="checkbox" id="config-show-meta" checked>
            Show verse number and surah name
          </label>
        </div>
        ` : ''}
        <div class="form-field">
          <label class="form-label">
            <ion-icon name="text-outline"></ion-icon>
            Arabic font size (px)
          </label>
          <input id="config-font-px" type="number" class="form-input" min="18" max="60" value="36">
        </div>
        <div class="form-field">
          <label class="form-label">
            <ion-icon name="color-palette-outline"></ion-icon>
            Tajweed coloring
          </label>
          <select id="config-tajweed" class="form-select">
            <option value="off">Off</option>
            <option value="on">On (if available)</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-checkbox">
            <input type="checkbox" id="config-timer-on">
            Enable timer
          </label>
        </div>
        <div class="form-field">
          <label class="form-label">
            <ion-icon name="time-outline"></ion-icon>
            Timer duration (seconds)
          </label>
          <input id="config-timer-sec" type="number" class="form-input" min="5" step="5" value="30">
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <button class="btn-test primary" id="config-start">
        <ion-icon name="play-outline"></ion-icon>
        Start Test
      </button>
      <button class="btn-test secondary" id="config-cancel">
        <ion-icon name="close-outline"></ion-icon>
        Cancel
      </button>
    </div>
  `;
  
  // Setup event listeners after panel is created
  setTimeout(() => {
    const scopeKind = document.getElementById('config-scope-kind');
    const startBtn = document.getElementById('config-start');
    const cancelBtn = document.getElementById('config-cancel');
    
    if (scopeKind) {
      scopeKind.addEventListener('change', () => {
        document.getElementById('config-surahs').style.display = scopeKind.value === 'surahs' ? 'block' : 'none';
        document.getElementById('config-juz').style.display = scopeKind.value === 'juz' ? 'block' : 'none';
        document.getElementById('config-hizb').style.display = scopeKind.value === 'hizb' ? 'block' : 'none';
      });
    }
    
    if (startBtn) {
      startBtn.addEventListener('click', () => startTestWithConfig(mode));
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', showLanding);
    }
  }, 0);
  
  return panel;
}

async function startTestWithConfig(mode) {
  // Gather configuration
  const config = {
    scopeKind: document.getElementById('config-scope-kind')?.value || 'progress',
    surahs: document.getElementById('config-surahs-input')?.value || '',
    juz: document.getElementById('config-juz-input')?.value || '',
    hizb: document.getElementById('config-hizb-input')?.value || '',
    xCount: parseInt(document.getElementById('config-x-count')?.value) || 3,
    showMeta: document.getElementById('config-show-meta')?.checked || false,
    fontPx: parseInt(document.getElementById('config-font-px')?.value) || 36,
    tajweed: document.getElementById('config-tajweed')?.value || 'off',
    timerOn: document.getElementById('config-timer-on')?.checked || false,
    timerSec: parseInt(document.getElementById('config-timer-sec')?.value) || 30,
  };
  
  // Apply font size
  applyFontSize(config.fontPx);
  
  // Build verses scope
  await buildVersesScope(config);
  
  // Update scope info in toolbar
  updateScopeInfo(config);
  
  // Initialize test based on mode
  state.currentQuestion = 0;
  state.totalQuestions = state.versesFlat.length;
  state.correctAnswers = 0;
  updateProgress();
  
  // Run the appropriate test mode
  switch (mode) {
    case 'recite':
      runReciteMode(config);
      break;
    case 'mcq':
      runMCQMode(config);
      break;
    case 'order':
      runOrderMode(config);
      break;
    case 'fill':
      runFillMode(config);
      break;
    case 'audio':
      runAudioMode(config);
      break;
  }
}

function updateScopeInfo(config) {
  let scopeText = '';
  switch (config.scopeKind) {
    case 'progress':
      scopeText = 'My Hifdh Progress';
      break;
    case 'surahs':
      scopeText = `Surahs: ${config.surahs}`;
      break;
    case 'juz':
      scopeText = `Juz: ${config.juz}`;
      break;
    case 'hizb':
      scopeText = `Hizb: ${config.hizb}`;
      break;
  }
  
  if (els.currentScopeInfo) {
    els.currentScopeInfo.textContent = scopeText;
  }
}

function updateProgress() {
  if (els.progressText) {
    els.progressText.textContent = `${state.currentQuestion} / ${state.totalQuestions}`;
  }
}

async function buildVersesScope(config) {
  // This function builds the verses list based on the config
  // For now, we'll keep the existing logic and just set defaults
  state.versesFlat = [];
  
  // TODO: Implement proper scope building based on config
  // This would involve fetching verses from the API
}

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

// ---------- OLD wiring (disabled for new design) ----------
// The following code is from the old design and is no longer needed
/*
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
*/

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

// ---------- New Test Mode Renderers ----------

function runReciteMode(config) {
  if (!els.testContent) return;
  
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="mic-outline"></ion-icon>
        Recite the next ${config.xCount} verses
      </div>
      ${config.showMeta ? `
        <div class="question-meta">
          <ion-icon name="information-circle-outline"></ion-icon>
          Starting verse: <strong>Al-Fatiha 1:1</strong>
        </div>
      ` : ''}
      <div class="question-text">
        بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
      </div>
      <div class="recording-controls">
        <button class="record-btn" id="record-toggle">
          <ion-icon name="mic"></ion-icon>
        </button>
        <div class="recording-duration" id="recording-duration" style="display: none;">00:00</div>
      </div>
      <audio id="recorded-audio" controls style="display: none; margin-top: 1rem; width: 100%;"></audio>
      <div class="action-buttons" style="margin-top: 1.5rem;">
        <button class="btn-test secondary" id="reveal-answer-btn">
          <ion-icon name="eye-outline"></ion-icon>
          Reveal Answer
        </button>
        <button class="btn-test primary" id="next-question-btn">
          <ion-icon name="arrow-forward-outline"></ion-icon>
          Next Question
        </button>
      </div>
      <div id="answer-area"></div>
    </div>
  `;
  
  setupRecordingControls();
}

function runMCQMode(config) {
  if (!els.testContent) return;
  
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="help-circle-outline"></ion-icon>
        Which verse comes next?
      </div>
      <div class="question-text">
        بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
      </div>
    </div>
    <div class="choices-grid" id="choices-container">
      ${generateMCQChoices()}
    </div>
    <div class="action-buttons">
      <button class="btn-test primary" id="next-mcq-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Question
      </button>
    </div>
  `;
  
  setupMCQControls();
}

function runOrderMode(config) {
  if (!els.testContent) return;
  
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="swap-vertical-outline"></ion-icon>
        Drag to arrange verses in correct order
      </div>
    </div>
    <ol class="draggable-list" id="draggable-verses">
      ${generateShuffledVerses()}
    </ol>
    <div class="action-buttons">
      <button class="btn-test primary" id="check-order-btn">
        <ion-icon name="checkmark-circle-outline"></ion-icon>
        Check Order
      </button>
      <button class="btn-test secondary" id="next-order-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Page
      </button>
    </div>
    <div id="order-result"></div>
  `;
  
  setupDragAndDrop();
}

function runFillMode(config) {
  if (!els.testContent) return;
  
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="create-outline"></ion-icon>
        Fill in the missing words
      </div>
      <div class="fill-text" id="fill-container">
        بِسۡمِ _____ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
      </div>
    </div>
    <div class="action-buttons">
      <button class="btn-test primary" id="check-fill-btn">
        <ion-icon name="checkmark-circle-outline"></ion-icon>
        Check Answer
      </button>
      <button class="btn-test secondary" id="reveal-fill-btn">
        <ion-icon name="eye-outline"></ion-icon>
        Reveal Answer
      </button>
      <button class="btn-test secondary" id="next-fill-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Question
      </button>
    </div>
    <div id="fill-result"></div>
  `;
  
  setupFillControls();
}

function runAudioMode(config) {
  if (!els.testContent) return;
  
  els.testContent.innerHTML = `
    <div class="audio-controls">
      <div class="audio-visualizer" id="audio-visualizer">
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
        <div class="audio-bar"></div>
      </div>
      <div class="audio-status" id="audio-status-text">
        <ion-icon name="headset-outline"></ion-icon>
        Click play to hear the verse
      </div>
    </div>
    <div class="action-buttons">
      <button class="btn-test primary" id="play-audio-btn">
        <ion-icon name="play-outline"></ion-icon>
        Play Audio
      </button>
      <button class="btn-test secondary" id="replay-audio-btn">
        <ion-icon name="refresh-outline"></ion-icon>
        Replay
      </button>
      <button class="btn-test secondary" id="reveal-audio-btn">
        <ion-icon name="eye-outline"></ion-icon>
        Reveal Answer
      </button>
      <button class="btn-test primary" id="next-audio-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Question
      </button>
    </div>
    <div id="audio-answer-area"></div>
  `;
  
  setupAudioControls();
}

// Helper functions for generating content
function generateMCQChoices() {
  const choices = [
    'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِینَ',
    'ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ',
    'مَـٰلِكِ یَوۡمِ ٱلدِّینِ',
    'إِیَّاكَ نَعۡبُدُ وَإِیَّاكَ نَسۡتَعِینُ',
    'ٱهۡدِنَا ٱلصِّرَ ٰطَ ٱلۡمُسۡتَقِیمَ'
  ];
  
  return choices.map((choice, i) => `
    <button class="choice-btn" data-choice="${i}">
      ${choice}
    </button>
  `).join('');
}

function generateShuffledVerses() {
  const verses = [
    'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ',
    'ٱلۡحَمۡدُ لِلَّهِ رَبِّ ٱلۡعَـٰلَمِینَ',
    'ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ',
    'مَـٰلِكِ یَوۡمِ ٱلدِّینِ'
  ];
  
  return verses.map((verse, i) => `
    <li class="draggable-item" draggable="true" data-index="${i}">
      <ion-icon name="menu-outline" class="drag-handle"></ion-icon>
      <span>${verse}</span>
    </li>
  `).join('');
}

function setupRecordingControls() {
  // Placeholder for recording functionality
}

function setupMCQControls() {
  const choices = document.querySelectorAll('.choice-btn');
  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      choices.forEach(c => c.classList.remove('selected'));
      choice.classList.add('selected');
    });
  });
}

function setupDragAndDrop() {
  // Placeholder for drag and drop functionality
}

function setupFillControls() {
  // Placeholder for fill in the blanks functionality
}

function setupAudioControls() {
  // Placeholder for audio controls functionality
}

// ---------- Initialize Landing Page ----------

// Mode card selection
function initializeModeCards() {
  els.modeCards = document.querySelectorAll('.mode-card');
  
  if (els.modeCards && els.modeCards.length > 0) {
    els.modeCards.forEach(card => {
      card.addEventListener('click', () => {
        // Remove selected class from all cards
        els.modeCards.forEach(c => c.classList.remove('selected'));
        // Add selected class to clicked card
        card.classList.add('selected');
        // Get mode and start configuration
        const mode = card.dataset.mode;
        if (mode) {
          setTimeout(() => selectMode(mode), 300);
        }
      });
    });
  }
}

// Back to landing button initialization
function initializeBackButton() {
  if (els.backToLanding) {
    els.backToLanding.addEventListener('click', showLanding);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeModeCards();
    initializeBackButton();
    showLanding();
    ensureFont();
  });
} else {
  // DOM already loaded
  initializeModeCards();
  initializeBackButton();
  showLanding();
  ensureFont();
}
