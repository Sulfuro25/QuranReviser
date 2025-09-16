// api.js — Quran.com API helpers
window.QR = window.QR || {};

QR.api = (function(){
  const API_BASE = 'https://api.quran.com/api/v4';
  const AUDIO_CDN = 'https://audio.qurancdn.com/';

  async function paginateVerses(urlBase){
    try {
      const first = await fetch(`${urlBase}&page=1`).then(r=>r.json());
      const totalPages = (first?.pagination?.total_pages) || 1;
      const all = Array.isArray(first.verses) ? first.verses.slice() : [];
      for(let p=2;p<=totalPages;p++){
        try {
          const d = await fetch(`${urlBase}&page=${p}`).then(r=>r.json());
          if (Array.isArray(d.verses)) all.push(...d.verses);
        } catch {}
      }
      return all;
    } catch { return []; }
  }

  async function fetchVersesByChapter(ch, extraFields='page_number'){
    const url = `${API_BASE}/verses/by_chapter/${ch}?per_page=300&words=false${extraFields?`&fields=${extraFields}`:''}`;
    const res = await fetch(url); if(!res.ok) throw new Error('Chapter HTTP '+res.status);
    const data = await res.json(); return data.verses || [];
  }

  // Word-by-word (WBW) variants
  function wbwCacheKey(kind, id){ return `qr_wbw_${kind}_${id}`; }
  function readCache(kind, id){ try { return JSON.parse(localStorage.getItem(wbwCacheKey(kind,id))||'null'); } catch { return null; } }
  function writeCache(kind, id, payload){ try { localStorage.setItem(wbwCacheKey(kind,id), JSON.stringify(payload||null)); } catch {} }

  async function fetchVersesByChapterWBW(ch, wordFields='translation,transliteration,root,lemma', extraFields='page_number'){
    try { const c = readCache('chapter', ch); if (c && Array.isArray(c)) return c; } catch {}
    const f = ['text_uthmani']; if (extraFields) f.push(extraFields);
    const url = `${API_BASE}/verses/by_chapter/${ch}?per_page=300&words=true&word_fields=${encodeURIComponent(wordFields)}&fields=${encodeURIComponent(f.join(','))}`;
    const res = await fetch(url); if(!res.ok) throw new Error('Chapter WBW HTTP '+res.status);
    const data = await res.json(); const out = data.verses || [];
    writeCache('chapter', ch, out);
    return out;
  }

  async function fetchVersesByRange(range, id, extraFields='page_number', perPage=300){
    const urlBase = `${API_BASE}/verses/by_${range}/${id}?per_page=${perPage}&words=false${extraFields?`&fields=${extraFields}`:''}`;
    return paginateVerses(urlBase);
  }

  async function fetchVersesByRangeWBW(range, id, wordFields='translation,transliteration,root,lemma', extraFields='page_number', perPage=300){
    try { const c = readCache(`${range}`, id); if (c && Array.isArray(c)) return c; } catch {}
    const f = ['text_uthmani']; if (extraFields) f.push(extraFields);
    const urlBase = `${API_BASE}/verses/by_${range}/${id}?per_page=${perPage}&words=true&word_fields=${encodeURIComponent(wordFields)}&fields=${encodeURIComponent(f.join(','))}`;
    const out = await paginateVerses(urlBase);
    writeCache(`${range}`, id, out);
    return out;
  }

  async function fetchVersesByPage(page, extraFields='page_number'){
    const url = `${API_BASE}/verses/by_page/${page}?per_page=300&words=false${extraFields?`&fields=${extraFields}`:''}`;
    const res = await fetch(url); if(!res.ok) throw new Error('Page HTTP '+res.status);
    const data = await res.json(); return data.verses || [];
  }

  async function fetchAudioMap(recitationId, chapterNumber){
    const merged = new Map(); let page = 1;
    while(true){
      const res = await fetch(`${API_BASE}/recitations/${recitationId}/by_chapter/${chapterNumber}?per_page=300&page=${page}`);
      if(!res.ok) throw new Error('Audio HTTP '+res.status);
      const data = await res.json();
      (data.audio_files||[]).forEach(a => merged.set(a.verse_key, AUDIO_CDN + a.url));
      const next = (data.pagination?.next_page) || (data.meta?.next_page) || null;
      if(!next) break; page = next; if(page>20) break;
    }
    return merged;
  }

  return { API_BASE, paginateVerses, fetchVersesByChapter, fetchVersesByRange, fetchVersesByPage, fetchAudioMap, fetchVersesByChapterWBW, fetchVersesByRangeWBW };
})();
