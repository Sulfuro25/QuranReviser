// Initialize theme from saved prefs, default to dark
document.addEventListener('DOMContentLoaded', () => {
  try {
    const prefs = JSON.parse(localStorage.getItem('qr_prefs') || '{}');
    const theme = prefs.theme || 'dark';
    document.body.setAttribute('data-theme', theme);
  } catch {
    document.body.setAttribute('data-theme', 'dark');
  }
});

