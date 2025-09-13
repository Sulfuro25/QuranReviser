// prefs.js — central preferences (theme, fonts, reciter, translation)
window.QR = window.QR || {};

QR.prefs = (function(){
  const KEY = 'qr_prefs';

  function read(){ try { return JSON.parse(localStorage.getItem(KEY)||'{}')||{}; } catch { return {}; } }
  function write(p){ try { localStorage.setItem(KEY, JSON.stringify(p||{})); } catch {} }
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

  return { read, write, get, set, ensureTheme };
})();
