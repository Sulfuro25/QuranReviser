// tajwid.js — Tajwīd Colors Guide
(function(){
  const API_BASE = (window.QR && QR.api && QR.api.API_BASE) || 'https://api.quran.com/api/v4';
  const els = {
    rules: document.getElementById('rules'),
    audio: document.getElementById('audio'),
  };

  // Search space for examples: Juz 30 (78–114)
  const SHORT_SURAHS = [
    78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114
  ];

  const RULES = [
    { key:'ikhfa', name:"Ikhfā’", desc:"ن or tanwīn partially concealed before specific letters, with nasalization.", classes:['ikhf'] },
    { key:'idgham_ghn', name:"Idghām (with ghunnah)", desc:"Assimilation with nasalization into ي ن م و.", classes:['idgh_ghn'] },
    { key:'idgham_no_ghn', name:"Idghām (without ghunnah)", desc:"Assimilation into ل or ر, no nasalization.", classes:['idgh_w_ghn'] },
    { key:'idgham_shafawi', name:"Idghām Shafawī", desc:"Labial assimilation with م before ب or م.", classes:['idghm_shfw'] },
    { key:'iqlab', name:"Iqlāb", desc:"ن or tanwīn becomes م before ب, with ghunnah.", classes:['iqlb'] },
    { key:'izhar', name:"Iẓhār", desc:"Clear pronunciation of ن/tanwīn before throat letters (ء ه ع ح غ خ).", classes:['izhar'] },
    { key:'qalqalah', name:"Qalqalah", desc:"Echoing sound on ق ط ب ج د.", classes:['qlq'] },
    { key:'madd', name:"Madd (all types)", desc:"Prolongation of vowels.", classes:['madda_normal','madda_permissible','madda_necessary','madda_obligatory'] },
    { key:'ghunnah', name:"Ghunnah", desc:"Nasal sound, strongest on نّ / مّ.", classes:['ghn'] },
    { key:'lam_shams', name:"Lām Shamsiyyah", desc:"The ل of “الـ” assimilated into next sun letter.", classes:['laam_shamsiyah','laa_shamsiyah'] },
    { key:'silent_wasl', name:"Silent / Hamzat-Wasl", desc:"Helper marks, not full tajwīd rules.", classes:['ham_wasl','slnt'] },
  ];

  // Pinned examples provided by user; use these first, then fallback to Juz 30 scan
  // Format: verse_key strings
  const PINNED = new Map(Object.entries({
    ikhfa: ['2:3','2:61'],
    idgham_ghn: ['2:7','4:146'],
    idgham_no_ghn: ['2:6','4:46'],
    idgham_shafawi: ['2:2','2:267'],
    iqlab: ['2:19','3:183'],
    izhar: ['2:5','6:1'],
    qalqalah: ['2:7','2:24'],
    ghunnah: ['1:7','2:2'],
  }));

  const state = {
    reciterId: 7,
    versesBySurah: new Map(), // surah -> verses with tajweed markup
    audioMaps: new Map(), // surah -> Map(verse_key -> url)
    playingKey: '',
    playingBtn: null,
    examples: new Map(), // rule.key -> [ {verse, classHit} ]
  };

  // Map API tajweed class names to our CSS class names
  const CLASS_MAP = {
    // Ghunnah
    'ghunnah': 'ghn',
    // Idgham variants
    'idgham_with_ghunnah': 'idgh_ghn',
    'idgham_ghunnah': 'idgh_ghn',
    'idgham_wo_ghunnah': 'idgh_w_ghn',
    'idgham_without_ghunnah': 'idgh_w_ghn',
    'idgham_shafawi': 'idghm_shfw',
    'idgham_mutajanisain': 'idgh_mus',
    'idgham_mutajanisayn': 'idgh_mus',
    // Ikhfa variants
    'ikhfa': 'ikhf',
    'ikhafa': 'ikhf',
    'ikhfaa': 'ikhf',
    'ikhfa_shafawi': 'ikhf_shfw',
    // Iqlab
    'iqlab': 'iqlb',
    // Qalqalah variants
    'qalqalah': 'qlq',
    'qalaqah': 'qlq',
    // Lam shamsiya
    'lam_shamsiya': 'laam_shamsiyah',
    'laam_shamsiya': 'laam_shamsiyah',
    'laam_shamsiyah': 'laam_shamsiyah',
    'laa_shamsiyah': 'laa_shamsiyah',
    // Madda and helpers keep same names
    'madda_normal': 'madda_normal',
    'madda_permissible': 'madda_permissible',
    'madda_necessary': 'madda_necessary',
    'madda_obligatory': 'madda_obligatory',
    'ham_wasl': 'ham_wasl',
    'slnt': 'slnt',
  };

  function normalizeClass(cls){ return CLASS_MAP[cls] || cls; }

  function applyTheme(theme){
    try {
      if (!theme) return;
      document.body.setAttribute('data-theme', theme);
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.textContent = (theme === 'light') ? 'Dark' : 'Light';
    } catch {}
  }

  function persistTheme(theme){
    try {
      if (window.QR && QR.prefs) QR.prefs.set({ theme });
      else {
        const prefs = JSON.parse(localStorage.getItem('qr_prefs')||'{}');
        prefs.theme = theme; localStorage.setItem('qr_prefs', JSON.stringify(prefs));
      }
    } catch {}
  }

  function loadPrefs(){
    try {
      const prefs = (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem('qr_prefs')||'{}');
      if (prefs && prefs.theme) applyTheme(prefs.theme);
      if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) state.reciterId = prefs.reciter_id;
    } catch {}
  }

  async function fetchSurahTajweed(ch){
    try {
      if (state.versesBySurah.has(ch)) return state.versesBySurah.get(ch);
      const url = `${API_BASE}/quran/verses/uthmani_tajweed?chapter_number=${ch}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      const verses = data.verses || [];
      state.versesBySurah.set(ch, verses);
      return verses;
    } catch(e){ console.warn('fetchSurahTajweed failed', ch, e); return []; }
  }

  async function ensureAudioMap(ch){
    if (state.audioMaps.has(ch)) return state.audioMaps.get(ch);
    try {
      if (window.QR && QR.api && typeof QR.api.fetchAudioMap === 'function'){
        const m = await QR.api.fetchAudioMap(state.reciterId, ch);
        state.audioMaps.set(ch, m);
        return m;
      }
    } catch(e){ console.warn('audio map failed', ch, e); }
    const m = new Map(); state.audioMaps.set(ch, m); return m;
  }

  function readTajweedColor(cls){
    try {
      const span = document.createElement('tajweed');
      span.className = cls;
      span.textContent = '■';
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      document.body.appendChild(span);
      const color = getComputedStyle(span).color;
      document.body.removeChild(span);
      return color || 'currentColor';
    } catch { return 'currentColor'; }
  }

  // No legend — color symbol will appear in each card title

  function filterTajweedHtmlByRule(html, classes){
    try {
      if (!html) return '';
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      const nodes = tmp.querySelectorAll('tajweed');
      let kept = 0;
      nodes.forEach(n => {
        const cls = (n.getAttribute('class')||'').split(/\s+/).map(normalizeClass);
        const has = classes.some(c => cls.includes(c));
        // normalize classes to our CSS so colors apply
        n.setAttribute('class', cls.join(' ').trim());
        if (!has){
          // unwrap: replace <tajweed> with its inner HTML but without tajweed tag
          const span = document.createElement('span');
          span.innerHTML = n.innerHTML;
          n.replaceWith(span);
        } else { kept++; }
      });
      if (kept === 0){
        // No matching segments; still normalize classes so colors show if available
        tmp.querySelectorAll('tajweed').forEach(n=>{
          const cls = (n.getAttribute('class')||'').split(/\s+/).map(normalizeClass);
          n.setAttribute('class', cls.join(' ').trim());
        });
      }
      return tmp.innerHTML;
    } catch { return html; }
  }

  function htmlForVerse(v, rule){
    const div = document.createElement('div');
    const ar = document.createElement('div'); ar.className='arabic'; ar.setAttribute('dir','rtl'); ar.setAttribute('lang','ar');
    // Prefer tajweed-marked text then filter to only keep the rule's coloring
    if (v.text_uthmani_tajweed) ar.innerHTML = filterTajweedHtmlByRule(v.text_uthmani_tajweed, rule.classes || []);
    else ar.textContent = v.text_uthmani || '';
    const meta = document.createElement('div'); meta.className='ayah-meta'; meta.textContent = String(v.verse_key||'');
    div.appendChild(ar); div.appendChild(meta); return div;
  }

  function verseHasClass(v, classes){
    try {
      const html = String(v.text_uthmani_tajweed || ''); if (!html) return false;
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      const nodes = tmp.querySelectorAll('tajweed');
      for (const n of nodes){
        const cls = (n.getAttribute('class')||'').split(/\s+/).map(normalizeClass);
        for (const want of classes){ if (cls.includes(want)) return true; }
      }
      return false;
    } catch { return false; }
  }

  async function collectExamples(){
    // Prefer short surahs (Juz 30) first
    const needChapters = new Set(SHORT_SURAHS);
    // Also prepare pinned chapters if we need fallback
    for (const arr of PINNED.values()){
      (arr||[]).forEach(key=>{ const sid = parseInt(String(key).split(':')[0],10); if (!Number.isNaN(sid)) needChapters.add(sid); });
    }

    const cache = new Map();
    for (const ch of needChapters){ cache.set(ch, await fetchSurahTajweed(ch)); }

    // 1) Scan Juz 30 to fill examples
    for (const rule of RULES){
      const list = [];
      for (const ch of SHORT_SURAHS){
        const verses = cache.get(ch) || [];
        for (const v of verses){
          if (list.length>=2) break;
          if (verseHasClass(v, rule.classes)) list.push({ verse: v, chapter: ch });
        }
        if (list.length>=2) break;
      }
      state.examples.set(rule.key, list);
    }

    // 2) If any rule still lacks examples, use pinned references
    for (const rule of RULES){
      const list = state.examples.get(rule.key) || [];
      if (list.length>=2) continue;
      const pinned = PINNED.get(rule.key) || [];
      for (const key of pinned){
        if (list.length>=2) break;
        const parts = String(key).split(':'); const ch = parseInt(parts[0],10); const vno = String(key);
        const verses = cache.get(ch) || [];
        const v = verses.find(x=> String(x.verse_key)===vno);
        if (v && verseHasClass(v, rule.classes)) list.push({ verse: v, chapter: ch });
      }
      state.examples.set(rule.key, list);
    }
  }

  async function playVerse(v, ch, btn){
    try { if (!els.audio) return; } catch { return; }
    try {
      // Stop any current
      if (state.playingKey && state.playingKey !== v.verse_key) {
        try { els.audio.pause(); } catch {}
        try { if (state.playingBtn) state.playingBtn.textContent = 'Play'; } catch {}
      }
      const map = await ensureAudioMap(ch);
      const url = map.get(String(v.verse_key));
      if (!url){ if (btn) { btn.disabled = true; btn.textContent = 'No Audio'; } return; }
      if (els.audio.src === url && !els.audio.paused){ els.audio.pause(); if (btn) btn.textContent = 'Play'; state.playingKey=''; state.playingBtn=null; return; }
      els.audio.src = url; state.playingKey = String(v.verse_key); state.playingBtn = btn || null;
      await els.audio.play(); if (btn) btn.textContent = 'Pause';
      els.audio.onended = ()=>{ try { if (state.playingBtn) state.playingBtn.textContent = 'Play'; state.playingKey=''; state.playingBtn=null; } catch {} };
    } catch {}
  }

  function renderRules(){
    const root = els.rules; if (!root) return; root.innerHTML = '';
    RULES.forEach(rule => {
      const card = document.createElement('div'); card.className = 'card';
      const h = document.createElement('h3'); h.style.marginTop='0';
      // Prepend colored dot based on the first class for this rule
      const color = readTajweedColor(rule.classes[0]);
      const dot = document.createElement('span'); dot.style.display='inline-block'; dot.style.width='12px'; dot.style.height='12px'; dot.style.borderRadius='999px'; dot.style.border='1px solid var(--border)'; dot.style.background=color; dot.style.marginRight='8px';
      h.appendChild(dot); h.appendChild(document.createTextNode(rule.name));
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = rule.desc;
      card.appendChild(h); card.appendChild(p);
      const list = state.examples.get(rule.key) || [];
      if (!list.length){
        const div = document.createElement('div'); div.className='muted'; div.textContent = 'No example found.'; card.appendChild(div);
      } else {
        list.slice(0,2).forEach(item => {
          const wrap = document.createElement('div'); wrap.className='verse';
          const block = htmlForVerse(item.verse, rule); wrap.appendChild(block);
          const actions = document.createElement('div'); actions.className='verse-actions';
          const btn = document.createElement('button'); btn.className='icon-btn'; btn.textContent='Play';
          btn.addEventListener('click', ()=> playVerse(item.verse, item.chapter, btn)); actions.appendChild(btn);
          wrap.appendChild(actions);
          card.appendChild(wrap);
        });
      }
      root.appendChild(card);
    });
  }

  async function init(){
    loadPrefs();
    try {
      const btn = document.getElementById('theme-toggle');
      if (btn) btn.addEventListener('click', ()=>{
        const cur = document.body.getAttribute('data-theme') || 'dark';
        const next = (cur === 'light') ? 'dark' : 'light';
        applyTheme(next); persistTheme(next);
      });
    } catch {}
    await collectExamples();
    renderRules();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
