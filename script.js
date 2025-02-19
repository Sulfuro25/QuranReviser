// Load the Quran verses from the JSON file
let quran = [];
let currentSurahIndex = 0;
let currentVerseIndex = 0;
let displayedVerses = [];
let selectedSurahs = [];
let isSurahNameHidden = false;
let isVerseNumberVisible = true;
const juzs = quran.juzs;
let isJuzSelection = false; // Default to Surah selection

// Fetch Quran data
fetch('quran_verses.json')
  .then(response => response.json())
  .then(data => {
    quran = data.quran; // Load the entire Quran object (including sura and juzs)
    console.log('Quran data loaded:', quran);
    loadSurahSelection(); // Load surah selection UI
    loadSavedSelection(); // Load saved selection from local storage
  })
  .catch(error => console.error('Error loading Quran verses:', error));

// Function to load surah selection UI
function loadSurahSelection() {
  const surahSelection = document.getElementById('surah-selection');
  surahSelection.innerHTML = ''; // Effacer le contenu précédent

  if (isJuzSelection) {
    // Charger la sélection des Juzz
    quran.juzs.forEach((juz, index) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = index;
      checkbox.checked = selectedSurahs.includes(index); // Préserver l'état de sélection
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(`الجزء ${juz.index}`));
      surahSelection.appendChild(label);
    });
  } else {
    // Charger la sélection des sourates
    quran.sura.forEach((surah, index) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = index;
      checkbox.checked = selectedSurahs.includes(index); // Préserver l'état de sélection
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(surah._name));
      surahSelection.appendChild(label);
    });
  }
}

document.getElementById('toggle-selection-btn').addEventListener('click', () => {
  isJuzSelection = !isJuzSelection; // Toggle between Surah and Juz selection
  document.getElementById('toggle-selection-btn').textContent = isJuzSelection
    ? 'التحديد حسب الأجزاء'
    : 'التحديد حسب السور';
  loadSurahSelection(); // Reload the selection UI
});

// Function to load saved selection from local storage
function loadSavedSelection() {
  const savedSurahs = localStorage.getItem('selectedSurahs');
  if (savedSurahs) {
    selectedSurahs = JSON.parse(savedSurahs);
    quran.forEach((surah, index) => {
      const checkbox = document.querySelector(`#surah-selection input[value="${index}"]`);
      if (checkbox) {
        checkbox.checked = selectedSurahs.includes(index);
      }
    });
  } else {
    selectedSurahs = quran.map((_, index) => index); // Default to all surahs selected
  }
}

// Function to display a random verse from selected surahs
function displayRandomVerse() {
  const errorMessage = document.getElementById('error-message');
  if (quran.length === 0 || selectedSurahs.length === 0) {
    errorMessage.textContent = "يرجى اختيار سورة أو جزء واحد على الأقل قبل طلب آية عشوائية";
    errorMessage.style.display = 'block';
    return;
  }

  if (isJuzSelection) {
    // Étape 1 : Calculer la plage totale des versets pour tous les Juzz sélectionnés
    let totalVerses = 0;
    const juzRanges = [];

    selectedSurahs.forEach(juzIndex => {
      const juz = quran.juzs[juzIndex];

      // Trouver la sourate et le verset correspondant au début du Juz
      const startSurah = quran.sura.find(s => s._index === juz.start.sura.toString());
      const startVerseIndex = startSurah.aya.findIndex(a => a._index === juz.start.aya.toString());

      // Trouver la sourate et le verset correspondant à la fin du Juz
      const endSurah = quran.sura.find(s => s._index === juz.end.sura.toString());
      const endVerseIndex = endSurah.aya.findIndex(a => a._index === juz.end.aya.toString());

      // Calculer le nombre de versets dans ce Juz
      let versesInRange = 0;
      if (startSurah._index === endSurah._index) {
        // Si le Juz commence et se termine dans la même sourate
        versesInRange = endVerseIndex - startVerseIndex + 1;
      } else {
        // Si le Juz s'étend sur plusieurs sourates
        // Versets restants dans la sourate de début
        versesInRange += startSurah.aya.length - startVerseIndex;
        // Versets dans les sourates intermédiaires
        for (let i = parseInt(startSurah._index) + 1; i < parseInt(endSurah._index); i++) {
          const surah = quran.sura.find(s => s._index === i.toString());
          versesInRange += surah.aya.length;
        }
        // Versets dans la sourate de fin
        versesInRange += endVerseIndex + 1;
      }

      // Ajouter la plage de ce Juz à la liste des plages
      juzRanges.push({ juzIndex, startSurah, startVerseIndex, endSurah, endVerseIndex, versesInRange });
      totalVerses += versesInRange;
    });

    // Étape 2 : Choisir un index aléatoire dans la plage totale des versets
    const randomVerseIndex = Math.floor(Math.random() * totalVerses);

    // Étape 3 : Trouver le Juzz et le verset correspondant à cet index
    let cumulativeVerses = 0;
    let selectedJuzRange = null;

    for (const range of juzRanges) {
      if (randomVerseIndex < cumulativeVerses + range.versesInRange) {
        selectedJuzRange = range;
        break;
      }
      cumulativeVerses += range.versesInRange;
    }

    // Étape 4 : Sélectionner le verset correspondant
    let verseIndexInRange = randomVerseIndex - cumulativeVerses;
    let currentSurah = selectedJuzRange.startSurah;
    let currentVerseIndexInSurah = selectedJuzRange.startVerseIndex;

    while (verseIndexInRange >= 0) {
      const versesRemainingInSurah = currentSurah.aya.length - currentVerseIndexInSurah;
      if (verseIndexInRange < versesRemainingInSurah) {
        // Le verset se trouve dans cette sourate
        const verse = currentSurah.aya[currentVerseIndexInSurah + verseIndexInRange];
        displayedVerses = [{ surah: currentSurah, verse }];
        currentSurahIndex = selectedJuzRange.juzIndex; // Mettre à jour l'index du Juz actuel
        currentVerseIndex = currentVerseIndexInSurah + verseIndexInRange;
        break;
      } else {
        // Passer à la sourate suivante
        verseIndexInRange -= versesRemainingInSurah;
        const nextSurahIndex = parseInt(currentSurah._index) + 1;
        currentSurah = quran.sura.find(s => s._index === nextSurahIndex.toString());
        currentVerseIndexInSurah = 0;
      }
    }
  } else {
    // Mode Surah
    const randomSurahIndex = selectedSurahs[Math.floor(Math.random() * selectedSurahs.length)];
    const surah = quran.sura[randomSurahIndex];
    currentVerseIndex = Math.floor(Math.random() * surah.aya.length);
    const verse = surah.aya[currentVerseIndex];

    displayedVerses = [{ surah, verse }];
    currentSurahIndex = randomSurahIndex;
  }
  displayVerses();
}

// Function to display the next verse
function displayNextVerse() {
  if (quran.length === 0 || displayedVerses.length === 0) return;

  if (isJuzSelection) {
    // Mode Juzz
    const currentJuz = quran.juzs[currentSurahIndex]; // currentSurahIndex représente l'index du Juz actuel
    const surah = quran.sura.find(s => s._index === currentJuz.start.sura.toString());
    const verseIndex = surah.aya.findIndex(a => a._index === currentJuz.start.aya.toString());

    // Passer au verset suivant dans le Juz
    currentVerseIndex = (currentVerseIndex + 1) % surah.aya.length;

    // Si on dépasse la fin du Juz, passer au Juz suivant
    if (currentVerseIndex === 0) {
      const nextJuzIndex = (currentSurahIndex + 1) % quran.juzs.length;
      currentSurahIndex = nextJuzIndex;
      const nextJuz = quran.juzs[nextJuzIndex];
      const nextSurah = quran.sura.find(s => s._index === nextJuz.start.sura.toString());
      currentVerseIndex = nextSurah.aya.findIndex(a => a._index === nextJuz.start.aya.toString());
    }

    const nextVerse = surah.aya[currentVerseIndex];
    displayedVerses.push({ surah, verse: nextVerse });
  } else {
    // Mode Surah
    const surah = quran.sura[currentSurahIndex];
    currentVerseIndex = (currentVerseIndex + 1) % surah.aya.length;

    // Si on dépasse la fin de la sourate, passer à la sourate suivante
    if (currentVerseIndex === 0) {
      const nextSurahIndex = (currentSurahIndex + 1) % quran.sura.length;
      currentSurahIndex = nextSurahIndex;
    }

    const nextVerse = quran.sura[currentSurahIndex].aya[currentVerseIndex];
    displayedVerses.push({ surah: quran.sura[currentSurahIndex], verse: nextVerse });
  }

  // Limiter le nombre de versets affichés
  if (displayedVerses.length > 3) {
    displayedVerses.shift();
  }

  displayVerses();
}

// Function to display all verses in the container
function displayVerses() {
  const verseContainer = document.getElementById('verse-container');
  verseContainer.innerHTML = '';

  if (!isSurahNameHidden) {
    const surahNameElement = document.createElement('p');
    surahNameElement.style.fontSize = '1.5em';
    surahNameElement.style.fontFamily = "'Noto Sans Arabic', serif";
    surahNameElement.style.fontWeight = 'bold'
    surahNameElement.style.color = '#007bff';
    surahNameElement.textContent = `سورة ${displayedVerses[0].surah._name}`;
    verseContainer.appendChild(surahNameElement);
  }

  displayedVerses.forEach((verseData, index) => {
    const verseElement = document.createElement('p');
    verseElement.style.fontSize = '1.5em';
    verseElement.style.fontFamily = "'Noto Sans Arabic', serif";
    verseElement.textContent = `${verseData.verse._text} (${verseData.verse._index})`;
    verseContainer.appendChild(verseElement);
  });
}

// Toggle Surah Name Visibility
document.getElementById('toggle-surah-btn').addEventListener('click', () => {
  isSurahNameHidden = !isSurahNameHidden;
  document.getElementById('toggle-surah-btn').textContent = isSurahNameHidden
    ? 'إظهار اسم السورة'
    : 'إخفاء اسم السورة';
  displayVerses(); // Refresh the display
});

// Redirect to "Quranic Virtues"
document.getElementById('redirect-btn').addEventListener('click', () => {
  window.location.href = 'virtues.html'; // Replace with your URL
});

// Toggle Menu Screen
const menuScreen = document.getElementById('menu-screen');
const menuWidth = window.innerWidth <= 600 ? '-100%' : '-90%'; // Ajuster en fonction de la largeur de l'écran
document.getElementById('menu-btn').addEventListener('click', () => {
  if (menuScreen.style.right === '0px') {
    menuScreen.style.right = menuWidth; // Close the menu screen
  } else {
    menuScreen.style.right = '0'; // Open the menu screen
  }
});

// Function to save selection to local storage
function saveSelection() {
  selectedSurahs = [];
  document.querySelectorAll('#surah-selection input[type="checkbox"]:checked').forEach(checkbox => {
    selectedSurahs.push(Number(checkbox.value));
  });

  localStorage.setItem('selectedSurahs', JSON.stringify(selectedSurahs));
  localStorage.setItem('isJuzSelection', isJuzSelection); // Save the selection mode
  menuScreen.style.right = menuWidth; // Close the menu
}

// Save Selection
document.getElementById('save-selection-btn').addEventListener('click', saveSelection)

// Event listeners for buttons
document.getElementById('random-verse-btn').addEventListener('click', displayRandomVerse);
document.getElementById('next-verse-btn').addEventListener('click', displayNextVerse);

// Add collapsible functionality
document.querySelectorAll('.collapsible').forEach(button => {
  button.addEventListener('click', function() {
    this.classList.toggle('active');
    const content = this.nextElementSibling;
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
});

// Function to select all surahs
function selectAllSurahs() {
  const checkboxes = document.querySelectorAll('#surah-selection input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  selectedSurahs = quran.map((_, index) => index); // Update selectedSurahs array
}

// Function to deselect all surahs
function deselectAllSurahs() {
  const checkboxes = document.querySelectorAll('#surah-selection input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  selectedSurahs = []; // Clear selectedSurahs array
}

// Fonction pour basculer l'affichage des numéros
function toggleVerseNumbers() {
  isVerseNumberVisible = !isVerseNumberVisible;
  displayVerses(); // Rafraîchir l'affichage des versets
}

function displayVerses() {
  const verseContainer = document.getElementById('verse-container');
  verseContainer.innerHTML = '';

  if (!isSurahNameHidden) {
    const surahNameElement = document.createElement('p');
    surahNameElement.style.fontSize = '1.5em';
    surahNameElement.style.fontFamily = "'Noto Sans Arabic', serif";
    surahNameElement.style.fontWeight = 'bold';
    surahNameElement.style.color = '#007bff';
    surahNameElement.textContent = `سورة ${displayedVerses[0].surah._name}`;
    verseContainer.appendChild(surahNameElement);
  }

  displayedVerses.forEach((verseData, index) => {
    const verseElement = document.createElement('p');
    verseElement.style.fontSize = '1.5em';
    verseElement.style.fontFamily = "'Noto Sans Arabic', serif";
    if (isVerseNumberVisible) {
      verseElement.textContent = `${verseData.verse._text} (${verseData.verse._index})`;
    } else {
      verseElement.textContent = `${verseData.verse._text}`;
    }
    verseContainer.appendChild(verseElement);
  });
}

function toggleVerseNumbers() {
  isVerseNumberVisible = !isVerseNumberVisible;
  const toggleNumberBtn = document.getElementById('toggle-number-btn');
  toggleNumberBtn.textContent = isVerseNumberVisible ? 'إخفاء الأرقام' : 'إظهار الأرقام';
  displayVerses(); // Rafraîchir l'affichage des versets
}

// Fonction pour basculer entre le mode clair et le mode sombre
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle('dark-mode');

  // Sauvegarder l'état du mode dans le localStorage
  const isDarkMode = body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);

  // Changer l'icône du bouton en fonction du mode
  const darkModeBtn = document.getElementById('toggle-darkmode-btn');
  darkModeBtn.textContent = isDarkMode ? '☀️' : '🌙';
}

// Charger l'état du mode sombre depuis le localStorage au chargement de la page
function loadDarkMode() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    document.getElementById('toggle-darkmode-btn').textContent = '☀️';
  } else {
    document.body.classList.remove('dark-mode');
    document.getElementById('toggle-darkmode-btn').textContent = '🌙';
  }
}

function loadSavedSelection() {
  const savedSurahs = localStorage.getItem('selectedSurahs');
  if (savedSurahs) {
    selectedSurahs = JSON.parse(savedSurahs);
  } else {
    selectedSurahs = isJuzSelection ? quran.juzs.map((_, index) => index) : quran.sura.map((_, index) => index);
  }

  const savedJuzSelection = localStorage.getItem('isJuzSelection');
  if (savedJuzSelection) {
    isJuzSelection = savedJuzSelection === 'true';
    document.getElementById('toggle-selection-btn').textContent = isJuzSelection
      ? 'التحديد حسب الأجزاء'
      : 'التحديد حسب السور';
  }

  loadSurahSelection();
}

// Charger l'état du mode sombre au chargement de la page
window.addEventListener('load', loadDarkMode);

//All EventListener
document.getElementById('toggle-darkmode-btn').addEventListener('click', toggleDarkMode);
document.getElementById('save-selection-btn').addEventListener('click', saveSelection)
document.getElementById('random-verse-btn').addEventListener('click', displayRandomVerse);
document.getElementById('next-verse-btn').addEventListener('click', displayNextVerse);
document.getElementById('select-all-btn').addEventListener('click', selectAllSurahs);
document.getElementById('deselect-all-btn').addEventListener('click', deselectAllSurahs);
document.getElementById('toggle-number-btn').addEventListener('click', toggleVerseNumbers);