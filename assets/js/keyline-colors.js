/*
 * Assigns a brand colour to each left keyline, re-rolled on every page load.
 *
 * Grouping is per <section>: every keylined paragraph within one section shares
 * a colour, so a block of related copy reads as one group, and adjacent
 * sections get different colours.
 *
 * Which paragraphs count is decided by the stylesheet, not duplicated here —
 * we query the same selectors and then keep only the elements that actually
 * ended up with a left border, so the CSS opt-out list stays the single source
 * of truth.
 */
(function () {
  var COLORS = [
    '--color-kale',
    '--color-tomato',
    '--color-blueberry',
    '--color-olive',
    '--color-strawberry',
    '--color-chocolate',
    '--color-custard',
    '--color-fish'
  ];

  var SELECTOR = '.keyline-text, .band p:first-of-type, .band-sm p:first-of-type, .service-item p';

  // Shuffled deck, refilled when exhausted, so a page cycles all eight colours
  // before repeating rather than landing on the same one twice by chance.
  var deck = [];
  function nextColor() {
    if (!deck.length) {
      deck = COLORS.slice();
      for (var i = deck.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
      }
    }
    return deck.pop();
  }

  var groups = new Map();

  Array.prototype.forEach.call(document.querySelectorAll(SELECTOR), function (el) {
    // The stylesheet decides eligibility: no border means an opt-out matched.
    if (parseFloat(getComputedStyle(el).borderLeftWidth) === 0) return;

    var section = el.closest('section') || el.parentElement;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(el);
  });

  groups.forEach(function (elements) {
    var color = nextColor();
    elements.forEach(function (el) {
      el.style.setProperty('--keyline-color', 'var(' + color + ')');
    });
  });
})();
