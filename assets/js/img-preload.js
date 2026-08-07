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
    if (img.complete) return;
    img.classList.add('img-loading');

    // A wrapper that exists only to hold this image can wear the shimmer.
    var frame = img.parentElement;
    var shimmer = frame && frame.children.length === 1 && frame !== document.body;
    if (shimmer) frame.classList.add('img-shimmer');

    function reveal() {
      img.classList.remove('img-loading');
      if (shimmer) frame.classList.remove('img-shimmer');
    }
    function onDone() {
      if (landing()) pendingReveals.push(reveal);
      else reveal();
    }
    img.addEventListener('load', onDone, { once: true });
    img.addEventListener('error', onDone, { once: true });
  });
});
