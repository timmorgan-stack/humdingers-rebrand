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
    '<div class="lightbox-count" aria-hidden="true">' +
      '<span class="lb-count-now">1</span>' +
      '<span class="lb-count-rule"></span>' +
      '<span class="lb-count-total">1</span>' +
      '<span class="lb-count-bar"><i></i></span>' +
    '</div>' +
    '<p class="lightbox-status" role="status" aria-live="polite"></p>';
  document.body.appendChild(overlay);

  var big = overlay.querySelector('img');
  var closeBtn = overlay.querySelector('.lightbox-close');
  var prevBtn = overlay.querySelector('.lightbox-prev');
  var nextBtn = overlay.querySelector('.lightbox-next');
  var count = overlay.querySelector('.lightbox-count');
  var countNow = overlay.querySelector('.lb-count-now');
  var countTotal = overlay.querySelector('.lb-count-total');
  var countFill = overlay.querySelector('.lb-count-bar i');
  var status = overlay.querySelector('.lightbox-status');
  var lastFocus = null;

  var set = [];      // the gallery currently open ([] when a single image)
  var at = 0;

  function render() {
    var item = set[at];
    big.src = item.img || item.src;
    big.alt = item.alt || '';
    /* The visible counter is decorative — assistive tech reads the live
       region instead, so the numerals never get announced as bare digits. */
    var many = set.length > 1;
    count.hidden = !many;
    if (!many) { status.textContent = ''; return; }
    countNow.textContent = at + 1;
    countTotal.textContent = set.length;
    countFill.style.width = ((at + 1) / set.length * 100) + '%';
    status.textContent = 'Image ' + (at + 1) + ' of ' + set.length;
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

  /* The moment an image visually fades in is when img-preload (or the
     gallery) removes its img-loading class — not the load event, which can
     precede it (cached images fade 30ms after DOMContentLoaded; landings
     hold reveals until the scroll settles). Overlays that should arrive
     with the photograph watch for that moment. */
  /* img-preload marks every image img-loading in its DOMContentLoaded pass —
     including cached ones, whose fade it starts 30ms later. Code here runs at
     parse, BEFORE that pass, so checking straight away would find a cached
     image "showing" and reveal the overlay ahead of the fade. Hold the first
     check until DOMContentLoaded; script order guarantees img-preload's
     handler has classed the images by the time ours runs. */
  var domReady = document.readyState === 'complete';
  document.addEventListener('DOMContentLoaded', function () { domReady = true; });

  function whenFadesIn(img, cb) {
    var fired = false;
    var mo = null;
    function go() { if (!fired) { fired = true; if (mo) mo.disconnect(); cb(); } }
    function showing() {
      return img.complete && img.naturalWidth > 0 && !img.classList.contains('img-loading');
    }
    function begin() {
      if (showing()) return go();
      if ('MutationObserver' in window) {
        mo = new MutationObserver(function () { if (showing()) go(); });
        mo.observe(img, { attributes: true, attributeFilter: ['class'] });
      }
      img.addEventListener('load', function () { if (showing()) go(); });
      img.addEventListener('error', go, { once: true });
      setTimeout(go, 4000);   // never leave the controls stranded invisible
    }
    if (domReady) begin();
    else document.addEventListener('DOMContentLoaded', begin);
  }

  function badgeFor(img) {
    var frame = img.parentElement;
    if (!frame || frame === document.body) return;
    if (frame.querySelector(':scope > .zoom-badge[data-for="' + img.src + '"]')) return;
    frame.classList.add('has-overlay');

    var badge = document.createElement('span');
    badge.className = 'zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M15.8 15.8 20 20M8.6 11h4.8M11 8.6v4.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    frame.appendChild(badge);

    /* Absolute coordinates resolve against the badge's offsetParent — the
       nearest positioned ancestor. Measuring against whatever the browser
       actually uses keeps the badge on the picture wherever it sits in the
       page, and has-overlay keeps that ancestor being this frame. */
    function place() {
      frame.classList.add('has-overlay');
      var host = badge.offsetParent || frame;
      var ir = img.getBoundingClientRect();
      var hr = host.getBoundingClientRect();
      if (!ir.width) { badge.hidden = true; return; }
      badge.hidden = false;
      badge.style.left = (ir.left - hr.left + ir.width) + 'px';
      badge.style.top = (ir.top - hr.top + ir.height) + 'px';
    }
    /* The badge arrives with the photograph rather than ahead of it — its
       first fade borrows the image's own 0.7s ramp so the two move as one. */
    function reveal() {
      place();
      badge.style.transition = 'opacity 0.7s ease';
      badge.classList.add('is-visible');
      setTimeout(function () { badge.style.transition = ''; }, 800);
    }
    place();
    whenFadesIn(img, reveal);
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
