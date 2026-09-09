# NorthEast News

NorthEast News is a lightweight regional digital publication focused first on New Hampshire, then Massachusetts, Rhode Island and the broader New England region. It remains a dependency-free static site suitable for GitHub Pages and a future custom domain.

## Run locally

From the repository root run:

    python3 -m http.server 8080

Open http://localhost:8080. The site reads articles from data/articles.json.

## Architecture

index.html is the homepage shell. article.html is the canonical article shell; normal stories are data objects, not hand-coded pages. assets/js/app.js owns shared navigation, data loading, homepage/archive rendering, search, breaking logic, footer, forms and path handling. assets/js/article.js owns article rendering, metadata, NewsArticle JSON-LD, sharing and scored related stories. assets/js/landing.js renders state pages from the same article data. data/site-config.json centralizes the site URL, data paths and form endpoints. data/businesses.json is intentionally empty until legitimate listings are reviewed. scripts/generate-sitemap.js generates sitemap.xml and robots.txt from the URL and every article slug.

## Public routes

/, /new-hampshire/, /massachusetts/, /rhode-island/, /search/, /archive.html, /business-directory/, /tips/, /advertise/, /about/, /editorial-standards/, /corrections/, /privacy/, /terms/ and /contact/. Older .html pages remain available for compatibility.

## Automated publishing

Copy templates/new-story.json, replace placeholders with verified original story data, append it to data/articles.json, and do not manually add article HTML. Set breaking, developing, featured and archive only when editorially true. Run the JSON check, node --check commands, node scripts/validate-site.js and node scripts/generate-sitemap.js. The site automatically supplies responsive article presentation, dates, source attribution, share buttons, Web Share support, related stories, search visibility, canonical URL, Open Graph metadata and NewsArticle schema.

## Forms and newsletter

Static hosting cannot safely store submissions by itself. Newsletter, tips, sponsorship and contact forms use HTTPS JSON endpoint keys in data/site-config.json and never commit submissions or subscriber emails. Until an endpoint is supplied, forms explicitly say delivery is inactive and do not pretend to store information. Honeypot fields and browser validation are included. Configure the endpoints with a secure form provider or serverless function.

## Custom domain

Change siteUrl once in data/site-config.json, then run node scripts/generate-sitemap.js. Article canonical URLs, Open Graph URLs, structured data, sitemap and robots output use that value. Add the real custom domain in GitHub Pages only when it is known.

## Deployment and checks

The GitHub Pages workflow validates the article data and generates crawl files before upload. Run node scripts/validate-site.js locally. Do not commit passwords, API keys, subscriber data or submissions.
