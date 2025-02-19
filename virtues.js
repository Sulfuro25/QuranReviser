// Tableau des textes à afficher
const texts = [
    "﴿إِنَّ الَّذِينَ يَتْلُونَ كِتَابَ اللَّهِ وَأَقَامُوا الصَّلَاةَ وَأَنفَقُوا مِمَّا رَزَقْنَاهُمْ سِرًّا وَعَلَانِيَةً يَرْجُونَ تِجَارَةً لَّن تَبُورَ﴾ (سورة فاطر: ٢٩)",
    "﴿وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ﴾ (سورة القمر: ١٧)",
    "﴿بَلْ هُوَ آيَاتٌ بَيِّنَاتٌ فِي صُدُورِ الَّذِينَ أُوتُوا الْعِلْمَ﴾ (سورة العنكبوت: ٤٩)",
    "قال رسول الله ﷺ:«الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ مَاهِرٌ بِهِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ، وَالَّذِي يَقْرَأُ الْقُرْآنَ وَيَتَتَعْتَعُ فِيهِ، وَهُوَ عَلَيْهِ شَاقٌّ لَهُ أَجْرَانِ» (رواه البخاري: ٤٩٣٧، ومسلم: ٧٩٨)",
    "قال رسول الله ﷺ:«يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا» (رواه الترمذي: ٢٩١٤، وأبو داود: ١٤٦٤، وابن ماجه: ٣٧٨٠)",
    "قال رسول الله ﷺ: «إِنَّ مَثَلَ صَاحِبِ الْقُرْآنِ كَمَثَلِ صَاحِبِ الإِبِلِ الْمُعَقَّلَةِ، إِنْ عَاهَدَ عَلَيْهَا أَمْسَكَهَا، وَإِنْ أَطْلَقَهَا ذَهَبَتْ» (رواه البخاري: ٥٠٣١، ومسلم: ٧٨٩)",
    "قال رسول الله ﷺ: «تَعَاهَدُوا الْقُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الإِبِلِ فِي عُقُلِهَا» (رواه البخاري: ٥٠٣٣، ومسلم: ٧٩١)",
    "قال رسول الله ﷺ: «إِنَّ الْقَلْبَ الَّذِي لَيْسَ فِيهِ شَيْءٌ مِنَ الْقُرْآنِ كَالْبَيْتِ الْخَرِبِ» (رواه الترمذي: ٢٩١٣، وقال حديث حسن صحيح)",
    "قال رسول الله ﷺ: «مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا، لَا أَقُولُ ﴿الم﴾ حَرْفٌ، وَلَكِنْ أَلِفٌ حَرْفٌ، وَلَامٌ حَرْفٌ، وَمِيمٌ حَرْفٌ» (رواه الترمذي: ٢٩١٠، وقال حديث حسن صحيح)",
    "قال رسول الله ﷺ: «مَثَلُ الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ حَافِظٌ لَهُ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ، وَمَثَلُ الَّذِي يَقْرَأُ الْقُرْآنَ وَهُوَ يَتَعَاهَدُهُ وَهُوَ عَلَيْهِ شَدِيدٌ فَلَهُ أَجْرَانِ» (رواه البخاري: 4937، ومسلم: 798)",
    "قال رسول الله ﷺ: «تَعَاهَدُوا هَذَا الْقُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الْإِبِلِ فِي عُقُلِهَا» (رواه مسلم: 791)",
    "قال رسول الله ﷺ: «مَنْ قَرَأَ الْقُرْآنَ وَعَمِلَ بِمَا فِيهِ أُلْبِسَ وَالِدَاهُ تَاجًا يَوْمَ الْقِيَامَةِ، ضَوْءُهُ أَحْسَنُ مِنْ ضَوْءِ الشَّمْسِ فِي بُيُوتِ الدُّنْيَا، فَمَا ظَنُّكُمْ بِالَّذِي عَمِلَ بِهَذَا» (رواه أبو داود: 1453)",
    "قال رسول الله ﷺ: «يُؤْتَى بِالْقُرْآنِ يَوْمَ الْقِيَامَةِ وَأَهْلِهِ الَّذِينَ كَانُوا يَعْمَلُونَ بِهِ فِي الدُّنْيَا، تَقْدُمُهُ سُورَةُ الْبَقَرَةِ وَآلِ عِمْرَانَ، تُحَاجَّانِ عَنْ صَاحِبِهِمَا» (رواه مسلم: 805)",
    "قال رسول الله ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ» (رواه البخاري: 5027)",
    "قال رسول الله ﷺ: «اقْرَءُوا الْقُرْآنَ، فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ» (رواه مسلم: 804)",
    "قال رسول الله ﷺ: «مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا، لَا أَقُولُ: (الم) حَرْفٌ، وَلَكِنْ أَلِفٌ حَرْفٌ، وَلَامٌ حَرْفٌ، وَمِيمٌ حَرْفٌ» (رواه الترمذي: 2910)",
    "قال رسول الله ﷺ: «إِنَّ الَّذِي لَيْسَ فِي جَوْفِهِ شَيْءٌ مِنَ الْقُرْآنِ كَالْبَيْتِ الْخَرِبِ» (رواه الترمذي: 2913)",
    "قال رسول الله ﷺ: «لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللَّهُ الْقُرْآنَ فَهُوَ يَقُومُ بِهِ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ، وَرَجُلٌ آتَاهُ اللَّهُ مَالًا فَهُوَ يُنْفِقُهُ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ» (رواه البخاري: 5025، ومسلم: 815)",
    "قال رسول الله ﷺ: «مَنْ جَلَسَ فِي مَسْجِدٍ يَقْرَأُ الْقُرْآنَ وَيَتَعَلَّمُهُ، حَتَّى تَكُونَ لَهُ حَاجَةٌ، كَانَ لَهُ كَأَجْرِ حَاجٍّ تَامٍّ حَجَّتُهُ» (رواه الطبراني في الأوسط: 7432)",
  ];
  
  let currentTextIndex = 0; // Index du texte actuel
  
  // Éléments du DOM
  const textDisplay = document.getElementById('text-display');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  // Fonction pour afficher le texte actuel
  function displayText() {
    textDisplay.textContent = texts[currentTextIndex];
  }
  
  // Fonction pour passer au texte précédent
  function showPreviousText() {
    if (currentTextIndex > 0) {
      currentTextIndex--;
    } else {
      currentTextIndex = texts.length - 1; // Revenir au dernier texte si on est au début
    }
    displayText();
  }
  
  // Fonction pour passer au texte suivant
  function showNextText() {
    if (currentTextIndex < texts.length - 1) {
      currentTextIndex++;
    } else {
      currentTextIndex = 0; // Revenir au premier texte si on est à la fin
    }
    displayText();
  }
  
  // Écouteurs d'événements pour les boutons de navigation
  prevBtn.addEventListener('click', showPreviousText);
  nextBtn.addEventListener('click', showNextText);
  
  // Écouteur d'événement pour le bouton de retour
  document.getElementById('menu-btn').addEventListener('click', () => {
    window.location.href = 'index.html'; // Rediriger vers index.html
  });

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
  
  // Écouteur d'événements pour le bouton de basculement du mode sombre
  document.getElementById('toggle-darkmode-btn').addEventListener('click', toggleDarkMode);
  
  // Charger l'état du mode sombre au chargement de la page
  window.addEventListener('load', loadDarkMode);
  
  // Afficher le texte initial au chargement de la page
  displayText();