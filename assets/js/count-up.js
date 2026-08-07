/*
 * Counts the impact figures up from zero when the panel comes properly into
 * view, decelerating continuously into the final number.
 *
 * One motion, no phases: every frame the value closes a fixed fraction of the
 * distance still remaining (exponential approach), floored at a minimum speed
 * so it always arrives. Velocity is proportional to what's left — the figure
 * starts fast and slows evenly the whole way, with no seam and no fixed-rate
 * ticking; the last few integers land at about MIN_RATE per second.
 *
 * The real figure is what's in the HTML — this only ever replaces it while an
 * animation is running, and always restores the exact original text at the end.
 * If the script, the observer or requestAnimationFrame never run, the correct
 * number is on screen the whole time; nothing is left at zero.
 */
(function () {
  var TAU = 0.8;        // seconds to close ~63% of the remaining distance
  var MIN_RATE = 4;     // integers per second at the very end
  var MAX_MS = 14000;   // safety restore if frames stop arriving
  var THRESHOLD = 0.6;  // most of the panel visible before it starts

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
    if (!isFinite(target) || target <= 0) return;

    function render(value) {
      el.textContent = prefix + (grouped ? value.toLocaleString('en-GB') : String(value)) + suffix;
    }

    var value = 0;
    var last = null;

    function frame(now) {
      if (last === null) last = now;
      var dt = Math.min((now - last) / 1000, 0.1); // clamp tab-switch jumps
      last = now;

      var remaining = target - value;
      var step = Math.max(remaining * (dt / TAU), MIN_RATE * dt);
      value = Math.min(value + step, target);

      if (value >= target - 0.5) {
        el.textContent = original; // restore verbatim, formatting and all
        return;
      }
      render(Math.round(value));
      requestAnimationFrame(frame);
    }

    render(0);
    requestAnimationFrame(frame);
    // Safety net: if frames stop arriving (background tab, throttling), never
    // leave a partial or zeroed figure on screen.
    setTimeout(function () {
      if (el.textContent !== original) el.textContent = original;
    }, MAX_MS);
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
