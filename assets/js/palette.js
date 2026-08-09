/*
 * palette.js — every "re-roll brand colours on page load" behaviour in one
 * place: the left swatch strip, paragraph keylines, the newsletter bar, the
 * impact stat pills, the header logo, tile-icon hovers, press-card hovers,
 * and the homepage definition card.
 *
 * Brand colour rules (apply to every rolling element):
 *   1. A colour is never the same as the one that element drew last load.
 *   2. Assignment within the pool is random.
 *   3. Every colour in the pool is used once before any repeats — decks
 *      persist across loads (localStorage) and reshuffle only when empty.
 *
 * Legibility ground rules, computed against WCAG:
 *   - Dark-on-paper text colours (≥4.5 on white): kale 4.9, blueberry 10.1,
 *     olive 7.3, chocolate 15.0. Tomato (4.37) misses AA for body text.
 *   - Light washes that can sit under dark text: custard, strawberry, fish.
 *     Only chocolate and blueberry are dark enough on top of them (4.7–9.1).
 *   - Custard 1.65, strawberry 2.1 and fish 2.2 are never used as text on
 *     paper — below even the large-text threshold.
 */
(function () {
  'use strict';

  var ALL = [
    '--color-kale', '--color-tomato', '--color-blueberry', '--color-olive',
    '--color-strawberry', '--color-chocolate', '--color-custard', '--color-fish'
  ];
  var DARK_ON_PAPER = ['--color-kale', '--color-blueberry', '--color-olive', '--color-chocolate'];

  function v(name) { return 'var(' + name + ')'; }

  function shuffled(arr) {
    var d = arr.slice();
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  /* ---- Persistent decks ---------------------------------------------------
     One named deck per rolling element group. draw(name, pool) pops the next
     colour; an empty deck reshuffles the whole pool, swapping so the first
     card of the new deck never equals the last one dealt (rule 1). Multiple
     draws in one load simply consume the deck faster — the full-cycle
     guarantee (rule 3) holds across loads. */
  var Decks = (function () {
    var KEY = 'hd-palette-decks';
    var store = {};
    try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* private mode: session-only rolls */ }
    }
    /* slot: a stable per-element index within the group. Each slot remembers
       the colour it wore last load; if the deck deals it the same one again,
       it swaps with another card so no element ever repeats itself across
       consecutive loads. */
    function draw(name, pool, slot) {
      var st = store[name];
      var valid = st && Array.isArray(st.deck) && st.deck.every(function (c) { return pool.indexOf(c) !== -1; });
      // A changed pool resets the deck but keeps the memory of what was
      // dealt before — rule 1 must survive across pool changes.
      if (!valid) st = store[name] = { deck: [], last: (st && st.last) || null, slots: (st && st.slots) || {} };
      if (!st.slots) st.slots = {};
      if (!st.deck.length) {
        var d = shuffled(pool);
        if (pool.length > 1 && d[d.length - 1] === st.last) {
          var j = Math.floor(Math.random() * (d.length - 1));
          var t = d[d.length - 1]; d[d.length - 1] = d[j]; d[j] = t;
        }
        st.deck = d;
      }
      var pick = st.deck.pop();
      if (slot !== undefined && pool.length > 1 && pick === st.slots[slot]) {
        var alt = -1;
        for (var i = st.deck.length - 1; i >= 0; i--) {
          if (st.deck[i] !== pick) { alt = i; break; }
        }
        if (alt >= 0) {
          var swap = st.deck[alt]; st.deck[alt] = pick; pick = swap;
        } else {
          // Deck exhausted on a conflict: start the next cycle a card early.
          var others = pool.filter(function (c) { return c !== pick; });
          var replacement = others[Math.floor(Math.random() * others.length)];
          st.deck = shuffled(pool.filter(function (c) { return c !== replacement; }));
          pick = replacement;
        }
      }
      if (slot !== undefined) st.slots[slot] = pick;
      st.last = pick;
      persist();
      return pick;
    }
    return { draw: draw };
  })();

  /* ---- Left swatch strip -------------------------------------------------
     Random order, but colours from the same temperature group never sit
     adjacent, so similar hues don't blur together — and the order always
     differs from the previous load's. 38px swatch + 10px transparent gap
     (whatever is behind the fixed strip shows through). */
  (function colourStrip() {
    if (!document.querySelector('.dot-col-left')) return;
    var GROUP = {
      '--color-kale': 'cool', '--color-blueberry': 'cool', '--color-olive': 'cool', '--color-fish': 'cool',
      '--color-tomato': 'warm', '--color-strawberry': 'warm', '--color-chocolate': 'warm', '--color-custard': 'warm'
    };
    var prev = '';
    try { prev = localStorage.getItem('hd-strip-order') || ''; } catch (e) {}
    var order = ALL;
    for (var attempt = 0; attempt < 100; attempt++) {
      var candidate = shuffled(ALL);
      var ok = candidate.join(',') !== prev;
      for (var i = 0; ok && i < candidate.length - 1; i++) {
        if (GROUP[candidate[i]] === GROUP[candidate[i + 1]]) ok = false;
      }
      if (ok) { order = candidate; break; }
    }
    try { localStorage.setItem('hd-strip-order', order.join(',')); } catch (e) {}
    var SWATCH = 38, GAP = 10, stops = [];
    order.forEach(function (name, i) {
      var start = i * (SWATCH + GAP), end = start + SWATCH;
      stops.push(v(name) + ' ' + start + 'px', v(name) + ' ' + end + 'px',
                 'transparent ' + end + 'px', 'transparent ' + (end + GAP) + 'px');
    });
    var style = document.createElement('style');
    style.textContent = '.dot-col-left { background-image: repeating-linear-gradient(to bottom, ' + stops.join(', ') + ') !important; }';
    document.head.appendChild(style);
  })();

  /* ---- Header logo -------------------------------------------------------
     The main site logo cycles the full palette: every colour appears once
     before the sequence reshuffles, never repeating the previous load's. */
  (function headerLogo() {
    var logo = document.querySelector('.site-header img.logo-mark');
    if (!logo) return;
    var NAMES = ['kale', 'tomato', 'blueberry', 'olive', 'strawberry', 'chocolate', 'custard', 'fish'];
    var pick = Decks.draw('header-logo', NAMES, 0);
    logo.src = logo.getAttribute('src').replace(/humdingers-logo-[a-z]+\.svg/, 'humdingers-logo-' + pick + '.svg');
  })();

  /* ---- Mobile nav keylines ------------------------------------------------
     The rules between the hamburger menu's top-level items are brand
     keylines, one colour per item per load, adjacent always distinct. */
  (function navKeylines() {
    var rows = document.querySelectorAll(
      '.main-nav > .nav-item, .nav-dropdown-inner > a, .nav-dropdown-inner > .nav-subitem, .nav-flyout a'
    );
    if (!rows.length) return;
    Array.prototype.forEach.call(rows, function (row, i) {
      row.style.setProperty('--nav-keyline', v(Decks.draw('nav-keylines', ALL, i)));
    });
  })();

  /* ---- Paragraph keylines ------------------------------------------------
     Which paragraphs carry a keyline is the stylesheet's decision; anything
     the CSS gave a left border gets a colour here. Grouped per <section> so
     related copy shares one colour; the persistent deck keeps adjacent
     sections different and cycles all eight before repeating. */
  (function keylines() {
    var els = document.querySelectorAll('.keyline-text, .band p:first-of-type, .band-sm p:first-of-type, .service-item p');
    if (!els.length) return;
    var groups = new Map();
    Array.prototype.forEach.call(els, function (el) {
      if (parseFloat(getComputedStyle(el).borderLeftWidth) === 0) return;
      // Testimonial balloons carry their own per-card roll — the left edge
      // that makes them look keyline-eligible belongs to the balloon.
      if (el.closest('blockquote')) return;
      var section = el.closest('section') || el.parentElement;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(el);
    });
    var gi = 0;
    groups.forEach(function (members) {
      var color = v(Decks.draw('keylines', ALL, gi++));
      members.forEach(function (el) { el.style.setProperty('--keyline-color', color); });
    });
  })();

  /* ---- Newsletter signup bar --------------------------------------------
     One dark-on-paper colour for the heading, input border and button. */
  (function newsletter() {
    var bars = document.querySelectorAll('.newsletter-row');
    if (!bars.length) return;
    var pick = v(Decks.draw('newsletter', DARK_ON_PAPER, 0));
    Array.prototype.forEach.call(bars, function (bar) {
      bar.style.setProperty('--nl-color', pick);
    });
  })();

  /* ---- Impact stat pills -------------------------------------------------
     Each pill: a light wash + dark fact text (the six AA pairings that exist
     in the palette), plus an independently drawn figure colour. No two pills
     share a wash or a figure colour. */
  (function statPills() {
    var cards = document.querySelectorAll('.stat-card');
    if (!cards.length) return;
    var WASHES = ['--color-custard', '--color-strawberry', '--color-fish'];
    var DARK_ON_WASH = ['--color-chocolate', '--color-blueberry'];
    var FIGURES = DARK_ON_PAPER.concat('--color-tomato'); // tomato ok: 2.4rem bold + icon only need 3.0
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--stat-light', v(Decks.draw('stat-washes', WASHES, i)));
      card.style.setProperty('--stat-dark', v(Decks.draw('stat-darks', DARK_ON_WASH, i)));
      card.style.setProperty('--stat-figure', v(Decks.draw('stat-figures', FIGURES, i)));
    });
  })();

  /* ---- Brand-coloured headings -------------------------------------------
     Any eyebrow or h2–h4 already set in a palette colour re-rolls on each
     load, as do h1s. Restricted to the five colours that hold 3:1 on paper
     at heading sizes (custard 1.65, strawberry 2.1 and fish 2.15 fail even
     as large text). Newsletter eyebrows are skipped — they follow their
     banner's own roll. */
  (function brandHeadings() {
    var PALETTE_RGB = {
      'rgb(11, 130, 65)': 1, 'rgb(202, 84, 32)': 1, 'rgb(0, 69, 109)': 1,
      'rgb(84, 91, 13)': 1, 'rgb(255, 145, 170)': 1, 'rgb(58, 32, 19)': 1,
      'rgb(255, 191, 43)': 1, 'rgb(116, 183, 238)': 1
    };
    var READABLE = ['--color-kale', '--color-tomato', '--color-blueberry', '--color-olive', '--color-chocolate'];
    var slot = 0;
    document.querySelectorAll('.eyebrow, h1, h2, h3, h4').forEach(function (el) {
      if (el.closest('.newsletter-row')) return;
      // Statement cards set their own coherent ink; the paper-readable deck
      // would clash with the wash behind it.
      if (el.closest('.statement-card')) return;
      // Footer sits on ink — the readable-on-paper deck would go invisible
      // there; its colourway is rolled separately.
      if (el.closest('footer')) return;
      // Eyebrows always carry a brand colour; h4s that follow a panel icon
      // join the roll even when currently black. Other headings only re-roll
      // if they already sit in a palette colour.
      var isEyebrow = el.classList.contains('eyebrow');
      var sib = el.previousElementSibling;
      var afterIcon = sib && sib.classList && sib.classList.contains('panel-icon');
      if (!isEyebrow && !afterIcon && !PALETTE_RGB[getComputedStyle(el).color]) return;
      el.style.color = 'var(' + Decks.draw('headings', READABLE, slot++) + ')';
    });
  })();

  /* ---- Testimonial keylines ----------------------------------------------
     Each card's left rule takes its own colour from the persistent deck, so
     adjacent cards differ and all eight cycle before repeating. */
  (function testimonialKeylines() {
    var cards = document.querySelectorAll('blockquote.testimonial');
    if (!cards.length) return;
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--keyline-color', v(Decks.draw('testimonials', ALL, i)));
    });
  })();

  /* ---- Inline wordmarks ---------------------------------------------------
     The small Humdingers wordmarks on content cards re-roll their colour on
     each load, distinct from one another, restricted to the variants that
     read on the white page (the light three are too pale for a wordmark). */
  (function pathMarks() {
    var marks = document.querySelectorAll('img.path-mark');
    if (!marks.length) return;
    Array.prototype.forEach.call(marks, function (img, i) {
      var pick = Decks.draw('path-marks', ['kale', 'tomato', 'blueberry', 'olive', 'chocolate'], i);
      img.src = img.getAttribute('src').replace(/humdingers-logo-[a-z]+\.svg/, 'humdingers-logo-' + pick + '.svg');
    });
  })();

  /* ---- Service-tile icon hovers ------------------------------------------
     Each browse-by-service tile draws its own brand colour per load; CSS
     applies it to the icon's outline/border on hover via --tile-hover. */
  (function tileHovers() {
    var tiles = document.querySelectorAll('.service-link-grid a');
    if (!tiles.length) return;
    // Tablet layouts split these grids with a vertical keyline — deal those too
    document.querySelectorAll('.service-link-grid').forEach(function (grid, i) {
      grid.style.setProperty('--tile-divider', v(Decks.draw('tile-divider', ALL, i)));
    });
    document.querySelectorAll('.venue-grid').forEach(function (grid, i) {
      grid.style.setProperty('--venue-divider', v(Decks.draw('venue-divider', ALL, i)));
    });
    Array.prototype.forEach.call(tiles, function (tile, i) {
      tile.style.setProperty('--tile-hover', v(Decks.draw('tile-hovers', ALL, i)));
    });
  })();

  /* ---- Press-card hovers --------------------------------------------------
     Each "As featured in" card draws a light wash it tints to on hover —
     restricted to the washes dark text stays AA on, since the card keeps
     its ink/dark text while hovered. */
  (function pressHovers() {
    var cards = document.querySelectorAll('.press-card');
    if (!cards.length) return;
    var WASHES = ['--color-custard', '--color-strawberry', '--color-fish'];
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--press-hover', v(Decks.draw('press-hovers', WASHES, i)));
    });
  })();

  /* ---- Path-card outlines -------------------------------------------------
     The two-ways cards each draw a brand colour for their border per load. */
  (function pathCardBorders() {
    var cards = document.querySelectorAll('.path-card');
    if (!cards.length) return;
    var WASHES = ['--color-custard', '--color-strawberry', '--color-fish'];
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--path-border', v(Decks.draw('path-borders', ALL, i)));
      // Hover wash: light colours only, so the ink text stays AA on hover
      card.style.setProperty('--path-hover', v(Decks.draw('path-hovers', WASHES, i)));
    });
  })();

  /* ---- Statement cards ---------------------------------------------------
     Each card draws a distinct light wash with an AA-passing dark text
     colour, same pairing table as the definition card's coloured rows. */
  (function statementCards() {
    var cards = document.querySelectorAll('.statement-card');
    if (!cards.length) return;
    var WASHES = ['--color-custard', '--color-strawberry', '--color-fish'];
    var DARKS = ['--color-chocolate', '--color-blueberry'];
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--statement-light', v(Decks.draw('statement-washes', WASHES, i)));
      card.style.setProperty('--statement-dark', v(Decks.draw('statement-darks', DARKS, i)));
    });
  })();

  /* ---- Footer colourway --------------------------------------------------
     One light colour per load — fish, custard or strawberry — applied
     together to the eyebrow, the column headings and the logo file, so the
     footer always reads as a single colourway on its ink background. */
  (function footerColourway() {
    var foot = document.querySelector('footer.site-footer');
    if (!foot) return;
    var pick = Decks.draw('footer', ['fish', 'custard', 'strawberry'], 0);
    foot.querySelectorAll('.eyebrow, h3, h4').forEach(function (el) {
      el.style.color = 'var(--color-' + pick + ')';
    });
    var logo = foot.querySelector('img.logo-mark');
    if (logo) logo.src = logo.getAttribute('src').replace(/humdingers-logo-[a-z]+\.svg/, 'humdingers-logo-' + pick + '.svg');
    // One shared hover colour for every footer link, re-dealt per load —
    // light colours only (legible on ink), and never the colour the
    // footer's own colourway/logo drew this load.
    var LINK_LIGHT = ['--color-fish', '--color-custard', '--color-strawberry'].filter(function (c) {
      return c !== '--color-' + pick;
    });
    foot.style.setProperty('--fl-hover', v(Decks.draw('footer-link-hovers', LINK_LIGHT, 0)));
  })();

  /* ---- Enquire-now CTA banner ---------------------------------------------
     The reusable banner draws a light wash + AA dark ink pair per load. */
  (function ctaBanner() {
    var banners = document.querySelectorAll('.cta-banner');
    if (!banners.length) return;
    var WASHES = ['--color-custard', '--color-strawberry', '--color-fish'];
    var DARKS = ['--color-chocolate', '--color-blueberry'];
    var wash = v(Decks.draw('cta-washes', WASHES, 0));
    var dark = v(Decks.draw('cta-darks', DARKS, 0));
    Array.prototype.forEach.call(banners, function (b) {
      b.style.setProperty('--cta-light', wash);
      b.style.setProperty('--cta-dark', dark);
    });
  })();

  /* ---- Definition card (homepage) ---------------------------------------
     A light background paired with dark text, drawn from the pairings that
     clear AA for body copy. Paper backgrounds widen the pool. */
  (function definition() {
    var card = document.querySelector('.definition');
    if (!card) return;
    var PAIRS = [
      ['--color-paper', '--color-ink'],        // 21.0
      ['--color-paper', '--color-chocolate'],  // 15.0
      ['--color-paper', '--color-blueberry'],  // 10.1
      ['--color-paper', '--color-olive'],      // 7.3
      ['--color-paper', '--color-kale'],       // 4.9
      ['--color-custard', '--color-chocolate'],    // 9.1
      ['--color-custard', '--color-blueberry'],    // 6.2
      ['--color-strawberry', '--color-chocolate'], // 7.1
      ['--color-strawberry', '--color-blueberry'], // 4.8
      ['--color-fish', '--color-chocolate'],       // 7.0
      ['--color-fish', '--color-blueberry']        // 4.7
    ];
    var idx = parseInt(Decks.draw('definition', PAIRS.map(function (_, i) { return String(i); }), 0), 10);
    var pair = PAIRS[idx];
    card.style.background = v(pair[0]);
    card.style.color = v(pair[1]);
    card.style.borderColor = v(pair[1]);
  })();
})();
