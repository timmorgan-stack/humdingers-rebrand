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

  /* Discrete affordance: a small magnifier pinned to each enlargeable image.
     These images sit in all sorts of containers — grid cells, <summary> rows,
     figures — so a corner badge on the parent would often land away from the
     picture. Position it against the image's own box instead, the same
     approach the loading spinner uses. */
  function badgeFor(img) {
    var frame = img.parentElement;
    if (!frame || frame === document.body) return;
    if (frame.querySelector(':scope > .zoom-badge[data-for="' + img.src + '"]')) return;
    if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';

    var badge = document.createElement('span');
    badge.className = 'zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M15.8 15.8 20 20M8.6 11h4.8M11 8.6v4.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    frame.appendChild(badge);

    /* Rect-based for the same reason as the gallery dots: offsetLeft/offsetTop
       are relative to the nearest positioned ancestor, which is not always
       this frame. */
    function place() {
      // Same reason as the gallery dots: these coordinates only mean anything
      // if the frame is the positioning context.
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
      var ir = img.getBoundingClientRect();
      var fr = frame.getBoundingClientRect();
      if (!ir.width) { badge.hidden = true; return; }
      badge.hidden = false;
      badge.style.left = (ir.left - fr.left + ir.width) + 'px';
      badge.style.top = (ir.top - fr.top + ir.height) + 'px';
    }
    /* The badge arrives with the photograph rather than ahead of it, in step
       with the image's own fade. */
    function reveal() { place(); badge.classList.add('is-visible'); }
    place();
    if (img.complete && img.naturalWidth) reveal();
    else img.addEventListener('load', reveal, { once: true });
    window.addEventListener('resize', place);
    // Same reason as the gallery dots: the image's box moves after first
    // layout, so follow the box rather than a handful of events.
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(img);
  }

  function addBadges() {
    Array.prototype.forEach.call(document.querySelectorAll(SOURCES), badgeFor);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBadges);
  else addBadges();
  // Late-arriving imagery (the Instagram grid, rotated venues) gets one too.
  document.addEventListener('hd:relayout', addBadges);

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
