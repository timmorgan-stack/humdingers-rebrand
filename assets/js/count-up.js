/*
 * Counts the impact figures up from zero when the panel comes properly into
 * view, decelerating into the final number.
 *
 * Runs in two phases, because a single easing curve cannot produce a visible
 * "last few numbers ticking into place" on a figure like 100,000 — those final
 * integers are 0.005% of the range, so any smooth curve either crosses them in
 * a frame or two, or is flattened so hard that the number appears to freeze
 * well before the animation ends:
 *
 *   1. Sweep  — eased from 0 to (target - TAIL_STEPS), doing all the fast
 *               movement and slowing as it approaches the tail.
 *   2. Tail   — the final TAIL_STEPS integers, one at a time on a fixed dwell,
 *               so each is actually legible as it lands.
 *
 * The real figure is what's in the HTML — this only ever replaces it while an
 * animation is running, and always restores the exact original text at the end.
 * If the script, the observer or requestAnimationFrame never run, the correct
 * number is on screen the whole time; nothing is left at zero.
 */
(function () {
  var TAIL_STEPS = 8;    // final integers ticked individually
  var TAIL_MS = 200;     // dwell per tail integer
  var TOTAL = 10000;     // whole animation, sweep + tail
  var SWEEP = TOTAL - TAIL_STEPS * TAIL_MS;
  var THRESHOLD = 0.6;   // most of the panel visible before it starts

  var targets = document.querySelectorAll('.stat-card .num');
  if (!targets.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window) || !window.requestAnimationFrame) return;

  function countUp(el) {
    var original = el.textContent.trim();
    var parts = original.match(/^(\D*)([\d,]+)(.*)$/);
    if (!parts) return;

    var prefix = parts[1];
    var suffix = parts[3];
    var digits = parts[2];
    var target = parseInt(digits.replace(/,/g, ''), 10);
    var grouped = digits.indexOf(',') !== -1;
    if (!isFinite(target)) return;

    // Small figures have no room for a tail; sweep them the whole way.
    var tail = Math.min(TAIL_STEPS, Math.max(0, target - 1));
    var sweepTarget = target - tail;

    function render(value) {
      el.textContent = prefix + (grouped ? value.toLocaleString('en-GB') : String(value)) + suffix;
    }

    var startTime = null;

    function tailFrame(now) {
      var elapsed = now - startTime - SWEEP;
      var stepped = Math.floor(elapsed / TAIL_MS);
      if (stepped >= tail) {
        el.textContent = original; // restore verbatim, formatting and all
        return;
      }
      render(sweepTarget + Math.max(0, stepped));
      requestAnimationFrame(tailFrame);
    }

    function sweepFrame(now) {
      if (startTime === null) startTime = now;
      var t = (now - startTime) / SWEEP;
      if (t >= 1) {
        render(sweepTarget);
        requestAnimationFrame(tailFrame);
        return;
      }
      // easeOutQuint — fast away, shedding speed the whole way into the tail
      render(Math.round(sweepTarget * (1 - Math.pow(1 - t, 5))));
      requestAnimationFrame(sweepFrame);
    }

    render(0);
    requestAnimationFrame(sweepFrame);
    // Safety net: if frames stop arriving (background tab, throttling), never
    // leave a partial or zeroed figure on screen.
    setTimeout(function () {
      if (el.textContent !== original) el.textContent = original;
    }, TOTAL + 1500);
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      countUp(entry.target);
    });
  }, { threshold: THRESHOLD });

  targets.forEach(function (el) { observer.observe(el); });
})();
