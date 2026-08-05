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

  // Position changes instantly — no scroll animation at all — so the only
  // motion on this page is the content fading in. Anything else reads as
  // "layout shifting" against the fixed head/controls positions.
  function jumpTo(id) {
    var target = document.getElementById(id);
    if (!target) return;
    var offset = header.getBoundingClientRect().height + jumpBar.getBoundingClientRect().height + 24;
    var top = Math.max(target.getBoundingClientRect().top + window.pageYOffset - offset, 0);
    window.scrollTo(0, top);
    if (history.replaceState) history.replaceState(null, '', '#' + id);
    if (typeof highlightCurrent === 'function') highlightCurrent();
  }

  // Underline the sub-nav item for whichever category is currently in view,
  // whether you got there by clicking or by scrolling the page.
  var navLinks = Array.prototype.slice.call(jumpBar.querySelectorAll('a[href^="#"]'));
  var categories = navLinks.map(function (link) {
    return { link: link, section: document.getElementById(link.getAttribute('href').slice(1)) };
  }).filter(function (entry) { return entry.section; });

  function highlightCurrent() {
    if (!categories.length) return;
    var line = header.getBoundingClientRect().height + jumpBar.getBoundingClientRect().height + 4;
    var current = null;
    categories.forEach(function (entry) {
      var box = entry.section.getBoundingClientRect();
      // The category straddling the line just under the sticky bars is the
      // one being read; past the last one, keep the last highlighted.
      if (box.top <= line && box.bottom > line) current = entry;
    });
    if (!current) {
      var first = categories[0].section.getBoundingClientRect();
      if (first.top > line) current = null; // above the first category
      else current = categories[categories.length - 1];
    }
    categories.forEach(function (entry) {
      entry.link.classList.toggle('current', entry === current);
    });
  }

  // Called straight from the scroll handler rather than deferred into
  // requestAnimationFrame — it's a handful of rect reads, and making the
  // highlight depend on rAF firing is one more way for it to silently
  // never happen.
  window.addEventListener('scroll', highlightCurrent, { passive: true });
  window.addEventListener('resize', highlightCurrent);
  window.addEventListener('load', highlightCurrent);
  highlightCurrent();

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

  // Each category heading fades in every time it enters view — on an ordinary
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
  }
});
