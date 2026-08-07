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
    // Measure the true slice with the movables out — if they were measured
    // in, their min-content can grow the wrap a few px and that growth is
    // itself the cross-page drift we are preventing.
    homes.forEach(function (h) { afterRow.appendChild(h.el); });
    var slice = wrap.getBoundingClientRect().height;

    // Readmit from the top only while the column genuinely fits the slice.
    afterRow.hidden = true;
    for (var i = 0; i < homes.length; i++) {
      var h = homes[i];
      column.insertBefore(h.el, h.next);
      // Small overshoot is absorbed in place (the wrap grows a few px,
      // shifting centring imperceptibly); relocation is reserved for
      // viewports where keeping the element would visibly distort the hero.
      if (column.scrollHeight > slice + 24) {
        afterRow.appendChild(h.el);
        afterRow.hidden = false;
        for (var j = i + 1; j < homes.length; j++) afterRow.appendChild(homes[j].el);
        break;
      }
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
