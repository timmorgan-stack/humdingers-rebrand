/*
 * The one place anchor landings are decided. Any in-page link (header
 * dropdowns, flyouts, jump bars, body links) scrolls its target to sit:
 *   - clear of the sticky header (and the menus jump bar), with a breathing
 *     gap below the header's black rule, and
 *   - vertically centred in the remaining viewport when the section fits;
 *     sections taller than the viewport align to the top of that space.
 * Landing on a collapsed menu panel opens it before measuring.
 */
(function () {
  var GAP = 28; // air between the sticky bars and the content

  function stickyOffset() {
    var header = document.querySelector('.site-header');
    return header ? header.getBoundingClientRect().height : 0;
  }

  function land(target) {
    var panel = target.querySelector('details.menu-panel');
    if (panel) panel.open = true;

    var offset = stickyOffset();
    var rect = target.getBoundingClientRect();
    var available = window.innerHeight - offset;
    var top = rect.top + window.pageYOffset - offset;
    if (rect.height + 2 * GAP <= available) {
      top -= (available - rect.height) / 2; // centre in the visible area
    } else {
      top -= GAP; // too tall to centre — align top, keep the gap
    }
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
