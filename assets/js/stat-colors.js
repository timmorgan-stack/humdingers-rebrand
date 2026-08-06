/*
 * Colours each impact pill, re-rolled on every load. Brand palette only — no
 * tints or mixes.
 *
 * Two independent draws per pill:
 *   1. The fact panel  — a light palette wash with dark palette text.
 *   2. The figure      — icon + number, on paper, in a dark palette colour.
 *
 * The palette ships only three genuinely light colours (custard, strawberry,
 * fish) and only chocolate and blueberry are dark enough to sit on them at AA,
 * so there are exactly six legible fact pairings. The three pills are given one
 * of each wash, which keeps them visibly distinct even though the text colour
 * has to repeat across two of them.
 */
(function () {
  // All six clear WCAG AA for body text; ratio noted per pairing.
  var FACT_COMBOS = [
    { light: '--color-custard',    dark: '--color-chocolate' }, // 9.13
    { light: '--color-custard',    dark: '--color-blueberry' }, // 6.15
    { light: '--color-strawberry', dark: '--color-chocolate' }, // 7.08
    { light: '--color-strawberry', dark: '--color-blueberry' }, // 4.77
    { light: '--color-fish',       dark: '--color-chocolate' }, // 6.99
    { light: '--color-fish',       dark: '--color-blueberry' }  // 4.71
  ];

  // For the icon and number on paper. Custard (1.65), strawberry (2.12) and
  // fish (2.15) are left out — below the 3.0 needed even for large text.
  // Tomato is 4.37: under AA for body copy, but the number is 2.4rem bold and
  // the icon is a graphic, so both only need 3.0.
  var FIGURE_COLORS = [
    '--color-kale',      // 4.90
    '--color-tomato',    // 4.37
    '--color-blueberry', // 10.13
    '--color-olive',     // 7.29
    '--color-chocolate'  // 15.04
  ];

  var cards = document.querySelectorAll('.stat-card');
  if (!cards.length) return;

  function shuffled(arr) {
    var d = arr.slice();
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  // One combo per distinct wash, so no two pills share a background.
  var washes = shuffled(['--color-custard', '--color-strawberry', '--color-fish']);
  var facts = washes.map(function (wash) {
    var options = FACT_COMBOS.filter(function (c) { return c.light === wash; });
    return options[Math.floor(Math.random() * options.length)];
  });

  var figures = shuffled(FIGURE_COLORS);

  Array.prototype.forEach.call(cards, function (card, i) {
    var fact = facts[i % facts.length];
    card.style.setProperty('--stat-light', 'var(' + fact.light + ')');
    card.style.setProperty('--stat-dark', 'var(' + fact.dark + ')');
    card.style.setProperty('--stat-figure', 'var(' + figures[i % figures.length] + ')');
  });
})();
