(function () {
  'use strict';
  var pageSize = 12;
  var labels = { breaking: 'Breaking & developing', tech: 'Tech', markets: 'Markets', misc: 'More Northeast' };
  var descriptions = {
    breaking: 'The latest verified breaking and developing stories relevant to readers across the Northeast.',
    tech: 'Technology, science and the companies shaping work and life across New England.',
    markets: 'Markets, business and economic developments with a Northeast lens.',
    misc: 'Regional stories, explainers and broader coverage for Northeast readers.'
  };
  function matches(article, key) {
    if (key === 'breaking') return article.breaking === true || article.developing === true || article.topic === 'breaking' || article.category === 'breaking';
    if (key === 'misc') return article.topic === 'misc' || article.category === 'more' || article.category === 'misc';
    return article.topic === key || article.category === key;
  }
  function render() {
    var api = window.NENews; if (!api || !api.state.ready) return;
    var key = document.body.getAttribute('data-category') || 'misc', items = api.sortArticles(api.state.articles.filter(function (article) { return matches(article, key); }));
    var lead = items.find(function (article) { return article.featured; }) || items[0];
    var leadTarget = document.getElementById('category-lead'), feed = document.getElementById('category-feed'), count = document.getElementById('category-count');
    if (count) count.textContent = items.length + ' published ' + (items.length === 1 ? 'story' : 'stories');
    if (leadTarget) leadTarget.innerHTML = lead ? '<article class="hero-card"><a class="story-link" href="' + api.articleUrl(lead) + '">' + api.visualArticle(lead) + '<div class="story-info"><span class="story-type">' + api.escapeHTML(api.typeLabel(lead)) + '</span><h2>' + api.escapeHTML(lead.headline) + '</h2><p class="story-summary">' + api.escapeHTML(lead.dek || lead.summary || '') + '</p><div class="story-meta">' + api.escapeHTML([lead.city, api.stateLabel(lead), api.formatFullDate(lead.publishedAt)].filter(Boolean).join(' · ')) + '</div></div></a></article>' : '<p class="empty-state">No stories are filed in this section yet.</p>';
    var feedItems = items.slice(lead ? 1 : 0), visibleCount = pageSize;
    if (!feed) return;
    var button = document.getElementById('category-load-more');
    if (!button) {
      button = document.createElement('button');
      button.id = 'category-load-more';
      button.className = 'load-more-button';
      button.type = 'button';
      button.setAttribute('aria-controls', 'category-feed');
      button.textContent = 'Load more stories';
      feed.insertAdjacentElement('afterend', button);
    }
    function renderFeed() {
      feed.innerHTML = feedItems.slice(0, visibleCount).map(api.latestItem).join('') || '<p class="empty-state">More coverage will appear here as stories are published.</p>';
      button.hidden = visibleCount >= feedItems.length;
    }
    button.onclick = function () {
      visibleCount += pageSize;
      renderFeed();
    };
    renderFeed();
    var heading = document.getElementById('category-heading'); if (heading) heading.textContent = labels[key] || 'News';
    var intro = document.getElementById('category-intro'); if (intro) intro.textContent = descriptions[key] || descriptions.misc;
  }
  document.addEventListener('ne-news-ready', render); document.addEventListener('DOMContentLoaded', render);
}());
