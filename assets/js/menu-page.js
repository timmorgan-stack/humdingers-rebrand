/*
 * Menus page: category headings fade in each time they enter view. Landing
 * and scrolling behaviour lives in smooth-scroll.js; expand/collapse is the
 * native <details> behaviour.
 */
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
