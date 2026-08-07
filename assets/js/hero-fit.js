/*
 * Keeps every page's hero identical. Elements marked .hero-overflow (home's
 * definition card, catering's Delivered-by-Us note) live in the hero text
 * column by default. If the column cannot fit the splash slice at the
 * current viewport, they move — last first — to a full-width row under the
 * grid inside the same centred band, and move back the moment there is room.
 * The layout only changes when the screen size makes it necessary.
 */
(function () {
  var band = document.querySelector('.band-hero');
  if (!band) return;
  var wrap = band.querySelector('.wrap.hero');
  if (!wrap) return;
  var column = wrap.querySelector(':scope > div:first-child');
  var movables = Array.prototype.slice.call(column.querySelectorAll('.hero-overflow'));
  if (!movables.length) return;

  // Remember each element's home position so it can return precisely.
  var homes = movables.map(function (el) {
    return { el: el, next: el.nextSibling };
  });

  var afterRow = document.createElement('div');
  afterRow.className = 'hero-after';
  afterRow.hidden = true;
  band.appendChild(afterRow);

  function fit() {
    // Start from the default layout, then move only what must move.
    homes.forEach(function (h) { column.insertBefore(h.el, h.next); });
    afterRow.hidden = true;

    var slice = wrap.getBoundingClientRect().height;
    for (var i = homes.length - 1; i >= 0; i--) {
      if (column.scrollHeight <= slice + 4) break;
      afterRow.insertBefore(homes[i].el, afterRow.firstChild);
      afterRow.hidden = false;
    }
  }

  var announce = function () { window.dispatchEvent(new Event('hero-relayout')); };

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = null; fit(); announce(); });
  }

  fit();
  announce();
  window.addEventListener('resize', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  window.addEventListener('load', schedule);
})();
