/*
 * Lightbox for wedding photos and hero images: click to view large, close on
 * the x, the backdrop or Escape. One overlay per page, built on demand.
 */
(function () {
  var SOURCES = '.wedding-grid img, .hero-figure img, .split img, .illustration-figure img';
  if (!document.querySelector(SOURCES)) return;

  var overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.hidden = true;
  overlay.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close image">&times;</button>' +
    '<img alt="">';
  document.body.appendChild(overlay);
  var big = overlay.querySelector('img');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var lastFocus = null;

  function open(img) {
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    closeBtn.focus();
  }

  function close() {
    overlay.hidden = true;
    big.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    var img = e.target.closest(SOURCES);
    if (img) {
      // wedding photos sit inside plain divs; hero figures aren't links —
      // nothing to preventDefault, but guard in case that ever changes
      e.preventDefault();
      open(img);
      return;
    }
    if (!overlay.hidden && (e.target === overlay || e.target === closeBtn)) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
})();
