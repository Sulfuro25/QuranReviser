// polyfills.js - Browser compatibility polyfills for older devices
// Ensures the app works on iOS Safari 12+, Chrome 60+, Firefox 60+, Edge 79+

(function() {
  'use strict';

  // Object.entries polyfill (IE11, older Safari)
  if (!Object.entries) {
    Object.entries = function(obj) {
      var ownProps = Object.keys(obj),
        i = ownProps.length,
        resArray = new Array(i);
      while (i--)
        resArray[i] = [ownProps[i], obj[ownProps[i]]];
      return resArray;
    };
  }

  // Object.values polyfill (IE11, older Safari)
  if (!Object.values) {
    Object.values = function(obj) {
      return Object.keys(obj).map(function(key) {
        return obj[key];
      });
    };
  }

  // Array.from polyfill (IE11)
  if (!Array.from) {
    Array.from = function(arrayLike) {
      return Array.prototype.slice.call(arrayLike);
    };
  }

  // Array.prototype.includes polyfill (IE11, older Edge)
  if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
      if (this == null) throw new TypeError('"this" is null or undefined');
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) return false;
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
      while (k < len) {
        if (o[k] === searchElement) return true;
        k++;
      }
      return false;
    };
  }

  // String.prototype.includes polyfill (IE11)
  if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      if (typeof start !== 'number') start = 0;
      if (start + search.length > this.length) return false;
      return this.indexOf(search, start) !== -1;
    };
  }

  // String.prototype.startsWith polyfill (IE11)
  if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position) {
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
    };
  }

  // String.prototype.endsWith polyfill (IE11)
  if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, length) {
      if (length === undefined || length > this.length) {
        length = this.length;
      }
      return this.substring(length - searchString.length, length) === searchString;
    };
  }

  // CustomEvent polyfill (IE11)
  if (typeof window.CustomEvent !== 'function') {
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: null };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    }
    window.CustomEvent = CustomEvent;
  }

  // Promise polyfill check (will use external library if needed)
  if (typeof Promise === 'undefined') {
    console.warn('Promise not supported. Please include a Promise polyfill.');
  }

  // fetch polyfill check (will use external library if needed)
  if (typeof fetch === 'undefined') {
    console.warn('fetch not supported. Please include a fetch polyfill.');
  }

  // URLSearchParams polyfill (IE11, older Safari)
  if (typeof URLSearchParams === 'undefined') {
    window.URLSearchParams = function(search) {
      this.params = {};
      if (search) {
        search = search.replace(/^\?/, '');
        var pairs = search.split('&');
        for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split('=');
          this.params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
      }
      this.get = function(name) { return this.params[name] || null; };
      this.has = function(name) { return name in this.params; };
    };
  }

  // Element.closest polyfill (IE11, older Edge)
  if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
      var el = this;
      do {
        if (el.matches(s)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }

  // Element.matches polyfill (IE11)
  if (!Element.prototype.matches) {
    Element.prototype.matches = 
      Element.prototype.matchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector ||
      Element.prototype.oMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function(s) {
        var matches = (this.document || this.ownerDocument).querySelectorAll(s),
          i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {}
        return i > -1;
      };
  }

  // NodeList.forEach polyfill (IE11, older Edge)
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  // CSS.escape polyfill (IE11, older browsers)
  if (!window.CSS || !window.CSS.escape) {
    if (!window.CSS) window.CSS = {};
    window.CSS.escape = function(value) {
      if (typeof value !== 'string') return '';
      var string = String(value);
      var length = string.length;
      var index = -1;
      var codeUnit;
      var result = '';
      var firstCodeUnit = string.charCodeAt(0);
      while (++index < length) {
        codeUnit = string.charCodeAt(index);
        if (codeUnit == 0x0000) {
          result += '\uFFFD';
          continue;
        }
        if (
          (codeUnit >= 0x0001 && codeUnit <= 0x001F) ||
          codeUnit == 0x007F ||
          (index == 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
          (
            index == 1 &&
            codeUnit >= 0x0030 && codeUnit <= 0x0039 &&
            firstCodeUnit == 0x002D
          )
        ) {
          result += '\\' + codeUnit.toString(16) + ' ';
          continue;
        }
        if (index == 0 && length == 1 && codeUnit == 0x002D) {
          result += '\\' + string.charAt(index);
          continue;
        }
        if (
          codeUnit >= 0x0080 ||
          codeUnit == 0x002D ||
          codeUnit == 0x005F ||
          codeUnit >= 0x0030 && codeUnit <= 0x0039 ||
          codeUnit >= 0x0041 && codeUnit <= 0x005A ||
          codeUnit >= 0x0061 && codeUnit <= 0x007A
        ) {
          result += string.charAt(index);
          continue;
        }
        result += '\\' + string.charAt(index);
      }
      return result;
    };
  }

  // requestAnimationFrame polyfill (older browsers)
  (function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
        window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function(callback) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
    }
  }());

  // Detect localStorage support (private browsing in Safari/Firefox blocks it)
  window.QR = window.QR || {};
  window.QR.hasLocalStorage = (function() {
    try {
      var test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch(e) {
      return false;
    }
  })();

  // localStorage fallback for private browsing mode
  if (!window.QR.hasLocalStorage) {
    console.warn('localStorage not available. Using in-memory storage (data will not persist).');
    var memoryStorage = {};
    window.localStorage = {
      getItem: function(key) { return memoryStorage[key] || null; },
      setItem: function(key, value) { memoryStorage[key] = String(value); },
      removeItem: function(key) { delete memoryStorage[key]; },
      clear: function() { memoryStorage = {}; }
    };
  }

  console.log('✅ Polyfills loaded successfully');
})();
