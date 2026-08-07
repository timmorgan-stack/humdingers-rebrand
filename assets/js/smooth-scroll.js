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
  setStickyVar();
  window.addEventListener('resize', setStickyVar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setStickyVar);

  // While a landing scroll animates, data-landing is set on <html>; images
  // (img-preload.js) hold their reveals until the landing-done event, so the
  // scroll finishes before imagery fades in.
  var landingTimer = null;
  function landingDone() {
    landingTimer = null;
    document.documentElement.removeAttribute('data-landing');
    document.dispatchEvent(new Event('landing-done'));
  }

  function land(target) {
    var panel = target.querySelector('details.menu-panel');
    if (panel) panel.open = true;

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
