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
  /* The browser restores the previous scroll position on reload, and does it
     asynchronously — so it races the landing below and sometimes wins, which
     is why refreshing on a hash could settle on the wrong panel. Landings are
     this file's job, so opt out of the browser's restoration entirely. */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  function stickyOffset() {
    var header = document.querySelector('.site-header');
    return header ? header.getBoundingClientRect().height : 0;
  }

  function setStickyVar() {
    document.documentElement.style.setProperty('--sticky-h', stickyOffset() + 'px');
  }

  // Hero media height is pure CSS now: the .hero grid takes min-height 100%
  // of the slice wrap and the figure stretches with the row, so the media
  // always ranges exactly with the text column — no measured pin to go
  // stale between resize frames.
  function relayout() { setStickyVar(); }
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

  /* Re-landing exists to correct for content that moved under a stationary
     reader; it must never drag a reader who has taken over. Comparing scroll
     positions cannot tell those apart — the browser's scroll anchoring moves
     scrollY itself when content is inserted above the viewport — so we key
     off actual input instead. A fresh navigation (click, popstate, load)
     hands control back. */
  var readerMoved = false;
  ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (evt) {
    window.addEventListener(evt, function () { readerMoved = true; }, { passive: true });
  });

  function mayReland() { return !readerMoved; }

  function landFromNavigation(target, instant) {
    readerMoved = false;
    land(target, instant);
  }

  function landingDone() {
    landingTimer = null;
    document.documentElement.removeAttribute('data-landing');
    document.documentElement.style.scrollSnapType = '';
    refadeMedia.splice(0).forEach(function (m) { m.classList.remove('img-refade'); });
    document.dispatchEvent(new Event('landing-done'));
    setTimeout(function () { settle(landingTarget, 8); }, 150);
  }

  /* Where a target should come to rest: a panel that fills the viewport sits
     flush under the sticky header, anything shorter is centred in the space
     below it. Clamped to the document so the check below can compare against
     a position the browser can actually reach. */
  function desiredTop(target) {
    var offset = stickyOffset();
    var rect = target.getBoundingClientRect();
    var available = window.innerHeight - offset;
    var top = rect.top + window.pageYOffset - offset;
    if (rect.height < available - 8) {
      top -= (available - rect.height) / 2; // centre in the visible area
    }
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(top, max));
  }

  /* A landing is computed against the layout as it stands, but the layout
     keeps moving afterwards — web fonts swap, --sticky-h is remeasured (and
     it sizes every panel, so a few pixels there move the foot of the page a
     long way), images settle, sections reveal. Rather than enumerate those
     causes, verify the result and correct it: nudge instantly, recheck, and
     stop as soon as the target is where it belongs, the reader takes over,
     or we run out of attempts. */
  var landingTarget = null;

  function settle(target, tries) {
    if (!target || readerMoved || tries <= 0) return;
    var want = desiredTop(target);
    if (Math.abs(window.pageYOffset - want) <= 2) return;
    window.scrollTo({ top: want, behavior: 'auto' });
    setTimeout(function () { settle(target, tries - 1); }, 250);
  }

  function land(target, instant) {
    landingTarget = target;
    // Landing on a menu category unfolds it — but only when the target IS
    // that category; landing on a broader container (e.g. #menus-top) must
    // not re-open the first panel it happens to contain.
    var panel = target.matches && target.matches('section.menu-category')
      ? target.querySelector('details.menu-panel') : null;
    if (panel) panel.open = true;

    // Every landing replays the choreography: the target's media hides now
    // and fades back in once the scroll settles — every click, not only
    // first loads. Media still loading stays with img-preload.js, which
    // already reveals on landing-done; unloaded images are skipped here so
    // they are never unveiled before their pixels exist.
    refadeMedia.splice(0).forEach(function (m) { m.classList.remove('img-refade'); });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Array.prototype.forEach.call(target.querySelectorAll('img, video'), function (m) {
        if (m.tagName === 'IMG' && !m.complete) return;
        if (m.classList.contains('img-loading') || m.classList.contains('img-refade')) return;
        m.classList.add('img-refade');
        refadeMedia.push(m);
        // The magnifier and gallery nav ride along: hidden with their image
        // now, restored with it on landing-done, so they never sit over an
        // empty frame while the image is held back.
        Array.prototype.forEach.call(
          (m.parentElement || m).querySelectorAll(':scope > .zoom-badge, :scope > .gallery-dots'),
          function (o) {
            if (o.classList.contains('img-refade')) return;
            o.classList.add('img-refade');
            refadeMedia.push(o);
          });
      });
    }

    var top = desiredTop(target);

    document.documentElement.setAttribute('data-landing', '');
    // Snap must not wrestle the landing animation mid-flight; it comes back
    // once the scroll settles (the landing position is itself on-boundary
    // for full panels, so nothing jumps on restore).
    document.documentElement.style.scrollSnapType = 'none';
    if (landingTimer) clearTimeout(landingTimer);
    // 'scrollend' is the real signal; the timeout covers browsers without it
    // and the no-movement case (already at the target position).
    landingTimer = setTimeout(landingDone, 900);
    window.addEventListener('scrollend', function onEnd() {
      window.removeEventListener('scrollend', onEnd);
      if (landingTimer) { clearTimeout(landingTimer); landingDone(); }
    });

    window.scrollTo({ top: Math.max(top, 0), behavior: instant ? 'auto' : 'smooth' });
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
    landFromNavigation(target, true);
  });

  // Scroll-spy: when scrolling comes to rest, the URL's hash follows the
  // panel under the viewport's midpoint (replaceState, so no history spam) —
  // a reload or a shared link then returns to the same panel via the load
  // lander below. Quiet while a landing animates; the hero clears the hash.
  if (history.replaceState) {
    var spyTimer = null;
    window.addEventListener('scroll', function () {
      if (spyTimer) clearTimeout(spyTimer);
      spyTimer = setTimeout(function () {
        spyTimer = null;
        if (document.documentElement.hasAttribute('data-landing')) return;
        var offset = stickyOffset();
        var probe = document.elementFromPoint(
          Math.floor(window.innerWidth / 2),
          Math.floor(offset + (window.innerHeight - offset) / 2));
        var section = probe && probe.closest('section.band[id], .band-hero');
        if (!section) return;
        if (section.id && window.location.hash !== '#' + section.id) {
          history.replaceState(null, '', '#' + section.id);
        } else if (!section.id && window.location.hash) {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // Settle assist: proximity snap sometimes leaves the viewport parked
        // between two panels (its engage threshold is narrow). If rest lands
        // within 40% of a viewport of a panel's ideal position, glide the
        // remaining distance so a half-panel screen never sticks. Desktop
        // only — below 1025px the panels flow naturally.
        if (window.innerWidth >= 1025) {
          // Reading inside a panel taller than the viewport is a legitimate
          // rest anywhere — never drag the reader back to its top.
          if (section.getBoundingClientRect().height > (window.innerHeight - offset) + 40) return;
          var best = null;
          document.querySelectorAll('section.band[id], .band-hero').forEach(function (p) {
            var ideal = p.getBoundingClientRect().top + window.scrollY - offset;
            var dist = Math.abs(window.scrollY - ideal);
            if (best === null || dist < best.dist) best = { ideal: Math.max(ideal, 0), dist: dist };
          });
          if (best && best.dist > 4 && best.dist < (window.innerHeight - offset) * 0.4) {
            var root = document.documentElement;
            root.style.scrollSnapType = 'none';
            window.scrollTo({ top: best.ideal, behavior: 'smooth' });
            setTimeout(function () { root.style.scrollSnapType = ''; }, 700);
          }
        }
      }, 180);
    }, { passive: true });
  }

  // Content that arrives after load (the Instagram grid) changes the page
  // height and invalidates the landing already performed — re-land the hash.
  document.addEventListener('hd:relayout', function () {
    if (!window.location.hash || !mayReland()) return;
    var target = document.getElementById(window.location.hash.slice(1));
    if (target) land(target, true);
  });

  /* Back/Forward. Clicks push a history entry and the scroll-spy keeps the
     current entry's URL pointing at the panel in view, so each entry already
     describes a place on the page — but nothing was acting on those entries.
     The browser would once have restored the scroll itself; now that we own
     restoration (see scrollRestoration above), we have to honour popstate
     ourselves or Back changes the URL and moves nothing.
     This is an explicit navigation, so it overrides the reader-scroll guard. */
  window.addEventListener('popstate', function () {
    var hash = window.location.hash;
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    var target = document.getElementById(hash.slice(1));
    if (target) landFromNavigation(target, true);
  });

  /* Arriving on a hash — a reload, or a pasted/shared link — places the
     content straight away. Clicks and Back/Forward land the same way: every
     anchor navigation cuts directly to the target panel, no animated
     scroll (the target's media re-fading in is the arrival cue instead). */
  window.addEventListener('load', function () {
    if (!window.location.hash) return;
    var target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    setTimeout(function () { landFromNavigation(target, true); }, 60);
    /* Web fonts swap in after load on a cold cache, changing text metrics and
       moving every panel below — re-land once they have settled. Instant, so
       the correction is invisible rather than a second animation. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (mayReland()) land(target, true); });
    }
  });
})();
