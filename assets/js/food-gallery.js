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

  /* Cross-fade: the incoming shot is decoded first so the swap never lands on
     a half-drawn frame. */
  function show(shown, item, index) {
    var pre = new Image();
    pre.src = item.img;
    var swap = function () {
      shown.dataset.index = index;
      shown.classList.add('is-fading');
      setTimeout(function () {
        shown.src = item.img;
        shown.alt = item.alt;
        shown.classList.remove('is-fading');
      }, 320);
    };
    if (pre.decode) pre.decode().then(swap).catch(swap);
    else if (pre.complete) swap();
    else pre.onload = swap;
  }
})();
