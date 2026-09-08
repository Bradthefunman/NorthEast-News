# NorthEast News — New story template

Use this checklist when drafting a new post, article or publishable story.

## Editorial brief

- Headline: `REPLACE_WITH_HEADLINE`
- Dek: `REPLACE_WITH_ONE_OR_TWO_SENTENCE_SUMMARY`
- Category: `new-hampshire | new-england | tech | markets | more`
- Topic: `new-hampshire | massachusetts | rhode-island | breaking | tech | markets | misc`
- State / city / location: `REPLACE_WITH_GEOGRAPHY`
- Author: `REPLACE_WITH_REAL_AUTHOR_OR_NEWSROOM_DESK`
- Published at: `YYYY-MM-DDTHH:MM:SS-04:00`
- Updated at: `YYYY-MM-DDTHH:MM:SS-04:00`
- Editorial labels: `breaking=false`, `developing=false`, `analysis=false`
- Placement flags: `featured=false`, `trending=false`, `archive=false`

## Original story body

Write short original paragraphs here. Lead with the clearest verified fact, identify what is preliminary, and explain why the story matters to Northeast readers. Do not copy another article, invent quotes, or turn an unverified claim into a fact.

## Verification and attribution

- Source name: `REPLACE_WITH_SOURCE_NAME`
- Source URL: `https://replace-with-the-page-used-to-verify-the-story`
- Verification notes: `REPLACE_WITH_WHAT_WAS_CHECKED`
- Image: use `null` unless the image is owned or legitimately licensed.
- Image alt text: required whenever an image is used.

## Publish contract

1. Copy `templates/new-story.json` into a working object and replace every placeholder.
2. Give the story a new stable `id` and a unique lowercase-hyphenated `slug`.
3. Keep `body` as an array of paragraph strings and keep every timestamp in ISO 8601 format with a timezone.
4. Append the object to `data/articles.json`; do not create a new HTML file for a normal story.
5. Set `featured: true` only for the homepage lead and remove it from the previous lead. Set `breaking: true` only while the story is genuinely developing.
6. Use `archive: true` only for deliberately backdated context pieces. Normal current publications use `archive: false`.
7. Validate before committing:

   ```bash
   python3 -m json.tool data/articles.json >/dev/null
   node --check assets/js/app.js
   node --check assets/js/article.js
   ```

The homepage, archive and reusable `article.html` layout will pick up the new story automatically.
