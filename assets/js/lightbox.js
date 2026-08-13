/*
 * Lightbox for wedding photos, hero images and the food galleries: click to
 * view large, close on the x, the backdrop or Escape.
 *
 * An image carrying data-gallery belongs to a set, so the overlay gains prev /
 * next controls and arrow-key support and opens on the frame that was on
 * screen. Everything else opens as a single image and the controls stay
 * hidden. One overlay per page, built on demand.
 */
(function () {
  var SOURCES = '.wedding-grid img, .hero-figure img, .split img, .illustration-figure img, img[data-gallery]';
  if (!document.querySelector(SOURCES)) return;

  var overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.hidden = true;
  overlay.innerHTML =
    '<button type="button" class="lightbox-close" aria-label="Close image">&times;</button>' +
    '<button type="button" class="lightbox-nav lightbox-prev" aria-label="Previous image">&#8249;</button>' +
    '<img alt="">' +
    '<button type="button" class="lightbox-nav lightbox-next" aria-label="Next image">&#8250;</button>' +
    '<p class="lightbox-count" aria-live="polite"></p>';
  document.body.appendChild(overlay);

  var big = overlay.querySelector('img');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var prevBtn = overlay.querySelector('.lightbox-prev');
  var nextBtn = overlay.querySelector('.lightbox-next');
  var count = overlay.querySelector('.lightbox-count');
  var lastFocus = null;

  var set = [];      // the gallery currently open ([] when a single image)
  var at = 0;

  function render() {
    var item = set[at];
    big.src = item.img || item.src;
    big.alt = item.alt || '';
    count.textContent = set.length > 1 ? (at + 1) + ' / ' + set.length : '';
  }

  function openSet(images, index) {
    set = images;
    at = index;
    var many = set.length > 1;
    prevBtn.hidden = nextBtn.hidden = !many;
    overlay.classList.toggle('has-nav', many);
    render();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    lastFocus = document.activeElement;
    closeBtn.focus();
  }

  function step(dir) {
    if (set.length < 2) return;
    at = (at + dir + set.length) % set.length;
    render();
  }

  function close() {
    overlay.hidden = true;
    big.removeAttribute('src');
    set = [];
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', function (e) {
    if (!overlay.hidden) {
      if (e.target === prevBtn) return step(-1);
      if (e.target === nextBtn) return step(1);
      if (e.target === overlay || e.target === closeBtn) return close();
      return;
    }

    var img = e.target.closest(SOURCES);
    if (!img) return;
    e.preventDefault();

    // A gallery image opens its whole set, starting on the frame displayed.
    var key = img.getAttribute('data-gallery');
    var gallery = key && window.HumdingersGalleries && window.HumdingersGalleries[key];
    if (gallery && gallery.images.length) {
      openSet(gallery.images, Number(img.dataset.index) || 0);
    } else {
      openSet([{ img: img.currentSrc || img.src, alt: img.alt || '' }], 0);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });
})();
