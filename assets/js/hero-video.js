/*
 * Hero video autoplay.
 *
 * Chrome honours the muted+autoplay+playsinline attributes on their own.
 * Safari is stricter: it wants `muted` set as a property before play() is
 * called, and it rejects autoplay outright in Low Power Mode. So we assert
 * muted in JS, call play(), and — if the browser still refuses — start on
 * the first interaction rather than leaving a frozen poster frame.
 */
document.addEventListener('DOMContentLoaded', function () {
  var video = document.querySelector('.hero-video-bg');
  if (!video) return;

  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('muted', '');
  video.playsInline = true;

  function attempt() {
    var played = video.play();
    if (played && played.catch) played.catch(function () { /* blocked; wait for input */ });
  }

  attempt();

  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (evt) {
    window.addEventListener(evt, function handler() {
      if (video.paused) attempt();
      window.removeEventListener(evt, handler);
    }, { once: true, passive: true });
  });
});
