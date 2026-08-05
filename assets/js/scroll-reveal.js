document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var targets = document.querySelectorAll('.band > .wrap, .band-sm > .wrap');
  if (!('IntersectionObserver' in window) || !targets.length) return;
  targets.forEach(function (el) { el.classList.add('reveal'); });
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  targets.forEach(function (el) { observer.observe(el); });

  // Menu category headers (menus.html): jump-nav links land instantly (no smooth-scroll),
  // so the arriving section's heading fades/rises in on its own — threshold 0 so it fires
  // the moment any part of it is on screen, even landing right at the viewport edge.
  var menuHeads = document.querySelectorAll('.menu-category-head');
  if (menuHeads.length) {
    menuHeads.forEach(function (el) { el.classList.add('menu-head-reveal'); });
    var menuObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          menuObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px' });
    menuHeads.forEach(function (el) { menuObserver.observe(el); });
  }
});
