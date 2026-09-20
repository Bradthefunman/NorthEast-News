(function () {
  'use strict';
  function render() {
    var api = window.NENews; if (!api || !api.state.ready) return;
    var input = document.getElementById('search-page-input'), results = document.getElementById('search-page-results'), count = document.getElementById('search-count'), query = new URLSearchParams(window.location.search).get('q') || '';
    input.value = query;
    async function update() {
      var value = input.value.trim();
      if (!value) { count.textContent = 'Search the archive'; results.innerHTML = '<p class="empty-state">Search headlines, article text, tags, cities, states and categories.</p>'; return; }
      count.textContent = 'Searching…'; results.innerHTML = '<p class="empty-state">Searching the archive…</p>';
      try {
        var matches = await api.searchMatches(value);
        count.textContent = matches.length + ' matching stories';
        results.innerHTML = api.searchMarkup(matches, value);
        if (history.replaceState) history.replaceState(null, '', api.rootPath('search/') + '?q=' + encodeURIComponent(value));
      } catch (error) {
        count.textContent = 'Search unavailable';
        results.innerHTML = '<p class="empty-state">' + api.escapeHTML(error.message || 'Search is temporarily unavailable.') + '</p>';
      }
    }
    input.addEventListener('input', update);
    document.getElementById('search-page-form').addEventListener('submit', function (event) { event.preventDefault(); update(); });
    update();
  }
  document.addEventListener('ne-news-ready', render); document.addEventListener('DOMContentLoaded', render);
}());
