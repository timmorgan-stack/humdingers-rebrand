/*
 * Smooth scroll to anchors with offset to account for fixed header
 * Ensures linked content appears with breathing room from top
 */
(function () {
  var headerHeight = 80; // Approximate height of sticky header + padding

  function scrollToElement(element) {
    var elementTop = element.getBoundingClientRect().top + window.scrollY;
    var targetScroll = elementTop - headerHeight;

    window.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  }

  // Handle all internal anchor links
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;

    var hash = link.getAttribute('href');
    if (hash === '#') return;

    var targetId = hash.substring(1);
    var targetElement = document.getElementById(targetId);

    if (targetElement) {
      e.preventDefault();
      scrollToElement(targetElement);
      // Update URL without full page reload
      window.history.pushState(null, null, hash);
    }
  });

  // Handle page load with anchor in URL
  window.addEventListener('load', function () {
    if (window.location.hash) {
      var hash = window.location.hash;
      var targetId = hash.substring(1);
      var targetElement = document.getElementById(targetId);

      if (targetElement) {
        setTimeout(function () {
          scrollToElement(targetElement);
        }, 100);
      }
    }
  });
})();
