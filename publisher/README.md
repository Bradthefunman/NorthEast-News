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

The app reads the generated catalog and writes individual files under `data/articles/` using the same object shape documented in `templates/new-story.json`. New articles keep `body` as an array of strings. The editor stores simple Markdown-style blocks inside those strings, and `assets/js/article.js` renders the supported inline formatting safely without changing the schema. Source name and source URL are optional; if a source URL is supplied, it must use `http` or `https`.

The publisher:

1. refuses to start when unrelated local Git changes are present;
2. runs `git pull --ff-only` before reading `data/article-index.json` and the individual article files;
3. validates IDs, slugs, required fields, timestamps, routes and image references;
4. loads the complete article file only when Edit is selected;
5. writes one stable-id article file, updates only the prior featured article when needed, then regenerates the catalog, affected search shard(s), sitemap and robots;
6. stages only the dynamic transaction allowlist and commits and pushes through the repository's configured Git remote.

The release app bundles a compatible arm64 Node.js runtime inside the application bundle and verifies it with `node --version` before publishing. `NEN_NEWS_NODE` is available as an explicit build-time override for `publisher/build-app.sh`; the finished app does not depend on the build machine's runtime path.

Drafts are local-only files under `~/Library/Application Support/NorthEast News Publisher/drafts/`; they are never written to the repository or published automatically.

The current website creates its category/developing/breaking placeholder visuals with CSS (`assets/js/app.js` and `assets/css/styles.css`), so an article with no custom image leaves `image` null and previews the same visual treatment.
