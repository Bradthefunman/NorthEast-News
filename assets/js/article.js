(function () {
  'use strict';
  function api() { return window.NENews || {}; }
  function intersect(a, b) {
    var right = (b || []).map(function (x) { return String(x).toLowerCase(); });
    return (a || []).reduce(function (n, x) { return n + (right.indexOf(String(x).toLowerCase()) !== -1 ? 1 : 0); }, 0);
  }
  function related(article, all) {
    var anchor = new Date(article.updatedAt || article.publishedAt || 0).getTime();
    return api().sortArticles(all).filter(function (item) { return item.id !== article.id && item.slug !== article.slug; }).map(function (item) {
      var score = 0;
      if (item.category && item.category === article.category) score += 4;
      if (item.topic && item.topic === article.topic) score += 4;
      if (item.state && item.state === article.state) score += 3;
      if (item.city && article.city && item.city.toLowerCase() === article.city.toLowerCase()) score += 5;
      score += intersect(article.tags, item.tags) * 3;
      if (Math.abs(new Date(item.updatedAt || item.publishedAt || 0).getTime() - anchor) < 14 * 86400000) score += 1;
      return { item: item, score: score };
    }).filter(function (row) { return row.score > 0; }).sort(function (a, b) {
      return b.score - a.score || new Date(b.item.publishedAt) - new Date(a.item.publishedAt);
    }).slice(0, 5).map(function (row) { return row.item; });
  }
  function setMeta(kind, key, value) {
    var selector = 'meta[' + kind + '="' + key + '"]', element = document.querySelector(selector);
    if (!element) { element = document.createElement('meta'); element.setAttribute(kind, key); document.head.appendChild(element); }
    if (value) element.setAttribute('content', value);
  }
  function stateHref(article, site) {
    var state = String(article.state || '').toUpperCase();
    var route = state === 'NH' ? 'new-hampshire/' : state === 'MA' ? 'massachusetts/' : state === 'RI' ? 'rhode-island/' : '';
    return route ? site.rootPath(route) : site.rootPath('search/?q=' + encodeURIComponent(article.state || article.location || 'New England'));
  }
  function canonical(article) {
    var config = api().CONFIG || {};
    return article.canonicalUrl || (config.siteUrl ? config.siteUrl.replace(/\/$/, '') + '/article.html?slug=' + encodeURIComponent(article.slug) : window.location.href);
  }
  function render(article, all) {
    var site = api(), url = canonical(article), description = article.seoDescription || article.dek || article.summary || '';
    var image = article.image ? site.absoluteUrl(article.image) : site.absoluteUrl((site.CONFIG.organization && site.CONFIG.organization.logo) || 'assets/og-default.svg');
    var publisherLogo = site.absoluteUrl((site.CONFIG.organization && site.CONFIG.organization.logo) || 'assets/og-default.svg');
    var place = [article.city, site.stateLabel(article)].filter(Boolean).join(', ') || article.location || 'New England';
    var body = Array.isArray(article.body) ? article.body : [article.body || ''], relatedItems = related(article, all);
    var relatedMarkup = relatedItems.length ? '<section class="related-stories" aria-labelledby="related-heading"><div class="section-heading"><div><p class="eyebrow">More from the file</p><h2 id="related-heading">Related stories</h2></div></div>' + relatedItems.map(function (item) { return '<a class="related-story" href="' + site.articleUrl(item) + '"><small>' + site.escapeHTML(site.typeLabel(item)) + '</small><h3>' + site.escapeHTML(item.headline) + '</h3><span>' + site.escapeHTML([item.city, site.stateLabel(item), site.formatFullDate(item.publishedAt)].filter(Boolean).join(' · ')) + '</span></a>'; }).join('') + '</section>' : '';
    var tags = (article.tags || []).map(function (tag) { return '<a href="' + site.rootPath('search/?q=' + encodeURIComponent(tag)) + '">' + site.escapeHTML(tag) + '</a>'; }).join('');
    var source = article.sourceUrl ? '<div class="article-source">Source attribution: <a href="' + site.escapeHTML(article.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + site.escapeHTML(article.sourceName || 'the originating source') + '</a>. NorthEast News wrote an original summary and will update this item as confirmed facts change.</div>' : '';
    var schema = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: article.headline, description: description, datePublished: article.publishedAt, dateModified: article.updatedAt || article.publishedAt, articleSection: site.categoryLabel(article), keywords: (article.tags || []).join(', '), mainEntityOfPage: { '@type': 'WebPage', '@id': url }, author: { '@type': 'Organization', name: article.author || 'NorthEast News' }, publisher: { '@type': 'Organization', name: 'NorthEast News', logo: { '@type': 'ImageObject', url: publisherLogo } } };
    if (article.image) schema.image = [image];
    document.title = (article.seoTitle || article.headline) + ' | NorthEast News';
    setMeta('name', 'description', description); setMeta('property', 'og:title', article.seoTitle || article.headline); setMeta('property', 'og:description', description); setMeta('property', 'og:type', 'article'); setMeta('property', 'og:url', url); setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', 'summary_large_image'); setMeta('name', 'twitter:title', article.seoTitle || article.headline); setMeta('name', 'twitter:description', description); setMeta('name', 'twitter:image', image);
    var canonicalLink = document.querySelector('link[rel="canonical"]'); if (canonicalLink) canonicalLink.href = url;
    var old = document.getElementById('article-schema'); if (old) old.remove();
    var shell = document.getElementById('article-shell');
    shell.innerHTML = '<div class="article-layout"><div><header class="article-header"><span class="story-type">' + site.escapeHTML(site.typeLabel(article)) + '</span><h1>' + site.escapeHTML(article.headline) + '</h1><p class="article-dek">' + site.escapeHTML(description) + '</p><div class="article-byline"><span>By ' + site.escapeHTML(article.author || 'NorthEast News Desk') + '</span><span><a href="' + stateHref(article, site) + '">' + site.escapeHTML(place) + '</a></span><span>Published ' + site.escapeHTML(site.formatDateTime(article.publishedAt)) + '</span>' + (article.updatedAt && article.updatedAt !== article.publishedAt ? '<span>Updated ' + site.escapeHTML(site.formatDateTime(article.updatedAt)) + '</span>' : '') + '</div></header>' + site.visualArticle(article) + '<div class="article-share" aria-label="Share this story"><span class="share-label">Share</span><button class="share-button" data-share="native" type="button" hidden>Share</button><button class="share-button" data-share="facebook" type="button">Facebook</button><button class="share-button" data-share="x" type="button">X</button><button class="share-button" data-share="linkedin" type="button">LinkedIn</button><a class="share-button" data-share="email" href="mailto:?subject=' + encodeURIComponent(article.headline) + '&body=' + encodeURIComponent(url) + '">Email</a><button class="share-button" data-share="copy" type="button">Copy link</button><small class="share-feedback" aria-live="polite"></small></div><div class="article-body">' + body.map(function (paragraph) { return '<p>' + site.escapeHTML(paragraph) + '</p>'; }).join('') + '</div>' + (article.tags && article.tags.length ? '<div class="article-tags" aria-label="Story tags">' + tags + '</div>' : '') + source + '<div class="article-tools"><a class="share-button" href="' + site.rootPath('archive.html') + '">← Back to all news</a></div></div><aside class="article-side"><div class="ad-slot ad-rectangle" aria-label="Advertisement"><span>ADVERTISEMENT</span></div>' + relatedMarkup + '</aside></div><script type="application/ld+json" id="article-schema">' + JSON.stringify(schema).replace(/<\/script/gi, '<\\/script') + '</script>';
    shell.hidden = false; var loading = document.getElementById('article-loading'); if (loading) loading.hidden = true; var missing = document.getElementById('article-missing'); if (missing) missing.hidden = true; bindShare(url, article.headline);
  }
  function bindShare(url, title) {
    document.querySelectorAll('[data-share]').forEach(function (button) {
      var action = button.getAttribute('data-share');
      if (action === 'native') { if (navigator.share) { button.hidden = false; button.addEventListener('click', function () { navigator.share({ title: title, text: title, url: url }).catch(function () {}); }); } return; }
      if (action === 'copy') { button.addEventListener('click', function () { var feedback = document.querySelector('.share-feedback'), done = function () { button.textContent = 'Copied'; if (feedback) feedback.textContent = 'Link copied to clipboard.'; setTimeout(function () { button.textContent = 'Copy link'; }, 1800); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(function () { window.prompt('Copy this story link:', url); }); else window.prompt('Copy this story link:', url); }); return; }
      if (action === 'facebook') button.addEventListener('click', function () { window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer'); });
      if (action === 'x') button.addEventListener('click', function () { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer'); });
      if (action === 'linkedin') button.addEventListener('click', function () { window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank', 'noopener,noreferrer'); });
    });
  }
  function missing() { var loading = document.getElementById('article-loading'); if (loading) loading.hidden = true; var shell = document.getElementById('article-shell'); if (shell) shell.hidden = true; var target = document.getElementById('article-missing'); if (target) target.hidden = false; }
  function load() { var slug = new URLSearchParams(window.location.search).get('slug'); if (!slug || !api().state || !api().state.articles.length) return; var article = api().state.articles.find(function (item) { return item.slug === slug; }); if (article) render(article, api().state.articles); else missing(); }
  document.addEventListener('DOMContentLoaded', load); document.addEventListener('ne-news-ready', load);
}());
