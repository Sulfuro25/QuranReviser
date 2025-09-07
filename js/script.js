const API_BASE = 'https://api.quran.com/api/v4';
const AUDIO_CDN = 'https://audio.qurancdn.com/';

const els = {
  themeToggle: document.getElementById('theme-toggle'),
  status: document.getElementById('status'),
  display: document.getElementById('quran-display'),
  audio: document.getElementById('audio'),
  prevAyah: document.getElementById('prev-ayah'),
  playPause: document.getElementById('play-pause'),
  nextAyah: document.getElementById('next-ayah'),
  playerInfo: document.getElementById('player-info'),
  toMushaf: document.getElementById('to-mushaf'),
};

const state = {
  verses: [],
  translations: new Map(), // verse_key -> text (not used now)
  audioMap: new Map(), // verse_key -> url
  currentContext: null, // { type: 'surah'|'juz'|'hizb', id: number }
  currentReciterId: 7,
  fontSizePx: 36,
  playIndex: 0,
  translationEnabled: false,
  translationId: 0,
};

try { window.state = state; } catch {}

function setStatus(text) { if (els.status) els.status.textContent = text || ''; }

function persistPrefs() {
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}'); } catch {}
  prefs.theme = document.body.getAttribute('data-theme') || 'dark';
  try { localStorage.setItem('qr_prefs', JSON.stringify(prefs)); } catch {}
}

async function ensureTranslationSource() {
  // If user enabled translations but didn't pick a source, choose a sensible default
  if (!state.translationEnabled || state.translationId) return;
  try {
    const res = await fetch(`${API_BASE}/resources/translations?language=en`);
    const data = await res.json();
    const list = data.translations || [];
    const pick =
      list.find(t => ((t.language||t.language_name||'')+'' ).toLowerCase().startsWith('en') && /saheeh/i.test((t.name||t.translated_name?.name||'')+'')) ||
      list.find(t => ((t.language||t.language_name||'')+'' ).toLowerCase().startsWith('en')) ||
      list[0];
    if (pick && pick.id) {
      state.translationId = pick.id;
      state.translationEnabled = true;
      try {
        const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
        prefs.translation_id = pick.id;
        prefs.translation_on = true;
        localStorage.setItem('qr_prefs', JSON.stringify(prefs));
      } catch {}
    }
  } catch (e) {
    // ignore; translation remains off if none available
  }
}

function loadPrefs() {
  try {
    const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
    if (prefs.theme) document.body.setAttribute('data-theme', prefs.theme);
    if (typeof prefs.font_px === 'number' && prefs.font_px > 10) {
      applyFontSize(prefs.font_px);
    } else {
      applyFontSize(state.fontSizePx);
    }
    if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) {
      state.currentReciterId = prefs.reciter_id;
    }
    state.translationEnabled = !!prefs.translation_on;
    if (typeof prefs.translation_id === 'number' && prefs.translation_id > 0) {
      state.translationId = prefs.translation_id;
    }
    if (els.themeToggle) els.themeToggle.textContent = (document.body.getAttribute('data-theme') === 'light') ? 'Dark' : 'Light';
  } catch {}
}

function applyFontSize(px) {
  state.fontSizePx = px;
  document.documentElement.style.setProperty('--arabic-size', px + 'px');
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

// Player
function updatePlayerInfo() {
  const total = state.verses.length;
  const current = Math.min(state.playIndex + 1, Math.max(1, total || 1));
  if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total}` : 'Not loaded';
  const enabled = !!total && state.audioMap.size > 0;
  [els.prevAyah, els.playPause, els.nextAyah].forEach(btn => { if (btn) btn.disabled = !enabled; });
  if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? '⏸ Pause' : '▶ Play';
}

function setAudioForIndex(i, autoplay = false) {
  if (!state.verses.length) return;
  state.playIndex = Math.max(0, Math.min(i, state.verses.length - 1));
  const v = state.verses[state.playIndex];
  const url = state.audioMap.get(v.verse_key);
  if (!url) return;
  els.audio.src = url;
  els.audio.dataset.current = url;
  if (autoplay) els.audio.play().catch(()=>{});
  updatePlayerInfo();
}

function togglePlay() {
  if (!state.verses.length || !state.audioMap.size) return;
  if (!els.audio.src) { setAudioForIndex(state.playIndex, true); return; }
  if (els.audio.paused) els.audio.play().catch(()=>{}); else els.audio.pause();
  updatePlayerInfo();
}

function nextAyah() {
  if (state.playIndex < state.verses.length - 1) {
    setAudioForIndex(state.playIndex + 1, true);
  } else {
    els.audio.pause();
    els.audio.currentTime = 0;
    updatePlayerInfo();
  }
}

function prevAyah() {
  const threshold = 2; // seconds
  if (els.audio.currentTime > threshold) {
    els.audio.currentTime = 0;
    return;
  }
  if (state.playIndex > 0) setAudioForIndex(state.playIndex - 1, true);
  else els.audio.currentTime = 0;
}

function renderVerses() {
  const verses = state.verses;
  const total = verses.length;
  if (!total) { els.display.innerHTML = ''; updatePlayerInfo(); return; }

  const frag = document.createDocumentFragment();
  verses.forEach(v => {
    const t = state.translations.get(v.verse_key) || '';

    const card = document.createElement('article');
    card.className = 'verse';

    const head = document.createElement('div');
    head.className = 'verse-header';
    const meta = document.createElement('div');
    meta.className = 'ayah-meta';
    meta.textContent = v.verse_key;
    const actions = document.createElement('div');
    actions.className = 'verse-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'icon-btn';
    copyBtn.textContent = '📋 Copy';
    copyBtn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(v.text_uthmani_tajweed.replace(/<[^>]+>/g, '')); } catch {}
    });
    actions.appendChild(copyBtn);
    head.appendChild(meta);
    head.appendChild(actions);
    card.appendChild(head);

    const arabic = document.createElement('div');
    arabic.className = 'arabic';
    arabic.innerHTML = v.text_uthmani_tajweed;
    card.appendChild(arabic);

    if (state.translationEnabled && t) {
      const tr = document.createElement('div');
      tr.className = 'translation';
      tr.innerHTML = t;
      card.appendChild(tr);
    }

    frag.appendChild(card);
  });

  els.display.innerHTML = '';
  els.display.appendChild(frag);
  updatePlayerInfo();
}

async function buildAudioForVerses(verses) {
  const surahSet = new Set();
  (verses || []).forEach(v => {
    const sid = parseInt(String(v.verse_key).split(':')[0], 10);
    if (sid) surahSet.add(sid);
  });
  const tasks = Array.from(surahSet).map(sid => fetchAudioMap(state.currentReciterId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((url, key) => merged.set(key, url)));
  return merged;
}

async function buildTranslationsForVerses(verses, translationId){
  if (!translationId) return new Map();
  const surahSet = new Set();
  (verses || []).forEach(v => {
    const sid = parseInt(String(v.verse_key).split(':')[0], 10);
    if (sid) surahSet.add(sid);
  });
  const tasks = Array.from(surahSet).map(sid => fetchTranslationsForChapter(translationId, sid).catch(()=>new Map()));
  const results = await Promise.all(tasks);
  const merged = new Map();
  results.forEach(m => m.forEach((txt, key) => merged.set(key, txt)));
  return merged;
}

async function loadSurah(surahId) {
  state.currentContext = { type: 'surah', id: surahId };
  try {
    setStatus('Loading…');
    await ensureTranslationSource();
    const baseTasks = [
      fetchVersesTajweed(surahId),
      fetchAudioMap(state.currentReciterId, surahId),
    ];
    if (state.translationId) {
      baseTasks.push(fetchTranslationsForChapter(state.translationId, surahId));
    }
    const [verses, audioMap, trMap] = await Promise.all(baseTasks);
    state.verses = verses;
    state.translations = trMap || new Map();
    state.audioMap = audioMap;
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded ${verses.length} ayah(s).`);
  } catch (e) {
    console.error(e);
    alert('Failed to load data: ' + e.message);
    setStatus('Failed to load.');
  }
  // update mushaf link to this surah
  if (els.toMushaf) els.toMushaf.href = `mushaf.html?surah=${surahId}`;
}

async function loadJuz(juzNumber) {
  state.currentContext = { type: 'juz', id: juzNumber };
  try {
    setStatus('Loading Juz…');
    await ensureTranslationSource();
    // Pull all verses in this Juz with tajweed text
    const res = await fetch(`${API_BASE}/verses/by_juz/${juzNumber}?words=false&fields=text_uthmani_tajweed&per_page=300`);
    if (!res.ok) throw new Error(`Juz HTTP ${res.status}`);
    const data = await res.json();
    const verses = data.verses || [];
    // Build audio map across involved surahs
    const audioMap = await buildAudioForVerses(verses);
    const trMap = (state.translationId)
      ? await buildTranslationsForVerses(verses, state.translationId)
      : new Map();
    state.verses = verses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Juz ${juzNumber} (${verses.length} ayah).`);
    // Update Mushaf link to first verse's surah
    const first = verses[0];
    const sid = first && String(first.verse_key).split(':')[0];
    if (els.toMushaf && sid) els.toMushaf.href = `mushaf.html?surah=${sid}`;
  } catch (e) {
    console.error(e);
    alert('Failed to load Juz: ' + e.message);
    setStatus('Failed to load Juz.');
  }
}

async function loadHizb(hizbNumber) {
  state.currentContext = { type: 'hizb', id: hizbNumber };
  try {
    setStatus('Loading Hizb…');
    await ensureTranslationSource();
    const res = await fetch(`${API_BASE}/verses/by_hizb/${hizbNumber}?words=false&fields=text_uthmani_tajweed&per_page=300`);
    if (!res.ok) throw new Error(`Hizb HTTP ${res.status}`);
    const data = await res.json();
    const verses = data.verses || [];
    const audioMap = await buildAudioForVerses(verses);
    const trMap = (state.translationId)
      ? await buildTranslationsForVerses(verses, state.translationId)
      : new Map();
    state.verses = verses;
    state.audioMap = audioMap;
    state.translations = trMap;
    state.playIndex = 0;
    renderVerses();
    setStatus(`Loaded Hizb ${hizbNumber} (${verses.length} ayah).`);
    const first = verses[0];
    const sid = first && String(first.verse_key).split(':')[0];
    if (els.toMushaf && sid) els.toMushaf.href = `mushaf.html?surah=${sid}`;
  } catch (e) {
    console.error(e);
    alert('Failed to load Hizb: ' + e.message);
    setStatus('Failed to load Hizb.');
  }
}

// Events
if (els.themeToggle) els.themeToggle.addEventListener('click', () => {
  const current = document.body.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  if (els.themeToggle) els.themeToggle.textContent = next === 'dark' ? 'Light' : 'Dark';
  persistPrefs();
});

// No Surah picker UI anymore

// Player events
if (els.prevAyah) els.prevAyah.addEventListener('click', prevAyah);
if (els.playPause) els.playPause.addEventListener('click', togglePlay);
if (els.nextAyah) els.nextAyah.addEventListener('click', nextAyah);
if (els.audio) els.audio.addEventListener('ended', nextAyah);

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.body.getAttribute('data-theme')) document.body.setAttribute('data-theme', 'dark');
  loadPrefs();
  updatePlayerInfo();
  // Back link behavior: go to the list
  try {
    const back = document.querySelector('.back-link');
    if (back) {
      back.textContent = '← List';
      back.addEventListener('click', (e) => {
        e.preventDefault();
        if (document.referrer && /surahs\.html(\?|$)/.test(document.referrer)) {
          history.back();
        } else {
          location.href = 'surahs.html';
        }
      });
    }
  } catch {}
  const params = new URLSearchParams(location.search);
  const surahParam = parseInt(params.get('surah') || '', 10);
  const juzParam = parseInt(params.get('juz') || '', 10);
  const hizbParam = parseInt(params.get('hizb') || '', 10);
  // Ensure back link returns to the correct list mode
  try {
    const back = document.querySelector('.back-link');
    const modeParam = (params.get('mode') || '').toLowerCase() || ( !Number.isNaN(juzParam) ? 'juz' : !Number.isNaN(hizbParam) ? 'hizb' : 'surahs');
    if (back) {
      const backUrl = `surahs.html?mode=${encodeURIComponent(modeParam)}`;
      back.textContent = 'List';
      back.setAttribute('href', backUrl);
      const handler = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        if (document.referrer && /surahs\.html(\?|$)/.test(document.referrer)) {
          history.back();
        } else {
          location.href = backUrl;
        }
      };
      back.addEventListener('click', handler, true);
    }
  } catch {}
  try {
    if (!Number.isNaN(surahParam) && surahParam >= 1 && surahParam <= 114) {
      await loadSurah(surahParam);
      return;
    }
    if (!Number.isNaN(juzParam) && juzParam >= 1 && juzParam <= 30) {
      await loadJuz(juzParam);
      return;
    }
    if (!Number.isNaN(hizbParam) && hizbParam >= 1 && hizbParam <= 60) {
      await loadHizb(hizbParam);
      return;
    }
  } catch (e) {
    console.error(e);
  }
  // If no context, send to list
  location.replace('surahs.html');
});
