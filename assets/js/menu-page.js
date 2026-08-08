/*
 * Menus page: category headings fade in each time they enter view. Landing
 * and scrolling behaviour lives in smooth-scroll.js; expand/collapse is the
 * native <details> behaviour.
 */
/* Filter above the list. Clicking the input opens a dropdown of the menus
   (thumbnail + name); picking one adds it as a removable pill below the bar
   and the list shows only picked menus. Free text still deep-filters on
   category names and dish text — combined with pills, it narrows within the
   picked set. A panel whose text matched opens so the hit is visible. */
document.addEventListener('DOMContentLoaded', function () {
  var input = document.getElementById('menu-filter-input');
  if (!input) return;
  var clear = document.getElementById('menu-filter-clear');
  var drop = document.getElementById('menu-filter-drop');
  var pillsBox = document.getElementById('menu-filter-pills');
  var emptyNote = document.getElementById('menu-filter-empty');

  var categories = Array.prototype.map.call(
    document.querySelectorAll('section.menu-category'),
    function (sec) {
      var h2 = sec.querySelector('h2');
      var img = sec.querySelector('.menu-category-img');
      return {
        sec: sec,
        panel: sec.querySelector('details'),
        label: h2 ? h2.textContent.trim() : sec.id,
        name: (h2 ? h2.textContent : '').toLowerCase(),
        text: sec.textContent.toLowerCase(),
        imgSrc: img ? img.getAttribute('src') : null,
        picked: false
      };
    });

  function apply() {
    var q = input.value.trim().toLowerCase();
    clear.hidden = !q;
    var anyPicked = categories.some(function (c) { return c.picked; });
    var any = false;
    categories.forEach(function (c) {
      var candidate = !anyPicked || c.picked;
      var inName = !q || c.name.indexOf(q) !== -1;
      var hit = candidate && (inName || c.text.indexOf(q) !== -1);
      c.sec.style.display = hit ? '' : 'none';
      if (hit) any = true;
      if (c.panel) {
        if (q && hit && !inName) c.panel.open = true;
        if (!q && !anyPicked) c.panel.open = false;
      }
    });
    emptyNote.hidden = any;
  }

  function renderPills() {
    pillsBox.textContent = '';
    categories.forEach(function (c) {
      if (!c.picked) return;
      var pill = document.createElement('span');
      pill.className = 'menu-pill menu-pill-' + (categories.indexOf(c) % 8);
      pill.textContent = c.label;
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'menu-pill-remove';
      x.setAttribute('aria-label', 'Remove ' + c.label);
      x.textContent = '×';
      x.addEventListener('click', function () {
        c.picked = false;
        renderPills();
        renderDrop();
        apply();
      });
      pill.appendChild(x);
      pillsBox.appendChild(pill);
    });
    if (categories.some(function (c) { return c.picked; })) {
      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'menu-pills-clear';
      reset.textContent = 'Clear all';
      reset.addEventListener('click', function () {
        categories.forEach(function (c) { c.picked = false; });
        input.value = '';
        closeDrop();
        renderPills();
        apply();
      });
      pillsBox.appendChild(reset);
    }
  }

  function renderDrop() {
    var q = input.value.trim().toLowerCase();
    drop.textContent = '';
    var shown = 0;
    categories.forEach(function (c) {
      if (c.picked) return;
      if (q && c.name.indexOf(q) === -1) return;
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'menu-drop-item';
      item.setAttribute('role', 'option');
      if (c.imgSrc) {
        var im = document.createElement('img');
        im.src = c.imgSrc;
        im.alt = '';
        item.appendChild(im);
      }
      var label = document.createElement('span');
      label.textContent = c.label;
      item.appendChild(label);
      item.addEventListener('click', function () {
        c.picked = true;
        input.value = '';
        renderPills();
        renderDrop();
        apply();
        input.focus();
      });
      drop.appendChild(item);
      shown++;
    });
    drop.hidden = !dropOpen || shown === 0;
  }

  var dropOpen = false;
  function openDrop() { dropOpen = true; renderDrop(); }
  function closeDrop() { dropOpen = false; drop.hidden = true; }

  input.addEventListener('focus', openDrop);
  input.addEventListener('click', openDrop);
  input.addEventListener('input', function () { renderDrop(); apply(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrop(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      var first = drop.querySelector('.menu-drop-item');
      if (first && !drop.hidden) first.click();
    }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu-filter')) closeDrop();
  });
  clear.addEventListener('click', function () {
    input.value = '';
    renderDrop();
    apply();
    input.focus();
  });
});

/* Back to top also folds the panel it lives in shut, so the list is compact
   again when you land back at the filter. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.menu-back-top').forEach(function (link) {
    link.addEventListener('click', function () {
      var panel = link.closest('details');
      if (panel) panel.open = false;
    });
  });
});

/* Opening a menu panel scrolls that menu's top to the top of the viewport
   (just under the sticky header), so the newly revealed content starts from
   its heading rather than wherever the click happened to land. */
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('section.menu-category details').forEach(function (panel) {
    panel.addEventListener('toggle', function () {
      if (!panel.open) return;
      var sec = panel.closest('section.menu-category');
      if (!sec) return;
      var sticky = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sticky-h')) || 80;
      // Proximity snap would drag the target away mid-scroll — pause it.
      var root = document.documentElement;
      root.style.scrollSnapType = 'none';
      window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - sticky, behavior: 'smooth' });
      setTimeout(function () { root.style.scrollSnapType = ''; }, 800);
    });
  });
});

document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var heads = document.querySelectorAll('.menu-category-head');
  if (!heads.length) return;
  heads.forEach(function (el) { el.classList.add('menu-head-reveal'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('menu-head-visible', entry.isIntersecting);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  heads.forEach(function (el) { observer.observe(el); });

  // Safety net: a fade-in that starts at opacity 0 must never be the reason
  // a heading is unreadable. If the observer hasn't reported on an element
  // shortly after load, drop the effect entirely and show it.
  setTimeout(function () {
    heads.forEach(function (el) {
      var box = el.getBoundingClientRect();
      var onScreen = box.bottom > 0 && box.top < window.innerHeight;
      if (onScreen && !el.classList.contains('menu-head-visible')) {
        el.classList.remove('menu-head-reveal');
      }
    });
  }, 1200);
});
