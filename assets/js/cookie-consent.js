document.addEventListener('DOMContentLoaded', function () {
  var banner = document.getElementById('cookie-banner');
  if (!banner) return;
  var KEY = 'humdingers-cookie-consent';
  var stored = localStorage.getItem(KEY);
  if (!stored) {
    banner.style.display = 'flex';
  }
  function decide(value) {
    localStorage.setItem(KEY, value);
    banner.style.display = 'none';
  }
  var acceptBtn = document.getElementById('cookie-accept');
  var declineBtn = document.getElementById('cookie-decline');
  if (acceptBtn) acceptBtn.addEventListener('click', function () { decide('accepted'); });
  if (declineBtn) declineBtn.addEventListener('click', function () { decide('declined'); });
});
