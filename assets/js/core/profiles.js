// profiles.js — multi-profile support with scoped storage
window.QR = window.QR || {};

(function(){
  const LS_KEY = 'qr_profiles';

  function _read(){
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || null; } catch { return null; }
  }
  function _write(obj){
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj||{})); } catch {}
  }

  function _genId(){ return 'p' + Math.random().toString(36).slice(2,8); }

  function ensure(){
    let data = _read();
    if (!data || !Array.isArray(data.list) || !data.list.length){
      const def = { id: _genId(), name: 'Me', createdAt: Date.now() };
      data = { currentId: def.id, list: [def] };
      _write(data);
      // migrate legacy unscoped prefs to default profile on first run
      try {
        const legacyPrefs = JSON.parse(localStorage.getItem('qr_prefs')||'null');
        if (legacyPrefs) localStorage.setItem(key('qr_prefs', def.id), JSON.stringify(legacyPrefs));
      } catch {}
      try {
        const legacyHifdh = JSON.parse(localStorage.getItem('hifdh_progress')||'null');
        if (legacyHifdh) localStorage.setItem(key('hifdh_progress', def.id), JSON.stringify(legacyHifdh));
      } catch {}
    }
    return data;
  }

  function list(){ return ensure().list.slice(); }
  function currentId(){ return ensure().currentId; }
  function current(){ const id = currentId(); return list().find(p => p.id === id) || list()[0]; }
  function setCurrent(id){ const data = ensure(); if (data.list.some(p=>p.id===id)){ data.currentId = id; _write(data); dispatchEvent(); } }
  function add(name){ const data = ensure(); const p = { id:_genId(), name: String(name||'User'), createdAt: Date.now() }; data.list.push(p); data.currentId = p.id; _write(data); dispatchEvent(); return p; }
  function rename(id, name){ const data = ensure(); const p = data.list.find(x=>x.id===id); if (p){ p.name = String(name||p.name); _write(data); dispatchEvent(); } }
  function remove(id){ const data = ensure(); if (data.list.length<=1) return false; const idx = data.list.findIndex(p=>p.id===id); if (idx>=0){ data.list.splice(idx,1); if (data.currentId===id){ data.currentId = data.list[0].id; } _write(data); dispatchEvent(); return true; } return false; }

  // namespaced key helper: key('qr_prefs') => 'qr:<pid>:qr_prefs'
  function key(base, pid){ const id = String(pid || currentId() || '').trim(); return id ? `qr:${id}:${base}` : String(base); }

  // profile-scoped storage convenience
  function getItem(base){ try { return localStorage.getItem(key(base)); } catch { return null; } }
  function setItem(base, val){ try { localStorage.setItem(key(base), val); try { window.dispatchEvent(new CustomEvent('qr:data-changed', { detail: { base } })); } catch {} } catch {} }
  function removeItem(base){ try { localStorage.removeItem(key(base)); } catch {} }

  function dispatchEvent(){ try { window.dispatchEvent(new CustomEvent('qr:profile-changed', { detail: { id: currentId() } })); } catch {} }

  // expose
  QR.profiles = { list, currentId, current, setCurrent, add, rename, remove, key, getItem, setItem, removeItem };
})();
