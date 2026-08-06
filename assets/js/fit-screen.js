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
  var SCALE_FLOOR = 0.8;
  var MIN_READABLE_SCALE = 0.9; // below this, grow the panel rather than shrink the text

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
    body.style.marginBottom = '';
    var viewport = section.querySelector('.fit-screen-viewport');
    if (viewport) {
      viewport.style.height = '';
      viewport.classList.remove('fit-scroll');
    }
    var col = section.querySelector('.fit-screen-col');
    if (col) col.style.height = '';
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

  var CHEVRON_SVG = '<svg viewBox="0 0 32 20" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><path d="M3 4l13 12L29 4" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function makeChevron(targetId) {
    var link = document.createElement('a');
    link.className = 'fit-next';
    link.href = '#' + targetId;
    link.setAttribute('aria-label', 'Go to next section');
    link.innerHTML = CHEVRON_SVG;
    return link;
  }

  // A chevron at the foot of each screen linking to the next one. It's a plain
  // in-page anchor, so it goes through exactly the same handling as the sub-nav
  // links (including the menus page's jump/reveal behaviour).
  function addNextChevron(section) {
    var sections = Array.prototype.slice.call(document.querySelectorAll('.fit-screen'));
    var next = sections[sections.indexOf(section) + 1];
    if (next && next.id) {
      section.appendChild(makeChevron(next.id));
      return;
    }
    // Last panel on the page points at the footer, so the chain never dead-ends.
    var footer = document.querySelector('footer.site-footer');
    if (!footer) return;
    if (!footer.id) footer.id = 'site-footer';
    section.appendChild(makeChevron(footer.id));
  }

  // The same chevron on the page's opening hero, pointing into the first
  // full-screen panel, so the pattern starts at the top of every page.
  function addHeroChevron() {
    var first = document.querySelector('.fit-screen');
    if (!first || !first.id) return;
    var hero = document.querySelector('.site-header ~ section.band, .site-header ~ .menu-jump-bar ~ section.band-sm');
    if (!hero || hero.classList.contains('fit-screen')) return;
    var existing = hero.querySelector(':scope > .fit-next');
    if (existing) existing.remove();
    hero.classList.add('has-hero-chevron');
    hero.appendChild(makeChevron(first.id));
  }

  // The scrolling box must not be the grid itself: giving a grid a definite
  // height makes it divide that height between its rows, so cards get squashed
  // and images crop. A plain wrapper takes the fixed height and scrolls, while
  // the grid inside keeps its natural row heights. Created once, then reused.
  // When the panel sits beside a photo, the scroll viewport and its controls
  // need to share one grid cell so the controls can sit under the text rather
  // than centred across the whole section.
  function ensureColumn(viewport) {
    var parent = viewport.parentElement;
    if (parent && parent.classList.contains('fit-screen-col')) return parent;
    var col = document.createElement('div');
    col.className = 'fit-screen-col';
    parent.insertBefore(col, viewport);
    col.appendChild(viewport);
    return col;
  }

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

  function addPagingControls(section, scroller, pageHeight, hostOverride) {
    var host = hostOverride || section.querySelector('.fit-screen-content') || scroller.parentElement;

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

  // Scales a panel down to fit. The element keeps its natural height so nothing
  // is clipped (an earlier version pinned a shorter height with overflow:hidden,
  // which sliced the bottom off images and squared their rounded corners); the
  // layout space the transform frees is reclaimed with a negative margin.
  function applyScale(body, naturalHeight, scale) {
    body.style.transformOrigin = 'top center';
    body.style.transform = 'scale(' + scale + ')';
    body.style.height = '';
    body.style.overflow = '';
    body.style.marginBottom = '-' + (naturalHeight * (1 - scale)) + 'px';
  }

  function fitSection(section, offset) {
    var content = section.querySelector('.fit-screen-content');
    var head = section.querySelector('.fit-screen-head');
    var body = reset(section);
    if (!content || !body) return;

    // Some sections (e.g. the founder story) sit next to a photo in a .split
    // grid — the row is as tall as its tallest cell, so the image has to
    // shrink in step with the text or it'll hold the row open.
    // Walk out past any wrappers this script added on an earlier pass, so the
    // photo beside the panel is still found on re-runs (otherwise the second
    // run loses it and the controls jump back out of the text column).
    var layoutParent = body.parentElement;
    while (layoutParent && (layoutParent.classList.contains('fit-screen-viewport') ||
                            layoutParent.classList.contains('fit-screen-col'))) {
      layoutParent = layoutParent.parentElement;
    }
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

    // Panels marked data-fit-noscroll must always be a single responsive
    // screen — they scale down as far as needed rather than ever becoming a
    // scrolling panel with arrows.
    var noScroll = section.hasAttribute('data-fit-noscroll');
    var scale = budget / natural;
    if (noScroll) {
      // Only ever shrink a little. Past this the copy stops being comfortably
      // readable on smaller laptops, so the panel is allowed to run taller
      // than one screen instead — readable content beats a rigid one-screen
      // rule.
      if (scale < MIN_READABLE_SCALE) return;
      applyScale(body, bodyNatural, scale);
      if (siblingImg) siblingImg.style.height = (imgNatural * scale) + 'px';
      return;
    }
    if (!uniform && scale >= SCALE_FLOOR) {
      // transform doesn't shrink the element's own layout box, so pin an
      // explicit height to match the visually-scaled size, or the section
      // would still occupy its full unscaled height in the page flow.
      applyScale(body, bodyNatural, scale);
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
    var controlsHost = null;
    if (siblingImg) {
      // Text column spans the photo exactly: text starts level with the top of
      // the image, controls finish level with its bottom.
      siblingImg.style.height = budget + 'px';
      pageHeight = Math.max(160, budget - controlsAllowance);
      var col = ensureColumn(viewport);
      col.style.height = budget + 'px';
      controlsHost = col;
    }
    viewport.style.height = pageHeight + 'px';
    viewport.classList.add('fit-scroll');
    if (body.scrollHeight > pageHeight + 1) {
      addPagingControls(section, viewport, pageHeight, controlsHost);
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
    addHeroChevron();
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
