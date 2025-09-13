// utils.js — shared helpers
window.QR = window.QR || {};

QR.utils = (function(){
  function clamp(n,min,max){
    n = Number(n)||0;
    if(n<min) return min;
    if(n>max) return max;
    return n;
  }

  function parseRangeList(input, max){
    if (!input || typeof input !== 'string') return [];
    const out = new Set();
    input.split(',').map(s => s.trim()).filter(Boolean).forEach(chunk => {
      const m = chunk.match(/^([0-9]{1,3})(?:\s*-\s*([0-9]{1,3}))?$/);
      if (!m) return;
      const a = Math.max(1, Math.min(max, parseInt(m[1],10)||0));
      const b = m[2] ? Math.max(1, Math.min(max, parseInt(m[2],10)||0)) : a;
      const start = Math.min(a,b), end = Math.max(a,b);
      for(let i=start;i<=end;i++) out.add(i);
    });
    return Array.from(out.values()).sort((x,y)=>x-y);
  }

  function seededRng(seed){
    if (!seed) return Math.random;
    let s = 0; const str = String(seed);
    for (let i=0;i<str.length;i++){ s = (s*31 + str.charCodeAt(i)) >>> 0; }
    return function(){
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
      return ((s>>>0) % 1_000_000) / 1_000_000;
    };
  }

  return { clamp, parseRangeList, seededRng };
})();
