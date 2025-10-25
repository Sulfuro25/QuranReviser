// sync.js - Cloud Sync (Google Drive AppData) for profile-scoped data
// Requires a Google OAuth Client ID provided via:
//   <meta name="google-client-id" content="YOUR_CLIENT_ID.apps.googleusercontent.com">
// Syncs these per-profile keys: qr_prefs, hifdh_progress, qr_bookmarks, qr_notes, qr_page_data, qr_confidence, qr_review, qr_streak

window.QR = window.QR || {};

(function(){
  const DRIVE_API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const KEYS = ['qr_prefs','hifdh_progress','qr_bookmarks','qr_notes','qr_page_data','qr_confidence','qr_review','qr_streak'];

  let token = null; // access token (session)

  function clientId(){
    try { const m = document.querySelector('meta[name="google-client-id"]'); const cid = (m && m.getAttribute('content')) || ''; return cid.trim(); } catch { return ''; }
  }

  function fileName(){ try { const pid = QR.profiles.currentId(); return `quran-reviser-profile-${pid}.json`; } catch { return 'quran-reviser-profile-default.json'; } }

  function setStatus(txt){ try { const el = document.getElementById('sync-status'); if (el) el.textContent = txt || ''; } catch {}
    try { const state = { connected: !!token, at: Date.now() }; QR.profiles.setItem('qr_sync_state', JSON.stringify(state)); } catch {}
  }

  async function ensureGis(){
    if (window.google && window.google.accounts && window.google.accounts.oauth2) return true;
    await new Promise((resolve, reject)=>{
      const s = document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.async=true; s.defer=true; s.onload=resolve; s.onerror=reject; document.head.appendChild(s);
    });
    return true;
  }

  async function ensureToken(interactive=true){
    if (token) return token;
    const cid = clientId();
    if (!cid) { setStatus('Set Google Client ID in <meta name="google-client-id">'); throw new Error('Missing Google Client ID'); }
    await ensureGis();
    token = await new Promise((resolve, reject)=>{
      try {
        const tc = google.accounts.oauth2.initTokenClient({ client_id: cid, scope: SCOPE, callback: (res)=>{ if (res && res.access_token) resolve(res.access_token); else reject(new Error('No access token')); } });
        tc.requestAccessToken({ prompt: interactive ? 'consent' : '' });
      } catch(e){ reject(e); }
    });
    setStatus('Connected to Google');
    return token;
  }

  function authHeaders(){ return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }; }

  async function driveFind(){
    const name = fileName();
    const url = `${DRIVE_API}/files?q=name='${encodeURIComponent(name).replace(/'/g,"\\'")}' and trashed=false and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id,name)`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Drive list failed: '+res.status);
    const data = await res.json();
    const f = (data.files||[])[0];
    return f ? { id: f.id, name: f.name } : null;
  }

  async function driveDownload(fileId){
    const url = `${DRIVE_API}/files/${fileId}?alt=media`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Drive download failed: '+res.status);
    return await res.json();
  }

  async function driveCreate(contentObj){
    const meta = { name: fileName(), parents: ['appDataFolder'], mimeType: 'application/json' };
    const body = buildMultipart(meta, contentObj);
    const res = await fetch(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body
    });
    if (!res.ok) throw new Error('Drive create failed: '+res.status);
    return await res.json();
  }

  async function driveUpdate(fileId, contentObj){
    const res = await fetch(`${UPLOAD_API}/${fileId}?uploadType=media`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(contentObj||{})
    });
    if (!res.ok) throw new Error('Drive update failed: '+res.status);
    return await res.json();
  }

  function buildMultipart(meta, obj){
    const boundary = 'boundary'+Math.random().toString(16).slice(2);
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`);
    parts.push(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(obj||{})}\r\n`);
    parts.push(`--${boundary}--`);
    return new Blob(parts, { type: 'multipart/related; boundary='+boundary });
  }

  function collectLocal(){
    const out = { version: 1, updatedAt: new Date().toISOString(), profileId: (QR.profiles && QR.profiles.currentId()) || null, items: {} };
    KEYS.forEach(k => { try { const v = QR.profiles.getItem(k); out.items[k] = { updatedAt: new Date().toISOString(), value: v }; } catch { out.items[k] = { updatedAt: new Date().toISOString(), value: null }; } });
    return out;
  }

  function applyRemote(obj){
    try {
      const items = (obj && obj.items) || {};
      Object.keys(items).forEach(k => {
        const val = items[k] && items[k].value;
        if (val !== undefined) QR.profiles.setItem(k, String(val));
      });
    } catch(e) { console.error(e); }
  }

  async function pull(){
    await ensureToken(true);
    setStatus('Sync: pulling...');
    const f = await driveFind();
    if (!f) { setStatus('No cloud data found'); return { created:false, applied:false }; }
    const data = await driveDownload(f.id);
    applyRemote(data);
    setStatus('Pulled from cloud');
    return { created:false, applied:true };
  }

  async function push(){
    await ensureToken(true);
    setStatus('Sync: pushing...');
    const payload = collectLocal();
    const found = await driveFind();
    if (!found){ await driveCreate(payload); setStatus('Created cloud backup'); return { created:true }; }
    await driveUpdate(found.id, payload);
    setStatus('Pushed to cloud');
    return { created:false };
  }

  // --- Auto sync helpers ---
  let _autoBound = false;
  let _pushTimer = null;
  function schedulePush(delayMs=1000){
    if (!token) return; // not connected
    clearTimeout(_pushTimer);
    _pushTimer = setTimeout(()=>{ push().catch(()=>{}); }, delayMs);
  }
  function bindAuto(){
    if (_autoBound) return; _autoBound = true;
    try { window.addEventListener('qr:data-changed', ()=> schedulePush(1200)); } catch {}
    try { window.addEventListener('beforeunload', ()=>{ try { if (token) navigator.sendBeacon && navigator.sendBeacon; } catch {} }); } catch {}
  }

  async function connectAndAuto(){
    await ensureToken(true);
    // On first connect: pull remote (if any), then push local snapshot, then bind autosave
    try { const f = await driveFind(); if (f){ const data = await driveDownload(f.id); applyRemote(data); setStatus('Pulled from cloud'); } } catch {}
    try { await push(); } catch {}
    bindAuto();
    return true;
  }

  function disconnect(){ token = null; setStatus('Disconnected'); }
  function isConnected(){ return !!token; }

  QR.sync = { connect: connectAndAuto, pull, push, disconnect, isConnected };
})();
