(function () {
  'use strict';

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function formatDate(value, options) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'America/New_York' }, options || {})).format(date);
  }

  function formatDateTime(value) {
    return formatDate(value, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function visualClass(article) {
    if (article.breaking) return 'visual-breaking';
    if (article.category === 'new-hampshire') return 'visual-new-hampshire';
    if (article.category === 'new-england') return 'visual-new-england';
    if (article.category === 'tech') return 'visual-tech';
    if (article.category === 'markets') return 'visual-markets';
    return 'visual-more';
  }

  function categoryLabel(article) {
    return { 'new-hampshire': 'New Hampshire', 'new-england': 'New England', tech: 'Tech', markets: 'Markets', more: 'More' }[article.category] || 'News';
  }

  function articleUrl(article) {
    return 'article.html?slug=' + encodeURIComponent(article.slug);
  }

  function storyVisual(article) {
    const image = article.image ? '<img src="' + escapeHTML(article.image) + '" alt="' + escapeHTML(article.imageAlt || article.headline) + '">' : '<span class="visual-label">' + escapeHTML(article.visualLabel || categoryLabel(article)) + '</span>';
    return '<div class="article-visual story-visual ' + visualClass(article) + '">' + image + '</div>';
  }

  function typeLabel(article) {
    if (article.breaking) return 'Breaking';
    if (article.developing) return 'Developing';
    if (article.analysis) return 'Analysis';
    return categoryLabel(article);
  }

  function renderArticle(article, allArticles) {
    const location = [article.city, article.state].filter(Boolean).join(', ') || article.location || 'New England';
    const updated = article.updatedAt && article.updatedAt !== article.publishedAt ? '<span>Updated ' + escapeHTML(formatDateTime(article.updatedAt)) + '</span>' : '';
    const paragraphs = (article.body || []).map(function (paragraph) { return '<p>' + escapeHTML(paragraph) + '</p>'; }).join('');
    const source = article.sourceUrl ? '<div class="article-source">Source attribution: reporting was informed by <a href="' + escapeHTML(article.sourceUrl) + '" target="_blank" rel="noreferrer">' + escapeHTML(article.sourceName || 'the originating source') + '</a>. NorthEast News has written an original summary and will update this item as confirmed facts change.</div>' : '';
    const related = allArticles.filter(function (item) { return item.id !== article.id && (item.category === article.category || (article.tags || []).some(function (tag) { return (item.tags || []).includes(tag); })); }).slice(0, 3);
    const relatedMarkup = related.length ? '<section class="related-stories" aria-labelledby="related-heading"><h2 id="related-heading">Keep reading</h2>' + related.map(function (item) { return '<a class="related-story" href="' + articleUrl(item) + '"><small>' + escapeHTML(categoryLabel(item)) + '</small><h3>' + escapeHTML(item.headline) + '</h3></a>'; }).join('') + '</section>' : '';
    const canonicalUrl = window.NENews && window.NENews.CONFIG.siteUrl ? window.NENews.CONFIG.siteUrl.replace(/\/$/, '') + '/' + articleUrl(article) : '';
    const shareUrl = canonicalUrl || window.location.href;
    const articleSchema = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.headline, description: article.dek || article.summary, datePublished: article.publishedAt, dateModified: article.updatedAt || article.publishedAt, articleSection: categoryLabel(article), mainEntityOfPage: shareUrl, author: { '@type': 'Organization', name: article.author || 'NorthEast News' }, publisher: { '@type': 'Organization', name: 'NorthEast News' } };

    document.title = article.headline + ' | NorthEast News';
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.setAttribute('content', article.dek || article.summary || 'Reporting from NorthEast News.');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogTitle) ogTitle.setAttribute('content', article.headline);
    if (ogDescription) ogDescription.setAttribute('content', article.dek || article.summary || '');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', canonicalUrl);

    const shell = document.getElementById('article-shell');
    shell.innerHTML = '<div class="article-layout"><div><header class="article-header"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h1>' + escapeHTML(article.headline) + '</h1><p class="article-dek">' + escapeHTML(article.dek || article.summary || '') + '</p><div class="article-byline"><span>By ' + escapeHTML(article.author || 'NorthEast News Desk') + '</span><span>' + escapeHTML(location) + '</span><span>Published ' + escapeHTML(formatDateTime(article.publishedAt)) + '</span>' + updated + '</div></header>' + storyVisual(article) + '<div class="article-tools"><span class="share-label">Share</span><button class="share-button" data-share="copy" type="button">Copy link</button><button class="share-button" data-share="x" type="button">Post to X</button><button class="share-button" data-share="facebook" type="button">Facebook</button></div><div class="article-body">' + paragraphs + '</div>' + source + '<div class="article-tools"><a class="share-button" href="index.html">← Back to all news</a></div></div><aside class="article-side"><div class="ad-slot ad-rectangle" aria-label="Advertisement"><span>ADVERTISEMENT</span></div>' + relatedMarkup + '</aside></div><script type="application/ld+json" id="article-schema">' + JSON.stringify(articleSchema) + '</script>';
    shell.hidden = false;
    document.getElementById('article-loading').hidden = true;
    document.getElementById('article-missing').hidden = true;
    bindShareButtons(shareUrl, article.headline);
  }

  function bindShareButtons(url, title) {
    document.querySelectorAll('[data-share]').forEach(function (button) {
      button.addEventListener('click', async function () {
        const action = button.getAttribute('data-share');
        if (action === 'copy') {
          try { await navigator.clipboard.writeText(url); button.textContent = 'Copied'; } catch (error) { window.prompt('Copy this story link:', url); }
          return;
        }
        const encodedUrl = encodeURIComponent(url);
        if (action === 'x') window.open('https://twitter.com/intent/tweet?url=' + encodedUrl + '&text=' + encodeURIComponent(title), '_blank', 'noopener,noreferrer');
        if (action === 'facebook') window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl, '_blank', 'noopener,noreferrer');
      });
    });
  }

  function showMissing() {
    const loading = document.getElementById('article-loading');
    const missing = document.getElementById('article-missing');
    if (loading) loading.hidden = true;
    if (missing) missing.hidden = false;
  }

  function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');
    if (!slug || !window.NENews || !window.NENews.state.articles.length) return;
    const article = window.NENews.state.articles.find(function (item) { return item.slug === slug; });
    if (article) renderArticle(article, window.NENews.state.articles); else showMissing();
  }

  document.addEventListener('DOMContentLoaded', loadArticle);
  document.addEventListener('ne-news-ready', loadArticle);
  document.addEventListener('ne-news-error', showMissing);
}());
