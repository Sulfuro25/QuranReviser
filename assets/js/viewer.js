// viewer.js — unified Reader + Mushaf
// Relies on: QR.prefs, QR.utils, QR.api

(function () {
  // ---------- Elements ----------
  const els = {
    themeToggle: document.getElementById('theme-toggle'),

    status: document.getElementById('status'),

    // Toolbar
    pageInfo: document.getElementById('page-info'),
    prevAyah: document.getElementById('prev-ayah'),
    playPause: document.getElementById('play-pause'),
    nextAyah: document.getElementById('next-ayah'),
    playerInfo: document.getElementById('player-info'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),

    // View toggle
    viewTextBtn: document.getElementById('view-text'),
    viewPageBtn: document.getElementById('view-page'),

    // Text view container
    display: document.getElementById('quran-display'),

    // Page view
    mushafImg: document.getElementById('mushaf-img'),
    mushafCanvas: document.getElementById('mushaf-canvas'),

    // Drawer & backdrop
    drawer: document.getElementById('control-drawer'),
    drawerOpen: document.getElementById('controls-open'),
    drawerClose: document.getElementById('drawer-close'),
    drawerBackdrop: document.getElementById('drawer-backdrop'),

    // Drawer controls
    followToggle: document.getElementById('follow-mode'),
    fontSize: document.getElementById('font-size'),
    trToggle: document.getElementById('tr-toggle'),
    trSize: document.getElementById('tr-size'),
    reciterSelect: document.getElementById('reciter-select'),
    reciterStatus: document.getElementById('reciter-status'),

    // Jumpers
    jumpSurah: document.getElementById('jump-surah'),
    jumpJuz: document.getElementById('jump-juz'),
    jumpHizb: document.getElementById('jump-hizb'),
    jumpGo: document.getElementById('jump-go'),

    // Footer quick-links (we'll retarget them to this viewer)
    toReader: document.getElementById('to-reader'),
    toMushaf: document.getElementById('to-mushaf'),

    // Audio
    audio: document.getElementById('audio'),
    backLink: document.querySelector('.back-link'),
  };

  // ---------- State ----------
  const state = {
    // context: { type: 'surah'|'juz'|'hizb', id: number }
    ctx: null,

    // view: 'text' | 'page'
    view: 'text',

    // data
    verses: [],              // all verses for current context (text view)
    pageNumbers: [],         // sorted unique mushaf pages in this context
    pageIndex: 0,            // index into pageNumbers for text view paging
    pageVerses: [],          // verses for the current page (page view)
    currentPage: 0,          // current mushaf page number (page view)
    audioMap: new Map(),     // verse_key -> url
    translations: new Map(), // verse_key -> translation text (if enabled)
    playIndex: 0,            // index within visible list

    // prefs
    reciterId: 7,
    followMode: false,
    fontPx: 36,
    translationOn: false,
    translationId: 0,
    translationPx: 16,

    // misc
    isLoading: false,
  };

  // Make visible for debugging
  try { window.viewerState = state; } catch {}

  // ---------- Utilities ----------
  function setStatus(txt) { if (els.status) els.status.textContent = txt || ''; }
  function applyFontSize(px) {
    state.fontPx = px;
    document.documentElement.style.setProperty('--arabic-size', px + 'px');
  }
  function applyTranslationFontSize(px) {
    state.translationPx = px;
    document.documentElement.style.setProperty('--translation-size', px + 'px');
  }
  function recomputePageNumbers() {
    const pages = Array.from(new Set((state.verses || []).map(v => v?.page_number).filter(p => typeof p === 'number' && p >= 1 && p <= 604))).sort((a, b) => a - b);
    state.pageNumbers = pages;
    if (state.pageIndex >= pages.length) state.pageIndex = Math.max(0, pages.length - 1);
  }
  function getVisibleVersesTextView() {
    // strict mushaf page grouping
    const pages = state.pageNumbers || [];
    if (!pages.length) return state.verses.slice(0, 20);
    const p = pages[Math.max(0, Math.min(state.pageIndex, pages.length - 1))];
    return (state.verses || []).filter(v => v?.page_number === p);
  }
  function currentPlayableList() {
    if (state.view === 'page') return state.pageVerses || [];
    return getVisibleVersesTextView();
  }
  function updatePageInfoTextView() {
    const pages = state.pageNumbers || [];
    if (!els.pageInfo) return;
    if (pages.length) {
      const localIndex = Math.max(0, Math.min(state.pageIndex, pages.length - 1));
      const currentPageNumber = pages[localIndex];
      els.pageInfo.textContent = `Page ${currentPageNumber} (${localIndex + 1}/${pages.length})`;
    } else {
      els.pageInfo.textContent = `${(state.verses || []).length} ayah`;
    }
  }
  function updatePageInfoPageView() {
    if (!els.pageInfo) return;
    els.pageInfo.textContent = state.currentPage ? `Page ${state.currentPage} / 604` : '—';
  }

  async function ensureTranslationSource() {
    if (!state.translationOn || state.translationId) return;
    try {
      const res = await fetch(`${QR.api.API_BASE}/resources/translations?language=en`);
      const data = await res.json();
      const list = data.translations || [];
      const pick =
        list.find(t => ((t.language||t.language_name||'')+'').toLowerCase().startsWith('en') && /saheeh/i.test((t.name||t.translated_name?.name||'')+'')) ||
        list.find(t => ((t.language||t.language_name||'')+'').toLowerCase().startsWith('en')) ||
        list[0];
      if (pick && pick.id) {
        state.translationId = pick.id;
        QR.prefs.set({ translation_id: pick.id, translation_on: true });
      }
    } catch {}
  }

  function persistPrefsPartial() {
    QR.prefs.set({
      reciter_id: state.reciterId,
      follow_mode_on: !!state.followMode,
      font_px: state.fontPx,
      translation_on: !!state.translationOn,
      translation_id: state.translationId || 0,
      translation_px: state.translationPx
    });
  }

  // ---------- Player ----------
  function updatePlayerInfo() {
    const list = currentPlayableList();
    const total = list.length;
    const current = Math.min(state.playIndex + 1, Math.max(1, total || 1));
    if (els.playerInfo) els.playerInfo.textContent = total ? `Ayah ${current} / ${total}` : 'Not loaded';
    const enabled = !!total && state.audioMap.size > 0;
    [els.prevAyah, els.playPause, els.nextAyah].forEach(btn => { if (btn) btn.disabled = !enabled; });
    if (els.playPause) els.playPause.textContent = (els.audio && !els.audio.paused) ? 'Pause' : 'Play';
  }

  function setAudioForIndex(i, autoplay = false) {
    const list = currentPlayableList();
    if (!list.length) return false;
    state.playIndex = Math.max(0, Math.min(i, list.length - 1));
    const v = list[state.playIndex];
    const url = state.audioMap.get(v.verse_key);
    if (!url) {
      try { els.audio.pause(); } catch {}
      els.audio.removeAttribute('src');
      delete els.audio.dataset.current;
      updatePlayerInfo();
      return false;
    }
    els.audio.src = url;
    els.audio.dataset.current = url;
    if (autoplay) els.audio.play().catch(()=>{});
    updatePlayerInfo();
    return true;
  }

  function highlightAndFollow() {
    if (!state.followMode || state.view !== 'text') return;
    const list = currentPlayableList();
    if (!list.length) return;
    // Determine current verse by audio url
    let currentKey = '';
    try {
      const curUrl = els.audio?.dataset?.current || '';
      if (curUrl) {
        for (const [k, u] of state.audioMap.entries()) { if (u === curUrl) { currentKey = k; break; } }
      }
    } catch {}
    if (!currentKey) currentKey = list[Math.max(0, Math.min(state.playIndex, list.length - 1))]?.verse_key || '';
    if (!currentKey) return;

    try { document.querySelectorAll('.verse.active').forEach(n => n.classList.remove('active')); } catch {}
    const el = document.querySelector(`.verse[data-key="${CSS.escape(currentKey)}"]`);
    if (el) {
      el.classList.add('active');
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    }
  }

  async function nextAyah() {
    const list = currentPlayableList();
    if (state.playIndex < list.length - 1) {
      setAudioForIndex(state.playIndex + 1, true);
      return;
    }
    // end of list: advance page
    if (state.view === 'text') {
      if (state.pageIndex < Math.max(0, state.pageNumbers.length - 1)) {
        state.pageIndex++;
        renderTextView(true);
        setAudioForIndex(0, true);
        window.scrollTo(0,0);
        return;
      }
    } else {
      if (state.currentPage < 604) {
        await loadPageView(state.currentPage + 1);
        setAudioForIndex(0, true);
        return;
      }
    }
    // try next surah in surah context
    if (state.ctx && state.ctx.type === 'surah') {
      const cur = parseInt(state.ctx.id,10)||0;
      if (cur > 0 && cur < 114) {
        await loadContext({ type:'surah', id: cur + 1 }, state.view);
        setAudioForIndex(0, true);
        window.scrollTo(0,0);
        return;
      }
    }
    // stop
    els.audio.pause(); els.audio.currentTime = 0; updatePlayerInfo();
  }

  async function prevAyah() {
    const threshold = 2;
    if (els.audio.currentTime > threshold) { els.audio.currentTime = 0; return; }
    if (state.playIndex > 0) { setAudioForIndex(state.playIndex - 1, true); return; }

    if (state.view === 'text') {
      if (state.pageIndex > 0) {
        state.pageIndex--;
        renderTextView(true);
        const lastIdx = Math.max(0, currentPlayableList().length - 1);
        state.playIndex = lastIdx;
        setAudioForIndex(lastIdx, true);
        window.scrollTo(0,0);
        return;
      }
    } else {
      if (state.currentPage > 1) {
        await loadPageView(state.currentPage - 1);
        const lastIdx = Math.max(0, currentPlayableList().length - 1);
        state.playIndex = lastIdx;
        setAudioForIndex(lastIdx, true);
        return;
      }
    }

    if (state.ctx && state.ctx.type === 'surah') {
      const cur = parseInt(state.ctx.id,10)||0;
      if (cur > 1) {
        await loadContext({ type:'surah', id: cur - 1 }, state.view);
        // jump to last page/ayah
        if (state.view === 'text') {
          state.pageIndex = Math.max(0, state.pageNumbers.length - 1);
          renderTextView(true);
        } else {
          // derive last page in the new surah
          const lastPage = Math.max(...(state.pageNumbers || [state.currentPage||1]));
          await loadPageView(lastPage);
        }
        const lastIdx = Math.max(0, currentPlayableList().length - 1);
        state.playIndex = lastIdx;
        setAudioForIndex(lastIdx, true);
        window.scrollTo(0,0);
        return;
      }
    }
    els.audio.currentTime = 0;
  }

  function togglePlay() {
    if (!setAudioForIndex(state.playIndex, true)) return;
    if (els.audio.paused) els.audio.play().catch(()=>{}); else els.audio.pause();
    updatePlayerInfo();
  }

  // ---------- Rendering (TEXT VIEW) ----------
  function renderTextView(skipScroll) {
    const verses = getVisibleVersesTextView();
    const frag = document.createDocumentFragment();

    verses.forEach(v => {
      const card = document.createElement('article');
      card.className = 'verse';
      card.setAttribute('data-key', v.verse_key);

      const head = document.createElement('div');
      head.className = 'verse-header';
      const meta = document.createElement('div');
      meta.className = 'ayah-meta';
      meta.textContent = v.verse_key;
      const actions = document.createElement('div');
      actions.className = 'verse-actions';
      const copyBtn = document.createElement('button');
      copyBtn.className = 'icon-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(v.text_uthmani || '');
        } catch {}
      });
      actions.appendChild(copyBtn);
      head.appendChild(meta);
      head.appendChild(actions);
      card.appendChild(head);

      const arabic = document.createElement('div');
      arabic.className = 'arabic';
      arabic.textContent = v.text_uthmani || '';
      card.appendChild(arabic);

      if (state.translationOn && state.translations.has(v.verse_key)) {
        const tr = document.createElement('div');
        tr.className = 'translation';
        tr.innerHTML = state.translations.get(v.verse_key) || '';
        card.appendChild(tr);
      }

      frag.appendChild(card);
    });

    if (els.display) {
      els.display.hidden = false;
      els.display.replaceChildren(frag);
    }
    // hide page view
    if (els.mushafImg) els.mushafImg.style.display = 'none';
    if (els.mushafCanvas) els.mushafCanvas.style.display = 'none';

    updatePageInfoTextView();
    state.playIndex = 0;
    updatePlayerInfo();
    if (!skipScroll) try { window.scrollTo(0, 0); } catch {}
    if (state.followMode) highlightAndFollow();
  }

  // ---------- Rendering (PAGE VIEW) ----------
  function adjustImageFit() {
    try {
      const header = document.querySelector('.app-header');
      const toolbar = document.querySelector('.toolbar');
      const extra = 40;
      const avail = Math.max(300, window.innerHeight - ((header?.offsetHeight)||0) - ((toolbar?.offsetHeight)||0) - extra);
      if (els.mushafImg) els.mushafImg.style.maxHeight = avail + 'px';
      if (els.mushafCanvas) els.mushafCanvas.style.maxHeight = avail + 'px';
    } catch {}
  }

  function loadPageImage(pageNumber) {
    const providers = [{ base:'../assets/img/mushaf_pages/', exts:['png'], padded:true }];
    const candidates = [];
    providers.forEach(pr => {
      const pstr = pr.padded ? String(pageNumber).padStart(3,'0') : String(pageNumber);
      (pr.exts?.length ? pr.exts : ['png']).forEach(ext => candidates.push(`${pr.base}${pstr}.${ext}`));
    });
    let idx = 0;
    const tryNext = () => {
      if (idx >= candidates.length) {
        if (els.mushafImg) { els.mushafImg.removeAttribute('src'); els.mushafImg.style.display='none'; }
        setStatus('Page image unavailable.');
        return;
      }
      const url = candidates[idx++];
      if (!els.mushafImg) return;
      els.mushafImg.onerror = () => tryNext();
      els.mushafImg.onload = () => { els.mushafImg.style.display='inline-block'; setStatus(''); adjustImageFit(); };
      els.mushafImg.src = url;
    };
    tryNext();
  }

  async function loadPageView(pageNumber) {
    setStatus('Loading page…');
    state.currentPage = pageNumber;
    // Fetch verses for the page
    state.pageVerses = await QR.api.fetchVersesByPage(pageNumber, 'text_uthmani,page_number');
    // Build or extend audio map (just in case)
    const surahSet = new Set();
    state.pageVerses.forEach(v => {
      const sid = parseInt(String(v.verse_key).split(':')[0],10);
      if (sid) surahSet.add(sid);
    });
    const tasks = Array.from(surahSet).map(sid => QR.api.fetchAudioMap(state.reciterId, sid).catch(()=>new Map()));
    const results = await Promise.all(tasks);
    results.forEach(m => m.forEach((url, key) => state.audioMap.set(key, url)));

    // Show page view, hide text view
    if (els.display) els.display.hidden = true;
    loadPageImage(pageNumber);
    updatePageInfoPageView();
    state.playIndex = 0;
    setAudioForIndex(0, false);
    setStatus('');
  }

  // ---------- Data loading by context ----------
  async function buildAudioForVerses(verses) {
    const surahSet = new Set();
    (verses || []).forEach(v => {
      const sid = parseInt(String(v.verse_key).split(':')[0], 10);
      if (sid) surahSet.add(sid);
    });
    const tasks = Array.from(surahSet).map(sid => QR.api.fetchAudioMap(state.reciterId, sid).catch(()=>new Map()));
    const results = await Promise.all(tasks);
    const merged = new Map();
    results.forEach(m => m.forEach((url, key) => merged.set(key, url)));
    return merged;
  }

  function extractTranslationMapFromVerses(verses) {
    const map = new Map();
    (verses || []).forEach(v => {
      const arr = v.translations || v.translation || [];
      if (Array.isArray(arr) && arr.length) {
        const txt = (arr[0] && (arr[0].text || arr[0].translation_text || '')) || '';
        if (txt) map.set(v.verse_key, txt);
      }
    });
    return map;
  }

  async function loadContext(ctx, viewKeep) {
    state.ctx = ctx;
    state.view = viewKeep || state.view || 'text';
    try {
      if (state.isLoading) return;
      state.isLoading = true;
      setStatus('Loading…');
      try { els.audio.pause(); els.audio.currentTime = 0; els.audio.removeAttribute('src'); delete els.audio.dataset.current; } catch {}

      // ensure translation source if needed
      await ensureTranslationSource();

      // Build base fetch
      const withTr = state.translationOn && !!state.translationId;
      let verses = [];
      if (ctx.type === 'surah') {
        const url = `${QR.api.API_BASE}/verses/by_chapter/${ctx.id}?words=false&fields=text_uthmani,page_number&per_page=300${withTr?`&translations=${state.translationId}`:''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Verses HTTP ${res.status}`);
        const data = await res.json();
        verses = data.verses || [];
      } else if (ctx.type === 'juz') {
        verses = await QR.api.fetchVersesByRange('juz', ctx.id, 'text_uthmani,page_number', 300);
        if (withTr) {
          // translations come later (per-chapter pull)
        }
      } else { // hizb
        verses = await QR.api.fetchVersesByRange('hizb', ctx.id, 'text_uthmani,page_number', 300);
      }

      // translations map
      let trMap = new Map();
      if (withTr) {
        // For performance, if the API didn’t inline translations (juz/hizb), fetch per chapter
        const sset = new Set();
        verses.forEach(v => {
          const sid = parseInt(String(v.verse_key).split(':')[0],10);
          if (sid) sset.add(sid);
        });
        const pulls = Array.from(sset).map(async sid => {
          try {
            const r = await fetch(`${QR.api.API_BASE}/quran/translations/${state.translationId}?chapter_number=${sid}`);
            const j = await r.json();
            (j.translations||[]).forEach(t => trMap.set(t.verse_key, t.text));
          } catch {}
        });
        await Promise.all(pulls);
        // If translations were already present inside verses (surah case), extract them too
        if (!trMap.size) trMap = extractTranslationMapFromVerses(verses);
      }

      // audio map across involved chapters
      const audioMap = await buildAudioForVerses(verses);

      // commit
      state.verses = verses;
      state.audioMap = audioMap;
      state.translations = trMap;
      state.pageIndex = 0;
      recomputePageNumbers();
      state.playIndex = 0;

      // render according to current view
      if (state.view === 'page') {
        const page = state.pageNumbers[0] || 1;
        await loadPageView(page);
      } else {
        renderTextView();
      }

      setStatus(`Loaded ${ctx.type} ${ctx.id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to load data: ' + e.message);
      setStatus('Failed to load.');
    } finally {
      state.isLoading = false;
    }
  }

  // ---------- View switching ----------
  async function switchView(target) {
    if (state.view === target) return;
    state.view = target;

    // update buttons aria + URL
    if (els.viewTextBtn) els.viewTextBtn.setAttribute('aria-pressed', String(target === 'text'));
    if (els.viewPageBtn) els.viewPageBtn.setAttribute('aria-pressed', String(target === 'page'));
    try {
      const usp = new URLSearchParams(location.search);
      usp.set('view', target);
      history.replaceState(null, '', `${location.pathname}?${usp.toString()}`);
    } catch {}

    if (target === 'page') {
      // choose current page based on text view selection
      const pages = state.pageNumbers || [];
      const page = pages[Math.max(0, Math.min(state.pageIndex, Math.max(0, pages.length - 1)))] || state.currentPage || 1;
      await loadPageView(page);
    } else {
      renderTextView();
    }
  }

  // ---------- Reciter / prefs ----------
  async function loadRecitersIntoSelect() {
    const sel = els.reciterSelect;
    if (!sel) return;
    try {
      if (els.reciterStatus) els.reciterStatus.textContent = 'Loading reciters…';
      const res = await fetch(`${QR.api.API_BASE}/resources/recitations?language=en`);
      const data = await res.json();
      const reciters = (data.recitations || []).map(r => ({ id: r.id, name: r.reciter_name || (r.translated_name?.name) || r.name || ('Reciter ' + r.id) }));
      sel.replaceChildren(...reciters.map(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = `${r.name}`; return o; }));
      sel.value = String(state.reciterId);
      if (els.reciterStatus) els.reciterStatus.textContent = '';
    } catch {
      if (els.reciterStatus) els.reciterStatus.textContent = 'Failed to load reciters. Using current.';
      // leave as-is
    }
  }

  async function rebuildAudioForCurrent() {
    try {
      setStatus('Loading audio…');
      if (state.view === 'page' && state.currentPage) {
        await loadPageView(state.currentPage);
      } else {
        state.audioMap = await buildAudioForVerses(state.verses);
        updatePlayerInfo();
        setStatus('');
      }
    } catch (e) {
      console.error(e);
      setStatus('Failed to refresh audio.');
    }
  }

  // ---------- Drawer ----------
  function openDrawer() {
    const d = els.drawer; if (!d) return;
    document.body.classList.add('drawer-open');
    d.removeAttribute('aria-hidden');
    if (els.drawerBackdrop) els.drawerBackdrop.hidden = false;
    try { d.focus(); } catch {}
  }
  function closeDrawer() {
    const d = els.drawer; if (!d) return;
    document.body.classList.remove('drawer-open');
    d.setAttribute('aria-hidden','true');
    if (els.drawerBackdrop) els.drawerBackdrop.hidden = true;
  }

  // ---------- Init & wiring ----------
  document.addEventListener('DOMContentLoaded', async () => {
    // Theme + prefs
    QR.prefs.ensureTheme();
    try {
      const p = QR.prefs.read();
      state.reciterId = (typeof p.reciter_id === 'number' && p.reciter_id > 0) ? p.reciter_id : 7;
      state.followMode = !!p.follow_mode_on;
      applyFontSize(typeof p.font_px === 'number' ? p.font_px : 36);
      state.translationOn = !!p.translation_on;
      state.translationId = (typeof p.translation_id === 'number' && p.translation_id > 0) ? p.translation_id : 0;
      applyTranslationFontSize(typeof p.translation_px === 'number' ? p.translation_px : 16);
    } catch {}

    // Back link should go back to proper list tab
    try {
      const qp = new URLSearchParams(location.search);
      const modeParam = (qp.get('mode') || '').toLowerCase() || 'surahs';
      if (els.backLink) {
        const backUrl = `surahs.html?mode=${encodeURIComponent(modeParam)}`;
        els.backLink.setAttribute('href', backUrl);
      }
    } catch {}

    // Theme toggle
    if (els.themeToggle) {
      els.themeToggle.textContent = (document.body.getAttribute('data-theme') === 'light') ? 'Dark' : 'Light';
      els.themeToggle.addEventListener('click', () => {
        const current = document.body.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        els.themeToggle.textContent = next === 'dark' ? 'Light' : 'Dark';
        QR.prefs.set({ theme: next });
      });
    }

    // Drawer wiring
    if (els.drawerOpen) els.drawerOpen.addEventListener('click', openDrawer);
    if (els.drawerClose) els.drawerClose.addEventListener('click', closeDrawer);
    if (els.drawerBackdrop) els.drawerBackdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeDrawer(); });

    // Follow + font + translation toggles
    if (els.followToggle) {
      els.followToggle.checked = !!state.followMode;
      els.followToggle.addEventListener('change', () => {
        state.followMode = !!els.followToggle.checked;
        persistPrefsPartial();
        highlightAndFollow();
      });
    }
    if (els.fontSize) {
      els.fontSize.value = String(state.fontPx);
      els.fontSize.addEventListener('input', () => {
        applyFontSize(parseInt(els.fontSize.value,10)||36);
        persistPrefsPartial();
      });
    }
    if (els.trToggle) {
      els.trToggle.checked = !!state.translationOn;
      els.trToggle.addEventListener('change', async () => {
        state.translationOn = !!els.trToggle.checked;
        if (state.translationOn && !state.translationId) await ensureTranslationSource();
        persistPrefsPartial();
        // rerender if text view
        if (state.view === 'text') renderTextView(true);
      });
    }
    if (els.trSize) {
      els.trSize.value = String(state.translationPx);
      els.trSize.addEventListener('input', () => {
        applyTranslationFontSize(parseInt(els.trSize.value,10)||16);
        persistPrefsPartial();
        if (state.view === 'text') renderTextView(true);
      });
    }

    // Reciters
    await loadRecitersIntoSelect();
    if (els.reciterSelect) {
      els.reciterSelect.value = String(state.reciterId);
      els.reciterSelect.addEventListener('change', async (e) => {
        state.reciterId = parseInt(e.target.value,10)||7;
        persistPrefsPartial();
        await rebuildAudioForCurrent();
      });
    }

    // Player
    if (els.prevAyah) els.prevAyah.addEventListener('click', () => { if (!state.isLoading) prevAyah(); });
    if (els.playPause) els.playPause.addEventListener('click', () => { if (!state.isLoading) togglePlay(); });
    if (els.nextAyah) els.nextAyah.addEventListener('click', () => { if (!state.isLoading) nextAyah(); });
    if (els.audio) {
      els.audio.addEventListener('ended', () => { if (!state.isLoading) nextAyah(); });
      ['play','playing','timeupdate','seeked','loadedmetadata'].forEach(evt => {
        els.audio.addEventListener(evt, () => { if (state.followMode) try { highlightAndFollow(); } catch {} });
      });
    }
    if (els.prevPage) els.prevPage.addEventListener('click', async () => {
      if (state.view === 'page') {
        if (state.currentPage > 1) await loadPageView(state.currentPage - 1);
      } else {
        if (state.pageIndex > 0) { state.pageIndex--; renderTextView(); }
      }
    });
    if (els.nextPage) els.nextPage.addEventListener('click', async () => {
      if (state.view === 'page') {
        if (state.currentPage < 604) await loadPageView(state.currentPage + 1);
      } else {
        if (state.pageIndex < Math.max(0, state.pageNumbers.length - 1)) { state.pageIndex++; renderTextView(); }
      }
    });

    // Jumpers
    if (els.jumpGo) els.jumpGo.addEventListener('click', async () => {
      const s = parseInt(els.jumpSurah?.value||'',10);
      const j = parseInt(els.jumpJuz?.value||'',10);
      const h = parseInt(els.jumpHizb?.value||'',10);
      if (!Number.isNaN(s) && s >= 1 && s <= 114) await loadContext({type:'surah', id:s}, state.view);
      else if (!Number.isNaN(j) && j >= 1 && j <= 30) await loadContext({type:'juz', id:j}, state.view);
      else if (!Number.isNaN(h) && h >= 1 && h <= 60) await loadContext({type:'hizb', id:h}, state.view);
      closeDrawer();
    });

    // View toggle buttons
    if (els.viewTextBtn) els.viewTextBtn.addEventListener('click', () => switchView('text'));
    if (els.viewPageBtn) els.viewPageBtn.addEventListener('click', () => switchView('page'));

    // Footer links: retarget to same viewer for convenience
    const setFooterLinks = () => {
      const usp = new URLSearchParams(location.search);
      if (state.ctx) usp.set(state.ctx.type, state.ctx.id);
      usp.set('controls', 'open');
      const base = 'viewer.html';
      if (els.toReader) els.toReader.href = `${base}?${new URLSearchParams({...Object.fromEntries(usp), view:'text'})}`;
      if (els.toMushaf) els.toMushaf.href = `${base}?${new URLSearchParams({...Object.fromEntries(usp), view:'page'})}`;
    };

    // Initial route
    try {
      const qp = new URLSearchParams(location.search);
      const s = parseInt(qp.get('surah')||'',10);
      const j = parseInt(qp.get('juz')||'',10);
      const h = parseInt(qp.get('hizb')||'',10);
      const viewParam = (qp.get('view')||'text').toLowerCase();
      state.view = (viewParam === 'page') ? 'page' : 'text';
      if (!Number.isNaN(j) && j >= 1 && j <= 30) await loadContext({type:'juz', id:j}, state.view);
      else if (!Number.isNaN(h) && h >= 1 && h <= 60) await loadContext({type:'hizb', id:h}, state.view);
      else if (!Number.isNaN(s) && s >= 1 && s <= 114) await loadContext({type:'surah', id:s}, state.view);
      else {
        // If no context, send to list
        location.replace('surahs.html');
        return;
      }
    } catch (e) { console.error(e); }

    setFooterLinks();

    // Auto-open drawer if requested
    try {
      const qp = new URLSearchParams(location.search);
      const want = (qp.get('controls') || qp.get('drawer') || '').toLowerCase();
      if (want === 'open' || want === '1' || want === 'true') openDrawer();
    } catch {}

    // Resize handler for page view
    window.addEventListener('resize', () => {
      if (state.view === 'page') adjustImageFit();
    });
  });
})();
