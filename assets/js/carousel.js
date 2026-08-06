document.addEventListener('DOMContentLoaded', function () {
  var carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;
  var slides = carousel.querySelectorAll('.carousel-slide');
  var dots = carousel.querySelectorAll('.carousel-dots span');
  var index = 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || slides.length < 2) return;
  setInterval(function () {
    slides[index].classList.remove('active');
    dots[index] && dots[index].classList.remove('active');
    index = (index + 1) % slides.length;
    slides[index].classList.add('active');
    dots[index] && dots[index].classList.add('active');
  }, 3500);
});
