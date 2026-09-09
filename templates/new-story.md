# NorthEast News — New story contract

Copy templates/new-story.json, replace its placeholders, and append one object to data/articles.json. The site owns presentation and infrastructure; the publishing agent supplies story-specific data only.

Core fields are id, slug, headline, dek, body, category or topic, publishedAt, sourceName and sourceUrl. Keep body as an array of original paragraph strings and timestamps as ISO 8601 values with a timezone.

Use category new-hampshire, new-england, tech, markets or more. Use topic new-hampshire, massachusetts, rhode-island, breaking, tech, markets or misc. Set state to NH, MA or RI for local coverage when supported. City, location, image, imageAlt, seoTitle, seoDescription and canonicalUrl are optional. Leave canonicalUrl null so it is derived from data/site-config.json.

Set breaking true only while a story is genuinely breaking. Set developing true when material facts are still being confirmed. Set featured true only for the homepage lead and remove it from the previous lead. Set archive true only for deliberately backdated context. Use image null unless the image is owned or legitimately licensed; imageAlt is required when an image exists.

Before publishing, verify the story, avoid fabricated quotes or figures, check duplicate ids/slugs, then run:

    python3 -m json.tool data/articles.json >/dev/null
    node --check assets/js/app.js
    node --check assets/js/article.js
    node scripts/validate-site.js
    node scripts/generate-sitemap.js

Do not create an HTML file for a normal article. article.html and the shared JavaScript automatically provide header/footer, state/category links, timestamps, source attribution, share controls, related stories, search indexing, canonical URL, Open Graph tags and NewsArticle structured data. The deployment workflow regenerates sitemap.xml and robots.txt from the article file.
