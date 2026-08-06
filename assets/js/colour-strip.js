/*
 * Randomize the left-side colour strip without placing similar colours adjacent
 * Similar colours are grouped: warm (tomato, strawberry, custard, chocolate)
 * and cool (kale, blueberry, olive, fish)
 */
(function () {
  var colors = [
    { name: 'kale', var: '--color-kale', group: 'cool' },
    { name: 'tomato', var: '--color-tomato', group: 'warm' },
    { name: 'blueberry', var: '--color-blueberry', group: 'cool' },
    { name: 'olive', var: '--color-olive', group: 'cool' },
    { name: 'strawberry', var: '--color-strawberry', group: 'warm' },
    { name: 'chocolate', var: '--color-chocolate', group: 'warm' },
    { name: 'custard', var: '--color-custard', group: 'warm' },
    { name: 'fish', var: '--color-fish', group: 'cool' }
  ];

  // Fisher-Yates shuffle with constraint that similar groups don't repeat
  function shuffleWithConstraint(arr) {
    var shuffled = arr.slice();
    var attempts = 0;
    var maxAttempts = 100;

    while (attempts < maxAttempts) {
      attempts++;

      // Standard Fisher-Yates
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }

      // Check constraint: no adjacent colors from same group
      var valid = true;
      for (var k = 0; k < shuffled.length - 1; k++) {
        if (shuffled[k].group === shuffled[k + 1].group) {
          valid = false;
          break;
        }
      }

      if (valid) return shuffled;
    }

    return shuffled; // Return best attempt if max attempts reached
  }

  var randomized = shuffleWithConstraint(colors);

  // 38px swatch + 10px gap; the gaps are transparent so the element's paper
  // background shows through as a white break between colours
  var gradientStops = [];
  var SWATCH = 38;
  var GAP = 10;

  for (var i = 0; i < randomized.length; i++) {
    var color = randomized[i];
    var start = i * (SWATCH + GAP);
    var swatchEnd = start + SWATCH;
    var gapEnd = swatchEnd + GAP;

    gradientStops.push('var(' + color.var + ') ' + start + 'px');
    gradientStops.push('var(' + color.var + ') ' + swatchEnd + 'px');
    gradientStops.push('transparent ' + swatchEnd + 'px');
    gradientStops.push('transparent ' + gapEnd + 'px');
  }

  var gradient = 'repeating-linear-gradient(to bottom, ' + gradientStops.join(', ') + ')';

  var style = document.createElement('style');
  style.textContent = '.dot-col-left { background-image: ' + gradient + ' !important; }';
  document.head.appendChild(style);
})();
