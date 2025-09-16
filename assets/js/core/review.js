// review.js — simple spaced repetition scheduler (per profile)
// Stores per-verse schedule: { last: ISO, intervalDays: number, due: ISO }
window.QR = window.QR || {};

(function(){
  function _read(){ try { return JSON.parse(QR.profiles.getItem('qr_review')||'null') || {}; } catch { return {}; } }
  function _write(obj){ try { QR.profiles.setItem('qr_review', JSON.stringify(obj||{})); } catch {} }
  function _now(){ const d=new Date(); d.setSeconds(0,0); return d; }
  function _toISO(d){ try { return d.toISOString(); } catch { return new Date().toISOString(); } }
  function _fromISO(s){ try { return s?new Date(s):null; } catch { return null; } }

  function markSeen(verseKey){ const m=_read(); const k=String(verseKey||''); if(!k) return; const it = m[k] || {}; const now=_now(); it.last = _toISO(now); if (!it.intervalDays) it.intervalDays = 1; if (!it.due){ const d=new Date(now); d.setDate(d.getDate()+it.intervalDays); it.due = _toISO(d);} m[k]=it; _write(m); dispatch(); }

  function setConfidence(verseKey, level){ const m=_read(); const k=String(verseKey||''); if(!k) return; if(!level){ delete m[k]; _write(m); dispatch(); return; }
    const now=_now(); const it = m[k] || {}; it.last = _toISO(now);
    // Base intervals (can be tuned later)
    const base = level==='weak' ? 1 : level==='ok' ? 3 : 7;
    // Simple escalation: if already had an interval and level is strong, grow
    const prev = Number(it.intervalDays||0) || base;
    it.intervalDays = (level==='strong' && prev>=7) ? Math.min(prev*2, 60) : base;
    const d=new Date(now); d.setDate(d.getDate()+it.intervalDays); it.due = _toISO(d);
    m[k]=it; _write(m); dispatch(); }

  function remove(k){ const m=_read(); delete m[String(k)]; _write(m); dispatch(); }

  function dueList(limit){ const m=_read(); const now=_now(); const arr = Object.entries(m).filter(([k,it])=>{ const dd=_fromISO(it.due); return dd && dd<=now; }).sort((a,b)=>{ const da=_fromISO(a[1].due), db=_fromISO(b[1].due); return (da-db); }).map(([k])=>k); if (typeof limit==='number'&&limit>0) return arr.slice(0,limit); return arr; }

  function planForToday(limitAyah){
    const lim = Math.max(1, Number(limitAyah||20));
    const pick = [];
    const due = dueList(lim);
    pick.push(...due);
    if (pick.length>=lim) return pick.slice(0,lim);
    // fill using confidence map (weak first, then ok)
    let conf={}; try { conf = QR.confidence.read(); } catch {}
    const keys = Object.keys(conf||{});
    const weak = keys.filter(k=>conf[k]==='weak' && !pick.includes(k));
    const ok = keys.filter(k=>conf[k]==='ok' && !pick.includes(k));
    for(const k of weak){ if (pick.length<lim) pick.push(k); else break; }
    for(const k of ok){ if (pick.length<lim) pick.push(k); else break; }
    return pick.slice(0,lim);
  }

  function groupBySurah(keys){ const g = new Map(); (keys||[]).forEach(k=>{ const sid = String(k).split(':')[0]; if (!g.has(sid)) g.set(sid, []); g.get(sid).push(k); }); return g; }

  function dispatch(){ try { window.dispatchEvent(new CustomEvent('qr:review-updated')); } catch {} }

  // hook confidence changes
  window.addEventListener('qr:confidence-changed', (e)=>{ try { const k=e.detail.key, level=e.detail.level; setConfidence(k, level); } catch {} });

  QR.review = { markSeen, setConfidence, remove, dueList, planForToday, groupBySurah };
})();

