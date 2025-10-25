// page-data.js - shared page-level page metadata storage
window.QR = window.QR || {};

(function(){
  const STORAGE_KEY = 'qr_page_data';

  function readRaw(){
    try {
      const raw = (window.QR && QR.profiles && QR.profiles.getItem)
        ? QR.profiles.getItem(STORAGE_KEY)
        : localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
    return {};
  }

  function writeRaw(map){
    try {
      const payload = JSON.stringify(map || {});
      if (window.QR && QR.profiles && QR.profiles.setItem) QR.profiles.setItem(STORAGE_KEY, payload);
      else localStorage.setItem(STORAGE_KEY, payload);
    } catch {}
  }

  function normalize(entry){
    return {
      bookmark: !!(entry && entry.bookmark),
      note: entry && typeof entry.note === 'string' ? entry.note : '',
      confidence: entry && typeof entry.confidence === 'string' ? entry.confidence : '',
    };
  }

  function sanitizePatch(patch){
    const out = {};
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'bookmark')) out.bookmark = !!patch.bookmark;
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'note')) out.note = String(patch.note || '');
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'confidence')) out.confidence = String(patch.confidence || '');
    return out;
  }

  function get(page){
    const key = String(page || '');
    if (!key) return { bookmark: false, note: '', confidence: '' };
    const map = readRaw();
    return normalize(map[key]);
  }

  function set(page, patch){
    const key = String(page || '');
    if (!key) return;
    const map = readRaw();
    const current = normalize(map[key]);
    const changes = sanitizePatch(patch);
    const next = {
      bookmark: Object.prototype.hasOwnProperty.call(changes, 'bookmark') ? changes.bookmark : current.bookmark,
      note: Object.prototype.hasOwnProperty.call(changes, 'note') ? changes.note : current.note,
      confidence: Object.prototype.hasOwnProperty.call(changes, 'confidence') ? changes.confidence : current.confidence,
    };
    next.note = (next.note || '').trim();
    next.confidence = String(next.confidence || '').trim();
    if (!next.bookmark && !next.note && !next.confidence){
      if (map[key]) delete map[key];
    } else {
      map[key] = { bookmark: next.bookmark, note: next.note, confidence: next.confidence };
    }
    writeRaw(map);
    dispatchChanged(key, next);
  }

  function toggleBookmark(page){
    const key = String(page || '');
    if (!key) return false;
    const cur = get(key);
    const next = !cur.bookmark;
    set(key, { bookmark: next });
    return next;
  }

  function clear(page){
    const key = String(page || '');
    if (!key) return;
    const map = readRaw();
    if (map[key]){
      delete map[key];
      writeRaw(map);
      dispatchChanged(key, { bookmark: false, note: '', confidence: '' });
    }
  }

  function dispatchChanged(page, data){
    try {
      window.dispatchEvent(new CustomEvent('qr:page-data-changed', {
        detail: { page: String(page || ''), data: normalize(data) },
      }));
    } catch {}
  }

  QR.pageData = {
    get,
    set,
    toggleBookmark,
    clear,
    read: readRaw,
  };
})();
