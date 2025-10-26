// setup-wizard.js - First-time setup wizard

(function() {
  const SETUP_KEY = 'qr_setup_completed';
  const SETUP_VERSION = '1.0';

  let currentStep = 0;
  const steps = ['welcome', 'language', 'appearance', 'audio', 'translation', 'account', 'complete'];

  const translations = {
    en: {
      welcomeTitle: 'Welcome to Quran Reviser',
      welcomeDesc: 'Let\'s personalize your experience in a few quick steps',
      getStarted: 'Get Started',
      skip: 'Skip Setup',
      next: 'Next',
      back: 'Back',
      finish: 'Finish',
      
      languageTitle: 'Choose Your Language',
      languageDesc: 'Select your preferred language for the interface',
      
      appearanceTitle: 'Customize Appearance',
      appearanceDesc: 'Adjust settings for comfortable reading',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark',
      sepia: 'Sepia',
      fontSize: 'Font Size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extraLarge: 'Extra Large',
      
      audioTitle: 'Audio Reciter',
      audioDesc: 'Choose your preferred Quran reciter for audio playback',
      selectReciter: 'Select Reciter',
      
      translationTitle: 'Translation Settings',
      translationDesc: 'Configure translation display preferences',
      showTranslation: 'Show Translation',
      enableTranslation: 'Enable translation below Arabic text',
      selectTranslation: 'Select Translation',
      chooseTranslation: 'Choose your preferred translation',
      
      accountTitle: 'Sync Your Progress',
      accountDesc: 'Sign in with Google to sync your progress across devices',
      signInGoogle: 'Sign in with Google',
      signingIn: 'Signing in...',
      signInError: 'Sign in failed. Please try again or continue without an account.',
      continueWithout: 'Continue Without Account',
      signInLater: 'You can always sign in later from Settings',
      
      completeTitle: 'All Set!',
      completeDesc: 'You\'re ready to start your Quran memorization journey',
      startUsing: 'Start Using Quran Reviser',
    },
    ar: {
      welcomeTitle: 'مرحباً بك في مراجع القرآن',
      welcomeDesc: 'دعنا نخصص تجربتك في بضع خطوات سريعة',
      getStarted: 'ابدأ',
      skip: 'تخطي الإعداد',
      next: 'التالي',
      back: 'رجوع',
      finish: 'إنهاء',
      
      languageTitle: 'اختر لغتك',
      languageDesc: 'حدد لغتك المفضلة للواجهة',
      
      appearanceTitle: 'تخصيص المظهر',
      appearanceDesc: 'اضبط الإعدادات للقراءة المريحة',
      theme: 'السمة',
      light: 'فاتح',
      dark: 'داكن',
      sepia: 'بني داكن',
      fontSize: 'حجم الخط',
      small: 'صغير',
      medium: 'متوسط',
      large: 'كبير',
      extraLarge: 'كبير جداً',
      
      audioTitle: 'القارئ',
      audioDesc: 'اختر القارئ المفضل لديك للتلاوة الصوتية',
      selectReciter: 'اختر القارئ',
      
      translationTitle: 'إعدادات الترجمة',
      translationDesc: 'تكوين تفضيلات عرض الترجمة',
      showTranslation: 'إظهار الترجمة',
      enableTranslation: 'تفعيل الترجمة أسفل النص العربي',
      selectTranslation: 'اختر الترجمة',
      chooseTranslation: 'اختر الترجمة المفضلة لديك',
      
      accountTitle: 'مزامنة تقدمك',
      accountDesc: 'سجل الدخول باستخدام Google لمزامنة تقدمك عبر الأجهزة',
      signInGoogle: 'تسجيل الدخول بواسطة Google',
      signingIn: 'جاري تسجيل الدخول...',
      signInError: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى أو المتابعة بدون حساب.',
      continueWithout: 'المتابعة بدون حساب',
      signInLater: 'يمكنك دائماً تسجيل الدخول لاحقاً من الإعدادات',
      
      completeTitle: 'جاهز!',
      completeDesc: 'أنت جاهز لبدء رحلة حفظ القرآن',
      startUsing: 'ابدأ استخدام مراجع القرآن',
    },
    fr: {
      welcomeTitle: 'Bienvenue sur Quran Reviser',
      welcomeDesc: 'Personnalisons votre expérience en quelques étapes rapides',
      getStarted: 'Commencer',
      skip: 'Ignorer la configuration',
      next: 'Suivant',
      back: 'Retour',
      finish: 'Terminer',
      
      languageTitle: 'Choisissez votre langue',
      languageDesc: 'Sélectionnez votre langue préférée pour l\'interface',
      
      appearanceTitle: 'Personnaliser l\'apparence',
      appearanceDesc: 'Ajustez les paramètres pour une lecture confortable',
      theme: 'Thème',
      light: 'Clair',
      dark: 'Sombre',
      sepia: 'Sépia',
      fontSize: 'Taille de police',
      small: 'Petit',
      medium: 'Moyen',
      large: 'Grand',
      extraLarge: 'Très grand',
      
      audioTitle: 'Récitateur audio',
      audioDesc: 'Choisissez votre récitateur préféré pour la lecture audio',
      selectReciter: 'Sélectionner le récitateur',
      
      translationTitle: 'Paramètres de traduction',
      translationDesc: 'Configurez les préférences d\'affichage de la traduction',
      showTranslation: 'Afficher la traduction',
      enableTranslation: 'Activer la traduction sous le texte arabe',
      selectTranslation: 'Sélectionner la traduction',
      chooseTranslation: 'Choisissez votre traduction préférée',
      
      accountTitle: 'Synchronisez votre progression',
      accountDesc: 'Connectez-vous avec Google pour synchroniser votre progression sur tous vos appareils',
      signInGoogle: 'Se connecter avec Google',
      signingIn: 'Connexion en cours...',
      signInError: 'Échec de la connexion. Veuillez réessayer ou continuer sans compte.',
      continueWithout: 'Continuer sans compte',
      signInLater: 'Vous pourrez toujours vous connecter plus tard depuis les Paramètres',
      
      completeTitle: 'Tout est prêt!',
      completeDesc: 'Vous êtes prêt à commencer votre parcours de mémorisation du Coran',
      startUsing: 'Commencer à utiliser Quran Reviser',
    },
    nl: {
      welcomeTitle: 'Welkom bij Quran Reviser',
      welcomeDesc: 'Laten we uw ervaring in een paar snelle stappen personaliseren',
      getStarted: 'Aan de slag',
      skip: 'Setup overslaan',
      next: 'Volgende',
      back: 'Terug',
      finish: 'Voltooien',
      
      languageTitle: 'Kies uw taal',
      languageDesc: 'Selecteer uw voorkeurstaal voor de interface',
      
      appearanceTitle: 'Uiterlijk aanpassen',
      appearanceDesc: 'Pas instellingen aan voor comfortabel lezen',
      theme: 'Thema',
      light: 'Licht',
      dark: 'Donker',
      sepia: 'Sepia',
      fontSize: 'Lettergrootte',
      small: 'Klein',
      medium: 'Gemiddeld',
      large: 'Groot',
      extraLarge: 'Extra groot',
      
      audioTitle: 'Audio-recitator',
      audioDesc: 'Kies uw voorkeurs Koran-recitator voor audio-weergave',
      selectReciter: 'Selecteer recitator',
      
      translationTitle: 'Vertaalinstellingen',
      translationDesc: 'Configureer voorkeuren voor vertaalweergave',
      showTranslation: 'Vertaling tonen',
      enableTranslation: 'Vertaling onder Arabische tekst inschakelen',
      selectTranslation: 'Selecteer vertaling',
      chooseTranslation: 'Kies uw voorkeursvertaling',
      
      accountTitle: 'Synchroniseer uw voortgang',
      accountDesc: 'Log in met Google om uw voortgang te synchroniseren op alle apparaten',
      signInGoogle: 'Inloggen met Google',
      signingIn: 'Inloggen...',
      signInError: 'Inloggen mislukt. Probeer het opnieuw of ga verder zonder account.',
      continueWithout: 'Doorgaan zonder account',
      signInLater: 'U kunt later altijd inloggen via Instellingen',
      
      completeTitle: 'Alles klaar!',
      completeDesc: 'U bent klaar om te beginnen met uw Koran-memorizatiereis',
      startUsing: 'Begin met Quran Reviser',
    }
  };

  let currentLang = 'en';

  function shouldShowSetup() {
    try {
      const completed = localStorage.getItem(SETUP_KEY);
      return completed !== SETUP_VERSION;
    } catch {
      return true;
    }
  }

  function markSetupComplete() {
    try {
      localStorage.setItem(SETUP_KEY, SETUP_VERSION);
    } catch {}
  }

  function t(key) {
    return translations[currentLang][key] || translations.en[key] || key;
  }

  function createWizardModal() {
    const overlay = document.createElement('div');
    overlay.id = 'setup-wizard-overlay';
    overlay.className = 'wizard-overlay';

    const modal = document.createElement('div');
    modal.id = 'setup-wizard-modal';
    modal.className = 'wizard-modal';

    // Progress indicator
    const progress = document.createElement('div');
    progress.className = 'wizard-progress';
    progress.innerHTML = steps.map((_, i) => `<div class="progress-dot ${i === 0 ? 'active' : ''}"></div>`).join('');

    // Content container
    const content = document.createElement('div');
    content.className = 'wizard-content';
    content.id = 'wizard-content';

    // Buttons
    const footer = document.createElement('div');
    footer.className = 'wizard-footer';
    footer.innerHTML = `
      <button id="wizard-skip" class="wizard-btn secondary">${t('skip')}</button>
      <div class="wizard-nav">
        <button id="wizard-back" class="wizard-btn secondary" style="display: none;">${t('back')}</button>
        <button id="wizard-next" class="wizard-btn primary">${t('next')}</button>
      </div>
    `;

    modal.appendChild(progress);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    return overlay;
  }

  function renderWelcomeStep() {
    return `
      <div class="wizard-step welcome-step">
        <div class="wizard-icon">
          <ion-icon name="book-outline"></ion-icon>
        </div>
        <h1>${t('welcomeTitle')}</h1>
        <p class="wizard-desc">${t('welcomeDesc')}</p>
        <div class="welcome-features">
          <div class="feature-item">
            <ion-icon name="checkbox-outline"></ion-icon>
            <span>Track memorization progress</span>
          </div>
          <div class="feature-item">
            <ion-icon name="sync-outline"></ion-icon>
            <span>Sync across devices</span>
          </div>
          <div class="feature-item">
            <ion-icon name="analytics-outline"></ion-icon>
            <span>Monitor your streaks</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderLanguageStep() {
    const languages = [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'nl', name: 'Dutch', native: 'Nederlands' }
    ];

    const saved = localStorage.getItem('qr_language') || 'en';

    return `
      <div class="wizard-step language-step">
        <div class="wizard-icon">
          <ion-icon name="language-outline"></ion-icon>
        </div>
        <h1>${t('languageTitle')}</h1>
        <p class="wizard-desc">${t('languageDesc')}</p>
        <div class="language-grid">
          ${languages.map(lang => `
            <label class="language-card ${saved === lang.code ? 'selected' : ''}">
              <input type="radio" name="language" value="${lang.code}" ${saved === lang.code ? 'checked' : ''}>
              <div class="language-content">
                <div class="language-native">${lang.native}</div>
                <div class="language-name">${lang.name}</div>
              </div>
              <div class="language-check">
                <ion-icon name="checkmark-circle"></ion-icon>
              </div>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAppearanceStep() {
    const savedTheme = localStorage.getItem('qr_theme') || 'light';
    const savedFontSize = localStorage.getItem('qr_font_size') || 'medium';

    return `
      <div class="wizard-step appearance-step">
        <div class="wizard-icon">
          <ion-icon name="color-palette-outline"></ion-icon>
        </div>
        <h1>${t('appearanceTitle')}</h1>
        <p class="wizard-desc">${t('appearanceDesc')}</p>
        
        <div class="setting-group">
          <label class="setting-label">${t('theme')}</label>
          <div class="theme-options">
            <label class="theme-card ${savedTheme === 'light' ? 'selected' : ''}">
              <input type="radio" name="theme" value="light" ${savedTheme === 'light' ? 'checked' : ''}>
              <ion-icon name="sunny-outline"></ion-icon>
              <span>${t('light')}</span>
            </label>
            <label class="theme-card ${savedTheme === 'dark' ? 'selected' : ''}">
              <input type="radio" name="theme" value="dark" ${savedTheme === 'dark' ? 'checked' : ''}>
              <ion-icon name="moon-outline"></ion-icon>
              <span>${t('dark')}</span>
            </label>
            <label class="theme-card ${savedTheme === 'sepia' ? 'selected' : ''}">
              <input type="radio" name="theme" value="sepia" ${savedTheme === 'sepia' ? 'checked' : ''}>
              <ion-icon name="book-outline"></ion-icon>
              <span>${t('sepia')}</span>
            </label>
          </div>
        </div>

        <div class="setting-group">
          <label class="setting-label">${t('fontSize')}</label>
          <div class="font-size-slider">
            <input type="range" id="font-size-slider" min="0" max="3" step="1" value="${['small', 'medium', 'large', 'xlarge'].indexOf(savedFontSize)}">
            <div class="font-size-labels">
              <span>${t('small')}</span>
              <span>${t('medium')}</span>
              <span>${t('large')}</span>
              <span>${t('extraLarge')}</span>
            </div>
          </div>
          <div class="font-preview" id="font-preview">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
        </div>
      </div>
    `;
  }

  function renderAudioStep() {
    return `
      <div class="wizard-step audio-step">
        <div class="wizard-icon">
          <ion-icon name="headset-outline"></ion-icon>
        </div>
        <h1>${t('audioTitle')}</h1>
        <p class="wizard-desc">${t('audioDesc')}</p>
        
        <div class="setting-group">
          <label class="setting-label">${t('selectReciter')}</label>
          <select id="reciter-select-wizard" class="wizard-select">
            <option value="">Loading reciters...</option>
          </select>
        </div>
        
        <div class="reciter-preview" id="reciter-preview">
          <ion-icon name="musical-notes-outline"></ion-icon>
          <p>Audio preview will be available in the Reader</p>
        </div>
      </div>
    `;
  }

  function renderTranslationStep() {
    return `
      <div class="wizard-step translation-step">
        <div class="wizard-icon">
          <ion-icon name="language-outline"></ion-icon>
        </div>
        <h1>${t('translationTitle')}</h1>
        <p class="wizard-desc">${t('translationDesc')}</p>
        
        <div class="setting-group">
          <label class="toggle-option-wizard">
            <input type="checkbox" id="translation-toggle-wizard" class="wizard-toggle">
            <div class="toggle-content">
              <div class="toggle-text">
                <div class="toggle-label">${t('showTranslation')}</div>
                <div class="toggle-desc">${t('enableTranslation')}</div>
              </div>
            </div>
            <div class="toggle-switch"></div>
          </label>
        </div>
        
        <div class="setting-group" id="translation-select-group" style="display: none;">
          <label class="setting-label">${t('selectTranslation')}</label>
          <select id="translation-select-wizard" class="wizard-select">
            <option value="">Loading translations...</option>
          </select>
        </div>
      </div>
    `;
  }

  function renderAccountStep() {
    return `
      <div class="wizard-step account-step">
        <div class="wizard-icon">
          <ion-icon name="cloud-upload-outline"></ion-icon>
        </div>
        <h1>${t('accountTitle')}</h1>
        <p class="wizard-desc">${t('accountDesc')}</p>
        
        <div class="account-options">
          <button class="google-signin-btn" id="google-signin-btn">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>${t('signInGoogle')}</span>
          </button>
          
          <button class="continue-without-btn" id="continue-without-btn">
            ${t('continueWithout')}
          </button>
          
          <p class="account-note">
            <ion-icon name="information-circle-outline"></ion-icon>
            ${t('signInLater')}
          </p>
        </div>
      </div>
    `;
  }

  function renderCompleteStep() {
    return `
      <div class="wizard-step complete-step">
        <div class="wizard-icon success">
          <ion-icon name="checkmark-circle-outline"></ion-icon>
        </div>
        <h1>${t('completeTitle')}</h1>
        <p class="wizard-desc">${t('completeDesc')}</p>
        <div class="completion-animation">
          <lottie-player
            src="https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json"
            background="transparent"
            speed="1"
            style="width: 200px; height: 200px; margin: 0 auto;"
            autoplay>
          </lottie-player>
        </div>
      </div>
    `;
  }

  function renderStep(step) {
    const content = document.getElementById('wizard-content');
    if (!content) return;

    switch(steps[step]) {
      case 'welcome':
        content.innerHTML = renderWelcomeStep();
        break;
      case 'language':
        content.innerHTML = renderLanguageStep();
        attachLanguageListeners();
        break;
      case 'appearance':
        content.innerHTML = renderAppearanceStep();
        attachAppearanceListeners();
        break;
      case 'audio':
        content.innerHTML = renderAudioStep();
        attachAudioListeners();
        break;
      case 'translation':
        content.innerHTML = renderTranslationStep();
        attachTranslationListeners();
        break;
      case 'account':
        content.innerHTML = renderAccountStep();
        attachAccountListeners();
        break;
      case 'complete':
        content.innerHTML = renderCompleteStep();
        break;
    }

    updateNavigation(step);
    updateProgress(step);
  }

  function updateNavigation(step) {
    const backBtn = document.getElementById('wizard-back');
    const nextBtn = document.getElementById('wizard-next');
    const skipBtn = document.getElementById('wizard-skip');

    if (backBtn) backBtn.style.display = step > 0 ? 'block' : 'none';
    
    if (nextBtn) {
      if (step === steps.length - 1) {
        nextBtn.textContent = t('startUsing');
        nextBtn.className = 'wizard-btn primary large';
      } else {
        nextBtn.textContent = t('next');
        nextBtn.className = 'wizard-btn primary';
      }
    }

    if (skipBtn) skipBtn.style.display = step < steps.length - 1 ? 'block' : 'none';
  }

  function updateProgress(step) {
    const dots = document.querySelectorAll('.progress-dot');
    dots.forEach((dot, i) => {
      if (i <= step) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function attachLanguageListeners() {
    const radios = document.querySelectorAll('input[name="language"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.language-card').forEach(card => card.classList.remove('selected'));
        e.target.closest('.language-card').classList.add('selected');
        
        const lang = e.target.value;
        currentLang = lang;
        localStorage.setItem('qr_language', lang);
        
        // Apply language to i18n system if available
        if (window.setLanguage) {
          window.setLanguage(lang);
        }
        
        // Update wizard text immediately
        updateWizardText();
        
        // Re-render current step to update content
        renderStep(currentStep);
      });
    });
  }

  function updateWizardText() {
    // Update navigation buttons
    const backBtn = document.getElementById('wizard-back');
    const nextBtn = document.getElementById('wizard-next');
    const skipBtn = document.getElementById('wizard-skip');
    
    if (backBtn) backBtn.textContent = t('back');
    if (skipBtn) skipBtn.textContent = t('skip');
    
    if (nextBtn) {
      if (currentStep === steps.length - 1) {
        nextBtn.textContent = t('startUsing');
      } else {
        nextBtn.textContent = t('next');
      }
    }
  }

  function attachAppearanceListeners() {
    // Theme selection
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('selected'));
        e.target.closest('.theme-card').classList.add('selected');
        
        const theme = e.target.value;
        localStorage.setItem('qr_theme', theme);
        applyTheme(theme);
      });
    });

    // Font size slider
    const fontSlider = document.getElementById('font-size-slider');
    const fontPreview = document.getElementById('font-preview');
    if (fontSlider && fontPreview) {
      const sizes = ['small', 'medium', 'large', 'xlarge'];
      const updateFontSize = () => {
        const value = parseInt(fontSlider.value);
        const size = sizes[value];
        localStorage.setItem('qr_font_size', size);
        fontPreview.className = `font-preview ${size}`;
      };
      
      fontSlider.addEventListener('input', updateFontSize);
      updateFontSize();
    }
  }

  async function attachAudioListeners() {
    const reciterSelect = document.getElementById('reciter-select-wizard');
    
    if (reciterSelect) {
      // Load reciters from API
      try {
        const response = await fetch('https://api.quran.com/api/v4/resources/recitations');
        const data = await response.json();
        
        if (data && data.recitations) {
          const savedReciter = localStorage.getItem('qr_reciter') || '7'; // Default to Mishari Rashid
          
          reciterSelect.innerHTML = '';
          data.recitations.forEach(reciter => {
            const option = document.createElement('option');
            option.value = reciter.id;
            option.textContent = reciter.translated_name.name;
            if (reciter.id == savedReciter) {
              option.selected = true;
            }
            reciterSelect.appendChild(option);
          });
          
          reciterSelect.addEventListener('change', (e) => {
            localStorage.setItem('qr_reciter', e.target.value);
            // Also save to prefs if available
            if (window.QR && window.QR.prefs) {
              const prefs = window.QR.prefs.read() || {};
              prefs.reciter_id = e.target.value;
              window.QR.prefs.write(prefs);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load reciters:', error);
        reciterSelect.innerHTML = '<option>Failed to load reciters</option>';
      }
    }
  }

  async function attachTranslationListeners() {
    const toggle = document.getElementById('translation-toggle-wizard');
    const selectGroup = document.getElementById('translation-select-group');
    const translationSelect = document.getElementById('translation-select-wizard');
    
    // Load translation toggle state
    const savedTranslationOn = localStorage.getItem('qr_translation_on') === 'true';
    if (toggle) {
      toggle.checked = savedTranslationOn;
      if (selectGroup) {
        selectGroup.style.display = savedTranslationOn ? 'block' : 'none';
      }
      
      toggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        localStorage.setItem('qr_translation_on', enabled);
        if (selectGroup) {
          selectGroup.style.display = enabled ? 'block' : 'none';
        }
        
        // Save to prefs if available
        if (window.QR && window.QR.prefs) {
          const prefs = window.QR.prefs.read() || {};
          prefs.translation_on = enabled;
          window.QR.prefs.write(prefs);
        }
      });
    }
    
    // Load translations from API
    if (translationSelect) {
      try {
        const response = await fetch('https://api.quran.com/api/v4/resources/translations');
        const data = await response.json();
        
        if (data && data.translations) {
          const savedTranslation = localStorage.getItem('qr_translation') || '131'; // Default to English - Sahih International
          
          translationSelect.innerHTML = '';
          data.translations
            .filter(t => t.language_name === 'english' || t.language_name === 'french' || t.language_name === 'dutch' || t.language_name === 'arabic')
            .forEach(translation => {
              const option = document.createElement('option');
              option.value = translation.id;
              option.textContent = `${translation.translated_name.name} (${translation.language_name})`;
              if (translation.id == savedTranslation) {
                option.selected = true;
              }
              translationSelect.appendChild(option);
            });
          
          translationSelect.addEventListener('change', (e) => {
            localStorage.setItem('qr_translation', e.target.value);
            // Save to prefs if available
            if (window.QR && window.QR.prefs) {
              const prefs = window.QR.prefs.read() || {};
              prefs.translation_id = e.target.value;
              window.QR.prefs.write(prefs);
            }
          });
        }
      } catch (error) {
        console.error('Failed to load translations:', error);
        translationSelect.innerHTML = '<option>Failed to load translations</option>';
      }
    }
  }

  function attachAccountListeners() {
    const googleBtn = document.getElementById('google-signin-btn');
    const continueBtn = document.getElementById('continue-without-btn');

    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        // Check if Google auth is available
        if (!window.QR || !window.QR.auth || !window.QR.profiles || typeof window.QR.profiles.signIn !== 'function') {
          showAccountError('Google sign-in is not configured yet. Please continue without an account.');
          return;
        }

        try {
          googleBtn.disabled = true;
          googleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span class="signing-in-text">${t('signingIn')}</span>
          `;

          const user = await window.QR.profiles.signIn();
          
          // Auto-sync data to cloud after successful sign-in
          if (window.QR && window.QR.auth && typeof window.QR.auth.uploadToGoogleDrive === 'function') {
            try {
              // Collect all important data
              const dataToSync = {
                prefs: QR.profiles.getItem('qr_prefs'),
                hifdh_progress: QR.profiles.getItem('hifdh_progress'),
                bookmarks: QR.profiles.getItem('qr_bookmarks'),
                notes: QR.profiles.getItem('qr_notes'),
                confidence: QR.profiles.getItem('qr_confidence'),
                timestamp: new Date().toISOString()
              };
              
              await window.QR.auth.uploadToGoogleDrive('quran-reviser-data.json', dataToSync);
            } catch (syncErr) {
              console.error('Auto-sync failed:', syncErr);
              // Don't block the wizard if sync fails
            }
          }
          
          // Move to next step
          nextStep();
        } catch (err) {
          console.error('Sign in failed:', err);
          googleBtn.disabled = false;
          googleBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>${t('signInGoogle')}</span>
          `;
          
          // Show detailed error message
          const errorMsg = err.message || 'Sign in failed. Please try again or continue without an account.';
          showAccountError(errorMsg);
        }
      });
    }

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        nextStep();
      });
    }
  }

  function showAccountError(message) {
    const accountStep = document.querySelector('.account-step');
    if (!accountStep) return;
    
    // Remove any existing error
    const existingError = accountStep.querySelector('.account-error');
    if (existingError) existingError.remove();
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'account-error';
    errorDiv.innerHTML = `
      <ion-icon name="alert-circle-outline"></ion-icon>
      <span>${message}</span>
    `;
    
    const accountOptions = accountStep.querySelector('.account-options');
    if (accountOptions) {
      accountOptions.insertBefore(errorDiv, accountOptions.firstChild);
    }
  }

  function applyTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
  }

  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep(currentStep);
    } else {
      completeSetup();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStep(currentStep);
    }
  }

  function skipSetup() {
    if (confirm('Are you sure you want to skip setup? You can configure these settings later.')) {
      completeSetup();
    }
  }

  function completeSetup() {
    markSetupComplete();
    const overlay = document.getElementById('setup-wizard-overlay');
    if (overlay) {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 300);
    }
  }

  function init() {
    if (!shouldShowSetup()) return;

    // Get current language
    currentLang = localStorage.getItem('qr_language') || 'en';

    // Create and show wizard
    const wizard = createWizardModal();
    document.body.appendChild(wizard);

    // Render first step
    renderStep(0);

    // Attach event listeners
    const nextBtn = document.getElementById('wizard-next');
    const backBtn = document.getElementById('wizard-back');
    const skipBtn = document.getElementById('wizard-skip');

    if (nextBtn) nextBtn.addEventListener('click', nextStep);
    if (backBtn) backBtn.addEventListener('click', prevStep);
    if (skipBtn) skipBtn.addEventListener('click', skipSetup);

    // Show after a short delay
    setTimeout(() => wizard.classList.add('show'), 100);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for manual triggering
  window.QR = window.QR || {};
  window.QR.setupWizard = {
    show: () => {
      localStorage.removeItem(SETUP_KEY);
      init();
    }
  };
})();
