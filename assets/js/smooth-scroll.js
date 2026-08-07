/*
 * The one place anchor landings are decided. Any in-page link (header
 * dropdowns, flyouts, body links) scrolls its target so that:
 *   - a panel that fills the viewport sits flush under the sticky header —
 *     nothing above it bleeds into view;
 *   - a shorter target is centred in the space below the header, equal
 *     margins above and below.
 * Landing on a collapsed menu panel opens it before measuring. Also keeps
 * --sticky-h (the header's real height) up to date for the CSS that sizes
 * viewport panels.
 */
(function () {
  function stickyOffset() {
    var header = document.querySelector('.site-header');
    return header ? header.getBoundingClientRect().height : 0;
  }

  function setStickyVar() {
    document.documentElement.style.setProperty('--sticky-h', stickyOffset() + 'px');
  }

  // Hard guarantee: the hero media is always exactly the height of the text
  // column beside it. CSS stretch already does this; pinning the measured
  // height as well means no future style change can silently break the
  // alignment. Cleared on narrow viewports, where the hero stacks.
  function syncHeroMedia() {
    var hero = document.querySelector('.band-hero .hero');
    if (!hero) return;
    var figure = hero.querySelector('.hero-figure');
    if (!figure) return;
    if (window.innerWidth <= 900) {
      figure.style.height = '';
      return;
    }
    // One frame late, so hero-fit.js has finished any relocation first; the
    // row (wrap) height is the slice both columns share.
    requestAnimationFrame(function () {
      figure.style.height = '';
      figure.style.height = hero.getBoundingClientRect().height + 'px';
    });
  }

  function relayout() { setStickyVar(); syncHeroMedia(); }
  relayout();
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  window.addEventListener('hero-relayout', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  // While a landing scroll animates, data-landing is set on <html>; images
  // (img-preload.js) hold their reveals until the landing-done event, so the
  // scroll finishes before imagery fades in.
  var landingTimer = null;
  // Media hidden for the current landing's post-scroll reveal.
  var refadeMedia = [];

  function landingDone() {
    landingTimer = null;
    document.documentElement.removeAttribute('data-landing');
    refadeMedia.splice(0).forEach(function (m) { m.classList.remove('img-loading'); });
    document.dispatchEvent(new Event('landing-done'));
  }

  function land(target) {
    var panel = target.querySelector('details.menu-panel');
    if (panel) panel.open = true;

    // Every landing replays the choreography: the target's media hides now
    // and fades back in once the scroll settles — every click, not only
    // first loads. Media still loading stays with img-preload.js, which
    // already reveals on landing-done; unloaded images are skipped here so
    // they are never unveiled before their pixels exist.
    refadeMedia.splice(0).forEach(function (m) { m.classList.remove('img-loading'); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Array.prototype.forEach.call(target.querySelectorAll('img, video'), function (m) {
        if (m.tagName === 'IMG' && !m.complete) return;
        if (m.classList.contains('img-loading')) return;
        m.classList.add('img-loading');
        refadeMedia.push(m);
      });
    }

    var offset = stickyOffset();
    var rect = target.getBoundingClientRect();
    var available = window.innerHeight - offset;
    var top = rect.top + window.pageYOffset - offset;
    if (rect.height < available - 8) {
      top -= (available - rect.height) / 2; // centre in the visible area
    }

    document.documentElement.setAttribute('data-landing', '');
    if (landingTimer) clearTimeout(landingTimer);
    // 'scrollend' is the real signal; the timeout covers browsers without it
    // and the no-movement case (already at the target position).
    landingTimer = setTimeout(landingDone, 900);
    window.addEventListener('scrollend', function onEnd() {
      window.removeEventListener('scrollend', onEnd);
      if (landingTimer) { clearTimeout(landingTimer); landingDone(); }
    });

    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="#"]');
    if (!link) return;
    var url = new URL(link.href, window.location.href);
    if (url.pathname !== window.location.pathname || !url.hash) return;
    var target = document.getElementById(url.hash.slice(1));
    if (!target) return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', url.hash);
    land(target);
  });

  // Arriving from another page with a hash: land it once layout has settled.
  window.addEventListener('load', function () {
    if (!window.location.hash) return;
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) setTimeout(function () { land(target); }, 60);
  });
})();
