// prefs.js — central preferences (theme, fonts, reciter, translation)
window.QR = window.QR || {};

QR.prefs = (function(){
  function storageKey(){ try { return (QR.profiles && QR.profiles.key('qr_prefs')) || 'qr_prefs'; } catch { return 'qr_prefs'; } }

  function read(){ try { return JSON.parse((QR.profiles ? QR.profiles.getItem('qr_prefs') : localStorage.getItem('qr_prefs'))||'{}')||{}; } catch { return {}; } }
  function write(p){ try { const s = JSON.stringify(p||{}); if (QR.profiles) QR.profiles.setItem('qr_prefs', s); else localStorage.setItem('qr_prefs', s); } catch {} }
  function get(k, fallback){ const p = read(); return (k in p) ? p[k] : fallback; }
  function set(obj){ const p = read(); Object.assign(p, obj||{}); write(p); }

  function ensureTheme(){
    try {
      const theme = get('theme','dark');
      document.body.setAttribute('data-theme', theme);
    } catch {
      document.body.setAttribute('data-theme', 'dark');
    }
  }

  document.addEventListener('DOMContentLoaded', ensureTheme);

  return { read, write, get, set, ensureTheme, storageKey };
})();
