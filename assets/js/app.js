(function () {
  'use strict';

  var defaults = {
    siteName: 'NorthEast News',
    siteUrl: 'https://bradthefunman.github.io/NorthEast-News',
    description: 'Independent regional reporting for New Hampshire, Massachusetts, Rhode Island and New England.',
    dataUrl: 'data/articles.json',
    marketDataUrl: 'data/market-snapshot.json',
    businessesUrl: 'data/businesses.json',
    timezone: 'America/New_York',
    forms: { newsletter: '', tips: '', sponsorship: '', contact: '' },
    organization: { name: 'NorthEast News', logo: 'assets/og-default.svg' }
  };
  var state = { articles: [], marketSnapshot: null, ready: false };
  var appRootPath = '';
  try {
    if (document.currentScript && document.currentScript.src) appRootPath = new URL(document.currentScript.src, window.location.href).pathname.replace(/\/assets\/js\/app\.js$/, '');
  } catch (error) {}
  var labels = {
    'new-hampshire': 'New Hampshire', 'new-england': 'New England',
    massachusetts: 'Massachusetts', 'rhode-island': 'Rhode Island',
    tech: 'Tech', markets: 'Markets', breaking: 'Breaking', more: 'More', misc: 'Misc.'
  };

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c];
    });
  }
  function siteBasePath() {
    try {
      var configured = new URL(defaults.siteUrl || '', window.location.href).pathname.replace(/\/$/, '');
      if (configured && configured !== '/' && (window.location.pathname.indexOf(configured) === 0 || window.location.hostname.indexOf('github.io') !== -1)) return configured;
    } catch (error) {}
    if (appRootPath) return appRootPath;
    return window.location.pathname.indexOf('/NorthEast-News') !== -1 ? '/NorthEast-News' : '';
  }
  function rootPath(path) {
    var clean = String(path || '').replace(/^\/+/, '');
    return siteBasePath() + (clean ? '/' + clean : '');
  }
  function absoluteUrl(path) {
    if (/^https?:\/\//i.test(path || '')) return path;
    try { return new URL(rootPath(path), window.location.origin).href; } catch (error) { return path; }
  }
  function pageCanonical() {
    var current = window.location.pathname + window.location.search;
    var basePath = siteBasePath();
    var relative = basePath && current.indexOf(basePath) === 0 ? current.slice(basePath.length) : current;
    if (!relative || relative === '/') relative = '/';
    return String(defaults.siteUrl || window.location.origin).replace(/\/$/, '') + (relative === '/' ? '' : relative);
  }
  function formatDate(value, options) {
    if (!value) return '';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: defaults.timezone }, options || {})).format(date);
  }
  function formatDateTime(value) { return formatDate(value, { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function formatFullDate(value) { return formatDate(value, { month: 'long', day: 'numeric', year: 'numeric' }); }
  function sortArticles(items) {
    return (items || []).slice().sort(function (a, b) {
      return new Date(b.updatedAt || b.publishedAt || 0) - new Date(a.updatedAt || a.publishedAt || 0);
    });
  }
  function categoryLabel(article) {
    var key = article && (article.topic || article.category);
    return labels[key] || (article && article.category) || 'News';
  }
  function stateLabel(article) {
    var value = article && (article.state || '');
    return { NH: 'New Hampshire', MA: 'Massachusetts', RI: 'Rhode Island', 'New Hampshire': 'New Hampshire', Massachusetts: 'Massachusetts', 'Rhode Island': 'Rhode Island' }[value] || value;
  }
  function typeLabel(article) {
    if (article && article.breaking) return 'Breaking';
    if (article && article.developing) return 'Developing';
    if (article && article.analysis) return 'Analysis';
    return categoryLabel(article);
  }
  function articleUrl(article) { return rootPath('article.html?slug=' + encodeURIComponent(article.slug)); }
  function stateMatches(article, requested) {
    var text = [article.state, article.city, article.location, article.topic, article.topicLabel, (article.tags || []).join(' ')].join(' ').toLowerCase();
    var patterns = {
      NH: /(^|[^a-z])(nh|new hampshire|granite state)([^a-z]|$)/,
      MA: /(^|[^a-z])(ma|massachusetts|boston|cambridge|worcester|springfield)([^a-z]|$)/,
      RI: /(^|[^a-z])(ri|rhode island|providence|cranston|warwick|newport)([^a-z]|$)/
    };
    return patterns[requested] ? patterns[requested].test(text) : false;
  }
  function visualClass(article) {
    if (article && article.breaking) return 'visual-breaking';
    if (article && article.category === 'new-hampshire') return 'visual-new-hampshire';
    if (article && article.category === 'new-england') return 'visual-new-england';
    if (article && article.category === 'tech') return 'visual-tech';
    if (article && article.category === 'markets') return 'visual-markets';
    return 'visual-more';
  }
  function visual(article, extra) {
    var image = article && article.image ? '<img src="' + escapeHTML(article.image) + '" alt="' + escapeHTML(article.imageAlt || article.headline) + '" loading="lazy">' : '<span class="visual-label">' + escapeHTML((article && article.visualLabel) || categoryLabel(article)) + '</span>';
    return '<div class="story-visual ' + visualClass(article) + ' ' + (extra || '') + '">' + image + '</div>';
  }
  function visualArticle(article) {
    return '<div class="article-visual story-visual ' + visualClass(article) + '">' + (article.image ? '<img src="' + escapeHTML(article.image) + '" alt="' + escapeHTML(article.imageAlt || article.headline) + '">' : '<span class="visual-label">' + escapeHTML(article.visualLabel || categoryLabel(article)) + '</span>') + '</div>';
  }
  function metadata(article) {
    var parts = [], place = article && (article.city || stateLabel(article) || article.location);
    if (place) parts.push('<span>' + escapeHTML(place) + '</span>');
    if (article && article.publishedAt) parts.push('<span>' + escapeHTML(formatDate(article.publishedAt, { hour: 'numeric', minute: '2-digit' })) + '</span>');
    return parts.join('');
  }
  function storyCard(article) {
    return '<article class="story-card"><a class="story-link" href="' + articleUrl(article) + '">' + visual(article) + '<div class="story-info"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3><p class="story-summary">' + escapeHTML(article.dek || article.summary || '') + '</p><div class="story-meta">' + metadata(article) + '</div></div></a></article>';
  }
  function latestItem(article) {
    return '<article class="latest-item"><a class="story-link" href="' + articleUrl(article) + '">' + visual(article) + '</a><div class="story-info"><a class="story-link" href="' + articleUrl(article) + '"><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3></a><p class="story-summary">' + escapeHTML(article.dek || article.summary || '') + '</p><div class="story-meta">' + metadata(article) + '</div></div></article>';
  }
  function setContent(id, html) { var element = document.getElementById(id); if (element) element.innerHTML = html; }
  function searchMatches(query) {
    var needle = String(query || '').trim().toLowerCase();
    if (!needle) return [];
    return sortArticles(state.articles).filter(function (article) {
      return [article.headline, article.dek, article.summary, Array.isArray(article.body) ? article.body.join(' ') : article.body, article.category, article.topic, article.topicLabel, article.state, article.city, article.location, (article.tags || []).join(' ')].join(' ').toLowerCase().indexOf(needle) !== -1;
    });
  }
  function excerpt(article, query) {
    var source = article.dek || article.summary || ((article.body || [])[0]) || '';
    var index = query ? source.toLowerCase().indexOf(String(query).toLowerCase()) : -1;
    if (index > 55) source = '…' + source.slice(index - 30);
    return source.length > 170 ? source.slice(0, 167) + '…' : source;
  }
  function searchMarkup(items, query) {
    if (!items.length) return '<p class="empty-state">No stories matched “' + escapeHTML(query) + '”. Try a place, topic or headline.</p>';
    return items.slice(0, 10).map(function (article) {
      return '<a class="search-result search-result-card" href="' + articleUrl(article) + '"><div><span class="story-type">' + escapeHTML(typeLabel(article)) + '</span><h3>' + escapeHTML(article.headline) + '</h3><p>' + escapeHTML(excerpt(article, query)) + '</p><small>' + escapeHTML([stateLabel(article), article.city, formatFullDate(article.publishedAt)].filter(Boolean).join(' · ')) + '</small></div><span aria-hidden="true">→</span></a>';
    }).join('');
  }
  function updateBreaking() {
    var bar = document.getElementById('breaking'), headline = document.getElementById('breaking-headline');
    if (!bar || !headline) return;
    var article = sortArticles(state.articles).find(function (item) { return item.breaking === true && item.archive !== true; });
    if (!article) { bar.hidden = true; return; }
    bar.hidden = false; headline.textContent = article.headline; headline.href = articleUrl(article);
    var time = bar.querySelector('time');
    if (time) { time.textContent = formatDate(article.updatedAt || article.publishedAt, { hour: 'numeric', minute: '2-digit' }); time.dateTime = article.updatedAt || article.publishedAt; }
  }
  function ensureBreakingBar() {
    if (document.getElementById('breaking')) return;
    var header = document.querySelector('.site-header'); if (!header) return;
    var bar = document.createElement('section'); bar.id = 'breaking'; bar.className = 'breaking-strip'; bar.hidden = true; bar.setAttribute('aria-label', 'Breaking news');
    bar.innerHTML = '<div class="page-width breaking-inner"><span class="breaking-label"><i></i> Breaking</span><a id="breaking-headline" href="#"></a><span class="breaking-time">Latest update <time></time></span></div>';
    header.insertAdjacentElement('afterend', bar);
  }
  function renderHome() {
    var articles = sortArticles(state.articles);
    if (!articles.length) { setContent('lead-story', '<div class="missing-state"><p class="eyebrow">News feed unavailable</p><h2>We are refreshing the newsroom.</h2></div>'); return; }
    var featured = articles.find(function (article) { return article.featured && !article.archive; }) || articles[0];
    var secondary = articles.filter(function (item) { return item.id !== featured.id; }).slice(0, 3);
    setContent('lead-story', '<article class="hero-card"><a class="story-link" href="' + articleUrl(featured) + '">' + visual(featured) + '<div class="story-info"><span class="story-type">' + escapeHTML(typeLabel(featured)) + '</span><h2>' + escapeHTML(featured.headline) + '</h2><p class="story-summary">' + escapeHTML(featured.dek || featured.summary || '') + '</p><div class="story-meta">' + metadata(featured) + (featured.updatedAt && featured.updatedAt !== featured.publishedAt ? '<span>Updated ' + escapeHTML(formatDate(featured.updatedAt, { hour: 'numeric', minute: '2-digit' })) + '</span>' : '') + '</div></div></a></article>');
    setContent('secondary-stories', secondary.map(function (item) { return '<article class="secondary-card"><a class="story-link" href="' + articleUrl(item) + '">' + visual(item) + '</a><div><a class="story-link" href="' + articleUrl(item) + '"><span class="story-type">' + escapeHTML(typeLabel(item)) + '</span><h3>' + escapeHTML(item.headline) + '</h3></a><div class="story-meta">' + metadata(item) + '</div></div></article>'; }).join(''));
    setContent('latest-feed', articles.filter(function (item) { return item.id !== featured.id; }).slice(0, 8).map(latestItem).join(''));
    setContent('nh-grid', articles.filter(function (item) { return stateMatches(item, 'NH') || item.topic === 'new-hampshire' || item.category === 'new-hampshire'; }).slice(0, 3).map(storyCard).join(''));
    setContent('ne-grid', articles.filter(function (item) { return item.category === 'new-england' || item.topic === 'massachusetts' || item.topic === 'rhode-island'; }).slice(0, 3).map(storyCard).join(''));
    setContent('tech-grid', articles.filter(function (item) { return item.category === 'tech' || item.topic === 'tech'; }).slice(0, 3).map(storyCard).join(''));
    setContent('more-grid', articles.filter(function (item) { return item.category === 'more' || item.topic === 'misc'; }).slice(0, 3).map(storyCard).join(''));
    setContent('markets-grid', articles.filter(function (item) { return item.category === 'markets' || item.topic === 'markets'; }).slice(0, 2).map(storyCard).join(''));
    var picks = articles.filter(function (item) { return item.trending; });
    setContent('trending-list', (picks.length ? picks : articles.slice(0, 5)).map(function (item) { return '<a class="trending-item" href="' + articleUrl(item) + '"><div><h3>' + escapeHTML(item.headline) + '</h3><small>' + escapeHTML(typeLabel(item)) + ' · ' + escapeHTML(formatDate(item.publishedAt, { hour: 'numeric', minute: '2-digit' })) + '</small></div></a>'; }).join(''));
    var market = state.marketSnapshot;
    if (market && Array.isArray(market.items)) setContent('market-snapshot', market.items.map(function (item) { return '<div class="market-item"><small>' + escapeHTML(item.name) + '</small><strong>' + escapeHTML(item.value) + '</strong><span>' + escapeHTML(item.change) + '</span></div>'; }).join('') + '<div class="market-disclaimer">' + escapeHTML(market.disclaimer || 'Reported snapshot, not live data.') + '</div>');
    updateBreaking();
  }
  function renderArchive(filter) {
    var items = sortArticles(state.articles).filter(function (article) { return !filter || filter === 'all' || article.topic === filter || article.category === filter; });
    setContent('archive-count', items.length + ' stories');
    setContent('archive-feed', items.length ? items.map(latestItem).join('') : '<p class="empty-state">No stories in this section yet.</p>');
    document.querySelectorAll('[data-topic-filter]').forEach(function (button) { button.classList.toggle('active', button.getAttribute('data-topic-filter') === (filter || 'all')); });
  }
  function bindSearch() {
    var toggle = document.getElementById('search-toggle'), panel = document.getElementById('search-panel'), close = document.getElementById('search-close'), input = document.getElementById('search-input'), results = document.getElementById('search-results');
    if (!toggle || !panel || !input || !results) return;
    function openSearch() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); input.focus(); }
    function closeSearch() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
    toggle.addEventListener('click', function () { panel.hidden ? openSearch() : closeSearch(); });
    if (close) close.addEventListener('click', closeSearch);
    input.addEventListener('input', function () { results.innerHTML = searchMarkup(searchMatches(input.value), input.value.trim()); });
  }
  function bindMenu() {
    var button = document.getElementById('menu-toggle'), nav = document.getElementById('site-nav');
    if (!button || !nav) return;
    button.addEventListener('click', function () { var open = nav.classList.toggle('is-open'); button.setAttribute('aria-expanded', String(open)); });
    nav.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { nav.classList.remove('is-open'); button.setAttribute('aria-expanded', 'false'); }); });
  }
  function enhanceNavigation() {
    var nav = document.querySelector('.nav-inner'); if (!nav) return;
    nav.innerHTML = [['Home', rootPath('index.html')], ['New Hampshire', rootPath('new-hampshire/')], ['Massachusetts', rootPath('massachusetts/')], ['Rhode Island', rootPath('rhode-island/')], ['Breaking', rootPath('search/?q=breaking')], ['Tech', rootPath('search/?q=tech')], ['Markets', rootPath('search/?q=markets')], ['Search', rootPath('search/')], ['More', rootPath('archive.html')]].map(function (item) { return '<a href="' + item[1] + '">' + item[0] + '</a>'; }).join('');
    var current = window.location.pathname;
    nav.querySelectorAll('a').forEach(function (link) { try { if (current === new URL(link.href).pathname) link.classList.add('active'); } catch (error) {} });
  }
  function enhanceFooter() {
    var grid = document.querySelector('.footer-grid'); if (!grid) return;
    var about = grid.lastElementChild;
    if (about) about.innerHTML = '<h2>NorthEast News</h2>' + [['About', rootPath('about/')], ['Editorial standards', rootPath('editorial-standards/')], ['Corrections', rootPath('corrections/')], ['Privacy', rootPath('privacy/')], ['Terms', rootPath('terms/')], ['Contact', rootPath('contact/')], ['News tips', rootPath('tips/')], ['Advertise', rootPath('advertise/')], ['Business directory', rootPath('business-directory/')]].map(function (item) { return '<a href="' + item[1] + '">' + item[0] + '</a>'; }).join('');
    if (!grid.querySelector('.footer-newsletter')) {
      var first = grid.firstElementChild;
      if (first) { var wrap = document.createElement('div'); wrap.className = 'footer-newsletter'; var id = 'footer-email-' + Math.random().toString(36).slice(2); wrap.innerHTML = '<span class="newsletter-kicker">NorthEast News Brief</span><p>Useful regional headlines, when there is something worth knowing.</p><form data-form-type="newsletter"><label class="visually-hidden" for="' + id + '">Email address</label><input id="' + id + '" name="email" type="email" placeholder="you@example.com" required><button type="submit">Subscribe</button><small data-form-message aria-live="polite"></small></form>'; first.appendChild(wrap); }
    }
  }
  function ensureFeatureStyles() {
    if (document.querySelector('link[data-feature-styles]')) return;
    var link = document.createElement('link'); link.rel = 'stylesheet'; link.href = rootPath('assets/css/features.css'); link.dataset.featureStyles = 'true'; document.head.appendChild(link);
  }
  function submitForm(form, type) {
    var message = form.querySelector('[data-form-message]') || document.getElementById('newsletter-message'), endpoint = defaults.forms && defaults.forms[type], data = {};
    Array.prototype.forEach.call(new FormData(form).entries(), function (entry) { if (entry[0] !== '_honey') data[entry[0]] = entry[1]; });
    var honeypot = form.querySelector('[name="_honey"]'); if (honeypot && honeypot.value) return;
    if (!endpoint) { if (message) { message.textContent = type === 'newsletter' ? 'Newsletter signup is not active yet; your email was not stored.' : 'This form is ready, but delivery has not been connected yet.'; message.className = 'form-status'; } return; }
    if (message) { message.textContent = 'Sending…'; message.className = 'form-status'; }
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) }).then(function (response) { if (!response.ok) throw new Error('Submission failed'); form.reset(); if (message) { message.textContent = type === 'newsletter' ? 'You’re on the list.' : 'Thanks — your submission was sent.'; message.className = 'form-status success'; } }).catch(function () { if (message) { message.textContent = 'We could not send that right now. Please try again later.'; message.className = 'form-status error'; } });
  }
  function bindForms() {
    document.querySelectorAll('form[data-form-type]').forEach(function (form) { if (form.dataset.bound) return; form.dataset.bound = 'true'; form.addEventListener('submit', function (event) { event.preventDefault(); submitForm(form, form.dataset.formType); }); });
    var old = document.getElementById('newsletter-form');
    if (old && !old.dataset.bound) { old.dataset.formType = 'newsletter'; old.dataset.bound = 'true'; old.addEventListener('submit', function (event) { event.preventDefault(); submitForm(old, 'newsletter'); }); }
  }
  function updatePageMeta() {
    var canonical = document.querySelector('link[rel="canonical"]'); if (canonical) canonical.href = pageCanonical();
    var urlMeta = document.querySelector('meta[property="og:url"]'); if (urlMeta) urlMeta.content = pageCanonical();
  }
  function initDate() { var element = document.getElementById('current-date'); if (element) element.textContent = formatDate(new Date().toISOString(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
  async function loadData() {
    var configResponse = await fetch(rootPath('data/site-config.json')); if (configResponse.ok) Object.assign(defaults, await configResponse.json());
    updatePageMeta();
    var responses = await Promise.all([fetch(rootPath(defaults.dataUrl)), fetch(rootPath(defaults.marketDataUrl))]);
    if (!responses[0].ok) throw new Error('Article data request failed');
    var articleData = await responses[0].json(); state.articles = Array.isArray(articleData) ? articleData : (articleData.articles || []); state.marketSnapshot = responses[1].ok ? await responses[1].json() : null; state.ready = true;
    if (document.body.id === 'homepage') renderHome();
    if (document.body.id === 'archive-page') { renderArchive('all'); document.querySelectorAll('[data-topic-filter]').forEach(function (button) { button.addEventListener('click', function () { renderArchive(button.getAttribute('data-topic-filter')); }); }); }
    document.dispatchEvent(new CustomEvent('ne-news-ready'));
  }
  function ready() {
    window.NENews = { CONFIG: defaults, state: state, rootPath: rootPath, absoluteUrl: absoluteUrl, articleUrl: articleUrl, escapeHTML: escapeHTML, formatDate: formatDate, formatDateTime: formatDateTime, formatFullDate: formatFullDate, sortArticles: sortArticles, categoryLabel: categoryLabel, stateLabel: stateLabel, typeLabel: typeLabel, stateMatches: stateMatches, storyCard: storyCard, latestItem: latestItem, visualArticle: visualArticle, searchMatches: searchMatches, searchMarkup: searchMarkup };
    initDate(); enhanceNavigation(); enhanceFooter(); ensureFeatureStyles(); ensureBreakingBar(); bindMenu(); bindSearch(); bindForms();
    loadData().catch(function (error) { console.error('NorthEast News data error:', error); document.dispatchEvent(new CustomEvent('ne-news-error')); });
  }
  document.addEventListener('DOMContentLoaded', ready);
}());
