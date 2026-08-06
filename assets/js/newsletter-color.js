/*
 * Picks a brand colour for the newsletter signup bar, re-rolled on each load.
 *
 * Only the palette colours that hold up as text on a white band are used.
 * Contrast against #FFF: chocolate 15.0, blueberry 10.1, olive 7.3, kale 4.9
 * all clear WCAG AA (4.5). Excluded: custard 1.7, strawberry 2.1, fish 2.2 —
 * far too pale; and tomato 4.4, which is marginally under AA for the bold 16px
 * "Subscribe" label. Re-add tomato if that label grows past 18.66px bold.
 *
 * Sets --nl-color; the stylesheet decides what that colour is applied to.
 */
(function () {
  var READABLE_ON_PAPER = [
    '--color-kale',
    '--color-blueberry',
    '--color-olive',
    '--color-chocolate'
  ];

  var bars = document.querySelectorAll('.newsletter-row');
  if (!bars.length) return;

  var pick = READABLE_ON_PAPER[Math.floor(Math.random() * READABLE_ON_PAPER.length)];

  Array.prototype.forEach.call(bars, function (bar) {
    bar.style.setProperty('--nl-color', 'var(' + pick + ')');
  });
})();
