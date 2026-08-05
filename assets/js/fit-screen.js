/*
 * Makes every header-dropdown sub-nav target its own "screen": at least one
 * viewport tall, with its content sized to fit that screen.
 *
 * Two strategies, in order:
 *   1. Modest overflow  -> scale the content down slightly so it fits.
 *   2. Heavy overflow   -> turn the panel into a fixed-height scroll area and
 *                          add prev/next controls that page through it.
 *
 * Strategy 2 deliberately NEVER moves, clones or rebuilds any content — it
 * only sets a height and scrolls. An earlier version repackaged items into
 * generated slide/grid containers based on measurements taken at one instant;
 * whenever those measurements were even slightly stale (web font swap, late
 * image load) content ended up mispositioned or clipped. Scrolling the real,
 * untouched DOM removes that entire class of bug.
 *
 * Desktop/tablet only (>=901px) — on narrow viewports there's no spare
 * height to give up, so sections just flow normally.
 */
(function () {
  var MIN_WIDTH = 901;
  var SCALE_FLOOR = 0.8; // gentler than this and text gets too small — page instead

  function isDesktop() {
    return window.innerWidth >= MIN_WIDTH;
  }

  function setViewportOffset() {
    var header = document.querySelector('.site-header');
    var jumpBar = document.querySelector('.menu-jump-bar');
    var offset = header ? header.getBoundingClientRect().height : 0;
    if (jumpBar) offset += jumpBar.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--viewport-fit-offset', offset + 'px');
    return offset;
  }

  function reset(section) {
    var body = section.querySelector('.fit-screen-body');
    if (!body) return null;
    body.style.transform = '';
    body.style.transformOrigin = '';
    body.style.height = '';
    body.style.maxHeight = '';
    body.style.overflow = '';
    body.classList.remove('fit-scroll');
    if (body.parentElement) {
      Array.prototype.forEach.call(body.parentElement.children, function (el) {
        if (el.tagName === 'IMG') el.style.height = '';
      });
    }
    var controls = section.querySelector('.fit-carousel-controls');
    if (controls) controls.remove();
    return body;
  }

  function addPagingControls(section, body, pageHeight) {
    var host = section.querySelector('.fit-screen-content') || body.parentElement;
    var pageCount = Math.max(2, Math.ceil(body.scrollHeight / pageHeight));

    var controls = document.createElement('div');
    controls.className = 'fit-carousel-controls';

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'fit-carousel-arrow';
    prev.setAttribute('aria-label', 'Previous');
    prev.innerHTML = '&larr;';

    var dots = document.createElement('div');
    dots.className = 'fit-carousel-dots';
    var dotEls = [];
    for (var i = 0; i < pageCount; i++) {
      var d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Go to page ' + (i + 1));
      dots.appendChild(d);
      dotEls.push(d);
    }

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'fit-carousel-arrow';
    next.setAttribute('aria-label', 'Next');
    next.innerHTML = '&rarr;';

    controls.appendChild(prev);
    controls.appendChild(dots);
    controls.appendChild(next);
    host.appendChild(controls);

    function currentPage() {
      return Math.round(body.scrollTop / pageHeight);
    }
    function sync() {
      var maxScroll = body.scrollHeight - body.clientHeight;
      var page = currentPage();
      dotEls.forEach(function (d, i) { d.classList.toggle('active', i === page); });
      prev.disabled = body.scrollTop <= 1;
      next.disabled = body.scrollTop >= maxScroll - 1;
    }
    function goto(page) {
      var target = Math.min(Math.max(0, page) * pageHeight, body.scrollHeight - body.clientHeight);
      body.scrollTo({
        top: target,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
      // Don't rely solely on scroll events to refresh the arrows/dots —
      // sync straight away and again once a smooth scroll has landed.
      sync();
      setTimeout(sync, 450);
    }

    prev.addEventListener('click', function () { goto(currentPage() - 1); });
    next.addEventListener('click', function () { goto(currentPage() + 1); });
    dotEls.forEach(function (d, i) { d.addEventListener('click', function () { goto(i); }); });
    body.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  function fitSection(section, offset) {
    var content = section.querySelector('.fit-screen-content');
    var head = section.querySelector('.fit-screen-head');
    var body = reset(section);
    if (!content || !body) return;

    // Some sections (e.g. the founder story) sit next to a photo in a .split
    // grid — the row is as tall as its tallest cell, so the image has to
    // shrink in step with the text or it'll hold the row open.
    var siblingImg = Array.prototype.filter.call(body.parentElement.children, function (el) {
      return el !== body && el.tagName === 'IMG';
    })[0] || null;

    var styles = getComputedStyle(section);
    var padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    var available = window.innerHeight - offset - padding;
    var headHeight = head ? head.getBoundingClientRect().height : 0;
    var headGap = head ? parseFloat(getComputedStyle(head).marginBottom) : 0;
    var budget = available - headHeight - headGap;
    if (budget < 160) return; // too little room to do anything sensible

    var bodyNatural = body.scrollHeight;
    var imgNatural = siblingImg ? siblingImg.getBoundingClientRect().height : 0;
    var natural = Math.max(bodyNatural, imgNatural);
    if (natural <= budget + 1) return; // already fits

    var scale = budget / natural;
    if (scale >= SCALE_FLOOR) {
      // transform doesn't shrink the element's own layout box, so pin an
      // explicit height to match the visually-scaled size, or the section
      // would still occupy its full unscaled height in the page flow.
      body.style.transformOrigin = 'top center';
      body.style.transform = 'scale(' + scale + ')';
      body.style.height = (bodyNatural * scale) + 'px';
      body.style.overflow = 'hidden';
      if (siblingImg) siblingImg.style.height = (imgNatural * scale) + 'px';
      return;
    }

    // Long-form prose reads badly in a paged panel, so sections marked
    // data-fit-grow stay a full screen tall but are allowed to run longer
    // and scroll with the page as normal.
    if (section.hasAttribute('data-fit-grow')) return;

    // Too much to shrink legibly: fix the panel's height and let it scroll,
    // with controls to page through. Content itself is left exactly as-is.
    var controlsAllowance = 72;
    var pageHeight = Math.max(160, budget - controlsAllowance);
    body.style.height = pageHeight + 'px';
    body.classList.add('fit-scroll');
    if (siblingImg) siblingImg.style.height = pageHeight + 'px';
    addPagingControls(section, body, pageHeight);
  }

  function clearSection(section) {
    reset(section);
  }

  // Several things trigger a re-run (window load, fonts finishing, resize).
  // Re-running is cheap and safe now that nothing is rebuilt, but pointless
  // work is still avoided once the page has genuinely settled — and crucially
  // a run is never skipped BEFORE that point, so an early, slightly-wrong
  // measurement can't get locked in.
  var lastRunSize = null;
  var settled = false;
  function run() {
    var size = window.innerWidth + 'x' + window.innerHeight;
    if (settled && size === lastRunSize) return;
    lastRunSize = size;

    var offset = setViewportOffset();
    var sections = document.querySelectorAll('.fit-screen');
    if (!isDesktop()) {
      sections.forEach(clearSection);
      document.documentElement.style.scrollSnapType = '';
      return;
    }
    document.documentElement.style.scrollSnapType = sections.length ? 'y proximity' : '';
    sections.forEach(function (section) { fitSection(section, offset); });
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(run, 150);
  }

  // "Settled" needs both window.load (images done — web fonts don't block it)
  // and fonts.ready (a font swap reflows card heights after load fires).
  var loadFired = false;
  var fontsDone = !(document.fonts && document.fonts.ready);
  function maybeSettle() {
    if (!loadFired || !fontsDone) return;
    lastRunSize = null; // force this final authoritative pass to run
    run();
    settled = true;
  }

  run();
  window.addEventListener('load', function () { loadFired = true; run(); maybeSettle(); });
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fontsDone = true; run(); maybeSettle(); });
  }
})();
