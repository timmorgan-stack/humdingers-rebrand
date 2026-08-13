/*
 * Homepage Partner Venues — a different four on every visit.
 *
 * The four venues in the markup are the no-JS fallback (and what crawlers
 * see); this swaps in a fresh selection on load. Selection follows the same
 * rules as the brand colours: a persistent deck deals every venue once
 * before any repeats, and no venue carries over from the previous load.
 */
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('#partner-venues .venue-grid');
  var store = document.getElementById('venue-data');
  if (!grid || !store) return;

  var venues;
  try { venues = JSON.parse(store.textContent); } catch (e) { return; }
  if (!Array.isArray(venues) || venues.length < 2) return;

  var SHOW = grid.children.length || 4;
  if (venues.length <= SHOW) return;

  var KEY = 'hd-venue-deck';
  var state = { deck: [], last: [] };
  try { state = JSON.parse(localStorage.getItem(KEY)) || state; } catch (e) {}
  if (!Array.isArray(state.deck)) state.deck = [];
  if (!Array.isArray(state.last)) state.last = [];

  function shuffled(arr) {
    var d = arr.slice();
    for (var i = d.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  /* Refill pushes anything the visitor has just seen to the back of the new
     cycle. That has to include the picks made so far in THIS load, not only
     the previous load's — a refill can happen mid-selection, and without it
     the venues just dealt sit at the front of the deck and reappear on the
     very next visit. */
  function refill(exclude) {
    var deck = shuffled(venues.map(function (_, i) { return i; }));
    var held = deck.filter(function (i) { return exclude.indexOf(i) === -1; });
    var carried = deck.filter(function (i) { return exclude.indexOf(i) !== -1; });
    state.deck = held.concat(carried);
  }

  var picks = [];
  while (picks.length < SHOW) {
    if (!state.deck.length) refill(state.last.concat(picks));
    var next = state.deck.shift();
    if (picks.indexOf(next) === -1) picks.push(next);
  }

  state.last = picks;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}

  grid.textContent = '';
  picks.forEach(function (i) {
    var v = venues[i];
    var card = document.createElement('a');
    card.className = 'venue-card';
    card.href = v.href;
    card.target = '_blank';
    card.rel = 'noopener';

    var img = document.createElement('img');
    img.src = v.img;
    img.alt = v.alt;
    card.appendChild(img);

    var label = document.createElement('span');
    label.appendChild(document.createTextNode(v.name));
    var sub = document.createElement('span');
    sub.className = 'sub';
    sub.innerHTML = v.sub; // trusted: authored in the page's own data block
    label.appendChild(sub);
    card.appendChild(label);

    grid.appendChild(card);
  });
});
