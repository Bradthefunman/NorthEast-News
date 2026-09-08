# NorthEast News

NorthEast News is a lightweight regional news publication focused first on New Hampshire, then Massachusetts, Rhode Island and the broader New England region. The first version is intentionally static: it uses semantic HTML, CSS and vanilla JavaScript so it can run on GitHub Pages or almost any static host without a build step or dependency tree.

## Run locally

From the repository root, run any simple static server:

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). Do not open `index.html` directly from the filesystem because browsers commonly block the JSON fetch used by the article feed.

## File structure

```text
index.html                 Homepage and section layout
article.html               Reusable article-page shell
archive.html               Chronological archive with topic filters
about.html                 Standards and editorial approach
contact.html               Story tips, corrections and newsroom contact form
terms.html                 Terms and conditions
404.html                   GitHub Pages fallback page
assets/css/styles.css      Responsive newsroom styling
assets/js/app.js           Shared UI, homepage rendering and search
assets/js/article.js       Article lookup, metadata and sharing UI
data/articles.json         Structured article content
data/market-snapshot.json  Clearly labeled non-live market snapshot
templates/new-story.json  Copy-ready article object for automated publishers
templates/new-story.md     Human-readable publishing checklist and contract
feed.xml                   Starter RSS feed
robots.txt                 Crawler rules and sitemap location
sitemap.xml                GitHub Pages-ready sitemap structure
.github/workflows/pages.yml Optional GitHub Pages deployment workflow
```

## Article data model

Every story is one object in `data/articles.json` with these fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable internal identifier; never reuse it for a different story |
| `slug` | URL-safe unique identifier used by `article.html?slug=...` |
| `headline` | Display headline |
| `dek` | Short summary used on cards and in metadata |
| `body` | Array of paragraph strings rendered on the article page |
| `category` | `new-hampshire`, `new-england`, `tech`, `markets` or `more` |
| `tags` | Search and related-story keywords |
| `state`, `city`, `location` | Geographic metadata; use `state` as `NH`, `MA`, `RI` when relevant |
| `author` | Byline; use an organization or real verified author only |
| `publishedAt`, `updatedAt` | ISO 8601 timestamps with timezone |
| `breaking`, `developing`, `analysis` | Editorial labels; use booleans |
| `featured`, `trending` | Homepage placement flags; editorial selection, not fake analytics |
| `image`, `imageAlt` | Optional legitimately licensed image and accessible alt text; use `null` for the visual fallback |
| `visualLabel` | Text shown inside the no-image visual fallback |
| `sourceName`, `sourceUrl` | Originating reporting used for verification and visible attribution |
| `topic`, `topicLabel` | Publishing topic used by the archive filters; topics are `new-hampshire`, `massachusetts`, `rhode-island`, `breaking`, `tech`, `markets` and `misc` |
| `archive` | Marks backdated launch-archive context pieces; archive items are never allowed to drive the live breaking-news bar |

## Automated Publisher Instructions

To publish one story:

1. Start with `templates/new-story.json` and replace every placeholder. The companion `templates/new-story.md` explains each field and includes the publishing checklist.
2. Research the story using trustworthy, current sources. Verify the facts, date and location. Do not invent quotes, numbers, events or eyewitness accounts.
3. Add one new JSON object to `data/articles.json`. Keep the object valid JSON and give it a new `id` and unique lowercase-hyphenated `slug`.
4. Write an original `dek` and original `body` paragraphs. Do not copy the source article.
5. Set `category`, `topic`, geographic fields, ISO timestamps, editorial flags and a real `sourceName`/`sourceUrl`.
6. Set `breaking: true` only while the story is genuinely developing. Set `featured: true` for the single homepage lead and remove that flag from the previous lead. Set `trending: true` for editorially selected stories only.
7. Use `image: null` unless a licensed or owned image URL is available. Always fill `imageAlt` when an image is used.
8. Run a JSON check and preview the site:

   ```bash
   python3 -m json.tool data/articles.json >/dev/null
   python3 -m http.server 8080
   ```

8. Update `feed.xml` and `sitemap.xml` for important new published stories, then commit the complete change.

The homepage automatically sorts stories by `publishedAt`, finds the featured story, fills the NH/New England/Tech/Markets/More sections, updates the breaking bar and generates related-story links. No HTML redesign is needed for a normal article publication. A normal current publication should use `archive: false`; the archive page handles deliberately backdated context pieces.

The archive page exposes the full chronological collection and filters by the seven publishing topics. The launch archive contains 20 backdated context pieces in each topic, scheduled at four articles per day before the original launch stories.

## Homepage and site configuration

Edit the `CONFIG` object near the top of `assets/js/app.js` to change `siteName`, `siteUrl`, or the JSON data paths. Leave `siteUrl` empty until the permanent domain exists. Once the real domain is connected, set it once there and update the absolute URLs in `robots.txt`, `sitemap.xml` and `feed.xml`.

Market cards read from `data/market-snapshot.json`. The current file intentionally uses a dash for index levels and labels itself as a reported, non-live snapshot. A future agent can replace this with an API-backed endpoint only after adding freshness, error and delayed-data handling.

## Contact form configuration

`contact.html` contains the only form-forwarding endpoint, on the `<form>` element. It is configured for the current newsroom inbox through FormSubmit, which allows this static GitHub Pages site to forward submissions without a custom server. The destination is intentionally not printed in the rendered page. On first use, FormSubmit may send a one-time activation request to the recipient; complete that activation before treating the form as live. To change the inbox later, replace the endpoint in that one `action` attribute and submit a test message.

The form includes a subject, sender, message type, location, message body and a honeypot field. Do not promise confidentiality for submissions until a secure newsroom workflow has been added.

## Terms and conditions

`terms.html` is a plain-language starter policy covering site use, editorial content, submissions, third-party links, disclaimers and policy changes. It is linked from the footer across the site and should receive a legal review before a commercial launch.

## Deployment

The repository includes `.nojekyll` and a GitHub Actions workflow at `.github/workflows/pages.yml`. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source if it is not already selected. Pushes to `main` then deploy the static files to the repository’s GitHub Pages URL. Add a custom domain later in that same Pages panel; do not add a `CNAME` file until the real domain is known.

For another static host, upload the repository root as-is. There is no build command.

## Editorial and product follow-ups

Before public launch, connect a newsroom inbox, replace the demo content with a reviewed publishing workflow, add a licensed image source, connect a newsletter provider, add delayed/live market data with a clear timestamp, and add automated sitemap/RSS generation. Analytics, advertising, weather, push notifications and social publishing can be layered on without changing the article schema.
