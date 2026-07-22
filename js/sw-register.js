// Registers the service worker. Included on every page.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('NeuroSarathi: service worker registration failed', err);
    });
  });
}
