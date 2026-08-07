/*
 * palette.js — every "re-roll brand colours on page load" behaviour in one
 * place: the left swatch strip, paragraph keylines, the newsletter bar, the
 * impact stat pills, and the homepage definition card.
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

  /* ---- Left swatch strip -------------------------------------------------
     Random order, but colours from the same temperature group never sit
     adjacent, so similar hues don't blur together. 38px swatch + 10px
     transparent gap (whatever is behind the fixed strip shows through). */
  (function colourStrip() {
    if (!document.querySelector('.dot-col-left')) return;
    var GROUP = {
      '--color-kale': 'cool', '--color-blueberry': 'cool', '--color-olive': 'cool', '--color-fish': 'cool',
      '--color-tomato': 'warm', '--color-strawberry': 'warm', '--color-chocolate': 'warm', '--color-custard': 'warm'
    };
    var order = ALL;
    for (var attempt = 0; attempt < 100; attempt++) {
      var candidate = shuffled(ALL);
      var ok = true;
      for (var i = 0; i < candidate.length - 1; i++) {
        if (GROUP[candidate[i]] === GROUP[candidate[i + 1]]) { ok = false; break; }
      }
      if (ok) { order = candidate; break; }
    }
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

  /* ---- Paragraph keylines ------------------------------------------------
     Which paragraphs carry a keyline is the stylesheet's decision; anything
     the CSS gave a left border gets a colour here. Grouped per <section> so
     related copy shares one colour; a shuffled deck keeps adjacent sections
     different and cycles all eight before repeating. */
  (function keylines() {
    var els = document.querySelectorAll('.keyline-text, .band p:first-of-type, .band-sm p:first-of-type, .service-item p');
    if (!els.length) return;
    var deck = [];
    function next() { if (!deck.length) deck = shuffled(ALL); return deck.pop(); }
    var groups = new Map();
    Array.prototype.forEach.call(els, function (el) {
      if (parseFloat(getComputedStyle(el).borderLeftWidth) === 0) return;
      var section = el.closest('section') || el.parentElement;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section).push(el);
    });
    groups.forEach(function (members) {
      var color = v(next());
      members.forEach(function (el) { el.style.setProperty('--keyline-color', color); });
    });
  })();

  /* ---- Newsletter signup bar --------------------------------------------
     One dark-on-paper colour for the heading, input border and button. */
  (function newsletter() {
    var bars = document.querySelectorAll('.newsletter-row');
    if (!bars.length) return;
    var pick = v(DARK_ON_PAPER[Math.floor(Math.random() * DARK_ON_PAPER.length)]);
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
    var DARK_ON_WASH = ['--color-chocolate', '--color-blueberry'];
    var washes = shuffled(['--color-custard', '--color-strawberry', '--color-fish']);
    var figures = shuffled(DARK_ON_PAPER.concat('--color-tomato')); // tomato ok: 2.4rem bold + icon only need 3.0
    Array.prototype.forEach.call(cards, function (card, i) {
      card.style.setProperty('--stat-light', v(washes[i % washes.length]));
      card.style.setProperty('--stat-dark', v(DARK_ON_WASH[Math.floor(Math.random() * DARK_ON_WASH.length)]));
      card.style.setProperty('--stat-figure', v(figures[i % figures.length]));
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
    var pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    card.style.background = v(pair[0]);
    card.style.color = v(pair[1]);
    card.style.borderColor = v(pair[1]);
  })();
})();
