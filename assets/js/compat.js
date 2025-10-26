// compat.js - Feature detection and graceful degradation
// Handles modern API compatibility across devices

window.QR = window.QR || {};

(function() {
  'use strict';

  // Detect device capabilities
  const capabilities = {
    // Check if touch is supported
    hasTouch: (function() {
      return 'ontouchstart' in window ||
             navigator.maxTouchPoints > 0 ||
             navigator.msMaxTouchPoints > 0;
    })(),

    // Check if device is mobile/tablet
    isMobile: (function() {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    })(),

    // Check if iOS device
    isIOS: (function() {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    })(),

    // Check if Safari browser
    isSafari: (function() {
      return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    })(),

    // Check MediaRecorder support
    hasMediaRecorder: (function() {
      return typeof MediaRecorder !== 'undefined';
    })(),

    // Check getUserMedia support
    hasGetUserMedia: (function() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    })(),

    // Check Web Audio API support
    hasWebAudio: (function() {
      return !!(window.AudioContext || window.webkitAudioContext);
    })(),

    // Check IntersectionObserver support
    hasIntersectionObserver: (function() {
      return 'IntersectionObserver' in window;
    })(),

    // Check if passive event listeners are supported
    supportsPassive: (function() {
      var passiveSupported = false;
      try {
        var options = {
          get passive() {
            passiveSupported = true;
            return false;
          }
        };
        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
      } catch(err) {
        passiveSupported = false;
      }
      return passiveSupported;
    })(),

    // Check if modern CSS is supported
    hasModernCSS: (function() {
      if (typeof CSS === 'undefined' || !CSS.supports) return false;
      return CSS.supports('display', 'grid') && 
             CSS.supports('display', 'flex');
    })()
  };

  // Safe getUserMedia wrapper with fallbacks
  function safeGetUserMedia(constraints) {
    if (!capabilities.hasGetUserMedia) {
      return Promise.reject(new Error('getUserMedia not supported on this device'));
    }

    // Handle older WebKit prefix
    if (navigator.mediaDevices.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    } else if (navigator.getUserMedia) {
      return new Promise(function(resolve, reject) {
        navigator.getUserMedia(constraints, resolve, reject);
      });
    } else if (navigator.webkitGetUserMedia) {
      return new Promise(function(resolve, reject) {
        navigator.webkitGetUserMedia(constraints, resolve, reject);
      });
    } else if (navigator.mozGetUserMedia) {
      return new Promise(function(resolve, reject) {
        navigator.mozGetUserMedia(constraints, resolve, reject);
      });
    }

    return Promise.reject(new Error('getUserMedia not available'));
  }

  // Safe AudioContext wrapper
  function createAudioContext() {
    if (!capabilities.hasWebAudio) {
      console.warn('Web Audio API not supported');
      return null;
    }
    return new (window.AudioContext || window.webkitAudioContext)();
  }

  // Safe URL.createObjectURL wrapper
  function createObjectURL(blob) {
    if (window.URL && window.URL.createObjectURL) {
      return window.URL.createObjectURL(blob);
    } else if (window.webkitURL && window.webkitURL.createObjectURL) {
      return window.webkitURL.createObjectURL(blob);
    }
    console.warn('createObjectURL not supported');
    return null;
  }

  // Safe URL.revokeObjectURL wrapper
  function revokeObjectURL(url) {
    if (window.URL && window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL(url);
    } else if (window.webkitURL && window.webkitURL.revokeObjectURL) {
      window.webkitURL.revokeObjectURL(url);
    }
  }

  // Viewport height fix for mobile browsers (iOS Safari)
  function setVhProperty() {
    // Get actual viewport height (minus browser UI)
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }

  if (capabilities.isMobile) {
    setVhProperty();
    // Update on resize with debounce
    var resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(setVhProperty, 100);
    });
    window.addEventListener('orientationchange', function() {
      setTimeout(setVhProperty, 200);
    });
  }

  // iOS-specific fixes
  if (capabilities.isIOS) {
    // Fix for iOS click delay (use touchend)
    document.addEventListener('touchstart', function(){}, capabilities.supportsPassive ? { passive: true } : false);

    // Prevent iOS zoom on input focus
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      var content = meta.getAttribute('content');
      if (content && !content.includes('maximum-scale')) {
        meta.setAttribute('content', content + ', maximum-scale=1.0');
      }
    }

    // Fix for iOS audio playback (needs user interaction)
    var unlockAudio = function() {
      if (capabilities.hasWebAudio) {
        var context = createAudioContext();
        if (context && context.state === 'suspended') {
          context.resume();
        }
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('click', unlockAudio);
  }

  // Add touch-friendly event delegation
  function addTouchEvents(element, callback) {
    if (!element) return;

    if (capabilities.hasTouch) {
      element.addEventListener('touchend', function(e) {
        e.preventDefault();
        callback(e);
      }, capabilities.supportsPassive ? { passive: false } : false);
    }
    element.addEventListener('click', callback);
  }

  // Smooth scroll polyfill for Safari/IE
  function smoothScrollTo(element, options) {
    if ('scrollBehavior' in document.documentElement.style) {
      element.scrollIntoView(options || { behavior: 'smooth', block: 'start' });
    } else {
      // Fallback for browsers without smooth scroll
      element.scrollIntoView(options && options.block === 'center' ? true : false);
    }
  }

  // Safe fetch with timeout
  function safeFetch(url, options) {
    options = options || {};
    var timeout = options.timeout || 30000;

    return Promise.race([
      fetch(url, options),
      new Promise(function(_, reject) {
        setTimeout(function() {
          reject(new Error('Request timeout'));
        }, timeout);
      })
    ]);
  }

  // Detect if running as PWA
  function isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Prevent body scroll when modal is open (mobile fix)
  function disableBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  }

  function enableBodyScroll() {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  // Debounce function for performance
  function debounce(func, wait) {
    var timeout;
    return function executedFunction() {
      var context = this;
      var args = arguments;
      var later = function() {
        timeout = null;
        func.apply(context, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function for scroll events
  function throttle(func, limit) {
    var inThrottle;
    return function() {
      var args = arguments;
      var context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(function() { inThrottle = false; }, limit);
      }
    };
  }

  // Detect if keyboard is open (approximation for mobile)
  function detectKeyboard() {
    if (!capabilities.isMobile) return false;
    
    var viewport = window.visualViewport || {
      height: window.innerHeight,
      width: window.innerWidth
    };
    
    var isKeyboardOpen = viewport.height < window.innerHeight * 0.75;
    return isKeyboardOpen;
  }

  // Prevent elastic scrolling on iOS
  function preventElasticScroll(element) {
    if (!capabilities.isIOS) return;
    
    element.addEventListener('touchstart', function() {
      var top = element.scrollTop;
      var totalScroll = element.scrollHeight;
      var currentScroll = top + element.offsetHeight;
      
      if (top === 0) {
        element.scrollTop = 1;
      } else if (currentScroll === totalScroll) {
        element.scrollTop = top - 1;
      }
    });
  }

  // Safe vibrate function
  function vibrate(pattern) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  // Check if network is available
  function isOnline() {
    return navigator.onLine;
  }

  // Detect network speed
  function getNetworkSpeed() {
    if (navigator.connection) {
      var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      return {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        saveData: connection.saveData || false
      };
    }
    return null;
  }

  // Export capabilities and helpers
  QR.compat = {
    // Capabilities
    capabilities: capabilities,

    // Helpers
    safeGetUserMedia: safeGetUserMedia,
    createAudioContext: createAudioContext,
    createObjectURL: createObjectURL,
    revokeObjectURL: revokeObjectURL,
    addTouchEvents: addTouchEvents,
    smoothScrollTo: smoothScrollTo,
    safeFetch: safeFetch,
    isPWA: isPWA,
    disableBodyScroll: disableBodyScroll,
    enableBodyScroll: enableBodyScroll,
    debounce: debounce,
    throttle: throttle,
    detectKeyboard: detectKeyboard,
    preventElasticScroll: preventElasticScroll,
    vibrate: vibrate,
    isOnline: isOnline,
    getNetworkSpeed: getNetworkSpeed,

    // Log compatibility info
    logInfo: function() {
      console.log('🔍 Device Compatibility:');
      console.log('  Touch Support:', capabilities.hasTouch);
      console.log('  Mobile Device:', capabilities.isMobile);
      console.log('  iOS Device:', capabilities.isIOS);
      console.log('  Safari Browser:', capabilities.isSafari);
      console.log('  MediaRecorder:', capabilities.hasMediaRecorder);
      console.log('  getUserMedia:', capabilities.hasGetUserMedia);
      console.log('  Web Audio:', capabilities.hasWebAudio);
      console.log('  Modern CSS:', capabilities.hasModernCSS);
      console.log('  Passive Events:', capabilities.supportsPassive);
      console.log('  IntersectionObserver:', capabilities.hasIntersectionObserver);
      console.log('  Online:', isOnline());
      var networkSpeed = getNetworkSpeed();
      if (networkSpeed) {
        console.log('  Network:', networkSpeed.effectiveType, '(' + networkSpeed.downlink + ' Mbps)');
      }
    }
  };

  // Log on load
  QR.compat.logInfo();

})();
