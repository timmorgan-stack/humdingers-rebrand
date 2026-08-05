document.addEventListener('DOMContentLoaded', function () {
  var header = document.querySelector('.site-header');
  var jumpBar = document.querySelector('.menu-jump-bar');
  if (!header || !jumpBar) return;

  function setStickyOffsets() {
    document.documentElement.style.setProperty('--header-h', header.getBoundingClientRect().height + 'px');
  }
  setStickyOffsets();
  window.addEventListener('resize', setStickyOffsets);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setStickyOffsets);

  function jumpTo(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var offset = header.getBoundingClientRect().height + jumpBar.getBoundingClientRect().height + 24;
    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(top, 0), left: 0, behavior: 'auto' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  }

  // Any link to a menu-category section (in the sticky sub-nav, or a "Menus" link from
  // another page's header dropdown) lands at the right spot, clear of the sticky bars.
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="#"]');
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    var target = document.getElementById(url.hash.slice(1));
    if (!target || !target.classList.contains('menu-category')) return;
    e.preventDefault();
    jumpTo(url.hash.slice(1));
  });

  if (window.location.hash) {
    var initialId = window.location.hash.slice(1);
    window.addEventListener('load', function () { jumpTo(initialId); });
  }

  // Each category heading fades/rises in every time it enters view — on an ordinary
  // scroll down the page, or the instant it lands from a sub-nav jump.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    var heads = document.querySelectorAll('.menu-category-head');
    heads.forEach(function (el) { el.classList.add('menu-head-reveal'); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('menu-head-visible', entry.isIntersecting);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
    heads.forEach(function (el) { observer.observe(el); });
  }
});
