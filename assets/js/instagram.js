/*
 * Renders the Instagram grid from assets/data/instagram.json, which the
 * scheduled Action refreshes. Nothing here talks to Instagram — no token
 * reaches the browser, and a missing or empty feed simply removes the
 * section rather than leaving an empty hole on the page.
 */
document.addEventListener('DOMContentLoaded', function () {
  var section = document.getElementById('instagram');
  if (!section) return;
  var grid = section.querySelector('.instagram-grid');
  if (!grid) return;

  // Already hidden in markup: leaving it hidden costs no layout space,
  // so nothing below it can shift once the page has settled.
  function drop() { section.remove(); }

  fetch('assets/data/instagram.json', { cache: 'no-cache' })
    .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error(res.status)); })
    .then(function (data) {
      var posts = (data && data.posts) || [];
      if (!posts.length) return drop();

      posts.forEach(function (post) {
        var link = document.createElement('a');
        link.className = 'instagram-tile';
        link.href = post.permalink;
        link.target = '_blank';
        link.rel = 'noopener';
        link.setAttribute('aria-label', 'View on Instagram: ' + post.caption);

        var img = document.createElement('img');
        img.src = post.img;
        img.alt = post.caption;
        img.loading = 'lazy';
        link.appendChild(img);

        if (post.isVideo) {
          var badge = document.createElement('span');
          badge.className = 'instagram-video-badge';
          badge.setAttribute('aria-hidden', 'true');
          link.appendChild(badge);
        }
        grid.appendChild(link);
      });

      // A preview feed says so on the page: staging must never look like it
      // is pulling live posts. The flag is absent from real API data, so
      // this notice removes itself the moment the feed is connected.
      if (data.preview) {
        var lede = section.querySelector('.script');
        if (lede) lede.textContent = 'A preview of how the feed will look.';
        var note = document.createElement('p');
        note.className = 'placeholder-tag';
        note.style.marginTop = '18px';
        note.textContent = 'Design preview \u2014 sample imagery from the site library, not yet connected to the live Instagram feed.';
        grid.insertAdjacentElement('afterend', note);
      }

      // Revealing the grid changes the page height. If we arrived on a hash
      // further down the page, that landing is now stale — ask for a re-land.
      section.hidden = false;
      document.dispatchEvent(new CustomEvent('hd:relayout'));
    })
    .catch(drop);
});
