(function () {
  'use strict';

  const CONFIG = {
    siteName: 'NorthEast News',
    siteUrl: '',
    defaultDescription: 'Clear, fast reporting for New Hampshire and New England.',
    dataUrl: 'data/articles.json',
    marketDataUrl: 'data/market-snapshot.json'
  };

  const state = { articles: [], marketSnapshot: null };
  const categoryLabels = {
    'new-hampshire': 'New Hampshire',
    'new-england': 'New England',
    tech: 'Tech',
    markets: 'Markets',
    breaking: 'Breaking',
    more: 'More'
  };

  window.NENews = { CONFIG, state };

  function escapeHTML(value) {
    return String(value || '').replace(/[&<>'"]/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character];
    });
  }

  function formatDate(value, options) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: 'America/New_York' }, options || {})).format(date);
  }

  function formatTime(value) {
    return formatDate(value, { hour: 'numeric', minute: '2-digit' });
  }

  function formatFullDate(value) {
    return formatDate(value, { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function getStoryUrl(article) {
    return 'article.html?slug=' + encodeURIComponent(article.slug);
  }

  function getCategoryLabel(article) {
    return categoryLabels[article.category] || 'News';
  }

  function visualClass(article) {
    if (article.breaking) return 'visual-breaking';
    if (article.category === 'new-hampshire') return 'visual-new-hampshire';
    if (article.category === 'new-england') return 'visual-new-england';
    if (article.category === 'tech') return 'visual-tech';
    if (article.category === 'markets') return 'visual-markets';
    return 'visual-more';
  }

  function visual(article, className) {
    const label = article.image ? '' : '<span class="visual-label">' + escapeHTML(article.visualLabel || getCategoryLabel(article)) + '</span>';
    const image = article.image ? '<img src="' + escapeHTML(article.image) + '" alt="' + escapeHTML(article.imageAlt || article.headline) + '" loading="lazy">' : '';
    return '<div class="story-visual ' + visualClass(article) + ' ' + (className || '') + '">' + image + label + '</div>';
  }

  function metadata(article) {
    const location = article.city || article.state || article.location;
    const parts = [];
    if (location) parts.push('<span>' + escapeHTML(location) + '</span>');
    if (article.publishedAt) parts.push('<span>' + escapeHTML(formatTime(article.publishedAt)) + '</span>');
    return parts.join('');
  }

  function typeLabel(article) {
    if (article.breaking) return 'Breaking';
    if (article.developing) return 'Developing';
    if (article.analysis) return 'Analysis';
    return getCategoryLabel(article);
  }

  function storyCard(article) {
    return '<article class="story-card"><a class="story-link" href="' + getStoryUrl(article) + '">' + visual(article) + '<div class="story-info"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3><p class="story-summary">' + escapeHTML(article.dek || article.summary) + '</p><div class="story-meta">' + metadata(article) + '</div></div></a></article>';
  }

  function latestItem(article) {
    return '<article class="latest-item"><a class="story-link" href="' + getStoryUrl(article) + '">' + visual(article) + '</a><div class="story-info"><a class="story-link" href="' + getStoryUrl(article) + '"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3></a><p class="story-summary">' + escapeHTML(article.dek || article.summary) + '</p><div class="story-meta">' + metadata(article) + '</div></div></article>';
  }

  function secondaryCard(article) {
    return '<article class="secondary-card"><a class="story-link" href="' + getStoryUrl(article) + '">' + visual(article) + '</a><div><a class="story-link" href="' + getStoryUrl(article) + '"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3></a><div class="story-meta">' + metadata(article) + '</div></div></article>';
  }

  function setContent(id, content) {
    const element = document.getElementById(id);
    if (element) element.innerHTML = content;
  }

  function renderHome() {
    const articles = state.articles.slice().sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });
    if (!articles.length) {
      setContent('lead-story', '<div class="missing-state"><p class="eyebrow">News feed unavailable</p><h2>We are refreshing the newsroom.</h2><p>Try reloading the page in a moment.</p></div>');
      return;
    }

    const featured = articles.find(function (article) { return article.featured; }) || articles[0];
    const secondary = articles.filter(function (article) { return article.id !== featured.id; }).slice(0, 3);
    setContent('lead-story', '<article class="hero-card"><a class="story-link" href="' + getStoryUrl(featured) + '">' + visual(featured) + '<div class="story-info"><span class="story-type">' + escapeHTML(typeLabel(featured)) + '</span><h2>' + escapeHTML(featured.headline) + '</h2><p class="story-summary">' + escapeHTML(featured.dek || featured.summary) + '</p><div class="story-meta">' + metadata(featured) + (featured.updatedAt ? '<span>Updated ' + escapeHTML(formatTime(featured.updatedAt)) + '</span>' : '') + '</div></div></a></article>');
    setContent('secondary-stories', secondary.map(secondaryCard).join(''));

    const latest = articles.filter(function (article) { return article.id !== featured.id; }).slice(0, 8);
    setContent('latest-feed', latest.map(latestItem).join(''));
    setContent('nh-grid', articles.filter(function (article) { return article.category === 'new-hampshire'; }).slice(0, 3).map(storyCard).join(''));
    setContent('ne-grid', articles.filter(function (article) { return article.category === 'new-england'; }).slice(0, 3).map(storyCard).join(''));
    setContent('tech-grid', articles.filter(function (article) { return article.category === 'tech'; }).slice(0, 3).map(storyCard).join(''));
    setContent('more-grid', articles.filter(function (article) { return article.category === 'more'; }).slice(0, 3).map(storyCard).join(''));
    setContent('markets-grid', articles.filter(function (article) { return article.category === 'markets'; }).slice(0, 2).map(storyCard).join(''));

    const trending = articles.filter(function (article) { return article.trending; }).slice(0, 5);
    setContent('trending-list', (trending.length ? trending : articles.slice(0, 5)).map(function (article) {
      return '<a class="trending-item" href="' + getStoryUrl(article) + '"><div><h3>' + escapeHTML(article.headline) + '</h3><small>' + escapeHTML(getCategoryLabel(article)) + ' · ' + escapeHTML(formatTime(article.publishedAt)) + '</small></div></a>';
    }).join(''));

    renderMarkets();
    updateBreaking(featured, articles);
  }

  function renderMarkets() {
    const snapshot = state.marketSnapshot;
    if (!snapshot || !Array.isArray(snapshot.items)) return;
    const cards = snapshot.items.map(function (item) {
      const directionClass = item.direction === 'up' ? 'market-up' : item.direction === 'down' ? 'market-down' : '';
      return '<div class="market-item"><small>' + escapeHTML(item.name) + '</small><strong>' + escapeHTML(item.value) + '</strong><span class="' + directionClass + '">' + escapeHTML(item.change) + '</span></div>';
    }).join('');
    setContent('market-snapshot', cards + '<div class="market-disclaimer">' + escapeHTML(snapshot.disclaimer || 'Market figures are reported snapshots, not live data.') + '</div>');
  }

  function updateBreaking(featured, articles) {
    const bar = document.getElementById('breaking');
    const headline = document.getElementById('breaking-headline');
    const article = articles.find(function (item) { return item.breaking; });
    if (!bar || !headline) return;
    if (!article) { bar.hidden = true; return; }
    headline.textContent = article.headline;
    headline.href = getStoryUrl(article);
    const time = bar.querySelector('time');
    if (time) { time.textContent = formatTime(article.updatedAt || article.publishedAt); time.dateTime = article.updatedAt || article.publishedAt; }
  }

  function initMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('site-nav');
    if (!menuToggle || !nav) return;
    menuToggle.addEventListener('click', function () {
      const open = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { nav.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); }); });
  }

  function initSearch() {
    const toggle = document.getElementById('search-toggle');
    const panel = document.getElementById('search-panel');
    const close = document.getElementById('search-close');
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!toggle || !panel || !input || !results) return;
    function openSearch() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); input.focus(); }
    function closeSearch() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', function () { panel.hidden ? openSearch() : closeSearch(); });
    if (close) close.addEventListener('click', closeSearch);
    input.addEventListener('input', function () {
      const query = input.value.trim().toLowerCase();
      if (!query) { results.innerHTML = ''; return; }
      const matches = state.articles.filter(function (article) { return [article.headline, article.dek, article.city, article.state, ...(article.tags || [])].join(' ').toLowerCase().includes(query); }).slice(0, 6);
      results.innerHTML = matches.length ? matches.map(function (article) { return '<a class="search-result" href="' + getStoryUrl(article) + '">' + escapeHTML(article.headline) + '<small>' + escapeHTML(getCategoryLabel(article)) + ' · ' + escapeHTML(formatFullDate(article.publishedAt)) + '</small></a>'; }).join('') : '<span class="story-summary">No matching stories yet.</span>';
    });
  }

  function initNewsletter() {
    const form = document.getElementById('newsletter-form');
    const message = document.getElementById('newsletter-message');
    if (!form || !message) return;
    form.addEventListener('submit', function (event) { event.preventDefault(); message.textContent = 'Thanks — newsletter delivery will be connected before launch.'; message.style.color = '#e4b24c'; form.reset(); });
  }

  function initDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) dateElement.textContent = formatDate(new Date().toISOString(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  async function loadData() {
    try {
      const responses = await Promise.all([fetch(CONFIG.dataUrl), fetch(CONFIG.marketDataUrl)]);
      if (!responses[0].ok) throw new Error('Article data request failed');
      const articleData = await responses[0].json();
      state.articles = Array.isArray(articleData) ? articleData : articleData.articles || [];
      state.marketSnapshot = responses[1].ok ? await responses[1].json() : null;
      if (document.body.id === 'homepage') renderHome();
      document.dispatchEvent(new CustomEvent('ne-news-ready'));
    } catch (error) {
      console.error('NorthEast News data error:', error);
      if (document.body.id === 'homepage') setContent('lead-story', '<div class="missing-state"><p class="eyebrow">News feed unavailable</p><h2>We are refreshing the newsroom.</h2><p>Please reload the page to try again.</p></div>');
      document.dispatchEvent(new CustomEvent('ne-news-error'));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDate();
    initMenu();
    initSearch();
    initNewsletter();
    loadData();
  });
}());
