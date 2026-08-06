/*
 * The contact page is one band painted in two tones so the enquiry form can
 * run across the colour change. The boundary has to sit just below the intro
 * copy in the right-hand column, and that copy rewraps at different widths —
 * so measure it rather than trusting a fixed pixel depth.
 *
 * If this never runs, the CSS fallback depth still gives a sensible split.
 */
(function () {
  var MIN_WIDTH = 901; // below this the columns stack and the band goes plain

  function setBoundary() {
    var band = document.querySelector('.contact-band');
    if (!band) return;
    var intro = band.querySelector('.contact-intro');
    if (!intro) return;

    if (window.innerWidth < MIN_WIDTH) {
      band.style.removeProperty('--contact-blue-depth');
      return;
    }
    var depth = intro.getBoundingClientRect().bottom - band.getBoundingClientRect().top + 36;
    band.style.setProperty('--contact-blue-depth', Math.round(depth) + 'px');
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setBoundary, 120);
  });
  window.addEventListener('load', setBoundary);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setBoundary);
  setBoundary();
})();
