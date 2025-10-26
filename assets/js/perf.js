// perf.js - Performance optimizations for mobile
(function() {
  'use strict';

  // Debounce resize events for better performance
  let resizeTimer;
  const originalResize = window.onresize;
  window.onresize = function(e) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (typeof originalResize === 'function') {
        originalResize(e);
      }
    }, 150);
  };

  // Lazy load images when they enter viewport
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all images with data-src
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('img[data-src]').forEach(function(img) {
        imageObserver.observe(img);
      });
    });
  }

  // Prefetch critical resources on idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(function() {
      // Prefetch critical pages
      const criticalPages = ['reader.html', 'mushaf.html'];
      criticalPages.forEach(function(page) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = page;
        document.head.appendChild(link);
      });
    });
  }

  // Reduce scroll event frequency
  let scrollTimer;
  let lastScrollY = 0;
  const throttledScroll = function() {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Only process if scroll changed significantly
    if (Math.abs(currentScrollY - lastScrollY) > 5) {
      lastScrollY = currentScrollY;
      
      // Dispatch custom throttled scroll event
      window.dispatchEvent(new CustomEvent('throttledScroll', {
        detail: { scrollY: currentScrollY }
      }));
    }
  };

  window.addEventListener('scroll', function() {
    if (scrollTimer) {
      clearTimeout(scrollTimer);
    }
    scrollTimer = setTimeout(throttledScroll, 100);
  }, { passive: true });

  // Optimize font loading
  if ('fonts' in document) {
    // Load critical fonts first
    Promise.all([
      document.fonts.load('16px Inter'),
      document.fonts.load('600 16px Inter')
    ]).then(function() {
      document.documentElement.classList.add('fonts-loaded');
    }).catch(function(error) {
      console.warn('Font loading failed:', error);
    });
  }

  // Performance monitoring (only in development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', function() {
      if ('performance' in window && 'getEntriesByType' in window.performance) {
        setTimeout(function() {
          const perfData = performance.getEntriesByType('navigation')[0];
          if (perfData) {
            console.log('⚡ Performance Metrics:');
            console.log('  DOM Content Loaded:', Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart), 'ms');
            console.log('  Load Complete:', Math.round(perfData.loadEventEnd - perfData.fetchStart), 'ms');
            console.log('  First Paint:', Math.round(perfData.responseEnd - perfData.fetchStart), 'ms');
          }

          // Measure LCP if available
          if ('PerformanceObserver' in window) {
            try {
              const lcpObserver = new PerformanceObserver(function(list) {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('  LCP:', Math.round(lastEntry.renderTime || lastEntry.loadTime), 'ms');
              });
              lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
            } catch (e) {
              // LCP not supported
            }
          }
        }, 0);
      }
    });
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function() {
    if (resizeTimer) clearTimeout(resizeTimer);
    if (scrollTimer) clearTimeout(scrollTimer);
  });

})();
