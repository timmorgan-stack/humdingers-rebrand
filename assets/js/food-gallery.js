/*
 * Food galleries.
 *
 * Any image marked data-gallery="canapes" cycles that gallery's photography,
 * cross-fading between shots. Clicking it opens the lightbox at the frame on
 * screen, from where the whole set can be stepped through.
 *
 * The photographs live in assets/data/food-galleries.json, so adding the
 * remaining shots is a data change — no markup edits needed. Each rotator
 * ships with its first image already in the HTML, so the panel is never empty
 * and still shows real photography with JS disabled.
 */
(function () {
  var rotators = document.querySelectorAll('img[data-gallery]');
  if (!rotators.length) return;

  var INTERVAL = 5000;   // time each shot is held
  var galleries = null;

  fetch('assets/data/food-galleries.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
    .then(function (data) {
      galleries = data;
      Array.prototype.forEach.call(rotators, setup);
      window.HumdingersGalleries = data; // lightbox reads the sets from here
    })
    .catch(function () { /* the static first frame stays put */ });

  function imagesFor(key) {
    return (galleries && galleries[key] && galleries[key].images) || [];
  }

  function setup(shown) {
    var key = shown.getAttribute('data-gallery');
    var images = imagesFor(key);
    if (images.length < 2) return;   // nothing to rotate between

    /* Start from whichever shot the markup shipped with, so the first frame
       never jumps, and offset each rotator on the page so several panels
       don't change in lockstep. */
    var current = 0;
    images.forEach(function (item, i) {
      if (shown.getAttribute('src') === item.img) current = i;
    });
    shown.dataset.index = current;

    var idle = null;
    function advance() {
      var next = (Number(shown.dataset.index) + 1) % images.length;
      show(shown, images[next], next);
    }

    function start() { if (!idle) idle = setInterval(advance, INTERVAL); }
    function stop() { if (idle) { clearInterval(idle); idle = null; } }

    // Rotation is decoration: it pauses off-screen, on hover, and for anyone
    // who has asked the system to reduce motion.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var frame = shown.parentElement || shown;
    frame.addEventListener('mouseenter', stop);
    frame.addEventListener('mouseleave', start);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.15 }).observe(shown);
    } else {
      start();
    }
  }

  /* True cross-fade: the incoming shot is drawn as a second layer directly
     over the current one and faded up, so the two dissolve into each other
     rather than the panel dipping to its background in between. The layer is
     positioned against the image's own box (offsets, not a wrapper) so no
     markup or layout changes are needed. It is decoded first, so the fade
     never begins on a half-drawn frame. */
  function show(shown, item, index) {
    var pre = new Image();
    pre.src = item.img;

    function commit() {
      shown.src = item.img;
      shown.alt = item.alt;
      shown.dataset.index = index;
    }

    function swap() {
      var frame = shown.parentElement;
      if (!frame || !shown.offsetWidth) { commit(); return; }
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';

      var cs = getComputedStyle(shown);
      var layer = document.createElement('img');
      layer.className = 'food-crossfade';
      layer.src = item.img;
      layer.alt = '';
      layer.setAttribute('aria-hidden', 'true');
      layer.style.left = shown.offsetLeft + 'px';
      layer.style.top = shown.offsetTop + 'px';
      layer.style.width = shown.offsetWidth + 'px';
      layer.style.height = shown.offsetHeight + 'px';
      layer.style.borderRadius = cs.borderRadius;
      layer.style.objectFit = cs.objectFit;
      layer.style.objectPosition = cs.objectPosition;
      frame.appendChild(layer);

      requestAnimationFrame(function () { layer.style.opacity = '1'; });
      // Commit underneath once the layer is fully opaque, then drop it: the
      // new file is already decoded, so the handover is invisible.
      setTimeout(function () {
        commit();
        requestAnimationFrame(function () { layer.remove(); });
      }, 480);
    }

    if (pre.decode) pre.decode().then(swap).catch(swap);
    else if (pre.complete) swap();
    else pre.onload = swap;
  }
})();
