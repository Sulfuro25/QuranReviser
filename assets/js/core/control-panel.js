// control-panel.js - unified controls for reader & mushaf views
window.QR = window.QR || {};

(function(){
  const RANGE_KEY = 'qr_playback_range';
  const surahMetaCache = new Map();

  const dom = {
    startSurah: null,
    startAyah: null,
    endSurah: null,
    endAyah: null,
    loopOne: null,
    rangeStatus: null,
    rangeClear: null,
    bmToggle: null,
    bmStatus: null,
    note: null,
    confSelect: null,
  };

  const state = {
    rangeStartKey: null,
    rangeEndKey: null,
    loopOne: false,
    currentPage: null,
    noteTimer: null,
  };

  const listeners = [];
  let setupDone = false;

  function ensureSurahMeta(){
    if (surahMetaCache.size) return surahMetaCache;
    const list = Array.isArray(window.CHAPTERS_DATA) ? window.CHAPTERS_DATA : [];
    list.forEach((entry, idx) => {
      if (!entry) return;
      const id = Number(entry.id || idx + 1);
      if (!id || Number.isNaN(id)) return;
      const name = String(entry.name_simple || entry.name_arabic || `Surah ${id}`).trim();
      const verses = Number(entry.verses_count) || 0;
      const pages = Array.isArray(entry.pages) ? entry.pages.slice(0, 2).map(p => Number(p) || null) : [];
      const label = `${id}. ${name}`;
      surahMetaCache.set(id, { id, label, verses, pages });
    });
    if (!surahMetaCache.size) {
      for (let i = 1; i <= 114; i += 1) {
        surahMetaCache.set(i, { id: i, label: `Surah ${i}`, verses: 286, pages: [] });
      }
    }
    return surahMetaCache;
  }

  function getVerseCount(surahId){
    const map = ensureSurahMeta();
    const meta = map.get(Number(surahId));
    return meta ? Math.max(1, Number(meta.verses) || 0) : 286;
  }

  function populateSurahSelect(select){
    if (!select) return;
    const prev = select.value;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '--';
    select.appendChild(placeholder);
    const map = ensureSurahMeta();
    Array.from(map.values()).sort((a, b) => a.id - b.id).forEach(meta => {
      const opt = document.createElement('option');
      opt.value = String(meta.id);
      opt.textContent = meta.label;
      select.appendChild(opt);
    });
    if (prev && select.querySelector(`option[value="${prev}"]`)) select.value = prev;
  }

  function populateAyahSelect(select, surahId, desired){
    if (!select) return;
    const prev = select.value;
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '--';
    select.appendChild(placeholder);
    const sid = Number(surahId);
    if (!sid || Number.isNaN(sid)) { select.value = ''; return; }
    const count = getVerseCount(sid);
    for (let i = 1; i <= count; i += 1){
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = String(i);
      select.appendChild(opt);
    }
    const want = desired || prev;
    if (want && select.querySelector(`option[value="${want}"]`)) select.value = String(want);
    else select.value = '';
  }

  function parseKey(key){
    if (!key) return null;
    const parts = String(key).split(':');
    const surah = Number(parts[0]);
    const ayah = Number(parts[1]);
    if (!surah || !ayah || Number.isNaN(surah) || Number.isNaN(ayah)) return null;
    return { surah, ayah };
  }

  function compareKeys(a, b){
    const pa = parseKey(a);
    const pb = parseKey(b);
    if (!pa || !pb) return 0;
    if (pa.surah !== pb.surah) return pa.surah - pb.surah;
    return pa.ayah - pb.ayah;
  }

  function readStoredRange(){
    try {
      const raw = (window.QR && QR.profiles && QR.profiles.getItem)
        ? QR.profiles.getItem(RANGE_KEY)
        : localStorage.getItem(RANGE_KEY);
      if (!raw) return { start: null, end: null, loopOne: false };
      const parsed = JSON.parse(raw);
      return {
        start: parsed && typeof parsed.start === 'string' && parsed.start ? parsed.start : null,
        end: parsed && typeof parsed.end === 'string' && parsed.end ? parsed.end : null,
        loopOne: !!(parsed && parsed.loopOne),
      };
    } catch {
      return { start: null, end: null, loopOne: false };
    }
  }

  function persistRange(){
    try {
      const payload = JSON.stringify({
        start: state.rangeStartKey || '',
        end: state.rangeEndKey || '',
        loopOne: !!state.loopOne,
      });
      if (window.QR && QR.profiles && QR.profiles.setItem) QR.profiles.setItem(RANGE_KEY, payload);
      else localStorage.setItem(RANGE_KEY, payload);
    } catch {}
  }

  function updateRangeStatus(){
    if (!dom.rangeStatus) return;
    const startLabel = state.rangeStartKey ? state.rangeStartKey : '--';
    const endLabel = state.rangeEndKey ? state.rangeEndKey : '--';
    dom.rangeStatus.textContent = `Start: ${startLabel}, End: ${endLabel}`;
  }

  function ensureRangeOrder(){
    if (state.rangeStartKey && state.rangeEndKey && compareKeys(state.rangeStartKey, state.rangeEndKey) > 0){
      const tmp = state.rangeStartKey;
      state.rangeStartKey = state.rangeEndKey;
      state.rangeEndKey = tmp;
      applyRangeToSelectors();
    }
  }

  function onRangeChanged(){
    ensureRangeOrder();
    persistRange();
    updateRangeStatus();
    listeners.forEach(l => { if (typeof l.onRangeChange === 'function') { try { l.onRangeChange(getRange()); } catch (err) { console.error(err); } } });
  }

  function applyRangeToSelectors(){
    if (dom.startSurah){
      if (state.rangeStartKey){
        const parts = parseKey(state.rangeStartKey);
        if (parts){
          dom.startSurah.value = String(parts.surah);
          populateAyahSelect(dom.startAyah, parts.surah, parts.ayah);
          dom.startAyah.value = String(parts.ayah);
        }
      } else {
        dom.startSurah.value = '';
        populateAyahSelect(dom.startAyah, null, null);
      }
    }
    if (dom.endSurah){
      if (state.rangeEndKey){
        const parts = parseKey(state.rangeEndKey);
        if (parts){
          dom.endSurah.value = String(parts.surah);
          populateAyahSelect(dom.endAyah, parts.surah, parts.ayah);
          dom.endAyah.value = String(parts.ayah);
        }
      } else {
        dom.endSurah.value = '';
        populateAyahSelect(dom.endAyah, null, null);
      }
    }
  }

  function updateRangeFromInputs(){
    const startSurah = Number(dom.startSurah?.value || 0);
    const startAyah = Number(dom.startAyah?.value || 0);
    const endSurah = Number(dom.endSurah?.value || 0);
    const endAyah = Number(dom.endAyah?.value || 0);
    state.rangeStartKey = (startSurah && startAyah) ? `${startSurah}:${startAyah}` : null;
    state.rangeEndKey = (endSurah && endAyah) ? `${endSurah}:${endAyah}` : null;
    onRangeChanged();
  }

  function setRange(startKey, endKey){
    state.rangeStartKey = startKey || null;
    state.rangeEndKey = endKey || null;
    applyRangeToSelectors();
    onRangeChanged();
  }

  function getRange(){
    return { start: state.rangeStartKey, end: state.rangeEndKey };
  }

  function setLoopOne(on){
    state.loopOne = !!on;
    if (dom.loopOne) dom.loopOne.checked = state.loopOne;
    persistRange();
    listeners.forEach(l => { if (typeof l.onLoopChange === 'function') { try { l.onLoopChange(state.loopOne); } catch (err) { console.error(err); } } });
  }

  function getLoopOne(){
    return !!state.loopOne;
  }

  function disablePageControls(){
    if (dom.bmToggle){
      dom.bmToggle.disabled = true;
      dom.bmToggle.textContent = 'Bookmark this page';
    }
    if (dom.bmStatus) dom.bmStatus.textContent = '';
    if (dom.note){
      dom.note.disabled = true;
      dom.note.value = '';
    }
    if (dom.confSelect){
      dom.confSelect.disabled = true;
      dom.confSelect.value = '';
    }
  }

  function updateBookmarkUI(){
    if (!state.currentPage){ disablePageControls(); return; }
    const data = (window.QR && QR.pageData) ? QR.pageData.get(state.currentPage) : { bookmark: false, note: '', confidence: '' };
    if (dom.bmToggle){
      dom.bmToggle.disabled = false;
      dom.bmToggle.textContent = data.bookmark ? 'Remove bookmark' : 'Bookmark this page';
    }
    if (dom.bmStatus){
      dom.bmStatus.textContent = data.bookmark ? `\u2605 Page ${state.currentPage}` : '';
    }
    if (dom.note){
      dom.note.disabled = false;
      if (dom.note.value !== data.note) dom.note.value = data.note;
    }
    if (dom.confSelect){
      dom.confSelect.disabled = false;
      let level = data.confidence || '';
      if (!level){
        try {
          if (window.QR && QR.confidence && typeof QR.confidence.get === 'function'){
            level = QR.confidence.get(`page:${state.currentPage}`) || '';
          }
        } catch {}
      }
      if (dom.confSelect.value !== level) dom.confSelect.value = level;
    }
  }

  function setCurrentPage(page){
    const num = Number(page);
    state.currentPage = Number.isFinite(num) && num > 0 ? Math.floor(num) : null;
    if (!state.currentPage) disablePageControls();
    else updateBookmarkUI();
  }

  function handleBookmarkClick(){
    if (!state.currentPage || !window.QR || !QR.pageData) return;
    const on = QR.pageData.toggleBookmark(state.currentPage);
    if (dom.bmStatus) dom.bmStatus.textContent = on ? `\u2605 Page ${state.currentPage}` : '';
    if (dom.bmToggle) dom.bmToggle.textContent = on ? 'Remove bookmark' : 'Bookmark this page';
    listeners.forEach(l => { if (typeof l.onBookmarkChange === 'function') { try { l.onBookmarkChange(state.currentPage, on); } catch (err) { console.error(err); } } });
  }

  function handleNoteInput(){
    if (!state.currentPage || !window.QR || !QR.pageData) return;
    if (state.noteTimer) clearTimeout(state.noteTimer);
    const text = dom.note ? dom.note.value : '';
    state.noteTimer = setTimeout(() => {
      QR.pageData.set(state.currentPage, { note: text });
      listeners.forEach(l => {
        if (typeof l.onNoteChange === 'function') {
          try { l.onNoteChange(state.currentPage, text); } catch (err) { console.error(err); }
        }
      });
    }, 300);
  }

  function handleConfidenceChange(){
    if (!state.currentPage || !dom.confSelect) return;
    const value = dom.confSelect.value || '';
    try {
      if (window.QR && QR.confidence && typeof QR.confidence.set === 'function'){
        QR.confidence.set(`page:${state.currentPage}`, value);
      }
    } catch {}
    try {
      if (window.QR && QR.pageData && typeof QR.pageData.set === 'function'){
        QR.pageData.set(state.currentPage, { confidence: value });
      }
    } catch {}
    listeners.forEach(l => { if (typeof l.onConfidenceChange === 'function') { try { l.onConfidenceChange(state.currentPage, value); } catch (err) { console.error(err); } } });
  }

  function attachEvents(){
    if (dom.startSurah) dom.startSurah.addEventListener('change', () => { populateAyahSelect(dom.startAyah, dom.startSurah.value, null); updateRangeFromInputs(); });
    if (dom.startAyah) dom.startAyah.addEventListener('change', updateRangeFromInputs);
    if (dom.endSurah) dom.endSurah.addEventListener('change', () => { populateAyahSelect(dom.endAyah, dom.endSurah.value, null); updateRangeFromInputs(); });
    if (dom.endAyah) dom.endAyah.addEventListener('change', updateRangeFromInputs);
    if (dom.rangeClear) dom.rangeClear.addEventListener('click', () => { setRange(null, null); });
    if (dom.loopOne) dom.loopOne.addEventListener('change', () => { setLoopOne(dom.loopOne.checked); });
    if (dom.bmToggle) dom.bmToggle.addEventListener('click', handleBookmarkClick);
    if (dom.note) dom.note.addEventListener('input', handleNoteInput);
    if (dom.confSelect) dom.confSelect.addEventListener('change', handleConfidenceChange);

    window.addEventListener('qr:page-data-changed', (ev) => {
      const page = ev && ev.detail && ev.detail.page;
      if (page && Number(page) === state.currentPage) updateBookmarkUI();
    });
    window.addEventListener('qr:confidence-changed', (ev) => {
      const key = ev && ev.detail && ev.detail.key;
      if (!key || !state.currentPage) return;
      if (key === `page:${state.currentPage}`) updateBookmarkUI();
    });
    window.addEventListener('qr:profile-changed', () => {
      const stored = readStoredRange();
      state.rangeStartKey = stored.start || null;
      state.rangeEndKey = stored.end || null;
      state.loopOne = !!stored.loopOne;
      applyRangeToSelectors();
      if (dom.loopOne) dom.loopOne.checked = state.loopOne;
      updateRangeStatus();
      updateBookmarkUI();
    });
  }

  function setup(){
    if (setupDone) return;
    dom.startSurah = document.getElementById('range-start-surah');
    dom.startAyah = document.getElementById('range-start-ayah');
    dom.endSurah = document.getElementById('range-end-surah');
    dom.endAyah = document.getElementById('range-end-ayah');
    dom.loopOne = document.getElementById('loop-one');
    dom.rangeStatus = document.getElementById('range-status');
    dom.rangeClear = document.getElementById('range-clear');
    dom.bmToggle = document.getElementById('bm-toggle');
    dom.bmStatus = document.getElementById('bm-status');
    dom.note = document.getElementById('note-text');
    dom.confSelect = document.getElementById('conf-select');

    populateSurahSelect(dom.startSurah);
    populateSurahSelect(dom.endSurah);
    populateAyahSelect(dom.startAyah, null, null);
    populateAyahSelect(dom.endAyah, null, null);

    // Clear any previously stored range to avoid confusion
    // Users can set a new range if they want
    state.rangeStartKey = null;
    state.rangeEndKey = null;
    state.loopOne = false;
    
    // Clear from storage as well
    try {
      if (window.QR && QR.profiles && QR.profiles.setItem) {
        QR.profiles.setItem(RANGE_KEY, JSON.stringify({ start: '', end: '', loopOne: false }));
      } else {
        localStorage.setItem(RANGE_KEY, JSON.stringify({ start: '', end: '', loopOne: false }));
      }
    } catch {}
    
    applyRangeToSelectors();
    if (dom.loopOne) dom.loopOne.checked = state.loopOne;
    updateRangeStatus();

    attachEvents();
    setupDone = true;
  }

  function init(options){
    setup();
    const entry = {
      onRangeChange: options && typeof options.onRangeChange === 'function' ? options.onRangeChange : null,
      onLoopChange: options && typeof options.onLoopChange === 'function' ? options.onLoopChange : null,
      onBookmarkChange: options && typeof options.onBookmarkChange === 'function' ? options.onBookmarkChange : null,
      onNoteChange: options && typeof options.onNoteChange === 'function' ? options.onNoteChange : null,
      onConfidenceChange: options && typeof options.onConfidenceChange === 'function' ? options.onConfidenceChange : null,
    };
    listeners.push(entry);
    if (entry.onRangeChange) {
      try { entry.onRangeChange(getRange()); } catch (err) { console.error(err); }
    }
    if (entry.onLoopChange) {
      try { entry.onLoopChange(getLoopOne()); } catch (err) { console.error(err); }
    }
    return {
      getRange,
      setRange,
      getLoopOne,
      setLoopOne,
      setCurrentPage,
      refreshPage: updateBookmarkUI,
    };
  }

  QR.controlPanel = {
    init,
    getRange,
    setRange,
    getLoopOne,
    setLoopOne,
    setCurrentPage,
    refresh: updateBookmarkUI,
    state,
  };
})();
