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
  var FIRST_KEY = 'hd-gallery-first';
  var galleries = null;

  function shuffled(arr) {
    var d = arr.slice();
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  /* Every visit sees the set in a fresh order, and never opens on the same
     photograph as last time — the same rule the brand colours follow. The
     opening shot per gallery is remembered between visits. */
  function order(key, images, lastFirst) {
    var out = shuffled(images);
    if (out.length > 1 && out[0].img === lastFirst) {
      var j = 1 + Math.floor(Math.random() * (out.length - 1));
      var t = out[0]; out[0] = out[j]; out[j] = t;
    }
    return out;
  }

  /* The sets are inlined in the page head, so this visit's choice is made
     without waiting on a network round trip — the reason the default frame
     used to show first. Falls back to the shared file if the inline block
     is ever missing. */
  function begin(data) {
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(FIRST_KEY)) || {}; } catch (e) {}

    Object.keys(data).forEach(function (key) {
      data[key].images = order(key, data[key].images, seen[key]);
      seen[key] = data[key].images[0].img;
    });
    try { localStorage.setItem(FIRST_KEY, JSON.stringify(seen)); } catch (e) {}

    galleries = data;
    window.HumdingersGalleries = data; // lightbox steps in this same order

    // Several panels can share a gallery: offset each so they never open on
    // the same photograph as one another.
    var used = {};
    Array.prototype.forEach.call(rotators, function (img) {
      var key = img.getAttribute('data-gallery');
      used[key] = (used[key] || 0);
      setup(img, used[key]++);
    });
  }

  function reveal() {
    Array.prototype.forEach.call(rotators, function (img) {
      img.classList.add('gallery-ready');
    });
  }

  var inline = document.getElementById('gallery-data');
  if (inline) {
    try { begin(JSON.parse(inline.textContent)); }
    catch (e) { reveal(); }
  } else {
    fetch('assets/data/food-galleries.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
      .then(begin)
      .catch(reveal);   // show the markup frame rather than nothing
  }
  // Belt and braces: never leave a gallery image hidden.
  setTimeout(reveal, 2000);

  function imagesFor(key) {
    return (galleries && galleries[key] && galleries[key].images) || [];
  }

  function setup(shown, offset) {
    var key = shown.getAttribute('data-gallery');
    var images = imagesFor(key);
    if (!images.length) return;

    /* Open on this load's shot for the gallery (offset per panel). The image
       is still hidden at this point, so setting src now means the visitor
       only ever sees the chosen photograph — never the markup default
       followed by a swap. Revealed immediately: img-preload's shimmer and
       spinner cover the download, exactly as for any other image. */
    var current = offset % images.length;
    shown.dataset.index = current;
    if (shown.getAttribute('src') !== images[current].img) {
      shown.src = images[current].img;
      shown.alt = images[current].alt;
    }
    shown.classList.add('gallery-ready');

    if (images.length < 2) return;   // nothing to rotate between

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
