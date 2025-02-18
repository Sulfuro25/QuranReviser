// Load the Quran verses from the JSON file
let quran = [];
let currentSurahIndex = 0;
let currentVerseIndex = 0;
let displayedVerses = [];
let selectedSurahs = [];
let isSurahNameHidden = false;
let isVerseNumberVisible = true;


// Fetch Quran data
fetch('quran_verses.json')
  .then(response => response.json())
  .then(data => {
    quran = data.quran.sura; // Load all surahs
    console.log('Quran data loaded:', quran);
    loadSurahSelection(); // Load surah selection UI
    loadSavedSelection(); // Load saved selection from local storage
  })
  .catch(error => console.error('Error loading Quran verses:', error));

// Function to load surah selection UI
function loadSurahSelection() {
  const surahSelection = document.getElementById('surah-selection');
  quran.forEach((surah, index) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = index;
    checkbox.checked = true; // Default to all surahs selected
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(surah._name));
    surahSelection.appendChild(label);
  });
}

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
    // Afficher un message d'erreur dans l'interface utilisateur
    errorMessage.textContent = "يرجى اختيار سورة واحدة على الأقل قبل طلب آية عشوائية";
    errorMessage.style.display = 'block';
    return;
  }

  // Select a random surah from the selected surahs
  const randomSurahIndex = selectedSurahs[Math.floor(Math.random() * selectedSurahs.length)];
  const surah = quran[randomSurahIndex];

  // Select a random verse from the surah
  currentVerseIndex = Math.floor(Math.random() * surah.aya.length);
  const verse = surah.aya[currentVerseIndex];

  // Reset displayed verses with the new random verse
  displayedVerses = [{ surah, verse }];

  // Update currentSurahIndex to the selected surah
  currentSurahIndex = randomSurahIndex;

  // Display the verse
  displayVerses();
}

// Function to display the next verse
function displayNextVerse() {
  if (quran.length === 0 || displayedVerses.length === 0) return;

  const surah = quran[currentSurahIndex];
  currentVerseIndex = (currentVerseIndex + 1) % surah.aya.length;

  if (currentVerseIndex === 0) {
    const currentSurahIndexInSelection = selectedSurahs.indexOf(currentSurahIndex);
    const nextSurahIndexInSelection = (currentSurahIndexInSelection + 1) % selectedSurahs.length;
    currentSurahIndex = selectedSurahs[nextSurahIndexInSelection];
  }

  const nextVerse = quran[currentSurahIndex].aya[currentVerseIndex];
  displayedVerses.push({ surah: quran[currentSurahIndex], verse: nextVerse });

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
  // Close the menu screen
  const menuScreen = document.getElementById('menu-screen');
  const menuWidth = window.innerWidth <= 600 ? '-90%' : '-80%'; // Ajuster en fonction de la largeur de l'écran
  menuScreen.style.right = menuWidth;
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