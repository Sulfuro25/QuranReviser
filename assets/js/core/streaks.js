// streaks.js — simple daily activity streak tracking (per profile)
window.QR = window.QR || {};

(function(){
  function _todayStr(){ const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
  function _yesterdayStr(){ const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); }

  function read(){ try { return JSON.parse(QR.profiles.getItem('qr_streak')||'null') || { current:0, best:0, days:{} }; } catch { return { current:0, best:0, days:{} }; } }
  function write(obj){ try { QR.profiles.setItem('qr_streak', JSON.stringify(obj||{})); } catch {} }

  function bump(kind){ // kind informational only
    const s = read(); const t = _todayStr(); s.days[t] = (Number(s.days[t])||0) + 1;
    const y = _yesterdayStr();
    const hadYesterday = Number(s.days[y]||0) > 0;
    const hadToday = Number(s.days[t]||0) > 0;
    if (hadToday){ s.current = hadYesterday ? (Number(s.current)||0)+1 : 1; }
    if ((Number(s.best)||0) < (Number(s.current)||0)) s.best = s.current;
    write(s);
    try { window.dispatchEvent(new CustomEvent('qr:streak-updated', { detail: s })); } catch {}
  }

  function summary(){ const s = read(); return { current: Number(s.current)||0, best: Number(s.best)||0, days: s.days||{} }; }

  QR.streaks = { bump, summary };
})();

