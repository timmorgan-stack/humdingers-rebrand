/*
 * Menus page: category headings fade in each time they enter view. Landing
 * and scrolling behaviour lives in smooth-scroll.js; expand/collapse is the
 * native <details> behaviour.
 */
/* Live filter above the list: matches category names AND the dishes inside.
   A panel whose match is body-level opens so it's clear why it stayed;
   clearing the filter returns everything to the closed default. */
document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('menu-filter-input');
  if (!input) return;
  var clear = document.getElementById('menu-filter-clear');
  var emptyNote = document.getElementById('menu-filter-empty');

  var categories = Array.prototype.map.call(
    document.querySelectorAll('section.menu-category'),
    function (sec) {
      var h2 = sec.querySelector('h2');
      return {
        sec: sec,
        panel: sec.querySelector('details'),
        name: (h2 ? h2.textContent : '').toLowerCase(),
        text: sec.textContent.toLowerCase()
      };
    });

  function apply() {
    var q = input.value.trim().toLowerCase();
    clear.hidden = !q;
    var any = false;
    categories.forEach(function (c) {
      var inName = !q || c.name.indexOf(q) !== -1;
      var hit = inName || c.text.indexOf(q) !== -1;
      c.sec.style.display = hit ? '' : 'none';
      if (hit) any = true;
      if (c.panel) {
        if (q && hit && !inName) c.panel.open = true;
        if (!q) c.panel.open = false;
      }
    });
    emptyNote.hidden = any;
  }

  input.addEventListener('input', apply);
  clear.addEventListener('click', function () {
    input.value = '';
    apply();
    input.focus();
  });
});

document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var heads = document.querySelectorAll('.menu-category-head');
  if (!heads.length) return;
  heads.forEach(function (el) { el.classList.add('menu-head-reveal'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('menu-head-visible', entry.isIntersecting);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  heads.forEach(function (el) { observer.observe(el); });

  // Safety net: a fade-in that starts at opacity 0 must never be the reason
  // a heading is unreadable. If the observer hasn't reported on an element
  // shortly after load, drop the effect entirely and show it.
  setTimeout(function () {
    heads.forEach(function (el) {
      var box = el.getBoundingClientRect();
      var onScreen = box.bottom > 0 && box.top < window.innerHeight;
      if (onScreen && !el.classList.contains('menu-head-visible')) {
        el.classList.remove('menu-head-reveal');
      }
    });
  }, 1200);
});
