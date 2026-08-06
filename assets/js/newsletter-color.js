/*
 * Apply rotating brand colours to newsletter signup bars
 * Colour is based on page pathname for consistency across refreshes
 */
(function () {
  var colors = [
    'var(--color-kale)',
    'var(--color-tomato)',
    'var(--color-blueberry)',
    'var(--color-olive)',
    'var(--color-strawberry)',
    'var(--color-chocolate)',
    'var(--color-custard)',
    'var(--color-fish)'
  ];

  var path = window.location.pathname;
  var hash = 0;
  for (var i = 0; i < path.length; i++) {
    hash = ((hash << 5) - hash) + path.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  var colorIndex = Math.abs(hash) % colors.length;
  var selectedColor = colors[colorIndex];

  var style = document.createElement('style');
  style.textContent = '.newsletter-band-sm { --nl-color: ' + selectedColor + '; }' +
    '.newsletter-band-sm h3, .newsletter-band-sm .eyebrow { color: ' + selectedColor + '; }' +
    '.newsletter-band-sm input[type="email"] { border-color: ' + selectedColor + '; color: ' + selectedColor + '; }' +
    '.newsletter-band-sm input[type="email"]::placeholder { color: ' + selectedColor + '; opacity: 0.6; }' +
    '.newsletter-band-sm .btn-solid { background: ' + selectedColor + '; color: var(--color-paper); border-color: ' + selectedColor + '; }';
  document.head.appendChild(style);
})();
