const API_BASE = 'https://api.quran.com/api/v4';
const listEl = document.getElementById('list');
const filterEl = document.getElementById('filter');
const tabSurahs = document.getElementById('tab-surahs');
const tabJuz = document.getElementById('tab-juz');
const tabHizb = document.getElementById('tab-hizb');
const viewToggle = document.getElementById('view-toggle');
const MODE_KEY = 'quran_list_mode';
const VIEW_KEY = 'qr_view_mode'; // 'reader' | 'mushaf'
let mode = 'surahs'; // 'surahs' | 'juz' | 'hizb'
let chapters = [];
let viewMode = 'reader';

function loadViewMode(){
  try { const v = (localStorage.getItem(VIEW_KEY)||'').toLowerCase(); if (v==='reader'||v==='mushaf') viewMode=v; } catch {}
  updateViewToggle();
}
function saveViewMode(){ try { localStorage.setItem(VIEW_KEY, viewMode); } catch {} }
function toggleView(){ viewMode = (viewMode==='reader') ? 'mushaf' : 'reader'; saveViewMode(); updateViewToggle(); renderAccordingToMode(); }
function updateViewToggle(){ if(viewToggle){ viewToggle.textContent = (viewMode==='reader') ? 'Mushaf' : 'Reader'; } }
function targetHref(query){
  const base = (viewMode==='mushaf') ? 'mushaf.html' : 'reader.html';
  return `${base}?${query}`;
}
function renderAccordingToMode(){
  if (mode === 'surahs') renderSurahs(filterEl.value);
  else if (mode === 'juz') renderJuz();
  else renderHizb();
}

function renderSurahs(filter='') {
  const term = (filter||'').trim().toLowerCase();
  const norm = s => (s||'').toString().toLowerCase();
  const frag = document.createDocumentFragment();
  (chapters||[]).filter(ch => {
    if (!term) return true;
    return norm(ch.id).startsWith(term) || norm(ch.name_simple).includes(term) || norm(ch.name_arabic).includes(term);
  }).forEach(ch => {
    const a = document.createElement('a');
    a.className = 'block';
    a.href = targetHref(`surah=${ch.id}&mode=surahs`);
    a.setAttribute('role', 'listitem');

    const id = document.createElement('div');
    id.className = 'id';
    id.textContent = ch.id;

    const names = document.createElement('div');
    names.className = 'names';
    const en = document.createElement('div');
    en.className = 'en';
    en.textContent = ch.name_simple;
    const ar = document.createElement('div');
    ar.className = 'ar';
    ar.textContent = ch.name_arabic;
    names.appendChild(en);
    names.appendChild(ar);

    a.appendChild(id);
    a.appendChild(names);
    frag.appendChild(a);
  });
  listEl.replaceChildren(frag);
}
function renderJuz() {
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 30; i++) {
    const a = document.createElement('a');
    a.href = targetHref(`juz=${i}&mode=juz`);
    a.className = 'block';
    a.setAttribute('role', 'listitem');
    const id = document.createElement('div');
    id.className = 'id';
    id.textContent = i;
    const names = document.createElement('div');
    names.className = 'names';
    const en = document.createElement('div');
    en.className = 'en';
    en.textContent = `Juz ${i}`;
    const ar = document.createElement('div');
    ar.className = 'ar';
    ar.textContent = '';
    names.appendChild(en);
    names.appendChild(ar);
    a.appendChild(id);
    a.appendChild(names);
    frag.appendChild(a);
  }
  listEl.replaceChildren(frag);
}
function renderHizb() {
  const frag = document.createDocumentFragment();
  for (let i = 1; i <= 60; i++) {
    const a = document.createElement('a');
    a.href = targetHref(`hizb=${i}&mode=hizb`);
    a.className = 'block';
    a.setAttribute('role', 'listitem');
    const id = document.createElement('div');
    id.className = 'id';
    id.textContent = i;
    const names = document.createElement('div');
    names.className = 'names';
    const en = document.createElement('div');
    en.className = 'en';
    en.textContent = `Hizb ${i}`;
    const ar = document.createElement('div');
    ar.className = 'ar';
    ar.textContent = '';
    names.appendChild(en);
    names.appendChild(ar);
    a.appendChild(id);
    a.appendChild(names);
    frag.appendChild(a);
  }
  listEl.replaceChildren(frag);
}
function setMode(next) {
  mode = next;
  const setPressed = (btn, on) => { if (!btn) return; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.setAttribute('aria-selected', on ? 'true' : 'false'); };
  setPressed(tabSurahs, mode === 'surahs');
  setPressed(tabJuz, mode === 'juz');
  setPressed(tabHizb, mode === 'hizb');
  if (filterEl) filterEl.style.display = (mode === 'surahs') ? 'block' : 'none';
  try { localStorage.setItem(MODE_KEY, mode); } catch {}
  try {
    const url = new URL(location.href);
    url.searchParams.set('mode', mode);
    history.replaceState(null, '', url);
  } catch {}
  if (mode === 'surahs') renderSurahs(filterEl.value);
  else if (mode === 'juz') renderJuz();
  else renderHizb();
}

async function load() {
  try {
    const res = await fetch(`${API_BASE}/chapters?language=en`);
    const data = await res.json();
    chapters = data.chapters || [];
    const params = new URLSearchParams(location.search);
    const urlMode = (params.get('mode')||'').toLowerCase();
    let initial = 'surahs';
    if (["surahs","juz","hizb"].includes(urlMode)) initial = urlMode;
    else {
      try {
        const saved = localStorage.getItem(MODE_KEY) || '';
        if (["surahs","juz","hizb"].includes(saved)) initial = saved;
      } catch {}
    }
    loadViewMode();
    setMode(initial);
  } catch (e) {
    listEl.textContent = 'Failed to load chapters. Check your connection.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.body.getAttribute('data-theme')) document.body.setAttribute('data-theme', 'dark');
  load();
});
filterEl.addEventListener('input', () => { if (mode === 'surahs') renderSurahs(filterEl.value); });
tabSurahs.addEventListener('click', () => setMode('surahs'));
tabJuz.addEventListener('click', () => setMode('juz'));
tabHizb.addEventListener('click', () => setMode('hizb'));
if (viewToggle) viewToggle.addEventListener('click', toggleView);

