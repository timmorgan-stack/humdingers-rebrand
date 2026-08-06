document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var targets = document.querySelectorAll('.band > .wrap, .band-sm > .wrap');
  if (!('IntersectionObserver' in window) || !targets.length) return;
  targets.forEach(function (el) { el.classList.add('reveal'); });

  // Fades an element in on the next frame, so the opacity:0 start state is
  // painted first and the transition actually runs.
  function revealSoon(el) {
    var done = false;
    function go() {
      if (done) return;
      done = true;
      el.classList.add('reveal-visible');
    }
    if (window.requestAnimationFrame) {
      requestAnimationFrame(function () { requestAnimationFrame(go); });
    }
    setTimeout(go, 60); // belt and braces if rAF doesn't run
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  targets.forEach(function (el) {
    // Anything already on screen fades in straight away rather than waiting
    // for the observer's threshold — a section taller than the viewport can
    // never reach 15% visibility, so content like the contact form used to
    // stay hidden until the user scrolled.
    var box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) {
      revealSoon(el);
    } else {
      observer.observe(el);
    }
  });
});
