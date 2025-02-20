// Variables globales
let quran = []; // Contiendra les données du Quran
let currentSurahIndex = 0; // Index de la sourate actuelle
let currentVerseIndex = 0; // Index du verset actuel
let displayedVerses = []; // Liste des versets affichés
let selectedSurahs = []; // Liste des sourates sélectionnées
let isSurahNameHidden = false; // Masquer/afficher le nom de la sourate
let isVerseNumberVisible = true; // Masquer/afficher les numéros de versets
let isJuzSelection = false; // Mode Juz ou Sourate

// Charger les données du Quran depuis le fichier JSON
fetch('quran_verses.json')
  .then(response => response.json())
  .then(data => {
    quran = data.quran; // Charger les données du Quran
    console.log('Données du Quran chargées :', quran); // Afficher les données dans la console
    loadSurahSelection(); // Charger la sélection des sourates
    loadSavedSelection(); // Charger la sélection sauvegardée
  })
  .catch(error => console.error('Erreur lors du chargement des versets du Quran :', error));

// Charger la sélection des sourates ou des Juz
function loadSurahSelection() {
  const surahSelection = document.getElementById('surah-selection');
  surahSelection.innerHTML = ''; // Effacer le contenu précédent

  if (isJuzSelection) {
    // Mode Juz : Charger les Juz
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
    // Mode Sourate : Charger les sourates
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

// Charger la sélection sauvegardée depuis le localStorage
function loadSavedSelection() {
  const savedSurahs = localStorage.getItem('selectedSurahs');
  if (savedSurahs) {
    selectedSurahs = JSON.parse(savedSurahs);
  } else {
    // Par défaut, sélectionner toutes les sourates ou tous les Juz
    selectedSurahs = isJuzSelection ? quran.juzs.map((_, index) => index) : quran.sura.map((_, index) => index);
  }

  const savedJuzSelection = localStorage.getItem('isJuzSelection');
  if (savedJuzSelection) {
    isJuzSelection = savedJuzSelection === 'true';
    document.getElementById('toggle-selection-btn').textContent = isJuzSelection
      ? 'التحديد حسب الأجزاء'
      : 'التحديد حسب السور';
  }

  loadSurahSelection(); // Recharger la sélection
}

// Afficher un verset aléatoire
function displayRandomVerse() {
  if (quran.length === 0 || selectedSurahs.length === 0) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = "يرجى اختيار سورة أو جزء واحد على الأقل قبل طلب آية عشوائية";
    errorMessage.style.display = 'block';
    return;
  }

  if (isJuzSelection) {
    // Mode Juz : Sélectionner un verset aléatoire dans un Juz
    const randomJuzIndex = selectedSurahs[Math.floor(Math.random() * selectedSurahs.length)];
    const juz = quran.juzs[randomJuzIndex];

    // Trouver la sourate de début et de fin du Juz
    const startSurah = quran.sura.find(s => s._index === juz.start.sura.toString());
    const endSurah = quran.sura.find(s => s._index === juz.end.sura.toString());

    // Calculer le nombre total de versets dans le Juz
    let totalVerses = 0;
    for (let surahIndex = parseInt(startSurah._index); surahIndex <= parseInt(endSurah._index); surahIndex++) {
      const surah = quran.sura.find(s => s._index === surahIndex.toString());
      totalVerses += surah.aya.length;
    }

    // Choisir un index aléatoire dans le Juz
    const randomVerseIndex = Math.floor(Math.random() * totalVerses);

    // Trouver la sourate et le verset correspondant à l'index aléatoire
    let cumulativeVerses = 0;
    let selectedSurah = null;
    let selectedVerseIndex = 0;

    for (let surahIndex = parseInt(startSurah._index); surahIndex <= parseInt(endSurah._index); surahIndex++) {
      const surah = quran.sura.find(s => s._index === surahIndex.toString());

      if (randomVerseIndex < cumulativeVerses + surah.aya.length) {
        selectedSurah = surah;
        selectedVerseIndex = randomVerseIndex - cumulativeVerses;
        break;
      }

      cumulativeVerses += surah.aya.length;
    }

    // Mettre à jour les indices globaux
    currentSurahIndex = quran.sura.findIndex(s => s._index === selectedSurah._index);
    currentVerseIndex = selectedVerseIndex;

    // Afficher le verset sélectionné
    const selectedVerse = selectedSurah.aya[selectedVerseIndex];
    displayedVerses = [{ surah: selectedSurah, verse: selectedVerse }];
  } else {
    // Mode Sourate : Sélectionner un verset aléatoire dans une sourate
    const randomSurahIndex = selectedSurahs[Math.floor(Math.random() * selectedSurahs.length)];
    const surah = quran.sura[randomSurahIndex];
    const randomVerseIndex = Math.floor(Math.random() * surah.aya.length);
    const randomVerse = surah.aya[randomVerseIndex];

    // Mettre à jour les indices globaux
    currentSurahIndex = randomSurahIndex;
    currentVerseIndex = randomVerseIndex;

    // Afficher le verset sélectionné
    displayedVerses = [{ surah, verse: randomVerse }];
  }

  displayVerses(); // Afficher les versets
}

// Afficher le verset suivant
function displayNextVerse() {
  if (quran.length === 0 || displayedVerses.length === 0) return;

  if (isJuzSelection) {
    // Mode Juz : Naviguer dans les versets du Juz
    const currentJuz = quran.juzs[selectedSurahs[currentSurahIndex]]; // Utiliser l'index du Juz sélectionné
    let currentSurah = quran.sura[currentSurahIndex];

    // Passer au verset suivant
    currentVerseIndex++;

    // Vérifier si nous avons atteint la fin de la sourate actuelle
    if (currentVerseIndex >= currentSurah.aya.length) {
      // Passer à la sourate suivante dans le Juz
      const nextSurahIndex = currentSurahIndex + 1;
      const nextSurah = quran.sura[nextSurahIndex];

      if (nextSurah && nextSurah._index <= currentJuz.end.sura) {
        // Si la sourate suivante est dans le même Juz, passer à elle
        currentSurahIndex = nextSurahIndex;
        currentVerseIndex = 0;
      } else {
        // Si aucune sourate suivante dans le Juz, passer au Juz suivant
        currentSurahIndex = (currentSurahIndex + 1) % quran.juzs.length;
        const nextJuz = quran.juzs[currentSurahIndex];
        currentSurah = quran.sura.find(s => s._index === nextJuz.start.sura.toString());
        currentVerseIndex = 0;
      }
    }

    const nextVerse = currentSurah.aya[currentVerseIndex];
    displayedVerses.push({ surah: currentSurah, verse: nextVerse });
  } else {
    // Mode Sourate : Naviguer dans les versets de la sourate
    const surah = quran.sura[currentSurahIndex];
    currentVerseIndex = (currentVerseIndex + 1) % surah.aya.length;

    // Si nous avons atteint la fin de la sourate, passer à la suivante
    if (currentVerseIndex === 0) {
      currentSurahIndex = (currentSurahIndex + 1) % quran.sura.length;
    }

    const nextVerse = quran.sura[currentSurahIndex].aya[currentVerseIndex];
    displayedVerses.push({ surah: quran.sura[currentSurahIndex], verse: nextVerse });
  }

  // Limiter le nombre de versets affichés
  if (displayedVerses.length > 3) {
    displayedVerses.shift();
  }

  displayVerses(); // Afficher les versets
}

// Afficher les versets dans le conteneur
function displayVerses() {
  const verseContainer = document.getElementById('verse-container');
  verseContainer.innerHTML = ''; // Effacer le contenu précédent

  if (!isSurahNameHidden && displayedVerses.length > 0 && displayedVerses[0].surah) {
    const surahNameElement = document.createElement('p');
    surahNameElement.style.fontSize = '1.5em';
    surahNameElement.style.fontFamily = "'Noto Sans Arabic', serif";
    surahNameElement.style.fontWeight = 'bold';
    surahNameElement.style.color = '#007bff';
    surahNameElement.textContent = `سورة ${displayedVerses[0].surah._name}`;
    verseContainer.appendChild(surahNameElement);
  }

  displayedVerses.forEach((verseData, index) => {
    if (!verseData || !verseData.verse) {
      console.error("VerseData ou verse est undefined :", verseData);
      return; // Ignorer cet élément si les données sont invalides
    }

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

// Basculer entre les modes Juz et Sourate
document.getElementById('toggle-selection-btn').addEventListener('click', () => {
  isJuzSelection = !isJuzSelection; // Basculer entre Juz et Sourate
  document.getElementById('toggle-selection-btn').textContent = isJuzSelection
    ? 'التحديد حسب الأجزاء'
    : 'التحديد حسب السور';
  loadSurahSelection(); // Recharger la sélection
});

document.getElementById('menu-btn').addEventListener('click', () => {
  const menuScreen = document.getElementById('menu-screen');
  const menuWidth = window.innerWidth <= 600 ? '-100%' : '-90%'; // Ajuster en fonction de la largeur de l'écran

  if (menuScreen.style.right === '0px') {
    menuScreen.style.right = menuWidth; // Fermer le menu
  } else {
    menuScreen.style.right = '0'; // Ouvrir le menu
  }
});

// Sauvegarder la sélection
document.getElementById('save-selection-btn').addEventListener('click', () => {
  selectedSurahs = []; // Réinitialiser la sélection
  document.querySelectorAll('#surah-selection input[type="checkbox"]:checked').forEach(checkbox => {
    selectedSurahs.push(Number(checkbox.value)); // Ajouter les sourates ou Juz sélectionnés
  });

  // Sauvegarder dans le localStorage
  localStorage.setItem('selectedSurahs', JSON.stringify(selectedSurahs));
  localStorage.setItem('isJuzSelection', isJuzSelection);

  // Fermer le menu
  const menuScreen = document.getElementById('menu-screen');
  const menuWidth = window.innerWidth <= 600 ? '-100%' : '-90%';
  menuScreen.style.right = menuWidth;

  console.log("Sélection sauvegardée :", selectedSurahs);
});

// Darkmode
document.getElementById('toggle-darkmode-btn').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode'); // Basculer le mode sombre
  const isDarkMode = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDarkMode); // Sauvegarder l'état du mode sombre

  // Changer l'icône du bouton
  const darkModeBtn = document.getElementById('toggle-darkmode-btn');
  darkModeBtn.textContent = isDarkMode ? '☀️' : '🌙';
});

// Attacher les écouteurs d'événements
document.getElementById('random-verse-btn').addEventListener('click', displayRandomVerse);
document.getElementById('next-verse-btn').addEventListener('click', displayNextVerse);

// Select All
document.getElementById('select-all-btn').addEventListener('click', () => {
  selectedSurahs = isJuzSelection ? quran.juzs.map((_, index) => index) : quran.sura.map((_, index) => index);
  loadSurahSelection();
});

// Deselect All
document.getElementById('deselect-all-btn').addEventListener('click', () => {
  selectedSurahs = [];
  loadSurahSelection();
});

// Bouton pour cacher/afficher les numéros de versets
document.getElementById('toggle-number-btn').addEventListener('click', () => {
  isVerseNumberVisible = !isVerseNumberVisible; // Basculer l'état
  document.getElementById('toggle-number-btn').textContent = isVerseNumberVisible
    ? 'إخفاء الأرقام'
    : 'إظهار الأرقام';
  displayVerses(); // Rafraîchir l'affichage
});

// Redirect QuranicVirtues
  document.getElementById('redirect-btn').addEventListener('click', () => {
    window.location.href = 'virtues.html'; // Rediriger vers virtues.html
  });

  // Bouton pour cacher/afficher le nom de la sourate
document.getElementById('toggle-surah-btn').addEventListener('click', () => {
  isSurahNameHidden = !isSurahNameHidden; // Basculer l'état
  document.getElementById('toggle-surah-btn').textContent = isSurahNameHidden
    ? 'إظهار اسم السورة'
    : 'إخفاء اسم السورة';
  displayVerses(); // Rafraîchir l'affichage
});
