document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  // Mobile: second and third-level menus sit collapsed behind a chevron.
  // The chevron buttons are injected here so the shared header markup stays
  // one flat hover-driven tree for desktop; the link itself still navigates.
  nav.querySelectorAll('.nav-item, .nav-subitem').forEach(function (item) {
    var link = item.querySelector(':scope > a');
    var panel = item.querySelector(':scope > .nav-dropdown, :scope > .nav-flyout');
    if (!link || !panel) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-sub-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Show ' + link.textContent.replace('›', '').trim() + ' menu');
    btn.addEventListener('click', function () {
      var open = item.classList.toggle('sub-open');
      btn.setAttribute('aria-expanded', open);
    });
    link.after(btn);
  });

  // Closing the hamburger folds every section back up, so it always reopens
  // as the compact top-level list.
  function closeAllSubs() {
    nav.querySelectorAll('.sub-open').forEach(function (item) {
      item.classList.remove('sub-open');
      var btn = item.querySelector(':scope > .nav-sub-toggle');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    var expanded = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', expanded);
    if (!expanded) closeAllSubs();
  });
});
