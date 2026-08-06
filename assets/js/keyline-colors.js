/*
 * Randomize keyline colours with constraint that consecutive paragraphs in same group get same colour
 * Groups by parent container so related paragraphs share a colour
 */
(function () {
  var colors = [
    '--color-kale',
    '--color-tomato',
    '--color-blueberry',
    '--color-olive',
    '--color-strawberry',
    '--color-chocolate',
    '--color-custard',
    '--color-fish'
  ];

  function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Group keyline-text elements by their parent container
  var containers = {};
  var keylineElements = document.querySelectorAll('.keyline-text');

  keylineElements.forEach(function (el) {
    var parent = el.closest('section') || el.closest('.band') || el.parentElement;
    var parentKey = parent ? parent.id || parent.className : 'default';

    if (!containers[parentKey]) {
      containers[parentKey] = {
        color: getRandomColor(),
        elements: []
      };
    }

    containers[parentKey].elements.push(el);
  });

  // Apply the grouped colour to all keyline elements in each container
  Object.keys(containers).forEach(function (key) {
    var color = containers[key].color;
    containers[key].elements.forEach(function (el) {
      el.style.setProperty('--keyline-color', 'var(' + color + ')');
    });
  });

  // Also randomize service-item paragraph colours
  var serviceItems = document.querySelectorAll('.service-item p');
  var serviceColors = {};

  serviceItems.forEach(function (el, index) {
    var parent = el.closest('.service-grid') || el.parentElement;
    var parentKey = parent ? parent.id || parent.className : 'service-' + index;

    if (!serviceColors[parentKey]) {
      serviceColors[parentKey] = getRandomColor();
    }

    el.style.setProperty('--keyline-color', 'var(' + serviceColors[parentKey] + ')');
  });
})();
