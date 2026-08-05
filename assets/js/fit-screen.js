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
    var viewport = section.querySelector('.fit-screen-viewport');
    if (viewport) {
      viewport.style.height = '';
      viewport.classList.remove('fit-scroll');
    }
    var container = (viewport || body).parentElement;
    if (container) {
      Array.prototype.forEach.call(container.children, function (el) {
        if (el.tagName === 'IMG') el.style.height = '';
      });
    }
    var controls = section.querySelector('.fit-carousel-controls');
    if (controls) controls.remove();
    var chevron = section.querySelector('.fit-next');
    if (chevron) chevron.remove();
    return body;
  }

  // A chevron at the foot of each screen linking to the next one. It's a plain
  // in-page anchor, so it goes through exactly the same handling as the sub-nav
  // links (including the menus page's jump/reveal behaviour).
  function addNextChevron(section) {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.fit-screen'));
    var next = sections[sections.indexOf(section) + 1];
    if (!next || !next.id) return;
    var link = document.createElement('a');
    link.className = 'fit-next';
    link.href = '#' + next.id;
    link.setAttribute('aria-label', 'Go to next section');
    link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    section.appendChild(link);
  }

  // The scrolling box must not be the grid itself: giving a grid a definite
  // height makes it divide that height between its rows, so cards get squashed
  // and images crop. A plain wrapper takes the fixed height and scrolls, while
  // the grid inside keeps its natural row heights. Created once, then reused.
  function ensureViewport(body) {
    var parent = body.parentElement;
    if (parent && parent.classList.contains('fit-screen-viewport')) return parent;
    var viewport = document.createElement('div');
    viewport.className = 'fit-screen-viewport';
    parent.insertBefore(viewport, body);
    viewport.appendChild(body);
    return viewport;
  }

  // Page by whole rows so a page never ends mid-card.
  function rowStride(body) {
    var kids = body.children;
    if (!kids.length) return 0;
    var firstTop = kids[0].offsetTop;
    for (var i = 1; i < kids.length; i++) {
      if (kids[i].offsetTop > firstTop + 2) return kids[i].offsetTop - firstTop;
    }
    return kids[0].offsetHeight; // single row
  }

  function addPagingControls(section, scroller, pageHeight) {
    var host = section.querySelector('.fit-screen-content') || scroller.parentElement;

    var controls = document.createElement('div');
    controls.className = 'fit-carousel-controls';

    var up = document.createElement('button');
    up.type = 'button';
    up.className = 'fit-carousel-arrow';
    up.setAttribute('aria-label', 'Scroll up');
    up.innerHTML = '&uarr;';

    var down = document.createElement('button');
    down.type = 'button';
    down.className = 'fit-carousel-arrow';
    down.setAttribute('aria-label', 'Scroll down');
    down.innerHTML = '&darr;';

    controls.appendChild(up);
    controls.appendChild(down);
    host.appendChild(controls);

    function sync() {
      var maxScroll = scroller.scrollHeight - scroller.clientHeight;
      up.disabled = scroller.scrollTop <= 1;
      down.disabled = scroller.scrollTop >= maxScroll - 1;
    }
    // Move exactly one panel-height per click; scroll-snap then settles it
    // onto the nearest row boundary so a page never stops mid-row.
    function step(direction) {
      var maxScroll = scroller.scrollHeight - scroller.clientHeight;
      var target = Math.min(Math.max(0, scroller.scrollTop + direction * pageHeight), maxScroll);
      scroller.scrollTo({
        top: target,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
      // Don't rely solely on scroll events to refresh the arrows — sync
      // straight away and again once a smooth scroll has landed.
      sync();
      setTimeout(sync, 500);
    }

    up.addEventListener('click', function () { step(-1); });
    down.addEventListener('click', function () { step(1); });
    scroller.addEventListener('scroll', sync, { passive: true });
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
    var layoutParent = body.parentElement.classList.contains('fit-screen-viewport')
      ? body.parentElement.parentElement
      : body.parentElement;
    var siblingImg = Array.prototype.filter.call(layoutParent.children, function (el) {
      return el.tagName === 'IMG';
    })[0] || null;

    var styles = getComputedStyle(section);
    var padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    var available = window.innerHeight - offset - padding;
    // Only reserve room for the head when it actually sits above the content.
    // In the menus' two-column layout it sits alongside, so the panel gets the
    // full height.
    var headAbove = head && body.getBoundingClientRect().top >= head.getBoundingClientRect().bottom - 2;
    var headHeight = headAbove ? head.getBoundingClientRect().height : 0;
    var headGap = headAbove ? parseFloat(getComputedStyle(head).marginBottom) : 0;
    var budget = available - headHeight - headGap;
    if (budget < 160) return; // too little room to do anything sensible

    var bodyNatural = body.scrollHeight;
    var imgNatural = siblingImg ? siblingImg.getBoundingClientRect().height : 0;
    var natural = Math.max(bodyNatural, imgNatural);

    // Sections marked data-fit-uniform always get the same fixed-height panel,
    // whether or not their content overflows it. The menu categories need this:
    // sizing each panel to its own content made every category a different
    // height, so the layout jumped as you moved between them.
    var uniform = section.hasAttribute('data-fit-uniform');
    if (natural <= budget + 1 && !uniform) return; // already fits

    var scale = budget / natural;
    if (!uniform && scale >= SCALE_FLOOR) {
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

    // Too much to shrink legibly: give a wrapper the fixed height and let it
    // scroll, with controls to page through. Content is left exactly as-is.
    var controlsAllowance = 72;
    var roomForRows = Math.max(160, budget - controlsAllowance);
    var pageHeight = roomForRows;

    // Card grids round down to a whole number of rows so a page never cuts a
    // card in half. Flowing text (the menu dish lists) doesn't: rounding to
    // its first block's height made every category a different height, and
    // text reads fine part-scrolled — so it just takes the full space.
    if (getComputedStyle(body).display === 'grid') {
      var stride = rowStride(body);
      if (stride > 0 && stride <= roomForRows) {
        pageHeight = Math.floor(roomForRows / stride) * stride;
        // Trailing row gap sits below the last visible row; trim it so the row
        // meets the panel edge cleanly.
        var gap = stride - (body.children[0] ? body.children[0].offsetHeight : stride);
        if (gap > 0 && pageHeight - gap >= stride) pageHeight -= gap;
      }
    }

    var viewport = ensureViewport(body);
    viewport.style.height = pageHeight + 'px';
    viewport.classList.add('fit-scroll');
    // A photo beside the panel is matched to it so the two columns line up.
    if (siblingImg) siblingImg.style.height = pageHeight + 'px';
    if (body.scrollHeight > pageHeight + 1) {
      addPagingControls(section, viewport, pageHeight);
    }
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
    sections.forEach(addNextChevron);
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
