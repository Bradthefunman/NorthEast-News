(function () {
  'use strict';
  function render() {
    var api = window.NENews; if (!api || !api.state.ready) return;
    var input = document.getElementById('search-page-input'), results = document.getElementById('search-page-results'), count = document.getElementById('search-count'), query = new URLSearchParams(window.location.search).get('q') || '';
    input.value = query;
    function update() { var value = input.value.trim(), matches = api.searchMatches(value); count.textContent = value ? matches.length + ' matching stories' : 'Search the archive'; results.innerHTML = value ? api.searchMarkup(matches, value) : '<p class="empty-state">Search headlines, article text, tags, cities, states and categories.</p>'; if (history.replaceState) history.replaceState(null, '', api.rootPath('search/') + (value ? '?q=' + encodeURIComponent(value) : '')); }
    input.addEventListener('input', update); document.getElementById('search-page-form').addEventListener('submit', function (event) { event.preventDefault(); update(); }); update();
  }
  document.addEventListener('ne-news-ready', render); document.addEventListener('DOMContentLoaded', render);
}());
