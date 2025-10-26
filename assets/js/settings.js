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
    // Use translation if available
    const themeKey = theme.toLowerCase();
    display.textContent = (typeof t === 'function') ? t(themeKey) : theme.charAt(0).toUpperCase() + theme.slice(1);
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
  
  // Popular translations - one per language
  const POPULAR_TRANSLATIONS = [
    { id: 20, name: 'Saheeh International', lang: 'English' },
    { id: 22, name: 'A. Yusuf Ali', lang: 'English' },
    { id: 203, name: 'Al-Hilali & Khan', lang: 'English' },
    { id: 85, name: 'M.A.S. Abdel Haleem', lang: 'English' },
    { id: 31, name: 'Muhammad Hamidullah', lang: 'French' },
    { id: 27, name: 'Frank Bubenheim and Nadeem', lang: 'German' },
    { id: 83, name: 'Sheikh Isa Garcia', lang: 'Spanish' },
    { id: 33, name: 'Indonesian Islamic Affairs Ministry', lang: 'Indonesian' },
    { id: 77, name: 'Turkish Translation (Diyanet)', lang: 'Turkish' },
    { id: 54, name: 'Maulana Muhammad Junagarhi', lang: 'Urdu' },
    { id: 74, name: 'Tajik', lang: 'Tajik' },
    { id: 29, name: 'Hussein Taji Kal Dari', lang: 'Persian' },
    { id: 56, name: 'Chinese Translation (Simplified) - Ma Jain', lang: 'Chinese' },
    { id: 35, name: 'Ryoichi Mita', lang: 'Japanese' },
    { id: 36, name: 'Korean', lang: 'Korean' },
    { id: 38, name: 'Maranao', lang: 'Maranao' },
    { id: 39, name: 'Abdullah Muhammad Basmeih', lang: 'Malay' },
    { id: 37, name: 'Malayalam Translation (Abdul Hameed and Kunhi)', lang: 'Malayalam' },
    { id: 50, name: 'Jan Trust Foundation', lang: 'Tamil' },
    { id: 161, name: 'Taisirul Quran', lang: 'Bengali' },
    { id: 32, name: 'Hausa Translation (Abubakar Gumi)', lang: 'Hausa' },
    { id: 49, name: 'Ali Muhsin Al-Barwani', lang: 'Swahili' },
    { id: 46, name: 'Mahmud Muhammad Abduh', lang: 'Somali' },
    { id: 43, name: 'Portuguese Translation (Samir)', lang: 'Portuguese' },
    { id: 42, name: 'Józef Bielawski', lang: 'Polish' },
    { id: 45, name: 'Russian Translation (Elmir Kuliev)', lang: 'Russian' },
    { id: 44, name: 'Grigore', lang: 'Romanian' },
    { id: 30, name: 'Finnish', lang: 'Finnish' },
    { id: 48, name: 'Knut Bernström', lang: 'Swedish' },
    { id: 41, name: 'Norwegian', lang: 'Norwegian' },
    { id: 26, name: 'Czech', lang: 'Czech' },
    { id: 25, name: 'Muhamed Mehanović', lang: 'Bosnian' },
    { id: 47, name: 'Albanian', lang: 'Albanian' },
    { id: 23, name: 'Azerbaijani', lang: 'Azeri' }
  ];
  
  try {
    sel.replaceChildren(...POPULAR_TRANSLATIONS.map(t => {
      const o = document.createElement('option');
      o.value = t.id;
      o.textContent = `${t.lang} – ${t.name}`;
      return o;
    }));
    
    const p = readPrefs(); 
    const cur = parseInt(p.translation_id || '0', 10);
    if (cur) {
      sel.value = String(cur);
    } else {
      sel.value = '20';
    }
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
  
  // Dispatch event to notify reader page
  window.dispatchEvent(new CustomEvent('qr:prefs-changed', { detail: p }));
}

function saveTranslationToggle(on) {
  const sel = document.getElementById('translation-select');
  const p = readPrefs();
  p.translation_on = !!on;
  
  if (on) {
    let cur = parseInt(p.translation_id || '0', 10) || 0;
    if (!cur && sel && sel.options && sel.options.length) {
      // Default to Saheeh International (id: 20)
      const saheehOpt = Array.from(sel.options).find(opt => opt.value === '20');
      const firstOpt = sel.options[0];
      
      const pick = saheehOpt || firstOpt;
      
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
  
  // Dispatch event to notify reader page
  window.dispatchEvent(new CustomEvent('qr:prefs-changed', { detail: p }));
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
  const prefsCountNum = document.getElementById('prefs-count-num');
  const prefsCountTotal = document.getElementById('prefs-count-total');
  
  if (progressBar) {
    progressBar.style.width = percentage + '%';
  }
  
  if (prefsCountNum) {
    prefsCountNum.textContent = configured;
  }
  
  if (prefsCountTotal) {
    prefsCountTotal.textContent = total;
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
    if (label) label.textContent = (typeof t === 'function') ? t('connected') : 'Connected';
    if (desc) desc.textContent = (typeof t === 'function') ? t('syncingAuto') : 'Your data is being synced automatically';
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = 'inline-flex';
    updateQuickDisplay('sync', (typeof t === 'function') ? t('connectingSyncing') : 'Connected & syncing');
  } else {
    if (icon) {
      icon.innerHTML = '<ion-icon name="cloud-offline-outline"></ion-icon>';
      icon.classList.remove('connected');
    }
    if (label) label.textContent = (typeof t === 'function') ? t('notConnected') : 'Not Connected';
    if (desc) desc.textContent = (typeof t === 'function') ? t('connectAccount') : 'Connect your Google account to enable cloud backup';
    if (connectBtn) connectBtn.style.display = 'inline-flex';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    updateQuickDisplay('sync', (typeof t === 'function') ? t('notConnected') : 'Not connected');
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
  if (toggle) toggle.addEventListener('change', () => {
    saveTranslationToggle(toggle.checked);
  });
  if (trSel) trSel.addEventListener('change', (e) => {
    saveTranslation(e.target.value);
  });

  // Language selector
  const langSelect = document.getElementById('language-select');
  if (langSelect && typeof initLanguage === 'function') {
    initLanguage(); // Initialize language from i18n.js
    
    langSelect.addEventListener('change', (e) => {
      if (typeof setLanguage === 'function') {
        setLanguage(e.target.value);
      }
    });
  }

  // Cloud sync
  try {
    const connectBtn = document.getElementById('sync-connect');
    const disconnectBtn = document.getElementById('sync-disconnect');
    
    // Check if connected via auth module or sync module
    let isConnected = false;
    if (window.QR && QR.auth && typeof QR.auth.isSignedIn === 'function') {
      isConnected = QR.auth.isSignedIn();
    } else if (window.QR && QR.sync && typeof QR.sync.isConnected === 'function') {
      isConnected = QR.sync.isConnected();
    }
    
    updateSyncUI(isConnected);
    
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => { 
        try {
          // Try to use auth module first
          if (window.QR && QR.profiles && typeof QR.profiles.signIn === 'function') {
            await QR.profiles.signIn();
            updateSyncUI(true);
            
            // Auto-sync data to cloud
            if (window.QR && QR.sync && typeof QR.sync.push === 'function') {
              await QR.sync.push();
            }
          } else if (window.QR && QR.sync && typeof QR.sync.connect === 'function') {
            await QR.sync.connect();
            updateSyncUI(true);
          }
          
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
          // Sign out from auth module
          if (window.QR && QR.profiles && typeof QR.profiles.signOut === 'function') {
            QR.profiles.signOut();
          }
          // Also disconnect sync
          if (window.QR && QR.sync && typeof QR.sync.disconnect === 'function') {
            QR.sync.disconnect();
          }
          updateSyncUI(false);
        } catch(e) {
          console.error('Disconnect error:', e);
        }
      });
    }
  } catch {}
  
  // Listen for auth state changes
  if (window.QR && window.QR.events) {
    QR.events.on('auth:signedIn', (user) => {
      updateSyncUI(true);
      
      // Auto-sync data to cloud after sign-in
      if (window.QR && QR.sync && typeof QR.sync.push === 'function') {
        QR.sync.push().catch(err => console.error('Auto-sync failed:', err));
      }
    });
    
    QR.events.on('auth:signedOut', () => {
      updateSyncUI(false);
    });
  }
  
  // Initialize progress
  updatePrefsProgress();
});
