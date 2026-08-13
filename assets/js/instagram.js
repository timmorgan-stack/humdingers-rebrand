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

      // Revealing the grid changes the page height. If we arrived on a hash
      // further down the page, that landing is now stale — ask for a re-land.
      section.hidden = false;
      document.dispatchEvent(new CustomEvent('hd:relayout'));
    })
    .catch(drop);
});
