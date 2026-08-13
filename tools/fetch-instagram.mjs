/*
 * fetch-instagram.mjs — build-time Instagram feed for a static site.
 *
 * Runs in GitHub Actions (never in the browser), so the access token stays in
 * repository secrets rather than in page source. Writes:
 *   assets/data/instagram.json   — the posts the page renders from
 *   assets/img/instagram/ig-N.jpg — the images, on fixed filenames so each
 *                                   refresh overwrites rather than accumulates
 *
 * Instagram's own CDN links expire after a few days, which is why the images
 * are copied into the repo instead of hot-linked.
 *
 * Env:
 *   IG_ACCESS_TOKEN  long-lived Instagram token (required; skips cleanly if absent)
 *   IG_POST_COUNT    how many posts to publish (default 8)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { Buffer } from 'node:buffer';

const TOKEN = process.env.IG_ACCESS_TOKEN;
const COUNT = Number(process.env.IG_POST_COUNT || 8);
const API = 'https://graph.instagram.com';
const IMG_DIR = 'assets/img/instagram';
const DATA_FILE = 'assets/data/instagram.json';

if (!TOKEN) {
  // Not an error: without credentials the site simply keeps the feed it has.
  console.log('IG_ACCESS_TOKEN not set — leaving the existing feed in place.');
  process.exit(0);
}

async function getJSON(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Instagram API ${res.status}: ${JSON.stringify(body.error || body)}`);
  }
  return body;
}

/* Videos and carousels expose a still in thumbnail_url; images use media_url. */
function stillFor(post) {
  return post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
}

/* Captions run long and contain hashtag walls — keep a short, readable line
   for the alt text and tooltip. */
function tidyCaption(caption) {
  if (!caption) return 'Recent work from the Humdingers kitchen';
  const firstLine = caption.split('\n').find((l) => l.trim() && !l.trim().startsWith('#'));
  const text = (firstLine || caption).replace(/#\w+/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Recent work from the Humdingers kitchen';
  return text.length > 120 ? text.slice(0, 117).trimEnd() + '…' : text;
}

const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
const feed = await getJSON(`${API}/me/media?fields=${fields}&limit=${COUNT * 2}&access_token=${TOKEN}`);

const usable = (feed.data || []).filter(stillFor).slice(0, COUNT);
if (!usable.length) {
  console.log('No usable posts returned — leaving the existing feed in place.');
  process.exit(0);
}

await mkdir(IMG_DIR, { recursive: true });
await mkdir('assets/data', { recursive: true });

const posts = [];
for (const [i, post] of usable.entries()) {
  const file = `ig-${i + 1}.jpg`;
  const res = await fetch(stillFor(post));
  if (!res.ok) {
    console.warn(`Skipping post ${post.id}: image fetch returned ${res.status}`);
    continue;
  }
  await writeFile(`${IMG_DIR}/${file}`, Buffer.from(await res.arrayBuffer()));
  posts.push({
    img: `${IMG_DIR}/${file}`,
    permalink: post.permalink,
    caption: tidyCaption(post.caption),
    timestamp: post.timestamp,
    isVideo: post.media_type === 'VIDEO',
  });
}

await writeFile(DATA_FILE, JSON.stringify({ updated: new Date().toISOString(), posts }, null, 2) + '\n');
console.log(`Wrote ${posts.length} posts to ${DATA_FILE}`);

/* Long-lived tokens last 60 days and refreshing issues a NEW one, so it only
   helps if the host stores it back into its own secret store. Set
   IG_TOKEN_SINK to a writable path and the fresh token is written there for
   the deploy pipeline to pick up; otherwise we just warn as expiry nears. */
try {
  const refreshed = await getJSON(`${API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${TOKEN}`);
  const days = Math.round((refreshed.expires_in || 0) / 86400);
  if (refreshed.access_token && process.env.IG_TOKEN_SINK) {
    await writeFile(process.env.IG_TOKEN_SINK, refreshed.access_token);
    console.log(`Token refreshed (${days} days) and written to IG_TOKEN_SINK.`);
  } else if (days && days < 14) {
    console.warn(`Instagram token expires in ~${days} days — issue a new one.`);
  }
} catch (err) {
  console.warn('Token refresh check failed (feed still updated):', err.message);
}
