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
      // Join the site's normal loading choreography so the chosen shot fades
      // in like any other image rather than appearing abruptly.
      shown.classList.add('img-loading', 'img-first-fade');
      shown.addEventListener('load', function () {
        shown.classList.remove('img-loading');
        setTimeout(function () { shown.classList.remove('img-first-fade'); }, 1000);
      }, { once: true });
      shown.src = images[current].img;
      shown.alt = images[current].alt;
    }
    shown.classList.add('gallery-ready');

    if (images.length < 2) return;   // nothing to rotate between

    var idle = null;
    var dots = buildDots(shown, images, function (i) {
      // A deliberate choice takes over from the timer: show it, then let the
      // rotation carry on from there.
      stop();
      mark(i);
      show(shown, images[i], i);
      start();
    });
    mark(current);

    function mark(i) {
      if (!dots) return;
      Array.prototype.forEach.call(dots.children, function (dot, n) {
        dot.classList.toggle('is-current', n === i);
        dot.setAttribute('aria-current', n === i ? 'true' : 'false');
      });
    }

    function advance() {
      var next = (Number(shown.dataset.index) + 1) % images.length;
      mark(next);
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

  /* Dots: one per photograph, the current one filled, any of them clickable
     to jump straight to that shot. Positioned against the image's own box
     like the magnifier badge, since these images sit in all sorts of
     containers. Skipped on small frames (the menu thumbnails), where a row
     of dots would be wider than the picture. */
  function buildDots(shown, images, jump) {
    var frame = shown.parentElement;
    if (!frame || shown.offsetWidth < 260) return null;

    var wrap = document.createElement('div');
    wrap.className = 'gallery-dots';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choose a photograph');

    images.forEach(function (item, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gallery-dot';
      dot.setAttribute('aria-label', 'Show photograph ' + (i + 1) + ' of ' + images.length);
      dot.addEventListener('click', function (e) {
        e.stopPropagation();   // don't also open the lightbox
        jump(i);
      });
      wrap.appendChild(dot);
    });

    frame.classList.add('has-overlay');
    frame.appendChild(wrap);

    /* Measured against the dots' offsetParent — the element the browser
       actually resolves these coordinates against — rather than assuming the
       frame is the positioning context. */
    function place() {
      frame.classList.add('has-overlay');
      var host = wrap.offsetParent || frame;
      var ir = shown.getBoundingClientRect();
      var hr = host.getBoundingClientRect();
      if (!ir.width) { wrap.hidden = true; return; }
      wrap.hidden = ir.width < 260;
      wrap.style.left = (ir.left - hr.left + ir.width / 2) + 'px';
      wrap.style.top = (ir.top - hr.top + ir.height) + 'px';
    }
    place();
    /* The image's box keeps changing after first layout — the photograph
       loads, fonts swap, a neighbouring column reflows and a stretched image
       grows with its row. Watching the box itself catches all of that; the
       load and resize hooks remain for browsers without ResizeObserver. */
    shown.addEventListener('load', place);
    window.addEventListener('resize', place);
    if ('ResizeObserver' in window) new ResizeObserver(place).observe(shown);

    /* The dots arrive with the opening photograph rather than ahead of it —
       a nav floating over an empty frame looks broken. Their first fade
       borrows the image's 0.7s ramp so the two move as one; once shown they
       stay put. */
    function reveal() {
      wrap.style.transition = 'opacity 0.7s ease';
      wrap.classList.add('is-visible');
      wrap.style.opacity = '1';
      setTimeout(function () { wrap.style.transition = ''; }, 800);
    }
    whenFadesIn(shown, reveal);
    return wrap;
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

    /* Transitions can overlap — a dot clicked while a fade is still running,
       or clicks in quick succession. Each one claims a ticket; a fade that
       has been superseded abandons its commit, otherwise the older one lands
       last and the panel ends up on the wrong photograph. */
    var ticket = (Number(shown.dataset.fade) || 0) + 1;
    shown.dataset.fade = ticket;
    var stale = function () { return Number(shown.dataset.fade) !== ticket; };

    // Drop any layer still fading from a superseded transition.
    var frameNow = shown.parentElement;
    if (frameNow) {
      Array.prototype.forEach.call(frameNow.querySelectorAll(':scope > .food-crossfade'), function (old) {
        old.remove();
      });
    }

    function commit() {
      if (stale()) return;
      shown.src = item.img;
      shown.alt = item.alt;
      shown.dataset.index = index;
    }

    function swap() {
      if (stale()) return;
      var frame = shown.parentElement;
      if (!frame || !shown.offsetWidth) { commit(); return; }
      frame.classList.add('has-overlay');

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

      // rAF is suspended in background tabs, which would strand the layer
      // at opacity 0; a timer still fires, so the fade always starts.
      setTimeout(function () { layer.style.opacity = '1'; }, 20);
      // Commit underneath once the layer is fully opaque, then drop it: the
      // new file is already decoded, so the handover is invisible.
      setTimeout(function () {
        if (stale()) { layer.remove(); return; }
        commit();
        setTimeout(function () { layer.remove(); }, 20);
      }, 480);
    }

    whenReady(pre, swap);
  }

  /* Decoding first keeps a fade from starting on a half-drawn frame, but
     decode() is only ever an optimisation: it can sit unsettled, and a
     gallery that waits on it stalls for good. Load is the real signal, and a
     timeout guarantees the sequence always moves on. */
  function whenReady(pre, done) {
    var fired = false;
    function go() { if (!fired) { fired = true; done(); } }
    function decodeThenGo() {
      if (pre.decode) pre.decode().then(go).catch(go);
      else go();
    }
    if (pre.complete && pre.naturalWidth) decodeThenGo();
    else {
      pre.onload = decodeThenGo;
      pre.onerror = go;
    }
    setTimeout(go, 300);
  }
})();
