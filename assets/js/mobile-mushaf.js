/**
 * Mobile Mushaf Enhancements
 * - Tap to show/hide toolbar
 * - Swipe gestures for page navigation
 */

(function() {
  'use strict';

  // Only run on mobile devices
  if (window.innerWidth > 768) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;
  let toolbarTimeout = null;

  const mushafViewer = document.getElementById('mushaf-viewer');
  const toolbar = document.getElementById('mushaf-toolbar');
  const mushafImg = document.getElementById('mushaf-img');
  const navPrev = document.getElementById('nav-prev');
  const navNext = document.getElementById('nav-next');

  if (!mushafViewer || !toolbar) return;

  // Toggle toolbar visibility on tap
  function toggleToolbar() {
    document.body.classList.toggle('show-toolbar');
    
    // Auto-hide toolbar after 3 seconds
    if (document.body.classList.contains('show-toolbar')) {
      clearTimeout(toolbarTimeout);
      toolbarTimeout = setTimeout(() => {
        document.body.classList.remove('show-toolbar');
      }, 3000);
    }
  }

  // Handle touch start
  function handleTouchStart(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }

  // Handle touch end - detect swipe
  function handleTouchEnd(e) {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  }

  // Determine swipe direction and trigger navigation
  function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance for swipe
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Check if horizontal swipe is dominant
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
          // Swipe right - go to previous page
          if (navPrev) navPrev.click();
        } else {
          // Swipe left - go to next page
          if (navNext) navNext.click();
        }
      }
    }
  }

  // Tap on image to toggle toolbar
  if (mushafImg) {
    mushafImg.addEventListener('click', toggleToolbar);
  }

  // Add touch event listeners for swipe
  if (mushafViewer) {
    mushafViewer.addEventListener('touchstart', handleTouchStart, { passive: true });
    mushafViewer.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  // Hide toolbar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (!toolbar.contains(e.target) && !mushafImg.contains(e.target)) {
      document.body.classList.remove('show-toolbar');
    }
  });

  console.log('Mobile Mushaf enhancements loaded');
})();
