# NorthEast News Publisher

This is a lightweight macOS publisher for the existing NorthEast News static site. It is intentionally implemented as a native AppKit/WebKit app rather than adding a CMS or a second article format.

## Build and run

From the repository root on a Mac with Xcode Command Line Tools:

```sh
publisher/build-app.sh
open "publisher/build/NorthEast News Publisher.app"
```

Choose the local checkout of this repository the first time the app opens. The app remembers that location. `NEN_NEWS_REPO=/path/to/NorthEast-News` can be used when launching the executable from a terminal for development.

## Publishing contract

The app reads and writes `data/articles.json` using the same object shape documented in `templates/new-story.json`. New articles keep `body` as an array of strings. The editor stores simple Markdown-style blocks inside those strings, and `assets/js/article.js` renders the supported inline formatting safely without changing the schema. Source name and source URL are optional; if a source URL is supplied, it must use `http` or `https`.

The publisher:

1. refuses to start when unrelated local Git changes are present;
2. runs `git pull --ff-only` before reading the latest article file;
3. validates IDs, slugs, required fields, timestamps, routes and image references;
4. writes the article and selected image, then runs `scripts/generate-sitemap.js` and `scripts/validate-site.js` when Node is available;
5. stages only `data/articles.json`, `sitemap.xml`, `robots.txt` and the selected image;
6. commits and pushes through the repository's configured Git remote.

If Node is unavailable on the Mac, the app uses a small fallback that mirrors the repository's current sitemap/robots generation and performs the same core validation. GitHub Pages still runs the canonical Node scripts on deployment.

Drafts are local-only files under `~/Library/Application Support/NorthEast News Publisher/drafts/`; they are never written to the repository or published automatically.

The current website creates its category/developing/breaking placeholder visuals with CSS (`assets/js/app.js` and `assets/css/styles.css`), so an article with no custom image leaves `image` null and previews the same visual treatment.
