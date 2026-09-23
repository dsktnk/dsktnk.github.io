(() => {
  const root = document.documentElement;

  window.addEventListener('pointermove', (event) => {
    root.style.setProperty('--mx', event.clientX + 'px');
    root.style.setProperty('--my', event.clientY + 'px');
  }, { passive: true });
})();
