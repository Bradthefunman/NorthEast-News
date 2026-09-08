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
about.html                 Standards and contact page
404.html                   GitHub Pages fallback page
assets/css/styles.css      Responsive newsroom styling
assets/js/app.js           Shared UI, homepage rendering and search
assets/js/article.js       Article lookup, metadata and sharing UI
data/articles.json         Structured article content
data/market-snapshot.json  Clearly labeled non-live market snapshot
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

## Automated Publisher Instructions

To publish one story:

1. Research the story using trustworthy, current sources. Verify the facts, date and location. Do not invent quotes, numbers, events or eyewitness accounts.
2. Add one new JSON object to `data/articles.json`. Keep the object valid JSON and give it a new `id` and unique lowercase-hyphenated `slug`.
3. Write an original `dek` and original `body` paragraphs. Do not copy the source article.
4. Set `category`, geographic fields, ISO timestamps, editorial flags and a real `sourceName`/`sourceUrl`.
5. Set `breaking: true` only while the story is genuinely developing. Set `featured: true` for the single homepage lead and remove that flag from the previous lead. Set `trending: true` for editorially selected stories only.
6. Use `image: null` unless a licensed or owned image URL is available. Always fill `imageAlt` when an image is used.
7. Run a JSON check and preview the site:

   ```bash
   python3 -m json.tool data/articles.json >/dev/null
   python3 -m http.server 8080
   ```

8. Update `feed.xml` and `sitemap.xml` for important new published stories, then commit the complete change.

The homepage automatically sorts stories by `publishedAt`, finds the featured story, fills the NH/New England/Tech/Markets/More sections, updates the breaking bar and generates related-story links. No HTML redesign is needed for a normal article publication.

## Homepage and site configuration

Edit the `CONFIG` object near the top of `assets/js/app.js` to change `siteName`, `siteUrl`, or the JSON data paths. Leave `siteUrl` empty until the permanent domain exists. Once the real domain is connected, set it once there and update the absolute URLs in `robots.txt`, `sitemap.xml` and `feed.xml`.

Market cards read from `data/market-snapshot.json`. The current file intentionally uses a dash for index levels and labels itself as a reported, non-live snapshot. A future agent can replace this with an API-backed endpoint only after adding freshness, error and delayed-data handling.

## Deployment

The repository includes `.nojekyll` and a GitHub Actions workflow at `.github/workflows/pages.yml`. In GitHub, open **Settings → Pages** and select **GitHub Actions** as the source if it is not already selected. Pushes to `main` then deploy the static files to the repository’s GitHub Pages URL. Add a custom domain later in that same Pages panel; do not add a `CNAME` file until the real domain is known.

For another static host, upload the repository root as-is. There is no build command.

## Editorial and product follow-ups

Before public launch, connect a newsroom inbox, replace the demo content with a reviewed publishing workflow, add a licensed image source, connect a newsletter provider, add delayed/live market data with a clear timestamp, and add automated sitemap/RSS generation. Analytics, advertising, weather, push notifications and social publishing can be layered on without changing the article schema.
