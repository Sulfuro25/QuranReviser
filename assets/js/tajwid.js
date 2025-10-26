// tajwid.js — Comprehensive Tajwīd Rules Guide
(function(){
  const API_BASE = (window.QR && QR.api && QR.api.API_BASE) || 'https://api.quran.com/api/v4';
  const els = {
    container: document.getElementById('rules-container'),
    audio: document.getElementById('audio'),
    search: document.getElementById('rule-search'),
  };

  // Comprehensive Tajwid Rules organized by category
  const RULES = [
    // ===== NOON SAAKIN & TANWEEN RULES =====
    {
      key: 'izhar',
      category: 'noon',
      name: "Iẓhār (إظهار)",
      nameAr: "الإظهار",
      desc: "Clear pronunciation of ن or tanween before throat letters (ء هـ ع ح غ خ).",
      duration: "No prolongation",
      classes: ['izhar'],
      importance: 'high'
    },
    {
      key: 'idgham_ghn',
      category: 'noon',
      name: "Idghām with Ghunnah (إدغام بغنة)",
      nameAr: "الإدغام بغنة",
      desc: "Assimilation of ن/tanween into ي ن م و with nasalization (2 counts)",
      duration: "2 counts of ghunnah",
      classes: ['idgh_ghn', 'idgham_ghunnah'],
      importance: 'high'
    },
    {
      key: 'idgham_no_ghn',
      category: 'noon',
      name: "Idghām without Ghunnah (إدغام بلا غنة)",
      nameAr: "الإدغام بلا غنة",
      desc: "Complete assimilation into ل or ر without nasalization",
      duration: "No ghunnah",
      classes: ['idgh_w_ghn', 'idgham_without_ghunnah'],
      importance: 'high'
    },
    {
      key: 'iqlab',
      category: 'noon',
      name: "Iqlāb (إقلاب)",
      nameAr: "الإقلاب",
      desc: "Convert ن or tanween into م before ب, pronounced with ghunnah (2 counts).",
      duration: "2 counts of ghunnah",
      classes: ['iqlb'],
      importance: 'high'
    },
    {
      key: 'ikhfa',
      category: 'noon',
      name: "Ikhfā' (إخفاء)",
      nameAr: "الإخفاء",
      desc: "Partial concealment of ن/tanween with ghunnah before 15 letters: ت ث ج د ذ ز س ش ص ض ط ظ ف ق ك",
      duration: "2 counts of ghunnah",
      classes: ['ikhf', 'ikhfa', 'ikhfaa'],
      importance: 'high'
    },

    // ===== MEEM SAAKIN RULES =====
    {
      key: 'idgham_shafawi',
      category: 'meem',
      name: "Idghām Shafawī (إدغام شفوي)",
      nameAr: "الإدغام الشفوي",
      desc: "Labial assimilation: م merges into another م with ghunnah (2 counts)",
      duration: "2 counts of ghunnah",
      classes: ['idghm_shfw', 'idgham_shafawi'],
      importance: 'high'
    },
    {
      key: 'ikhfa_shafawi',
      category: 'meem',
      name: "Ikhfā' Shafawī (إخفاء شفوي)",
      nameAr: "الإخفاء الشفوي",
      desc: "م saakin concealed before ب with ghunnah (2 counts), lips slightly closed",
      duration: "2 counts of ghunnah",
      classes: ['ikhf_shfw', 'ikhfa_shafawi'],
      importance: 'high'
    },
    {
      key: 'izhar_shafawi',
      category: 'meem',
      name: "Iẓhār Shafawī (إظهار شفوي)",
      nameAr: "الإظهار الشفوي",
      desc: "Clear pronunciation of م saakin before all letters except م and ب",
      duration: "No prolongation",
      classes: ['izhar_shafawi', 'ham_wasl'],  // Ham wasl often has clear meem
      importance: 'medium'
    },

    // ===== MADD (PROLONGATION) RULES =====
    {
      key: 'madd_tabee',
      category: 'madd',
      name: "Madd Ṭabī'ī (مد طبيعي)",
      nameAr: "المد الطبيعي",
      desc: "Natural prolongation of ا و ي when preceded by matching vowel (2 counts)",
      duration: "2 counts",
      classes: ['madda_normal'],
      importance: 'high'
    },
    {
      key: 'madd_munfasil',
      category: 'madd',
      name: "Madd Munfaṣil (مد منفصل)",
      nameAr: "المد المنفصل",
      desc: "Permissible prolongation when madd letter ends a word and hamzah starts next word",
      duration: "2, 4, or 5 counts (permissible)",
      classes: ['madda_permissible'],
      importance: 'high'
    },
    {
      key: 'madd_muttasil',
      category: 'madd',
      name: "Madd Muttaṣil (مد متصل)",
      nameAr: "المد المتصل",
      desc: "Obligatory prolongation when madd letter followed by hamzah in same word",
      duration: "4, 5, or 6 counts (obligatory)",
      classes: ['madda_obligatory'],
      importance: 'high'
    },
    {
      key: 'madd_lazim',
      category: 'madd',
      name: "Madd Lāzim (مد لازم)",
      nameAr: "المد اللازم",
      desc: "Necessary prolongation when madd letter followed by sukoon/shaddah",
      duration: "6 counts (necessary)",
      classes: ['madda_necessary'],
      importance: 'high'
    },
    {
      key: 'madd_arid',
      category: 'madd',
      name: "Madd ʿĀriḍ lil-Sukūn (مد عارض للسكون)",
      nameAr: "المد العارض للسكون",
      desc: "Occurs when a word ending with a madd letter is followed by a temporary sukoon at a stop (e.g., {العالمين}).",
      duration: "2, 4, or 6 counts (optional)",
      classes: ['madda_permissible'],
      importance: 'high'
    },
    {
      key: 'madd_leen',
      category: 'madd',
      name: "Madd Līn (مد لين)",
      nameAr: "المد اللين",
      desc: "Occurs when و or ي are preceded by fatḥah and followed by sukoon at a stop (e.g., {خَوْف}).",
      duration: "2, 4, or 6 counts (optional)",
      classes: ['madda_permissible'],
      importance: 'medium'
    },
    {
      key: 'madd_silah',
      category: 'madd',
      name: "Madd aṣ-Ṣilah (مد الصلة)",
      nameAr: "مد الصلة",
      desc: "Prolongation of هاء الضمير (pronoun ha) when preceded and followed by vowel",
      duration: "2 counts (minor), 4-5 counts (major)",
      classes: ['madda_permissible'],
      importance: 'medium'
    },
    {
      key: 'madd_badal',
      category: 'madd',
      name: "Madd al-Badal (مد البدل)",
      nameAr: "مد البدل",
      desc: "Substitute prolongation: hamzah followed by madd letter (آ)",
      duration: "2 counts",
      classes: ['madda_normal'],
      importance: 'medium'
    },
    {
      key: 'madd_ewad',
      category: 'madd',
      name: "Madd al-'Iwaḍ (مد العوض)",
      nameAr: "مد العوض",
      desc: "Compensation prolongation: tanween fatḥah at pause becomes alif",
      duration: "2 counts",
      classes: ['madda_normal'],
      importance: 'medium'
    },
    {
      key: 'madd_farq',
      category: 'madd',
      name: "Madd Farq (مد الفرق)",
      nameAr: "مد الفرق",
      desc: "Used to differentiate a question from a statement, as in {ءَآللَّهُ خَيْرٌ}.",
      duration: "6 counts",
      classes: ['madda_obligatory'],
      importance: 'low'
    },

    // ===== IDGHAM & OTHER ASSIMILATION RULES =====
    {
      key: 'idgham_mutamathilayn',
      category: 'assimilation',
      name: "Idghām Mutamāthilayn (إدغام متماثلين)",
      nameAr: "الإدغام المتماثلين",
      desc: "Assimilation when two identical letters meet — the first saakin, second with a vowel (e.g., {قَدْ دَخَلُوا}).",
      duration: "Normal",
      classes: ['idgh_mus'],
      importance: 'medium'
    },
    {
      key: 'idgham_mutajanisayn',
      category: 'assimilation',
      name: "Idghām Mutajānīsayn (إدغام متجانسين)",
      nameAr: "الإدغام المتجانسين",
      desc: "Assimilation of letters from same makhraj but different sifat, e.g., {قَدْ تَّبَيَّنَ}, {اذْهَبْ بِكِتَابِي}.",
      duration: "Normal",
      classes: ['idgh_mus'],
      importance: 'medium'
    },
    {
      key: 'idgham_mutqaribayn',
      category: 'assimilation',
      name: "Idghām Mutqāribayn (إدغام متقاربين)",
      nameAr: "الإدغام المتقاربين",
      desc: "Assimilation of two closely articulated letters, e.g., {يَقُولُ لَكُمْ}.",
      duration: "Normal",
      classes: ['idgh_mus'],
      importance: 'medium'
    },

    // ===== OTHER IMPORTANT RULES =====
    {
      key: 'qalqalah',
      category: 'other',
      name: "Qalqalah (قلقلة)",
      nameAr: "القلقلة",
      desc: "Bouncing echo sound on ق ط ب ج د when saakin or paused upon.",
      duration: "Brief bounce",
      classes: ['qlq', 'qalqalah'],
      importance: 'high'
    },
    {
      key: 'ghunnah',
      category: 'other',
      name: "Ghunnah (غنة)",
      nameAr: "الغنة",
      desc: "Nasalization sound from the nose, strongest on نّ and مّ.",
      duration: "2 counts",
      classes: ['ghn', 'ghunnah'],
      importance: 'high'
    },
    {
      key: 'lam_shams',
      category: 'other',
      name: "Lām Shamsiyyah (لام شمسية)",
      nameAr: "اللام الشمسية",
      desc: "The ل of 'al-' (الـ) assimilated into sun letters: ت ث د ذ ر ز س ش ص ض ط ظ ل ن",
      duration: "Assimilated",
      classes: ['laam_shamsiyah', 'laa_shamsiyah'],
      importance: 'high'
    },
    {
      key: 'lam_qamar',
      category: 'other',
      name: "Lām Qamariyyah (لام قمرية)",
      nameAr: "اللام القمرية",
      desc: "The ل of 'al-' (الـ) pronounced clearly before moon letters: ا ب ج ح خ ع غ ف ق ك م ه و ي",
      duration: "Clear pronunciation",
      classes: ['laam_qamariya'],
      importance: 'high'
    },
    {
      key: 'tafkheem',
      category: 'other',
      name: "Tafkhīm (تفخيم)",
      nameAr: "التفخيم",
      desc: "Heavy/emphatic pronunciation of letters: ص ض ط ظ خ غ ق and ر in specific cases",
      duration: "Heavy articulation",
      classes: ['tafkhim'],
      importance: 'medium'
    },
    {
      key: 'tarqeeq',
      category: 'other',
      name: "Tarqīq (ترقيق)",
      nameAr: "الترقيق",
      desc: "Light/thin pronunciation of all letters except heavy letters",
      duration: "Light articulation",
      classes: ['tarqiq'],
      importance: 'medium'
    },
    {
      key: 'isti_ala',
      category: 'other',
      name: "Isti'lā' (استعلاء)",
      nameAr: "الاستعلاء",
      desc: "Elevated tongue position for letters: خ ص ض غ ط ق ظ",
      duration: "Elevated articulation",
      classes: ['istila'],
      importance: 'medium'
    },
    {
      key: 'ham_wasl',
      category: 'other',
      name: "Hamzat al-Waṣl (همزة الوصل)",
      nameAr: "همزة الوصل",
      desc: "Connecting hamzah, pronounced only at the start of recitation and dropped when continuing.",
      duration: "Conditional",
      classes: ['ham_wasl'],
      importance: 'medium'
    },
    {
      key: 'silent',
      category: 'other',
      name: "Silent Letters (حروف ساكنة)",
      nameAr: "الحروف الساكنة",
      desc: "Letters written but not pronounced in certain words, e.g., alif in {قَالُوا}.",
      duration: "Silent",
      classes: ['slnt'],
      importance: 'low'
    },
  ];

  // Search space for examples: Expand to more surahs for better coverage
  const EXAMPLE_SURAHS = [
    1,2,3,4,5,6,7,8,9,10,11,12,18,19,20,21,36,55,56,67,  // Common & important surahs
    78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114  // Juz 30
  ];

  // Pinned examples for better coverage - verified examples for each rule
  const PINNED = new Map(Object.entries({
    izhar: ['2:62'],
    idgham_ghn: ['2:8', '2:143'],
    idgham_no_ghn: ['18:65'],
    iqlab: ['4:58'],
    ikhfa: ['2:272'],
    idgham_shafawi: ['83:29'],
    ikhfa_shafawi: ['104:1'],
    izhar_shafawi: ['2:8'],
    madd_tabee: ['1:2'],
    madd_munfasil: ['3:2'],
    madd_muttasil: ['2:6'],
    madd_lazim: ['68:1'],
    madd_arid: ['1:2'],
    madd_leen: ['106:4'],
    madd_farq: ['37:125'],
    madd_silah: ['2:2','2:85'],
    madd_badal: ['2:6','2:221'],
    madd_ewad: ['2:2','2:5'],
    qalqalah: ['23:1'],
    ghunnah: ['108:1'],
    lam_shams: ['91:1'],
    lam_qamar: ['54:1'],
    tafkheem: ['2:21'],
    tarqeeq: ['51:47'],
    isti_ala: ['50:16'],
    ham_wasl: ['1:6'],
    silent: ['2:25'],
    idgham_mutamathilayn: ['48:29'],
    idgham_mutajanisayn: ['2:136'],
    idgham_mutqaribayn: ['2:221']
  }));

  const state = {
    reciterId: 7,
    versesBySurah: new Map(),
    audioMaps: new Map(),
    playingKey: '',
    playingBtn: null,
    examples: new Map(),
    currentCategory: 'all',
    searchQuery: '',
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
      // Use QR.prefs if available (handles profiles system)
      let prefs = {};
      if (window.QR && QR.prefs) {
        prefs = QR.prefs.read();
      } else {
        const saved = localStorage.getItem('qr_prefs');
        prefs = saved ? JSON.parse(saved) : {};
      }
      
      // Apply saved theme
      if (prefs.theme) {
        document.body.setAttribute('data-theme', prefs.theme);
      }
      
      // Load reciter preference
      if (typeof prefs.reciter_id === 'number' && prefs.reciter_id > 0) {
        state.reciterId = prefs.reciter_id;
      }
    } catch(e) {
      console.error('loadPrefs failed:', e);
    }
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
      // Sanitize first to prevent XSS
      const sanitized = window.QR && QR.utils && QR.utils.sanitizeTajweedHTML 
        ? QR.utils.sanitizeTajweedHTML(html) 
        : html;
      const tmp = document.createElement('div'); tmp.innerHTML = sanitized;
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
          span.textContent = n.textContent; // Use textContent to avoid XSS
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
    } catch { return ''; }
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
      // Sanitize before parsing
      const sanitized = window.QR && QR.utils && QR.utils.sanitizeTajweedHTML 
        ? QR.utils.sanitizeTajweedHTML(html) 
        : html;
      const tmp = document.createElement('div'); tmp.innerHTML = sanitized;
      const nodes = tmp.querySelectorAll('tajweed');
      for (const n of nodes){
        const cls = (n.getAttribute('class')||'').split(/\s+/).map(normalizeClass);
        for (const want of classes){ if (cls.includes(want)) return true; }
      }
      return false;
    } catch { return false; }
  }

  async function collectExamples(){
    const needChapters = new Set(EXAMPLE_SURAHS);
    for (const arr of PINNED.values()){
      (arr||[]).forEach(key=>{ const sid = parseInt(String(key).split(':')[0],10); if (!Number.isNaN(sid)) needChapters.add(sid); });
    }

    const cache = new Map();
    for (const ch of needChapters){ cache.set(ch, await fetchSurahTajweed(ch)); }

    // Scan for examples (collect up to 5 examples per rule)
    for (const rule of RULES){
      const list = [];
      const MAX_EXAMPLES = 5;
      
      // First try pinned examples
      const pinned = PINNED.get(rule.key) || [];
      for (const key of pinned){
        if (list.length >= MAX_EXAMPLES) break;
        const parts = String(key).split(':'); const ch = parseInt(parts[0],10); const vno = String(key);
        const verses = cache.get(ch) || [];
        const v = verses.find(x=> String(x.verse_key)===vno);
        if (v && verseHasClass(v, rule.classes)) list.push({ verse: v, chapter: ch });
      }
      
      // Then scan all surahs for more examples
      for (const ch of EXAMPLE_SURAHS){
        if (list.length >= MAX_EXAMPLES) break;
        const verses = cache.get(ch) || [];
        for (const v of verses){
          if (list.length >= MAX_EXAMPLES) break;
          // Avoid duplicates
          const isDuplicate = list.some(ex => ex.verse.verse_key === v.verse_key);
          if (!isDuplicate && verseHasClass(v, rule.classes)) {
            list.push({ verse: v, chapter: ch });
          }
        }
      }
      
      state.examples.set(rule.key, list);
    }
  }

  function renderRules(){
    const root = els.container; 
    if (!root) return; 
    root.innerHTML = '';

    // Group rules by category
    const categories = [
      { id: 'noon', title: 'Noon Saakin & Tanween Rules (أحكام النون الساكنة والتنوين)', titleKey: 'noonRulesTitle', icon: 'ن' },
      { id: 'meem', title: 'Meem Saakin Rules (أحكام الميم الساكنة)', titleKey: 'meemRulesTitle', icon: 'م' },
      { id: 'madd', title: 'Madd - Prolongation Rules (أحكام المدود)', titleKey: 'maddRulesTitle', icon: 'ـ' },
      { id: 'assimilation', title: 'Assimilation Rules (أحكام الإدغام)', titleKey: 'assimilationRulesTitle', icon: '↔️' },
      { id: 'other', title: 'Other Essential Rules (أحكام أخرى)', titleKey: 'otherRulesTitle', icon: '◆' }
    ];

    categories.forEach(cat => {
      if (state.currentCategory !== 'all' && state.currentCategory !== cat.id) return;

      const rulesInCat = RULES.filter(r => {
        const matchCategory = r.category === cat.id;
        const matchSearch = !state.searchQuery || 
          r.name.toLowerCase().includes(state.searchQuery) ||
          r.nameAr.includes(state.searchQuery) ||
          r.desc.toLowerCase().includes(state.searchQuery);
        return matchCategory && matchSearch;
      });

      if (rulesInCat.length === 0) return;

      // Category Header
      const catHeader = document.createElement('div');
      catHeader.style.cssText = 'margin: 48px 0 24px 0;';
      catHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 8px;">
          <div style="width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 700; font-family: 'Amiri Quran', serif; box-shadow: var(--shadow-sm);">${cat.icon}</div>
          <h2 style="margin: 0; font-size: 1.6rem; color: var(--text);" data-i18n="${cat.titleKey}">${cat.title}</h2>
        </div>
        <div style="height: 3px; background: linear-gradient(90deg, var(--primary), transparent); border-radius: 999px; margin-bottom: 4px;"></div>
      `;
      root.appendChild(catHeader);

      // Rules Grid for this category
      const grid = document.createElement('div');
      grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 20px; margin-bottom: 24px;';

      rulesInCat.forEach(rule => {
        const color = readTajweedColor(rule.classes[0]);
        
        const card = document.createElement('div');
        card.className = 'card';
        card.style.cssText = 'position: relative; overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; border-left: 4px solid ' + color + ';';
        card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-4px)'; card.style.boxShadow = 'var(--shadow-lg)'; });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.boxShadow = 'var(--shadow-sm)'; });

        // Header with color indicator and importance badge
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px;';
        
        const titleSection = document.createElement('div');
        titleSection.style.flex = '1';
        
        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 6px;';
        
        const dot = document.createElement('span');
        dot.style.cssText = `display: inline-block; width: 14px; height: 14px; border-radius: 999px; background: ${color}; border: 2px solid var(--surface); box-shadow: 0 0 0 1px var(--border);`;
        
        const title = document.createElement('h3');
        title.style.cssText = 'margin: 0; font-size: 1.15rem; color: var(--text);';
        title.textContent = rule.name;
        
        titleRow.appendChild(dot);
        titleRow.appendChild(title);
        
        const arabicName = document.createElement('div');
        arabicName.style.cssText = 'font-family: "Amiri Quran", serif; font-size: 1.05rem; color: var(--muted); direction: rtl;';
        arabicName.textContent = rule.nameAr;
        
        titleSection.appendChild(titleRow);
        titleSection.appendChild(arabicName);
        
        // Importance badge
        if (rule.importance === 'high') {
          const badge = document.createElement('span');
          badge.style.cssText = 'padding: 4px 10px; border-radius: 999px; background: rgba(239, 68, 68, 0.12); color: #dc2626; font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap;';
          badge.textContent = 'Essential';
          badge.setAttribute('data-i18n', 'essential');
          header.appendChild(badge);
        }
        
        header.appendChild(titleSection);
        card.appendChild(header);

        // Description
        const desc = document.createElement('p');
        desc.style.cssText = 'margin: 0 0 12px 0; color: var(--text-dim); font-size: 0.95rem; line-height: 1.6;';
        desc.textContent = rule.desc;
        card.appendChild(desc);

        // Duration info
        const duration = document.createElement('div');
        duration.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface-soft); border-radius: 8px; font-size: 0.85rem; color: var(--muted); margin-bottom: 16px;';
        duration.innerHTML = `<ion-icon name="time-outline" style="font-size: 1.1rem;"></ion-icon><span><strong>Duration:</strong> ${rule.duration}</span>`;
        card.appendChild(duration);

        // Examples - Show one at a time with navigation
        const examples = state.examples.get(rule.key) || [];
        if (examples.length === 0) {
          const noEx = document.createElement('div');
          noEx.style.cssText = 'padding: 16px; background: var(--surface-soft); border-radius: 12px; text-align: center; color: var(--muted); font-size: 0.9rem;';
          
          // Check if examples are still loading
          if (state.examples.size === 0) {
            noEx.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> <span data-i18n="loadingExamples">Loading examples...</span>';
          } else {
            noEx.innerHTML = '<ion-icon name="information-circle-outline"></ion-icon> <span data-i18n="noExampleFound">No example found in loaded surahs</span>';
          }
          card.appendChild(noEx);
        } else {
          let currentExampleIndex = 0;
          
          const exContainer = document.createElement('div');
          exContainer.style.cssText = 'position: relative;';
          
          const renderExample = (index) => {
            const item = examples[index];
            const exWrap = document.createElement('div');
            exWrap.style.cssText = 'background: var(--surface-soft); border-radius: 12px; padding: 14px; border: 1px solid var(--border);';
            
            const verse = htmlForVerse(item.verse, rule);
            verse.style.cssText = 'margin-bottom: 10px;';
            exWrap.appendChild(verse);

            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; gap: 8px; align-items: center; justify-content: space-between;';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'btn small';
            playBtn.innerHTML = '<ion-icon name="play-outline"></ion-icon><span data-i18n="play">Play</span>';
            playBtn.addEventListener('click', () => playVerse(item.verse, item.chapter, playBtn));
            
            actions.appendChild(playBtn);
            
            // Navigation if multiple examples
            if (examples.length > 1) {
              const nav = document.createElement('div');
              nav.style.cssText = 'display: flex; align-items: center; gap: 8px;';
              
              const prevBtn = document.createElement('button');
              prevBtn.className = 'btn small';
              prevBtn.innerHTML = '<ion-icon name="chevron-back-outline"></ion-icon>';
              prevBtn.style.cssText = 'padding: 6px 10px; min-width: auto;';
              prevBtn.disabled = index === 0;
              prevBtn.addEventListener('click', () => {
                currentExampleIndex = Math.max(0, currentExampleIndex - 1);
                exContainer.innerHTML = '';
                exContainer.appendChild(renderExample(currentExampleIndex));
              });
              
              const counter = document.createElement('span');
              counter.style.cssText = 'font-size: 0.85rem; color: var(--muted); min-width: 40px; text-align: center;';
              counter.textContent = `${index + 1}/${examples.length}`;
              
              const nextBtn = document.createElement('button');
              nextBtn.className = 'btn small';
              nextBtn.innerHTML = '<ion-icon name="chevron-forward-outline"></ion-icon>';
              nextBtn.style.cssText = 'padding: 6px 10px; min-width: auto;';
              nextBtn.disabled = index === examples.length - 1;
              nextBtn.addEventListener('click', () => {
                currentExampleIndex = Math.min(examples.length - 1, currentExampleIndex + 1);
                exContainer.innerHTML = '';
                exContainer.appendChild(renderExample(currentExampleIndex));
              });
              
              nav.appendChild(prevBtn);
              nav.appendChild(counter);
              nav.appendChild(nextBtn);
              actions.appendChild(nav);
            }
            
            exWrap.appendChild(actions);
            return exWrap;
          };
          
          exContainer.appendChild(renderExample(0));
          card.appendChild(exContainer);
        }

        grid.appendChild(card);
      });

      root.appendChild(grid);
    });

    // No results message
    if (root.children.length === 0) {
      const noResults = document.createElement('div');
      noResults.style.cssText = 'text-align: center; padding: 60px 20px; color: var(--muted);';
      noResults.innerHTML = `
        <ion-icon name="search-outline" style="font-size: 4rem; opacity: 0.3; margin-bottom: 16px;"></ion-icon>
        <p style="font-size: 1.1rem; margin: 0;" data-i18n="noRulesFound">No rules found matching your search</p>
      `;
      root.appendChild(noResults);
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

  function setupFilters(){
    // Category filter buttons
    const categoryBtns = document.querySelectorAll('[data-category]');
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        state.currentCategory = cat;
        categoryBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        renderRules();
      });
    });

    // Search input
    if (els.search) {
      els.search.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderRules();
      });
    }
  }

  async function init(){
    // Small delay to ensure prefs.js has set the theme first
    await new Promise(resolve => setTimeout(resolve, 50));
    loadPrefs();
    setupFilters();
    
    // Show loader
    const loader = document.getElementById('tajwid-loader');
    if (loader) {
      loader.style.opacity = '1';
      loader.style.visibility = 'visible';
    }
    
    // Load examples first, then render everything at once
    await collectExamples();
    
    // Render rules with examples
    renderRules();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
