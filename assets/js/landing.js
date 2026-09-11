(function () {
  'use strict';
  function render() {
    var api = window.NENews; if (!api || !api.state.ready) return;
    var marker = document.querySelector('[data-state]'), code = document.body.getAttribute('data-state') || (marker && marker.getAttribute('data-state')) || 'NH';
    var items = api.sortArticles(api.state.articles.filter(function (article) { return api.stateMatches(article, code); }));
    var name = code === 'NH' ? 'New Hampshire' : code === 'MA' ? 'Massachusetts' : 'Rhode Island';
    var lead = items.find(function (article) { return article.featured; }) || items[0];
    var leadMarkup = lead ? '<article class="hero-card"><a class="story-link" href="' + api.articleUrl(lead) + '">' + api.visualArticle(lead) + '<div class="story-info"><span class="story-type">' + api.escapeHTML(api.typeLabel(lead)) + '</span><h2>' + api.escapeHTML(lead.headline) + '</h2><p class="story-summary">' + api.escapeHTML(lead.dek || lead.summary || '') + '</p><div class="story-meta">' + api.escapeHTML([lead.city, api.stateLabel(lead), api.formatFullDate(lead.publishedAt)].filter(Boolean).join(' · ')) + '</div></div></a></article>' : '<p class="empty-state">No published stories are tagged for this state yet.</p>';
    document.getElementById('landing-lead').innerHTML = leadMarkup;
    document.getElementById('landing-feed').innerHTML = items.slice(lead ? 1 : 0, 13).map(api.latestItem).join('') || '<p class="empty-state">More coverage will appear here as stories are published.</p>';
    document.getElementById('landing-count').textContent = items.length + ' published ' + (items.length === 1 ? 'story' : 'stories');
  }
  document.addEventListener('ne-news-ready', render); document.addEventListener('DOMContentLoaded', render);
}());
