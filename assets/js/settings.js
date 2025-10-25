const API_BASE = 'https://api.quran.com/api/v4';
const PREFS_KEY = (window.QR && QR.prefs && QR.prefs.storageKey && QR.prefs.storageKey()) || 'qr_prefs';

function readPrefs() {
  try { 
    return (window.QR && QR.prefs) ? QR.prefs.read() : JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); 
  } catch { 
    return {}; 
  }
}

function writePrefs(p) {
  try { 
    return (window.QR && QR.prefs) ? QR.prefs.write(p) : localStorage.setItem(PREFS_KEY, JSON.stringify(p)); 
  } catch {}
}

function setTheme(theme) { 
  document.body.setAttribute('data-theme', theme);
  updateThemeDisplay(theme);
}

function loadTheme() {
  const p = readPrefs();
  const theme = p.theme || 'light';
  setTheme(theme);
  document.querySelectorAll('input[name="theme"]').forEach(r => r.checked = (r.value === theme));
  updateQuickDisplay('theme', theme);
}

function saveTheme(theme) {
  const p = readPrefs(); 
  p.theme = theme; 
  writePrefs(p); 
  setTheme(theme);
  updateQuickDisplay('theme', theme);
  updatePrefsProgress();
}

function updateThemeDisplay(theme) {
  const display = document.getElementById('current-theme-display');
  if (display) {
    display.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
  }
}

function loadFont() {
  const p = readPrefs();
  const v = parseInt(p.font_px || '36', 10);
  const size = (!Number.isNaN(v)) ? v : 36;
  const slider = document.getElementById('font-size');
  const val = document.getElementById('font-size-val');
  const prev = document.getElementById('font-preview');
  if (slider) slider.value = size;
  if (val) val.textContent = size;
  document.documentElement.style.setProperty('--arabic-size', size + 'px');
  if (prev) prev.style.fontSize = size + 'px';
}

function saveFont(size) {
  const p = readPrefs(); 
  p.font_px = size; 
  writePrefs(p);
  document.documentElement.style.setProperty('--arabic-size', size + 'px');
  const prev = document.getElementById('font-preview');
  const val = document.getElementById('font-size-val');
  if (prev) prev.style.fontSize = size + 'px';
  if (val) val.textContent = size;
  updatePrefsProgress();
}

function loadTrFont() {
  const p = readPrefs();
  const v = parseInt(p.translation_px || '16', 10);
  const size = (!Number.isNaN(v)) ? v : 16;
  const slider = document.getElementById('tr-font-size');
  const val = document.getElementById('tr-font-size-val');
  const prev = document.getElementById('tr-font-preview');
  if (slider) slider.value = size;
  if (val) val.textContent = size;
  document.documentElement.style.setProperty('--translation-size', size + 'px');
  if (prev) prev.style.fontSize = size + 'px';
}

function saveTrFont(size) {
  const p = readPrefs(); 
  p.translation_px = size; 
  writePrefs(p);
  document.documentElement.style.setProperty('--translation-size', size + 'px');
  const val = document.getElementById('tr-font-size-val');
  if (val) val.textContent = size;
  const prev = document.getElementById('tr-font-preview');
  if (prev) prev.style.fontSize = size + 'px';
  updatePrefsProgress();
}

async function loadReciters() {
  const sel = document.getElementById('reciter-select');
  if (!sel) return;
  
  try {
    const res = await fetch(`${API_BASE}/resources/recitations?language=en`);
    const data = await res.json();
    const reciters = (data.recitations || []).map(r => ({ 
      id: r.id, 
      name: r.reciter_name || (r.translated_name?.name) || r.name || ('Reciter ' + r.id) 
    }));
    
    sel.replaceChildren(...reciters.map(r => { 
      const o = document.createElement('option'); 
      o.value = r.id; 
      o.textContent = r.name; 
      return o; 
    }));
    
    const p = readPrefs(); 
    const cur = parseInt(p.reciter_id || '7', 10); 
    sel.value = String(cur);
    
    updateQuickDisplay('reciter', reciters.find(r => r.id === cur)?.name || 'Selected');
  } catch(e) {
    console.error('Failed to load reciters:', e);
    const p = readPrefs(); 
    const cur = parseInt(p.reciter_id || '7', 10);
    const o = document.createElement('option'); 
    o.value = String(cur); 
    o.textContent = `Reciter ${cur}`;
    sel.replaceChildren(o); 
    sel.value = String(cur);
    
    updateQuickDisplay('reciter', 'Using default');
  }
}

function saveReciter(id) { 
  const p = readPrefs(); 
  p.reciter_id = parseInt(id, 10) || 7; 
  writePrefs(p);
  
  const sel = document.getElementById('reciter-select');
  const selectedName = sel?.options[sel.selectedIndex]?.textContent || 'Selected';
  updateQuickDisplay('reciter', selectedName);
  updatePrefsProgress();
}

async function loadTranslations() {
  const sel = document.getElementById('translation-select');
  if (!sel) return;
  
  try {
    const res = await fetch(`${API_BASE}/resources/translations?language=en`);
    const data = await res.json();
    const translations = (data.translations || []).map(t => ({
      id: t.id,
      name: t.name || t.translated_name?.name || ('Translation ' + t.id),
      lang: t.language_name || t.language || t.locale || 'Unknown',
      author: t.author_name || ''
    }));
    
    translations.sort((a, b) => String(a.lang + ' ' + a.name).localeCompare(String(b.lang + ' ' + b.name)));
    
    sel.replaceChildren(...translations.map(t => {
      const o = document.createElement('option');
      o.value = t.id;
      const meta = t.author ? ` – ${t.author}` : '';
      o.textContent = `[${t.lang}] ${t.name}${meta}`;
      return o;
    }));
    
    const p = readPrefs(); 
    const cur = parseInt(p.translation_id || '0', 10); 
    if (cur) sel.value = String(cur);
  } catch(e) {
    console.error('Failed to load translations:', e);
    sel.replaceChildren();
  }
}

function saveTranslation(id) { 
  const p = readPrefs(); 
  p.translation_id = parseInt(id, 10) || 0; 
  writePrefs(p);
  updatePrefsProgress();
}

function saveTranslationToggle(on) {
  const sel = document.getElementById('translation-select');
  const p = readPrefs();
  p.translation_on = !!on;
  
  if (on) {
    let cur = parseInt(p.translation_id || '0', 10) || 0;
    if (!cur && sel && sel.options && sel.options.length) {
      let pick = null;
      // Prefer Saheeh International
      for (let i = 0; i < sel.options.length; i++) {
        const opt = sel.options[i];
        if (/saheeh/i.test(opt.textContent || '')) { pick = opt; break; }
      }
      // Otherwise first English
      if (!pick) {
        for (let i = 0; i < sel.options.length; i++) {
          const opt = sel.options[i];
          if (/\[english\]/i.test(opt.textContent || '')) { pick = opt; break; }
        }
      }
      // Fallback to first available
      if (!pick) pick = sel.options[0];
      if (pick) {
        cur = parseInt(pick.value, 10) || 0;
        sel.value = String(cur);
        p.translation_id = cur;
      }
    }
  }
  
  writePrefs(p);
  if (sel) sel.disabled = !on;
  updatePrefsProgress();
}

function updateQuickDisplay(type, value) {
  const displays = {
    'theme': 'quick-theme-display',
    'reciter': 'quick-reciter-display',
    'sync': 'quick-sync-display'
  };
  
  const el = document.getElementById(displays[type]);
  if (!el) return;
  
  if (type === 'theme') {
    el.textContent = value.charAt(0).toUpperCase() + value.slice(1) + ' theme active';
  } else if (type === 'reciter') {
    el.textContent = value;
  } else if (type === 'sync') {
    el.textContent = value;
  }
}

function updatePrefsProgress() {
  const p = readPrefs();
  let configured = 0;
  const total = 5;
  
  if (p.theme) configured++;
  if (p.font_px) configured++;
  if (p.reciter_id) configured++;
  if (p.translation_id || p.translation_on === false) configured++;
  if (window.QR && QR.sync && QR.sync.isConnected && QR.sync.isConnected()) configured++;
  
  const percentage = Math.round((configured / total) * 100);
  const progressBar = document.getElementById('prefs-progress');
  const prefsCount = document.getElementById('prefs-count');
  
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }
  
  if (prefsCount) {
    prefsCount.textContent = `${configured} of ${total} configured`;
  }
}

function updateSyncUI(connected) {
  const statusBox = document.querySelector('.sync-status-box');
  const icon = document.getElementById('sync-icon-status');
  const label = document.getElementById('sync-status-label');
  const desc = document.getElementById('sync-status-desc');
  const connectBtn = document.getElementById('sync-connect');
  const disconnectBtn = document.getElementById('sync-disconnect');
  
  if (connected) {
    if (icon) {
      icon.innerHTML = '<ion-icon name="cloud-done-outline"></ion-icon>';
      icon.classList.add('connected');
    }
    if (label) label.textContent = 'Connected';
    if (desc) desc.textContent = 'Your data is being synced automatically';
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
    updateQuickDisplay('sync', 'Connected & syncing');
  } else {
    if (icon) {
      icon.innerHTML = '<ion-icon name="cloud-offline-outline"></ion-icon>';
      icon.classList.remove('connected');
    }
    if (label) label.textContent = 'Not Connected';
    if (desc) desc.textContent = 'Connect your Google account to enable cloud backup';
    if (connectBtn) connectBtn.style.display = 'inline-flex';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    updateQuickDisplay('sync', 'Not connected');
  }
  
  updatePrefsProgress();
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load all settings
  loadTheme();
  loadFont();
  loadTrFont();
  await loadReciters();
  await loadTranslations();
  
  // Theme selection
  document.querySelectorAll('input[name="theme"]').forEach(r => 
    r.addEventListener('change', () => saveTheme(r.value))
  );
  
  // Font size sliders
  const fs = document.getElementById('font-size');
  if (fs) fs.addEventListener('input', () => saveFont(parseInt(fs.value, 10)));
  
  const tfs = document.getElementById('tr-font-size');
  if (tfs) tfs.addEventListener('input', () => saveTrFont(parseInt(tfs.value, 10)));
  
  // Reciter selection
  const recSel = document.getElementById('reciter-select');
  if (recSel) recSel.addEventListener('change', (e) => saveReciter(e.target.value));
  
  // Translation settings
  const p = readPrefs();
  const toggle = document.getElementById('translation-toggle');
  const trSel = document.getElementById('translation-select');
  
  if (toggle) toggle.checked = !!p.translation_on;
  if (trSel) trSel.disabled = !(toggle && toggle.checked);
  if (toggle) toggle.addEventListener('change', () => saveTranslationToggle(toggle.checked));
  if (trSel) trSel.addEventListener('change', (e) => saveTranslation(e.target.value));

  // Cloud sync
  try {
    const connectBtn = document.getElementById('sync-connect');
    const disconnectBtn = document.getElementById('sync-disconnect');
    
    const isConnected = window.QR && QR.sync && QR.sync.isConnected && QR.sync.isConnected();
    updateSyncUI(isConnected);
    
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => { 
        try { 
          await QR.sync.connect(); 
          updateSyncUI(true);
          // Show success feedback
          const originalText = connectBtn.innerHTML;
          connectBtn.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> Connected!';
          setTimeout(() => {
            connectBtn.innerHTML = originalText;
          }, 2000);
        } catch(e) { 
          alert(e.message || String(e)); 
        }
      });
    }
    
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => { 
        try { 
          QR.sync.disconnect(); 
          updateSyncUI(false);
        } catch {} 
      });
    }
  } catch {}
  
  // Initialize progress
  updatePrefsProgress();
});
