# Instagram feed

`fetch-instagram.mjs` pulls the latest posts from the Humdingers Instagram
account into the repo so the site can show them **without putting an access
token in page source**. It runs wherever you can run Node on a schedule — the
GitHub Action in `.github/workflows/instagram.yml` is just one wrapper, and the
script is not tied to GitHub. On the production host, run it from that host's
cron / build hook / deploy pipeline instead.

```bash
IG_ACCESS_TOKEN=xxxx node tools/fetch-instagram.mjs
```

It writes `assets/data/instagram.json` and images into
`assets/img/instagram/` on fixed filenames (`ig-1.jpg` … `ig-8.jpg`), so each
run overwrites rather than piling up. `assets/js/instagram.js` renders the grid
from that JSON, and removes the section entirely if the feed is missing or
empty — so a lapsed token degrades to "no section", never a broken one.

## What's needed to switch it on

1. The Instagram account must be a **Business or Creator** account (not personal)
   and linked to a Facebook Page.
2. A Meta app with Instagram access, from which you generate a **long-lived
   access token**.
3. Store that token as a secret named `IG_ACCESS_TOKEN` wherever the script
   runs. Never commit it.

## Token expiry

Long-lived tokens last 60 days. Each run calls the refresh endpoint, which
issues a *new* token — useful only if it gets stored back. Set `IG_TOKEN_SINK`
to a path your pipeline reads back into its secret store to automate that;
otherwise the script warns in its logs once expiry is within two weeks and the
token needs re-issuing by hand.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `IG_ACCESS_TOKEN` | yes | Long-lived Instagram token. Without it the script exits quietly and leaves the existing feed alone. |
| `IG_POST_COUNT` | no | Posts to publish (default 8). |
| `IG_TOKEN_SINK` | no | Path to write the refreshed token for the pipeline to re-store. |
