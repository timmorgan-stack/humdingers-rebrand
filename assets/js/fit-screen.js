/*
 * Makes every header-dropdown sub-nav target its own "screen": at least one
 * viewport tall. If its content is a bit too long, it's scaled down to fit.
 * If scaling that far would make it illegibly small, the dense part (a card
 * grid, a run of long paragraphs, a list of menu groups) is paginated into a
 * small carousel instead, at full readable size.
 *
 * Desktop/tablet only (>=901px) — on narrow viewports there's no spare
 * height to give up, so sections just flow normally.
 */
(function () {
  var MIN_WIDTH = 901;
  var SCALE_FLOOR = 0.72; // below this, switch to a carousel instead of shrinking further
  var ROW_TOLERANCE = 4; // px — items within this of each other's offsetTop count as one row

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

  function groupIntoRows(items) {
    var rows = [];
    items.forEach(function (item) {
      var top = item.offsetTop;
      var row = rows.filter(function (r) { return Math.abs(r.top - top) < ROW_TOLERANCE; })[0];
      if (!row) { row = { top: top, items: [] }; rows.push(row); }
      row.items.push(item);
    });
    rows.sort(function (a, b) { return a.top - b.top; });
    return rows;
  }

  function rowHeight(row) {
    return Math.max.apply(null, row.items.map(function (i) { return i.offsetHeight; }));
  }

  // Splits rows into pages aimed at an even share of the total content each
  // (not just "pack until it overflows, dump the remainder on the last
  // page") so no slide ends up sparse next to full ones. If a page still
  // can't fit its rows into budget even split evenly (one huge row), it
  // tries more pages until every page fits — falling back to one row per
  // page in the worst case.
  function paginateRows(rows, budget, gap) {
    var heights = rows.map(rowHeight);
    var total = heights.reduce(function (sum, h, i) { return sum + h + (i > 0 ? gap : 0); }, 0);
    var maxPages = rows.length;

    for (var numPages = Math.max(1, Math.ceil(total / budget)); numPages <= maxPages; numPages++) {
      var target = total / numPages;
      var pages = [];
      var current = [];
      var currentHeight = 0;

      for (var i = 0; i < rows.length; i++) {
        var added = current.length ? heights[i] + gap : heights[i];
        var remainingRows = rows.length - i;
        var remainingPages = numPages - pages.length;
        var mustStartNewPage = current.length && (
          currentHeight + added > budget ||
          (currentHeight + added > target && remainingRows > remainingPages)
        );
        if (mustStartNewPage) {
          pages.push(current);
          current = [];
          currentHeight = 0;
          added = heights[i];
        }
        current.push(rows[i]);
        currentHeight += added;
      }
      if (current.length) pages.push(current);

      var fits = pages.every(function (page) {
        var h = page.reduce(function (sum, row, idx) { return sum + rowHeight(row) + (idx > 0 ? gap : 0); }, 0);
        return h <= budget + 1 || page.length === 1;
      });
      if (fits || numPages === maxPages) return pages;
    }
    return [rows]; // unreachable, satisfies linters
  }

  function buildCarousel(body, pages, gridClass, budget) {
    var wrap = document.createElement('div');
    wrap.className = 'fit-carousel';

    var track = document.createElement('div');
    track.className = 'fit-carousel-track';

    var grids = [];
    pages.forEach(function (page) {
      var slide = document.createElement('div');
      slide.className = 'fit-carousel-slide';
      var grid = document.createElement('div');
      grid.className = gridClass;
      page.forEach(function (row) {
        row.items.forEach(function (item) { grid.appendChild(item); });
      });
      slide.appendChild(grid);
      track.appendChild(slide);
      grids.push(grid);
    });

    wrap.appendChild(track);
    body.appendChild(wrap); // attached so the grids below can be measured

    // Balanced pagination keeps every panel a reasonably even share of the
    // total already — this only needs to catch the rare page that still
    // overflows the budget (one row too big to split further) and shrink
    // it to fit. Never scales up: width is hard-capped by the section, so
    // there's no slack to grow into without clipping the sides.
    grids.forEach(function (grid) {
      var naturalH = grid.scrollHeight;
      if (!naturalH || naturalH <= budget) return;
      var naturalW = grid.getBoundingClientRect().width;
      var scale = Math.max(0.55, budget / naturalH);
      grid.style.transform = 'scale(' + scale + ')';
      grid.style.transformOrigin = 'top center';
      grid.style.width = naturalW + 'px';
      grid.style.height = (naturalH * scale) + 'px';
      grid.style.alignSelf = 'center';
      grid.style.overflow = 'hidden';
    });

    if (pages.length > 1) {
      var controls = document.createElement('div');
      controls.className = 'fit-carousel-controls';

      var prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'fit-carousel-arrow';
      prev.setAttribute('aria-label', 'Previous');
      prev.innerHTML = '&larr;';

      var dots = document.createElement('div');
      dots.className = 'fit-carousel-dots';
      var dotEls = pages.map(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        dots.appendChild(d);
        return d;
      });

      var next = document.createElement('button');
      next.type = 'button';
      next.className = 'fit-carousel-arrow';
      next.setAttribute('aria-label', 'Next');
      next.innerHTML = '&rarr;';

      controls.appendChild(prev);
      controls.appendChild(dots);
      controls.appendChild(next);
      wrap.appendChild(controls);

      var index = 0;
      function render() {
        track.style.transform = 'translateX(-' + (index * 100) + '%)';
        dotEls.forEach(function (d, i) { d.classList.toggle('active', i === index); });
        prev.disabled = index === 0;
        next.disabled = index === pages.length - 1;
      }
      prev.addEventListener('click', function () { index = Math.max(0, index - 1); render(); });
      next.addEventListener('click', function () { index = Math.min(pages.length - 1, index + 1); render(); });
      dotEls.forEach(function (d, i) { d.addEventListener('click', function () { index = i; render(); }); });
      wrap.tabIndex = 0;
      wrap.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { index = Math.max(0, index - 1); render(); }
        if (e.key === 'ArrowRight') { index = Math.min(pages.length - 1, index + 1); render(); }
      });
      render();
    }
  }

  function fitSection(section, offset) {
    var content = section.querySelector('.fit-screen-content');
    var head = section.querySelector('.fit-screen-head');
    var body = section.querySelector('.fit-screen-body');
    if (!content || !body) return;

    // A couple of sections (e.g. the founder story) sit next to a photo in a
    // .split grid — the grid row is as tall as its tallest cell, so the image
    // has to shrink in step with the text or it'll hold the row open.
    var siblingImg = null;
    if (body.parentElement) {
      siblingImg = Array.prototype.filter.call(body.parentElement.children, function (el) {
        return el !== body && el.tagName === 'IMG';
      })[0] || null;
    }

    // Undo any previous pass so we measure natural, unscaled height.
    body.style.transform = '';
    body.style.height = '';
    body.style.overflow = '';
    if (siblingImg) siblingImg.style.height = '';
    if (body.dataset.fitOriginal) {
      body.innerHTML = body.dataset.fitOriginal;
      delete body.dataset.fitOriginal;
    }
    if (body.dataset.fitOriginalClass) {
      body.className = body.dataset.fitOriginalClass;
      delete body.dataset.fitOriginalClass;
    }

    var styles = getComputedStyle(section);
    var padding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    var available = window.innerHeight - offset - padding;
    var headHeight = head ? head.getBoundingClientRect().height : 0;
    var headGap = head ? parseFloat(getComputedStyle(head).marginBottom) : 0;
    var budget = available - headHeight - headGap;
    if (budget < 120) return; // too little room to do anything sensible — leave it be

    var bodyNatural = body.scrollHeight;
    var imgNatural = siblingImg ? siblingImg.getBoundingClientRect().height : 0;
    var natural = Math.max(bodyNatural, imgNatural);
    if (natural <= budget) return; // already fits

    var scale = budget / natural;
    if (scale >= SCALE_FLOOR) {
      // transform doesn't shrink the element's own layout box, so pin an explicit
      // height to match the visually-scaled size (shrinks from the top) or the
      // section would still occupy its full unscaled height in the page flow.
      // Both the text and any sibling photo shrink by the same factor so the
      // grid row settles at exactly the available height, not whichever cell
      // happens to be tallest.
      body.style.transform = 'scale(' + scale + ')';
      body.style.height = (bodyNatural * scale) + 'px';
      body.style.overflow = 'hidden';
      if (siblingImg) siblingImg.style.height = (imgNatural * scale) + 'px';
      return;
    }

    // .fit-screen-body's direct children are the repeatable "items" to paginate
    // (cards in a grid, paragraphs, menu groups) — its own class (minus the
    // fit-screen-body marker) is reapplied to each slide so grid layout survives.
    var items = Array.from(body.children);
    if (items.length < 2) return; // nothing sensible to paginate
    var gridClass = body.className.replace('fit-screen-body', '').trim();

    body.dataset.fitOriginal = body.innerHTML;
    var rows = groupIntoRows(items);
    var rowGap = rows.length > 1 ? (rows[1].top - rows[0].top - rows[0].items[0].offsetHeight) : 0;
    var pages = paginateRows(rows, budget, Math.max(rowGap, 0));
    if (pages.length < 2) { delete body.dataset.fitOriginal; return; }
    // Body itself must stop being a grid/flex container once it hosts the
    // carousel wrapper — otherwise it sizes that single child as a grid track
    // (min-width:auto keeps it at content's natural, uncapped width) and the
    // whole carousel blows out past the section's actual width.
    body.dataset.fitOriginalClass = body.className;
    body.className = 'fit-screen-body';
    buildCarousel(body, pages, gridClass, budget);
  }

  // Multiple things can trigger a re-run (window load, fonts finishing,
  // resize) — rebuilding a carousel the user is mid-interaction with
  // (destroying and recreating its DOM) is jarring and can flash empty,
  // so skip it entirely unless the viewport actually changed size.
  var lastRunSize = null;
  function run() {
    var size = window.innerWidth + 'x' + window.innerHeight;
    if (size === lastRunSize) return;
    lastRunSize = size;

    var offset = setViewportOffset();
    var sections = document.querySelectorAll('.fit-screen');
    if (!isDesktop()) {
      sections.forEach(function (section) {
        var body = section.querySelector('.fit-screen-body');
        if (!body) return;
        body.style.transform = '';
        body.style.height = '';
        body.style.overflow = '';
        if (body.parentElement) {
          Array.prototype.forEach.call(body.parentElement.children, function (el) {
            if (el.tagName === 'IMG') el.style.height = '';
          });
        }
        if (body.dataset.fitOriginal) {
          body.innerHTML = body.dataset.fitOriginal;
          delete body.dataset.fitOriginal;
        }
        if (body.dataset.fitOriginalClass) {
          body.className = body.dataset.fitOriginalClass;
          delete body.dataset.fitOriginalClass;
        }
      });
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

  window.addEventListener('load', run);
  window.addEventListener('resize', onResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
})();
