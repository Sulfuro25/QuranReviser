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
            <option value="confidence">By Confidence Level</option>
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
        <div class="form-field" id="config-confidence" style="display: none;">
          <label class="form-label">
            <ion-icon name="analytics-outline"></ion-icon>
            Confidence Level
          </label>
          <select id="config-confidence-level" class="form-select">
            <option value="weak">⚠️ Weak - Pages needing practice</option>
            <option value="ok">✓ Okay - Pages getting there</option>
            <option value="strong">✨ Strong - Confident pages</option>
            <option value="all">All marked pages</option>
          </select>
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
        document.getElementById('config-confidence').style.display = scopeKind.value === 'confidence' ? 'block' : 'none';
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
  // Load font size from preferences
  let fontPx = 36;
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (typeof prefs.font_px === 'number') fontPx = prefs.font_px;
  } catch {}
  
  // Gather configuration
  const config = {
    scopeKind: document.getElementById('config-scope-kind')?.value || 'progress',
    surahs: document.getElementById('config-surahs-input')?.value || '',
    juz: document.getElementById('config-juz-input')?.value || '',
    hizb: document.getElementById('config-hizb-input')?.value || '',
    confidenceLevel: document.getElementById('config-confidence-level')?.value || 'weak',
    xCount: parseInt(document.getElementById('config-x-count')?.value) || 3,
    showMeta: document.getElementById('config-show-meta')?.checked || false,
    fontPx: fontPx
  };
  
  // Show loading
  showLoading('Loading verses...');
  
  // Apply font size
  applyFontSize(config.fontPx);
  
  // Build verses scope
  await buildVersesScope(config);
  
  // Check if we have verses
  if (!state.versesFlat || state.versesFlat.length === 0) {
    return; // Error already shown by buildVersesScope
  }
  
  // Update scope info in toolbar
  updateScopeInfo(config);
  
  // Initialize test based on mode
  state.currentQuestion = 0;
  state.totalQuestions = state.versesFlat.length;
  state.correctAnswers = 0;
  updateProgress();
  
  // Store config in state
  state.config = config;
  
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

function showError(message) {
  if (els.testContent) {
    els.testContent.innerHTML = `
      <div class="result-feedback incorrect">
        <ion-icon name="alert-circle"></ion-icon>
        <span>${message}</span>
      </div>
      <div class="action-buttons">
        <button class="btn-test secondary" onclick="showLanding()">
          <ion-icon name="arrow-back-outline"></ion-icon>
          Back to Selection
        </button>
      </div>
    `;
  }
}

function showLoading(message = 'Loading...') {
  if (els.testContent) {
    els.testContent.innerHTML = `
      <div class="result-feedback info">
        <ion-icon name="hourglass-outline"></ion-icon>
        <span>${message}</span>
      </div>
    `;
  }
}

async function buildVersesScope(config) {
  // This function builds the verses list based on the config
  state.versesFlat = [];
  
  try {
    if (config.scopeKind === 'progress') {
      // Read saved hifdh progress: sid -> memorized count
      let progress = {};
      try {
        progress = JSON.parse((QR.profiles ? QR.profiles.getItem('hifdh_progress') : localStorage.getItem(HIFDH_KEY)) || '{}') || {};
      } catch {}
      
      const chapters = Object.keys(progress).map(k => parseInt(k, 10)).filter(n => n >= 1 && n <= 114);
      const all = [];
      
      for (const sid of chapters) {
        const verses = await QR.api.fetchVersesByChapter(sid, 'text_uthmani,page_number');
        const upto = Math.max(0, Math.min(verses.length, Number(progress[sid]) || 0));
        all.push(...verses.slice(0, upto));
      }
      
      state.versesFlat = all.sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    }
    else if (config.scopeKind === 'surahs') {
      const ids = QR.utils.parseRangeList(config.surahs || '', 114);
      const all = [];
      
      for (const sid of ids) {
        all.push(...await QR.api.fetchVersesByChapter(sid, 'text_uthmani,page_number'));
      }
      
      state.versesFlat = all.sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    }
    else if (config.scopeKind === 'juz') {
      const ids = QR.utils.parseRangeList(config.juz || '', 30);
      const all = [];
      
      for (const j of ids) {
        all.push(...await QR.api.fetchVersesByRange('juz', j, 'text_uthmani,page_number'));
      }
      
      state.versesFlat = all.sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    }
    else if (config.scopeKind === 'hizb') {
      const ids = QR.utils.parseRangeList(config.hizb || '', 60);
      const all = [];
      
      for (const h of ids) {
        all.push(...await QR.api.fetchVersesByRange('hizb', h, 'text_uthmani,page_number'));
      }
      
      state.versesFlat = all.sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    }
    else if (config.scopeKind === 'confidence') {
      // Get pages with specified confidence level
      const pageData = window.QR && QR.pageData ? QR.pageData : null;
      if (!pageData) {
        showError('Page data not available. Please mark some pages with confidence levels first.');
        return;
      }
      
      const targetLevel = config.confidenceLevel;
      const pages = [];
      
      // Iterate through all possible pages
      for (let p = 1; p <= 604; p++) {
        const data = pageData.get(p);
        if (!data) continue;
        
        // Check if this page has the target confidence level
        if (targetLevel === 'all') {
          // Include any page with a confidence level set
          if (data.confidence) pages.push(p);
        } else {
          // Include only pages with exact match
          if (data.confidence === targetLevel) pages.push(p);
        }
      }
      
      if (pages.length === 0) {
        const levelText = targetLevel === 'all' ? 'any confidence level' : `confidence level: ${targetLevel}`;
        showError(`No pages found with ${levelText}. Please mark some pages first.`);
        return;
      }
      
      // Fetch verses for all matched pages
      const all = [];
      for (const page of pages) {
        all.push(...await QR.api.fetchVersesByPage(page, 'text_uthmani,page_number'));
      }
      
      state.versesFlat = all.sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    }
    
    if (state.versesFlat.length === 0) {
      showError('No verses found in the selected scope. Please adjust your settings.');
    }
  } catch (error) {
    console.error('Error building verse scope:', error);
    showError('Failed to load verses. Please try again.');
  }
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

function stopTimer(){ 
  if (state.tId){ 
    clearInterval(state.tId); 
    state.tId=null; 
  } 
  state.tRemain=0; 
  
  if (els.timerDisplay) {
    els.timerDisplay.style.display='none';
    els.timerDisplay.classList.remove('warning');
  }
}
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
    // Escape to prevent XSS
    const esc = window.QR && QR.utils && QR.utils.escapeHTML ? QR.utils.escapeHTML : (s => s);
    meta = `<span class='muted' style='font-size:18px;display:block;'>[${esc(start.verse_key)}] ${esc(surahName)}</span>`;
  }

  const promptText = start.text_uthmani || '—';
  els.recPrompt.innerHTML = meta + esc(promptText);
  els.recAnswer.classList.add('hidden');
  // Sanitize verse text
  const answerText = follow.map(v => {
    const txt = v.text_uthmani || '';
    return esc(txt);
  }).join('<br>');
  els.recAnswer.innerHTML = answerText;

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
          // Use compatibility layer for getUserMedia
          const getUserMedia = (window.QR && QR.compat && QR.compat.safeGetUserMedia) 
            ? QR.compat.safeGetUserMedia 
            : (navigator.mediaDevices && navigator.mediaDevices.getUserMedia 
                ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
                : null);
          
          if (!getUserMedia) {
            throw new Error('Microphone access not supported on this device');
          }
          
          const stream = await getUserMedia({ audio: true });
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

  if (els.reciteMetaWrapper) {
    els.reciteMetaWrapper.style.display = (v === 'recite') ? '' : 'none';
  }
});

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
  if (!els.testContent || !state.versesFlat.length) {
    showError('No verses available for Recite mode.');
    return;
  }
  
  const X = config.xCount || 3;
  
  // Find a verse that has X following verses
  let idx = -1;
  for (let tries = 0; tries < 50; tries++) {
    const i = Math.floor(state.rng() * state.versesFlat.length);
    if (i + X < state.versesFlat.length) {
      idx = i;
      break;
    }
  }
  
  if (idx < 0 || idx + X >= state.versesFlat.length) {
    showError('Not enough verses for Recite mode.');
    return;
  }
  
  const startVerse = state.versesFlat[idx];
  const followingVerses = state.versesFlat.slice(idx + 1, idx + 1 + X);
  
  // Get surah name if showMeta is enabled
  let metaHTML = '';
  if (config.showMeta) {
    let surahName = '';
    if (window.CHAPTERS_DATA && Array.isArray(window.CHAPTERS_DATA)) {
      const sid = parseInt(startVerse.verse_key.split(':')[0]);
      const surah = window.CHAPTERS_DATA.find(c => c.id === sid);
      if (surah) {
        surahName = `${surah.name_simple} (${surah.name_arabic})`;
      }
    }
    metaHTML = `
      <div class="question-meta">
        <ion-icon name="information-circle-outline"></ion-icon>
        Verse ${startVerse.verse_key} ${surahName ? ' - ' + surahName : ''}
      </div>
    `;
  }
  
  // Render the UI
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="mic-outline"></ion-icon>
        Recite the next ${X} verse${X > 1 ? 's' : ''}
      </div>
      ${metaHTML}
      <div class="question-text" style="font-size: ${config.fontPx}px;">
        ${startVerse.text_uthmani || '—'}
      </div>
      <div class="recording-controls">
        <button class="record-btn" id="record-toggle">
          <ion-icon name="mic"></ion-icon>
        </button>
        <div class="recording-duration" id="recording-duration" style="display: none;">00:00</div>
      </div>
      <audio id="recorded-audio" controls style="display: none; margin-top: 1rem; width: 100%;"></audio>
    </div>
    <div id="answer-area"></div>
    <div class="action-buttons" id="recite-actions" style="margin-top: 1.5rem;">
      <button class="btn-test secondary" id="reveal-answer-btn">
        <ion-icon name="eye-outline"></ion-icon>
        Reveal Answer
      </button>
      <button class="btn-test primary" id="next-question-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Question
      </button>
    </div>
  `;
  
  // Store state
  state.reciteCurrent = {
    startVerse,
    followingVerses
  };
  
  // Setup recording
  setupRecording(config);
  
  // Setup buttons
  document.getElementById('reveal-answer-btn').addEventListener('click', () => revealReciteAnswer(config));
  document.getElementById('next-question-btn').addEventListener('click', () => runReciteMode(config));
}

function setupRecording(config) {
  const recordBtn = document.getElementById('record-toggle');
  const recordingDuration = document.getElementById('recording-duration');
  const audioPlayer = document.getElementById('recorded-audio');
  
  let mediaRecorder = null;
  let chunks = [];
  let recordingState = 'idle'; // 'idle' | 'recording' | 'recorded'
  let recordingStartTime = 0;
  let durationInterval = null;
  
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      if (recordingState === 'idle') {
        // Start recording
        try {
          // Use compatibility layer for getUserMedia
          const getUserMedia = (window.QR && QR.compat && QR.compat.safeGetUserMedia) 
            ? QR.compat.safeGetUserMedia 
            : (navigator.mediaDevices && navigator.mediaDevices.getUserMedia 
                ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
                : null);
          
          if (!getUserMedia) {
            throw new Error('Microphone access not supported on this device');
          }
          
          const stream = await getUserMedia({ audio: true });
          
          // Check if MediaRecorder is supported
          if (!window.MediaRecorder) {
            throw new Error('Audio recording not supported on this device');
          }
          
          // Determine best supported mime type
          let mimeType = 'audio/webm';
          if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus';
          } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }
          
          mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
          chunks = [];
          
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            audioPlayer.src = url;
            audioPlayer.type = mimeType;
            audioPlayer.style.display = 'block';
            audioPlayer.volume = 1.0;
            audioPlayer.load();
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
          };
          
          // Start recording with timeslice to ensure data is captured
          mediaRecorder.start(100);
          recordingState = 'recording';
          recordBtn.classList.add('recording');
          recordBtn.querySelector('ion-icon').setAttribute('name', 'stop');
          recordingDuration.style.display = 'block';
          
          // Update duration
          recordingStartTime = Date.now();
          durationInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            recordingDuration.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          }, 1000);
          
        } catch (e) {
          console.error('Error accessing microphone:', e);
        }
      } else if (recordingState === 'recording') {
        // Stop recording
        if (mediaRecorder) {
          mediaRecorder.stop();
        }
        if (durationInterval) {
          clearInterval(durationInterval);
        }
        recordingState = 'recorded';
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('ion-icon').setAttribute('name', 'refresh');
      } else if (recordingState === 'recorded') {
        // Re-record
        recordingState = 'idle';
        recordBtn.classList.remove('recording');
        recordBtn.querySelector('ion-icon').setAttribute('name', 'mic');
        recordingDuration.style.display = 'none';
        recordingDuration.textContent = '00:00';
        audioPlayer.style.display = 'none';
        audioPlayer.src = '';
        
        // Click again to start new recording
        setTimeout(() => recordBtn.click(), 100);
      }
    });
  }
}

function revealReciteAnswer(config) {
  const cur = state.reciteCurrent;
  if (!cur || !cur.followingVerses) return;
  
  const answerArea = document.getElementById('answer-area');
  if (answerArea) {
    const esc = window.QR && QR.utils && QR.utils.escapeHTML ? QR.utils.escapeHTML : (s => s);
    let html = '<div class="answer-reveal"><div class="answer-reveal-label">The next verses are:</div>';
    
    cur.followingVerses.forEach(verse => {
      const verseText = verse.text_uthmani || '—';
      html += `<div class="answer-reveal-text" style="font-size: ${config.fontPx}px;">${esc(verseText)}</div>`;
    });
    
    html += '</div>';
    answerArea.innerHTML = html;
  }
  
  state.currentQuestion++;
  updateProgress();
}

function runMCQMode(config) {
  if (!els.testContent || !state.versesFlat.length) {
    showError('No verses available for MCQ mode.');
    return;
  }
  
  // Find a verse that has a next verse
  let idx = -1;
  for (let tries = 0; tries < 50; tries++) {
    const i = Math.floor(state.rng() * state.versesFlat.length);
    if (i + 1 < state.versesFlat.length) {
      idx = i;
      break;
    }
  }
  
  if (idx < 0 || idx + 1 >= state.versesFlat.length) {
    showError('Not enough verses for MCQ mode.');
    return;
  }
  
  const promptVerse = state.versesFlat[idx];
  const correctVerse = state.versesFlat[idx + 1];
  
  // Get 4 random wrong answers (excluding the correct one)
  const pool = state.versesFlat.filter((_, i) => i !== idx + 1);
  const distractors = shuffle(pool.slice()).slice(0, 4);
  
  // Combine and shuffle all options
  const options = shuffle([correctVerse, ...distractors]);
  
  // Render the question
  els.testContent.innerHTML = `
    <div class="question-card">
      <div class="question-label">
        <ion-icon name="help-circle-outline"></ion-icon>
        Which verse comes next?
      </div>
      <div class="question-text" style="font-size: ${config.fontPx}px;">
        ${promptVerse.text_uthmani || '—'}
      </div>
    </div>
    <div class="choices-grid" id="choices-container"></div>
    <div id="result-area"></div>
    <div class="action-buttons" id="mcq-actions" style="display: none;">
      <button class="btn-test primary" id="next-mcq-btn">
        <ion-icon name="arrow-forward-outline"></ion-icon>
        Next Question
      </button>
    </div>
  `;
  
  const choicesContainer = document.getElementById('choices-container');
  
  // Create choice buttons
  options.forEach((verse, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.verseKey = verse.verse_key;
    btn.style.fontSize = config.fontPx + 'px';
    btn.textContent = verse.text_uthmani || '—';
    
    btn.addEventListener('click', () => handleMCQAnswer(btn, verse, correctVerse, options));
    
    choicesContainer.appendChild(btn);
  });
  
  // Start timer if enabled
  if (config.timerOn) {
    startMCQTimer(config.timerSec, correctVerse, options);
  }
}

function handleMCQAnswer(clickedBtn, selectedVerse, correctVerse, allOptions) {
  const choicesContainer = document.getElementById('choices-container');
  const allBtns = choicesContainer.querySelectorAll('.choice-btn');
  
  // Disable all buttons
  allBtns.forEach(btn => btn.disabled = true);
  
  // Check if answer is correct
  const isCorrect = selectedVerse.verse_key === correctVerse.verse_key;
  
  if (isCorrect) {
    state.correctAnswers++;
    clickedBtn.classList.add('correct');
  } else {
    clickedBtn.classList.add('incorrect');
    
    // Highlight the correct answer
    allBtns.forEach(btn => {
      if (btn.dataset.verseKey === correctVerse.verse_key) {
        btn.classList.add('correct');
      }
    });
  }
  
  // Update progress
  state.currentQuestion++;
  updateProgress();
  
  // Show result
  const resultArea = document.getElementById('result-area');
  resultArea.innerHTML = `
    <div class="result-feedback ${isCorrect ? 'correct' : 'incorrect'}">
      <ion-icon name="${isCorrect ? 'checkmark-circle' : 'close-circle'}"></ion-icon>
      <span>${isCorrect ? 'Correct!' : 'Incorrect. The correct answer is highlighted above.'}</span>
    </div>
  `;
  
  // Show next button
  document.getElementById('mcq-actions').style.display = 'flex';
  
  // Setup next button
  const nextBtn = document.getElementById('next-mcq-btn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (state.config) {
        runMCQMode(state.config);
      }
    });
  }
  
  // Stop timer
  stopTimer();
}

function startMCQTimer(seconds, correctVerse, allOptions) {
  stopTimer();
  state.tRemain = seconds;
  
  if (els.timerDisplay) {
    els.timerDisplay.style.display = 'flex';
  }
  
  const update = () => {
    if (els.timerText) {
      els.timerText.textContent = state.tRemain.toString().padStart(2, '0') + ':00';
    }
    
    if (state.tRemain <= 10 && els.timerDisplay) {
      els.timerDisplay.classList.add('warning');
    }
    
    if (state.tRemain <= 0) {
      stopTimer();
      // Time's up - show answer automatically
      const choicesContainer = document.getElementById('choices-container');
      if (choicesContainer) {
        const allBtns = choicesContainer.querySelectorAll('.choice-btn');
        allBtns.forEach(btn => {
          btn.disabled = true;
          if (btn.dataset.verseKey === correctVerse.verse_key) {
            btn.classList.add('correct');
          }
        });
        
        const resultArea = document.getElementById('result-area');
        if (resultArea) {
          resultArea.innerHTML = `
            <div class="result-feedback info">
              <ion-icon name="time-outline"></ion-icon>
              <span>Time's up! The correct answer is highlighted above.</span>
            </div>
          `;
        }
        
        document.getElementById('mcq-actions').style.display = 'flex';
        
        const nextBtn = document.getElementById('next-mcq-btn');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            if (state.config) {
              runMCQMode(state.config);
            }
          });
        }
      }
    }
    
    state.tRemain--;
  };
  
  update();
  state.tId = setInterval(update, 1000);
}

function runOrderMode(config) {
  if (!els.testContent || !state.versesFlat.length) {
    showError('No verses available for Order mode.');
    return;
  }
  
  // Get all unique pages from the verses
  const pages = Array.from(new Set(state.versesFlat.map(v => v.page_number).filter(p => typeof p === 'number' && p >= 1 && p <= 604)));
  
  if (!pages.length) {
    showError('No page information available.');
    return;
  }
  
  // Pick a random page
  const page = pickRandom(pages);
  
  // Get all verses for that page
  showLoading('Loading page verses...');
  
  QR.api.fetchVersesByPage(page, 'text_uthmani,page_number').then(verses => {
    if (!verses || verses.length < 2) {
      showError('Not enough verses on this page.');
      return;
    }
    
    // Sort verses in correct order
    const ordered = verses.slice().sort((a, b) => cmpVerseKey(a.verse_key, b.verse_key));
    state.orderCorrect = ordered.map(v => v.verse_key);
    
    // Keep first verse locked, shuffle the rest
    const first = ordered[0];
    const rest = ordered.slice(1);
    const shuffled = shuffle(rest.slice());
    
    state.orderUser = [first.verse_key, ...shuffled.map(v => v.verse_key)];
    
    // Render the UI
    els.testContent.innerHTML = `
      <div class="question-card">
        <div class="question-label">
          <ion-icon name="swap-vertical-outline"></ion-icon>
          Drag to arrange verses in correct order - Page ${page}
        </div>
        <div class="question-meta">
          <ion-icon name="lock-closed-outline"></ion-icon>
          The first verse is locked in place
        </div>
      </div>
      <ol class="draggable-list" id="draggable-verses"></ol>
      <div id="order-result"></div>
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
    `;
    
    const list = document.getElementById('draggable-verses');
    
    // Add first verse (locked)
    const li0 = document.createElement('li');
    li0.className = 'draggable-item locked';
    li0.dataset.key = first.verse_key;
    li0.style.fontSize = config.fontPx + 'px';
    li0.innerHTML = `
      <ion-icon name="lock-closed-outline" class="drag-handle"></ion-icon>
      <span>${first.text_uthmani || '—'}</span>
    `;
    list.appendChild(li0);
    
    // Add shuffled verses (draggable)
    shuffled.forEach(verse => {
      const li = document.createElement('li');
      li.className = 'draggable-item';
      li.draggable = true;
      li.dataset.key = verse.verse_key;
      li.style.fontSize = config.fontPx + 'px';
      li.innerHTML = `
        <ion-icon name="menu-outline" class="drag-handle"></ion-icon>
        <span>${verse.text_uthmani || '—'}</span>
      `;
      list.appendChild(li);
    });
    
    // Setup drag and drop
    setupDragAndDrop();
    
    // Setup check button
    document.getElementById('check-order-btn').addEventListener('click', () => checkOrder(config));
    
    // Setup next button
    document.getElementById('next-order-btn').addEventListener('click', () => runOrderMode(config));
    
    // Start timer if enabled
    if (config.timerOn) {
      startOrderTimer(config.timerSec, config);
    }
  }).catch(error => {
    console.error('Error loading page:', error);
    showError('Failed to load page verses.');
  });
}

function setupDragAndDrop() {
  const list = document.getElementById('draggable-verses');
  if (!list) return;
  
  let dragEl = null;
  let autoScrollInterval = null;
  let lastClientY = 0;
  let isDragging = false;
  
  const scrollContainer = els.testContent || document.documentElement;
  
  // Track mouse position globally during drag
  const updateMousePosition = (e) => {
    if (isDragging) {
      const clientY = e.clientY || e.pageY || 0;
      if (clientY > 0) {
        lastClientY = clientY;
      }
    }
  };
  
  // Allow mouse wheel scrolling during drag
  const handleWheel = (e) => {
    if (isDragging) {
      scrollContainer.scrollTop += e.deltaY;
      // Don't prevent default - let normal scrolling work
    }
  };
  
  // Auto-scroll function with variable speed
  const autoScroll = (clientY) => {
    const scrollThreshold = 200; // larger zone
    const maxScrollSpeed = 40; // much faster
    
    const viewportHeight = window.innerHeight;
    const distanceFromTop = clientY;
    const distanceFromBottom = viewportHeight - clientY;
    
    let scrollAmount = 0;
    
    if (distanceFromTop < scrollThreshold && distanceFromTop >= 0) {
      // Scroll up - faster when closer to edge
      const intensity = Math.max(0.3, 1 - (distanceFromTop / scrollThreshold));
      scrollAmount = -Math.ceil(maxScrollSpeed * intensity);
    } else if (distanceFromBottom < scrollThreshold && distanceFromBottom >= 0) {
      // Scroll down - faster when closer to edge
      const intensity = Math.max(0.3, 1 - (distanceFromBottom / scrollThreshold));
      scrollAmount = Math.ceil(maxScrollSpeed * intensity);
    }
    
    if (scrollAmount !== 0) {
      scrollContainer.scrollTop += scrollAmount;
    }
  };
  
  list.querySelectorAll('.draggable-item:not(.locked)').forEach(li => {
    li.addEventListener('dragstart', (e) => {
      dragEl = li;
      isDragging = true;
      li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      lastClientY = e.clientY || e.pageY || 0;
      
      // Add multiple tracking methods
      document.addEventListener('mousemove', updateMousePosition, { capture: true });
      document.addEventListener('dragover', updateMousePosition, { capture: true });
      document.addEventListener('drag', updateMousePosition, { capture: true });
      scrollContainer.addEventListener('wheel', handleWheel, { passive: true });
      
      // Start auto-scroll interval
      autoScrollInterval = setInterval(() => {
        if (lastClientY > 0 && isDragging) {
          autoScroll(lastClientY);
        }
      }, 16); // ~60fps for smooth scrolling
    });
    
    li.addEventListener('drag', (e) => {
      const clientY = e.clientY || e.pageY || 0;
      if (clientY > 0) {
        lastClientY = clientY;
      }
    });
    
    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      isDragging = false;
      
      // Remove global listeners
      document.removeEventListener('mousemove', updateMousePosition, { capture: true });
      document.removeEventListener('dragover', updateMousePosition, { capture: true });
      document.removeEventListener('drag', updateMousePosition, { capture: true });
      scrollContainer.removeEventListener('wheel', handleWheel);
      
      // Clear auto-scroll
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
      }
      lastClientY = 0;
      dragEl = null;
    });
    
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Update position for auto-scroll
      const clientY = e.clientY || e.pageY || 0;
      if (clientY > 0) {
        lastClientY = clientY;
      }
    });
    
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      
      if (!dragEl || dragEl === li) return;
      
      const allItems = Array.from(list.children);
      const dragIndex = allItems.indexOf(dragEl);
      const dropIndex = allItems.indexOf(li);
      
      if (dragIndex < 0 || dropIndex < 0) return;
      
      // Don't allow dropping before the locked first item
      if (dropIndex === 0) return;
      
      // Insert the dragged element
      if (dragIndex < dropIndex) {
        list.insertBefore(dragEl, li.nextSibling);
      } else {
        list.insertBefore(dragEl, li);
      }
    });
  });
}

function checkOrder(config) {
  const list = document.getElementById('draggable-verses');
  if (!list) return;
  
  const items = Array.from(list.children);
  const userOrder = items.map(li => li.dataset.key).filter(Boolean);
  const correct = state.orderCorrect;
  
  let correctCount = 0;
  
  items.forEach((li, idx) => {
    const isCorrect = userOrder[idx] === correct[idx];
    
    if (isCorrect) {
      correctCount++;
      li.classList.add('correct-order');
      li.classList.remove('incorrect-order');
      
      // Lock the verse if it's in the correct position
      if (!li.classList.contains('locked')) {
        li.classList.add('locked');
        li.draggable = false;
        
        // Change icon to lock
        const icon = li.querySelector('ion-icon');
        if (icon) {
          icon.setAttribute('name', 'lock-closed-outline');
        }
      }
    } else {
      li.classList.add('incorrect-order');
      li.classList.remove('correct-order');
    }
  });
  
  const resultArea = document.getElementById('order-result');
  if (resultArea) {
    const allCorrect = correctCount === correct.length;
    resultArea.innerHTML = `
      <div class="result-feedback ${allCorrect ? 'correct' : 'info'}">
        <ion-icon name="${allCorrect ? 'checkmark-circle' : 'information-circle'}"></ion-icon>
        <span>${correctCount}/${correct.length} verses in correct position${allCorrect ? '!' : '.'}</span>
      </div>
    `;
    
    if (allCorrect) {
      state.correctAnswers++;
      state.currentQuestion++;
      updateProgress();
    }
  }
  
  stopTimer();
}

function startOrderTimer(seconds, config) {
  stopTimer();
  state.tRemain = seconds;
  
  if (els.timerDisplay) {
    els.timerDisplay.style.display = 'flex';
  }
  
  const update = () => {
    if (els.timerText) {
      els.timerText.textContent = state.tRemain.toString().padStart(2, '0') + ':00';
    }
    
    if (state.tRemain <= 10 && els.timerDisplay) {
      els.timerDisplay.classList.add('warning');
    }
    
    if (state.tRemain <= 0) {
      stopTimer();
      checkOrder(config);
      
      const resultArea = document.getElementById('order-result');
      if (resultArea && resultArea.querySelector('.result-feedback')) {
        const feedback = resultArea.querySelector('.result-feedback');
        const currentText = feedback.textContent || '';
        feedback.innerHTML = `
          <ion-icon name="time-outline"></ion-icon>
          <span>Time's up! ${currentText}</span>
        `;
      }
    }
    
    state.tRemain--;
  };
  
  update();
  state.tId = setInterval(update, 1000);
}

function runAudioMode(config) {
  if (!els.testContent || !state.versesFlat.length) {
    showError('No verses available for Audio mode.');
    return;
  }
  
  // Find a verse that has a next verse in the same surah
  let idx = -1;
  for (let tries = 0; tries < 50; tries++) {
    const i = Math.floor(state.rng() * state.versesFlat.length);
    const [surah, ayah] = verseKeyToTuple(state.versesFlat[i].verse_key);
    
    // Check if next verse exists in same surah
    const hasNext = state.versesFlat.some(v => {
      const [s, a] = verseKeyToTuple(v.verse_key);
      return s === surah && a === ayah + 1;
    });
    
    if (hasNext) {
      idx = i;
      break;
    }
  }
  
  if (idx < 0) {
    showError('Could not find suitable verses for Audio mode.');
    return;
  }
  
  const promptVerse = state.versesFlat[idx];
  const [surah, ayah] = verseKeyToTuple(promptVerse.verse_key);
  
  const nextVerse = state.versesFlat.find(v => {
    const [s, a] = verseKeyToTuple(v.verse_key);
    return s === surah && a === ayah + 1;
  });
  
  if (!nextVerse) {
    showError('Next verse not found.');
    return;
  }
  
  // Fetch audio URL
  showLoading('Loading audio...');
  
  fetchAudioForVerse(promptVerse).then(audioUrl => {
    // Render the UI
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
          Click play to hear the verse, then recite the next one
        </div>
      </div>
      <div id="audio-answer-area"></div>
      <div class="action-buttons">
        <button class="btn-test primary" id="play-audio-btn">
          <ion-icon name="play-outline"></ion-icon>
          Play Audio
        </button>
        <button class="btn-test secondary" id="replay-audio-btn" style="display: none;">
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
    `;
    
    // Store state
    state.audioCurrent = {
      promptVerse,
      nextVerse,
      audioUrl
    };
    
    // Get audio element
    const audio = els.audio || document.getElementById('audio');
    
    // Setup play button
    document.getElementById('play-audio-btn').addEventListener('click', () => {
      if (audio && audioUrl) {
        audio.src = audioUrl;
        audio.play().catch(e => {
          console.error('Error playing audio:', e);
          alert('Failed to play audio. Please try again.');
        });
        
        document.getElementById('play-audio-btn').style.display = 'none';
        document.getElementById('replay-audio-btn').style.display = 'inline-flex';
        
        const statusText = document.getElementById('audio-status-text');
        if (statusText) {
          statusText.innerHTML = `
            <ion-icon name="volume-high-outline"></ion-icon>
            Playing verse ${promptVerse.verse_key}...
          `;
        }
        
        // Animate audio bars
        const visualizer = document.getElementById('audio-visualizer');
        if (visualizer) {
          visualizer.classList.add('playing');
        }
        
        audio.onended = () => {
          if (visualizer) {
            visualizer.classList.remove('playing');
          }
          if (statusText) {
            statusText.innerHTML = `
              <ion-icon name="mic-outline"></ion-icon>
              Now recite the next verse
            `;
          }
        };
      }
    });
    
    // Setup replay button
    document.getElementById('replay-audio-btn').addEventListener('click', () => {
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error('Error replaying audio:', e));
        
        const visualizer = document.getElementById('audio-visualizer');
        if (visualizer) {
          visualizer.classList.add('playing');
        }
      }
    });
    
    // Setup reveal button
    document.getElementById('reveal-audio-btn').addEventListener('click', () => revealAudioAnswer(config));
    
    // Setup next button
    document.getElementById('next-audio-btn').addEventListener('click', () => runAudioMode(config));
    
    // Start timer if enabled
    if (config.timerOn) {
      startAudioTimer(config.timerSec, config);
    }
  }).catch(error => {
    console.error('Error loading audio:', error);
    showError('Failed to load audio. Please try again.');
  });
}

async function fetchAudioForVerse(verse) {
  try {
    // Get reciter preference
    let reciterId = 7; // Default to Mishary Rashid Alafasy
    try {
      const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (prefs.reciter_id) {
        reciterId = prefs.reciter_id;
      }
    } catch (e) {
      console.error('Error reading reciter preference:', e);
    }
    
    const [surah] = verseKeyToTuple(verse.verse_key);
    const audioMap = await QR.api.fetchAudioMap(reciterId, surah);
    
    const url = audioMap.get(verse.verse_key) || '';
    return url;
  } catch (error) {
    console.error('Error fetching audio:', error);
    throw error;
  }
}

function revealAudioAnswer(config) {
  const cur = state.audioCurrent;
  if (!cur || !cur.nextVerse) return;
  
  const answerArea = document.getElementById('audio-answer-area');
  if (answerArea) {
    answerArea.innerHTML = `
      <div class="answer-reveal">
        <div class="answer-reveal-label">The next verse is:</div>
        <div class="answer-reveal-text" style="font-size: ${config.fontPx}px;">
          ${cur.nextVerse.text_uthmani || '—'}
        </div>
      </div>
    `;
  }
  
  state.currentQuestion++;
  updateProgress();
  stopTimer();
}

function startAudioTimer(seconds, config) {
  stopTimer();
  state.tRemain = seconds;
  
  if (els.timerDisplay) {
    els.timerDisplay.style.display = 'flex';
  }
  
  const update = () => {
    if (els.timerText) {
      els.timerText.textContent = state.tRemain.toString().padStart(2, '0') + ':00';
    }
    
    if (state.tRemain <= 10 && els.timerDisplay) {
      els.timerDisplay.classList.add('warning');
    }
    
    if (state.tRemain <= 0) {
      stopTimer();
      revealAudioAnswer(config);
      
      const answerArea = document.getElementById('audio-answer-area');
      if (answerArea && answerArea.querySelector('.result-feedback')) {
        const existing = answerArea.querySelector('.result-feedback');
        existing.remove();
      }
      
      // Add time's up message
      if (answerArea) {
        const timeUpMsg = document.createElement('div');
        timeUpMsg.className = 'result-feedback info';
        timeUpMsg.innerHTML = `
          <ion-icon name="time-outline"></ion-icon>
          <span>Time's up!</span>
        `;
        answerArea.insertBefore(timeUpMsg, answerArea.firstChild);
      }
    }
    
    state.tRemain--;
  };
  
  update();
  state.tId = setInterval(update, 1000);
}

// Helper functions for generating content (removed - using real data now)

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

// Options button initialization
function initializeOptionsButton() {
  if (els.optionsBtn) {
    els.optionsBtn.addEventListener('click', showOptionsModal);
  }
}

function showOptionsModal() {
  // Create a modal overlay
  const modal = document.createElement('div');
  modal.className = 'options-modal-overlay';
  modal.innerHTML = `
    <div class="options-modal">
      <div class="options-modal-header">
        <h3>Test Options</h3>
        <button class="btn-icon" id="close-options">
          <ion-icon name="close"></ion-icon>
        </button>
      </div>
      <div class="options-modal-content">
        <div class="option-group">
          <label class="option-checkbox">
            <input type="checkbox" id="modal-show-meta" ${state.config?.showMeta ? 'checked' : ''}>
            <span>Show Verse Info (Recite Mode)</span>
          </label>
        </div>
      </div>
      <div class="options-modal-footer">
        <button class="btn-test secondary" id="cancel-options">
          Cancel
        </button>
        <button class="btn-test primary" id="apply-options">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
          Apply Changes
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close modal handlers
  const closeModal = () => {
    modal.remove();
  };
  
  document.getElementById('close-options')?.addEventListener('click', closeModal);
  document.getElementById('cancel-options')?.addEventListener('click', closeModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Apply changes handler
  document.getElementById('apply-options')?.addEventListener('click', () => {
    if (state.config) {
      state.config.showMeta = document.getElementById('modal-show-meta')?.checked || false;
      
      // Show feedback
      const applyBtn = document.getElementById('apply-options');
      if (applyBtn) {
        const originalText = applyBtn.innerHTML;
        applyBtn.innerHTML = '<ion-icon name="checkmark-circle"></ion-icon> Applied!';
        applyBtn.disabled = true;
        
        setTimeout(() => {
          closeModal();
        }, 500);
      }
    } else {
      closeModal();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeModeCards();
    initializeBackButton();
    initializeOptionsButton();
    showLanding();
    ensureFont();
  });
} else {
  // DOM already loaded
  initializeModeCards();
  initializeBackButton();
  initializeOptionsButton();
  showLanding();
  ensureFont();
}
