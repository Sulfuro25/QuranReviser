// confidence.js — per-ayah confidence levels (per profile)
// level: '', 'weak', 'ok', 'strong'
window.QR = window.QR || {};

(function(){
  function read(){ try { return JSON.parse(QR.profiles.getItem('qr_confidence')||'null') || {}; } catch { return {}; } }
  function write(obj){ try { QR.profiles.setItem('qr_confidence', JSON.stringify(obj||{})); } catch {} }
  function get(k){ const m = read(); return String(m[String(k)]||''); }
  function set(k, level){ const m = read(); if (level) m[String(k)] = level; else delete m[String(k)]; write(m); try { window.dispatchEvent(new CustomEvent('qr:confidence-changed', { detail: { key:String(k), level } })); } catch {} }
  function counts(){ const m = read(); const c={ weak:0, ok:0, strong:0 }; Object.values(m).forEach(v=>{ if (v==='weak') c.weak++; else if (v==='ok') c.ok++; else if (v==='strong') c.strong++; }); return c; }
  QR.confidence = { read, write, get, set, counts };
})();

