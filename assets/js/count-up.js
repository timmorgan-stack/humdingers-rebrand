/*
 * Counts the impact figures up from zero when the panel comes properly into
 * view. Eases out, so it moves quickly at first and settles on the number.
 *
 * The real figure is what's in the HTML — this only ever replaces it while an
 * animation is actually running, and always restores the exact original text
 * at the end. If the script, the observer or requestAnimationFrame never run,
 * the correct number is on screen the whole time; nothing is left at zero.
 */
(function () {
  var DURATION = 2400;
  var THRESHOLD = 0.6; // most of the panel visible before it starts

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

    function render(value) {
      el.textContent = prefix + (grouped ? value.toLocaleString('en-GB') : String(value)) + suffix;
    }

    var startTime = null;
    function frame(now) {
      if (startTime === null) startTime = now;
      var t = Math.min((now - startTime) / DURATION, 1);
      // Steep ease-out: clears 60% of the range in the first ~14% of the run,
      // then spends the remaining ~86% crawling through the last 40%, so the
      // figure decelerates hard into its final number.
      var eased = 1 - Math.pow(1 - t, 7);
      if (t < 1) {
        render(Math.round(target * eased));
        requestAnimationFrame(frame);
      } else {
        el.textContent = original; // restore verbatim, formatting and all
      }
    }

    render(0);
    requestAnimationFrame(frame);
    // Safety net: if frames stop arriving (background tab, throttling), never
    // leave a partial or zeroed figure on screen.
    setTimeout(function () {
      if (el.textContent !== original) el.textContent = original;
    }, DURATION + 1200);
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
