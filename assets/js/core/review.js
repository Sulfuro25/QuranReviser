// review.js — simple spaced repetition scheduler (per profile)
// Stores per-verse schedule: { last: ISO, intervalDays: number, due: ISO }
window.QR = window.QR || {};

(function(){
  function _read(){ try { return JSON.parse(QR.profiles.getItem('qr_review')||'null') || {}; } catch { return {}; } }
  function _write(obj){ try { QR.profiles.setItem('qr_review', JSON.stringify(obj||{})); } catch {} }
  function _now(){ const d=new Date(); d.setSeconds(0,0); return d; }
  function _toISO(d){ try { return d.toISOString(); } catch { return new Date().toISOString(); } }
  function _fromISO(s){ try { return s?new Date(s):null; } catch { return null; } }

  function markSeen(verseKey){ 
    // Validate verse key
    const validate = window.QR && QR.utils && QR.utils.validateVerseKey;
    if (validate && !validate(verseKey)) {
      console.warn('Invalid verse key in markSeen:', verseKey);
      return;
    }
    const m=_read(); const k=String(verseKey||''); if(!k) return; const it = m[k] || {}; const now=_now(); it.last = _toISO(now); if (!it.intervalDays) it.intervalDays = 1; if (!it.due){ const d=new Date(now); d.setDate(d.getDate()+it.intervalDays); it.due = _toISO(d);} m[k]=it; _write(m); 
  }

  function setConfidence(verseKey, level){ 
    // Validate inputs
    const validateKey = window.QR && QR.utils && QR.utils.validateVerseKey;
    if (validateKey && !validateKey(verseKey)) {
      console.warn('Invalid verse key in setConfidence:', verseKey);
      return;
    }
    const validateLevel = window.QR && QR.utils && QR.utils.validateConfidenceLevel;
    if (level && validateLevel && !validateLevel(level)) {
      console.warn('Invalid confidence level:', level);
      return;
    }
    const m=_read(); const k=String(verseKey||''); if(!k) return; if(!level){ delete m[k]; _write(m); return; }
    const now=_now(); const it = m[k] || {}; it.last = _toISO(now);
    // Base intervals (can be tuned later)
    const base = level==='weak' ? 1 : level==='ok' ? 3 : 7;
    // Simple escalation: if already had an interval and level is strong, grow
    const prev = Number(it.intervalDays||0) || base;
    it.intervalDays = (level==='strong' && prev>=7) ? Math.min(prev*2, 60) : base;
    const d=new Date(now); d.setDate(d.getDate()+it.intervalDays); it.due = _toISO(d);
    m[k]=it; _write(m); }

  // hook confidence changes
  window.addEventListener('qr:confidence-changed', (e)=>{ try { const k=e.detail.key, level=e.detail.level; setConfidence(k, level); } catch {} });

  QR.review = { markSeen, setConfidence };
})();

