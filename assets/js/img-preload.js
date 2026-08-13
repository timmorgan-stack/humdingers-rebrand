/*
 * Image loading choreography:
 *   - images fade in when their pixels arrive (never a hard pop-in);
 *   - while pending, the image's own frame carries a soft light-grey shimmer
 *     (only when it sits alone in a wrapper, so the placeholder has a shape);
 *   - while smooth-scroll.js is animating a landing, reveals hold back and
 *     play once the scroll settles, so content and imagery arrive in order.
 */
document.addEventListener('DOMContentLoaded', function () {
  var pendingReveals = [];

  function landing() { return document.documentElement.hasAttribute('data-landing'); }

  document.addEventListener('landing-done', function () {
    pendingReveals.splice(0).forEach(function (fn) { fn(); });
  });

  document.querySelectorAll('img').forEach(function (img) {
    /* An image already in cache is complete before this runs and would
       otherwise appear abruptly while its neighbours fade — give it the same
       fade from a standing start, with no shimmer or spinner since there is
       nothing to wait for. */
    if (img.complete) {
      img.classList.add('img-loading', 'img-first-fade');
      /* Reading a layout property commits the transparent state. Without it
         the browser coalesces the add and the remove into one paint and no
         transition runs — which is why the fade was barely perceptible on a
         cached load. */
      void img.offsetWidth;
      setTimeout(function () {
        img.classList.remove('img-loading');
        setTimeout(function () { img.classList.remove('img-first-fade'); }, 1000);
      }, 30);
      return;
    }
    img.classList.add('img-loading', 'img-first-fade');

    // A wrapper that exists only to hold this image can wear the shimmer.
    var frame = img.parentElement;
    var shimmer = frame && frame.children.length === 1 && frame !== document.body;
    if (shimmer) frame.classList.add('img-shimmer');

    // Spinner overlay pinned to the image's own layout box — dead centre of
    // where the pixels will appear, not of whatever frame surrounds it.
    // Images whose height collapses before load (no aspect ratio yet) fall
    // back to covering the frame.
    var spinner = null;
    if (frame && frame !== document.body) {
      spinner = document.createElement('span');
      spinner.className = 'img-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      if (img.offsetHeight >= 40 && img.offsetWidth >= 40) {
        spinner.style.left = img.offsetLeft + 'px';
        spinner.style.top = img.offsetTop + 'px';
        spinner.style.width = img.offsetWidth + 'px';
        spinner.style.height = img.offsetHeight + 'px';
      } else {
        spinner.style.inset = '0';
      }
      frame.appendChild(spinner);
    }

    function reveal() {
      img.classList.remove('img-loading');
      if (shimmer) frame.classList.remove('img-shimmer');
      // The slower first-load fade is a one-off; later refades stay brisk.
      setTimeout(function () { img.classList.remove('img-first-fade'); }, 1000);
      if (spinner && spinner.parentElement) spinner.parentElement.removeChild(spinner);
    }
    function onDone() {
      if (landing()) pendingReveals.push(reveal);
      else reveal();
    }
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });
});
