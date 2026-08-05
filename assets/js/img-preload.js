document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('img').forEach(function (img) {
    if (img.complete) return;
    img.classList.add('img-loading');
    function reveal() { img.classList.remove('img-loading'); }
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  });
});
