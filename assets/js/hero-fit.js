/*
 * Keeps the homepage hero identical to every other page's.
 *
 * The definition card lives in the hero text column. If, at the current
 * viewport, that column cannot fit the fixed splash slice, the card moves to
 * a full-width row under the grid (inside the same centred band) — and moves
 * back the moment there is room again. The layout only ever changes when the
 * screen size makes it absolutely necessary.
 */
(function () {
  var band = document.querySelector('.band-hero');
  if (!band) return;
  var wrap = band.querySelector('.wrap.hero');
  var definition = band.querySelector('.definition');
  if (!wrap || !definition) return;

  var column = definition.parentElement === wrap.firstElementChild
    ? wrap.firstElementChild
    : wrap.querySelector(':scope > div:first-child');
  var homeSlot = definition.nextElementSibling; // null = end of column
  var afterRow = null;

  function ensureAfterRow() {
    if (!afterRow) {
      afterRow = document.createElement('div');
      afterRow.className = 'hero-after';
      band.appendChild(afterRow);
    }
    return afterRow;
  }

  function fit() {
    // Measure with the card in its home position, then decide.
    if (definition.parentElement !== column) {
      column.insertBefore(definition, homeSlot);
    }
    var sliceHeight = wrap.getBoundingClientRect().height;
    var needed = column.scrollHeight;
    if (needed > sliceHeight + 4) {
      ensureAfterRow().appendChild(definition);
      if (afterRow) afterRow.hidden = false;
    } else if (afterRow) {
      afterRow.hidden = true;
    }
  }

  var pending = null;
  function schedule() {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = null; fit(); });
  }

  fit();
  window.addEventListener('resize', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  window.addEventListener('load', schedule);
})();
