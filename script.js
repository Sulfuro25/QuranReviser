const API_BASE = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://audio.qurancdn.com/';

const els = {
  surah: document.getElementById('surah-select'),
  range: document.getElementById('ayah-range'),
  translation: document.getElementById('translation-select'),
  reciter: document.getElementById('reciter-select'),
  load: document.getElementById('load-btn'),
  search: document.getElementById('search-input'),
  fontSize: document.getElementById('font-size'),
  legend: document.getElementById('legend'),
  legendToggle: document.getElementById('legend-toggle'),
  themeToggle: document.getElementById('theme-toggle'),
  status: document.getElementById('status'),
  display: document.getElementById('quran-display'),
  audio: document.getElementById('audio'),
};

const state = {
  chapters: [],
  verses: [],
  translations: new Map(), // verse_key -> text
  audioMap: new Map(), // verse_key -> url
  currentSurah: null,
  currentTranslationId: '',
  currentReciterId: '',
  search: '',
  fontSizePx: 36,
};

function setStatus(text) {
  els.status.textContent = text || '';
}

// UI helpers
function persistPrefs() {
  const prefs = {
    theme: document.body.getAttribute('data-theme') || 'dark',
    translationId: els.translation.value,
    reciterId: els.reciter.value,
    fontSize: els.fontSize.value,
  };
  try { localStorage.setItem('qr_prefs', JSON.stringify(prefs)); } catch {}
}

function loadPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
    if (prefs.theme) document.body.setAttribute('data-theme', prefs.theme);
    if (prefs.translationId) els.translation.value = prefs.translationId;
    if (prefs.reciterId) els.reciter.value = prefs.reciterId;
    if (prefs.fontSize) { els.fontSize.value = prefs.fontSize; applyFontSize(+prefs.fontSize); }
    els.themeToggle.textContent = (document.body.getAttribute('data-theme') === 'light') ? 'Dark' : 'Light';
  } catch {}
}

function applyFontSize(px) {
  state.fontSizePx = px;
  document.documentElement.style.setProperty('--arabic-size', px + 'px');
}

async function loadChapters() {
  els.surah.innerHTML = '<option value="">Loading Surahs...</option>';
  try {
    const res = await fetch(`${API_BASE}/chapters?language=en`);
    if (!res.ok) throw new Error(`Chapters HTTP ${res.status}`);
    const data = await res.json();
    state.chapters = data.chapters || [];
    els.surah.innerHTML = '<option value="">Select a Surah</option>';
    state.chapters.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = `${ch.id}. ${ch.name_simple} (${ch.name_arabic})`;
      els.surah.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
    els.surah.innerHTML = '<option value="">Failed to load Surahs</option>';
    setStatus('Failed to load Surahs. Check connection.');
  }
}

async function loadTranslations() {
  els.translation.innerHTML = '<option value="">None</option>';
  try {
    const res = await fetch(`${API_BASE}/resources/translations`);
    if (!res.ok) throw new Error(`Translations HTTP ${res.status}`);
    const { translations } = await res.json();
    const allowedLangs = new Set(['english', 'french', 'german', 'spanish', 'turkish', 'indonesian', 'malayalam', 'bengali', 'urdu']);
    translations
      .filter(t => allowedLangs.has((t.language_name || '').toLowerCase()))
      .sort((a,b) => (a.language_name+a.name).localeCompare(b.language_name+b.name))
      .forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${capitalize(t.language_name)} — ${t.name}`;
        els.translation.appendChild(opt);
      });
  } catch (e) {
    console.error(e);
    setStatus('Translations unavailable.');
  }
}

async function loadReciters() {
  els.reciter.innerHTML = '<option value="">None</option>';
  try {
    const res = await fetch(`${API_BASE}/resources/recitations`);
    if (!res.ok) throw new Error(`Recitations HTTP ${res.status}`);
    const { recitations } = await res.json();
    recitations
      .sort((a,b) => (a.reciter_name+a.style).localeCompare(b.reciter_name+b.style))
      .forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.style ? `${r.reciter_name} — ${r.style}` : r.reciter_name;
        els.reciter.appendChild(opt);
      });
  } catch (e) {
    console.error(e);
    setStatus('Reciters unavailable.');
  }
}

async function fetchVersesTajweed(chapterNumber) {
  setStatus('Loading verses...');
  const res = await fetch(`${API_BASE}/quran/verses/uthmani_tajweed?chapter_number=${chapterNumber}`);
  if (!res.ok) throw new Error(`Verses HTTP ${res.status}`);
  const data = await res.json();
  const verses = data.verses || [];
  setStatus('');
  return verses;
}

async function fetchTranslationsForChapter(translationId, chapterNumber) {
  if (!translationId) return new Map();
  setStatus('Loading translation...');
  const res = await fetch(`${API_BASE}/quran/translations/${translationId}?chapter_number=${chapterNumber}`);
  if (!res.ok) throw new Error(`Translation HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map();
  (data.translations || []).forEach(t => map.set(t.verse_key, t.text));
  setStatus('');
  return map;
}

async function fetchAudioMap(recitationId, chapterNumber) {
  if (!recitationId) return new Map();
  setStatus('Loading audio...');
  const res = await fetch(`${API_BASE}/recitations/${recitationId}/by_chapter/${chapterNumber}`);
  if (!res.ok) throw new Error(`Audio HTTP ${res.status}`);
  const data = await res.json();
  const map = new Map();
  (data.audio_files || []).forEach(a => map.set(a.verse_key, AUDIO_CDN + a.url));
  setStatus('');
  return map;
}

function parseRange(rangeStr, total) {
  if (!rangeStr) return [1, total];
  const m = rangeStr.split('-').map(v => parseInt(v.trim(), 10));
  if (m.length === 2 && !isNaN(m[0]) && !isNaN(m[1]) && m[0] >= 1 && m[0] <= m[1]) {
    return [Math.max(1, m[0]), Math.min(total, m[1])];
  }
  return null;
}

function capitalize(s){ return (s||'').charAt(0).toUpperCase() + (s||'').slice(1); }

function playAyah(verseKey) {
  const url = state.audioMap.get(verseKey);
  if (!url) return;
  const isSame = els.audio.dataset.current === url;
  if (isSame && !els.audio.paused) {
    els.audio.pause();
    return;
  }
  els.audio.src = url;
  els.audio.dataset.current = url;
  els.audio.play().catch(()=>{});
}

function renderVerses() {
  const verses = state.verses;
  const total = verses.length;
  if (!total) { els.display.innerHTML = ''; return; }
  const r = parseRange(els.range.value.trim(), total);
  if (!r) { alert('Invalid range. Use e.g., 1-10'); return; }
  const [start, end] = r;
  const term = (state.search||'').trim().toLowerCase();

  const frag = document.createDocumentFragment();
  verses.slice(start-1, end).forEach(v => {
    const t = state.translations.get(v.verse_key) || '';
    const combined = (v.text_uthmani_tajweed || '') + ' ' + t;
    if (term && !combined.toLowerCase().includes(term)) return;

    const card = document.createElement('article');
    card.className = 'verse';

    const head = document.createElement('div');
    head.className = 'verse-header';
    const meta = document.createElement('div');
    meta.className = 'ayah-meta';
    meta.textContent = v.verse_key;
    const actions = document.createElement('div');
    actions.className = 'verse-actions';

    const playBtn = document.createElement('button');
    playBtn.className = 'icon-btn';
    playBtn.textContent = '▶ Play';
    playBtn.disabled = !state.audioMap.size;
    playBtn.addEventListener('click', () => playAyah(v.verse_key));

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.textContent = '⧉ Copy';
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(v.text_uthmani_tajweed.replace(/<[^>]+>/g, '')); } catch {}
    });

    actions.appendChild(playBtn);
    actions.appendChild(copyBtn);
    head.appendChild(meta);
    head.appendChild(actions);
    card.appendChild(head);

    const arabic = document.createElement('div');
    arabic.className = 'arabic';
    arabic.innerHTML = v.text_uthmani_tajweed;
    card.appendChild(arabic);

    if (t) {
      const tr = document.createElement('div');
      tr.className = 'translation';
      tr.innerHTML = t;
      card.appendChild(tr);
    }

    frag.appendChild(card);
  });

  els.display.innerHTML = '';
  els.display.appendChild(frag);
}

async function loadAll() {
  const surahId = parseInt(els.surah.value, 10);
  if (!surahId) { alert('Please select a Surah.'); return; }

  state.currentSurah = surahId;
  try {
    setStatus('Loading…');
    const [verses, translationMap, audioMap] = await Promise.all([
      fetchVersesTajweed(surahId),
      fetchTranslationsForChapter(els.translation.value, surahId),
      fetchAudioMap(els.reciter.value, surahId),
    ]);
    state.verses = verses;
    state.translations = translationMap;
    state.audioMap = audioMap;
    renderVerses();
    setStatus(`Loaded ${verses.length} ayah(s).`);
    persistPrefs();
  } catch (e) {
    console.error(e);
    alert('Failed to load data: ' + e.message);
    setStatus('Failed to load.');
  }
}

// Events
els.load.addEventListener('click', loadAll);
els.translation.addEventListener('change', async () => {
  if (!state.currentSurah) return;
  state.translations = await fetchTranslationsForChapter(els.translation.value, state.currentSurah).catch(()=>new Map());
  renderVerses();
  persistPrefs();
});
els.reciter.addEventListener('change', async () => {
  if (!state.currentSurah) return;
  state.audioMap = await fetchAudioMap(els.reciter.value, state.currentSurah).catch(()=>new Map());
  renderVerses();
  persistPrefs();
});
els.search.addEventListener('input', () => { state.search = els.search.value; renderVerses(); });
els.fontSize.addEventListener('input', () => { applyFontSize(+els.fontSize.value); persistPrefs(); });
els.legendToggle.addEventListener('click', () => {
  const isHidden = els.legend.hasAttribute('hidden');
  if (isHidden) els.legend.removeAttribute('hidden'); else els.legend.setAttribute('hidden','');
});
els.themeToggle.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  els.themeToggle.textContent = next === 'dark' ? 'Light' : 'Dark';
  persistPrefs();
});

document.addEventListener('DOMContentLoaded', async () => {
  // Default theme
  if (!document.body.getAttribute('data-theme')) document.body.setAttribute('data-theme', 'dark');
  await Promise.all([loadChapters(), loadTranslations(), loadReciters()]);
  loadPrefs();
});
