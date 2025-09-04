const API_BASE = 'https://api.quran.com/api/v4';

async function loadChapters() {
    try {
        const response = await fetch(`${API_BASE}/chapters?language=en`);
        const data = await response.json();
        const select = document.getElementById('surah-select');
        data.chapters.forEach(chapter => {
            const option = document.createElement('option');
            option.value = chapter.id;
            option.textContent = `${chapter.name_simple} (${chapter.name_arabic})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading chapters:', error);
        alert('Failed to load Surah list. Please try again.');
    }
}

async function fetchAllVerses(surahId) {
    let verses = [];
    let page = 1;
    const perPage = 50;
    while (true) {
        try {
            const response = await fetch(`${API_BASE}/verses/by_chapter/${surahId}?fields=text_uthmani_tajweed&per_page=${perPage}&page=${page}`);
            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            verses = verses.concat(data.verses);
            if (!data.pagination.next_page) break;
            page++;
        } catch (error) {
            console.error('Error fetching verses:', error);
            alert('Failed to load verses. Please check your connection.');
            return [];
        }
    }
    return verses;
}

function displayVerses(verses, start, end) {
    const display = document.getElementById('quran-display');
    display.innerHTML = '';
    const slicedVerses = verses.slice(start - 1, end);
    slicedVerses.forEach(verse => {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse';
        const arabicSpan = document.createElement('span');
        arabicSpan.className = 'arabic';
        arabicSpan.innerHTML = verse.text_uthmani_tajweed;
        verseDiv.appendChild(arabicSpan);
        const numSpan = document.createElement('span');
        numSpan.className = 'verse-num';
        numSpan.textContent = `(${verse.verse_number})`;
        verseDiv.appendChild(numSpan);
        display.appendChild(verseDiv);
    });
}

document.getElementById('load-btn').addEventListener('click', async () => {
    const surahId = document.getElementById('surah-select').value;
    const rangeInput = document.getElementById('ayah-range').value.trim();
    if (!surahId) return alert('Please select a Surah.');

    const verses = await fetchAllVerses(surahId);
    if (verses.length === 0) return;

    let start = 1;
    let end = verses.length;
    if (rangeInput) {
        const parts = rangeInput.split('-').map(Number);
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] <= parts[1]) {
            start = Math.max(1, parts[0]);
            end = Math.min(verses.length, parts[1]);
        } else {
            alert('Invalid range format. Use e.g., 1-10');
            return;
        }
    }
    displayVerses(verses, start, end);
});

// Load chapters on page load
loadChapters();