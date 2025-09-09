const API_BASE = 'https://api.quran.com/api/v4';
const PREFS_KEY = 'qr_prefs';

function readPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); } catch { return {}; }
}
function writePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch {}
}

function setTheme(theme) { document.body.setAttribute('data-theme', theme); }
function loadTheme() {
  const p = readPrefs();
  const theme = p.theme || 'dark';
  setTheme(theme);
  document.querySelectorAll('input[name="theme"]').forEach(r => r.checked = (r.value === theme));
}
function saveTheme(theme) {
  const p = readPrefs(); p.theme = theme; writePrefs(p); setTheme(theme);
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
  const p = readPrefs(); p.font_px = size; writePrefs(p);
  document.documentElement.style.setProperty('--arabic-size', size + 'px');
  const prev = document.getElementById('font-preview');
  const val = document.getElementById('font-size-val');
  if (prev) prev.style.fontSize = size + 'px';
  if (val) val.textContent = size;
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
  const p = readPrefs(); p.translation_px = size; writePrefs(p);
  document.documentElement.style.setProperty('--translation-size', size + 'px');
  const val = document.getElementById('tr-font-size-val');
  if (val) val.textContent = size;
  const prev = document.getElementById('tr-font-preview');
  if (prev) prev.style.fontSize = size + 'px';
}

async function loadReciters() {
  const sel = document.getElementById('reciter-select');
  const status = document.getElementById('reciter-status');
  if (!sel) return;
  try {
    if (status) status.textContent = 'Loading reciters…';
    const res = await fetch(`${API_BASE}/resources/recitations?language=en`);
    const data = await res.json();
    const reciters = (data.recitations || []).map(r => ({ id: r.id, name: r.reciter_name || (r.translated_name?.name) || r.name || ('Reciter ' + r.id) }));
    sel.replaceChildren(...reciters.map(r => { const o = document.createElement('option'); o.value = r.id; o.textContent = `${r.name}`; return o; }));
    const p = readPrefs(); const cur = parseInt(p.reciter_id || '7', 10); sel.value = String(cur);
    if (status) status.textContent = '';
  } catch(e) {
    if (status) status.textContent = 'Failed to load reciters. Using default.';
    const p = readPrefs(); const cur = parseInt(p.reciter_id || '7', 10);
    const o = document.createElement('option'); o.value = String(cur); o.textContent = `Reciter ${cur}`;
    sel.replaceChildren(o); sel.value = String(cur);
  }
}
function saveReciter(id) { const p = readPrefs(); p.reciter_id = parseInt(id, 10) || 7; writePrefs(p); }

async function loadTranslations() {
  const sel = document.getElementById('translation-select');
  const status = document.getElementById('translation-status');
  if (!sel) return;
  try {
    if (status) status.textContent = 'Loading translations…';
    const res = await fetch(`${API_BASE}/resources/translations?language=en`);
    const data = await res.json();
    const translations = (data.translations || []).map(t => ({
      id: t.id,
      name: t.name || t.translated_name?.name || ('Translation ' + t.id),
      lang: t.language_name || t.language || t.locale || t.language_name_code || 'Unknown',
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
    const p = readPrefs(); const cur = parseInt(p.translation_id || '0', 10); if (cur) sel.value = String(cur);
    if (status) status.textContent = '';
  } catch(e) {
    if (status) status.textContent = 'Failed to load translations.';
    sel.replaceChildren();
  }
}
function saveTranslation(id) { const p = readPrefs(); p.translation_id = parseInt(id, 10) || 0; writePrefs(p); }
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
}

document.addEventListener('DOMContentLoaded', async () => {
  loadTheme();
  loadFont();
  loadTrFont();
  await loadReciters();
  await loadTranslations();
  document.querySelectorAll('input[name="theme"]').forEach(r => r.addEventListener('change', () => saveTheme(r.value)));
  const fs = document.getElementById('font-size');
  if (fs) fs.addEventListener('input', () => saveFont(parseInt(fs.value, 10)));
  const tfs = document.getElementById('tr-font-size');
  if (tfs) tfs.addEventListener('input', () => saveTrFont(parseInt(tfs.value, 10)));
  const recSel = document.getElementById('reciter-select');
  if (recSel) recSel.addEventListener('change', (e) => saveReciter(e.target.value));
  // Init translation prefs
  const p = readPrefs();
  const toggle = document.getElementById('translation-toggle');
  const trSel = document.getElementById('translation-select');
  if (toggle) toggle.checked = !!p.translation_on;
  if (trSel) trSel.disabled = !(toggle && toggle.checked);
  if (toggle) toggle.addEventListener('change', () => saveTranslationToggle(toggle.checked));
  if (trSel) trSel.addEventListener('change', (e) => saveTranslation(e.target.value));
});
