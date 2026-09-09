(function () {
  'use strict';
  function render() {
    var api = window.NENews; if (!api || !api.state.ready) return;
    fetch(api.rootPath(api.CONFIG.businessesUrl || 'data/businesses.json')).then(function (response) { return response.ok ? response.json() : { businesses: [] }; }).then(function (data) {
      var businesses = Array.isArray(data) ? data : (data.businesses || []), grid = document.getElementById('directory-grid'), empty = document.getElementById('directory-empty'), search = document.getElementById('directory-search'), stateSelect = document.getElementById('directory-state'), citySelect = document.getElementById('directory-city'), categorySelect = document.getElementById('directory-category');
      Array.from(new Set(businesses.map(function (item) { return item.city; }).filter(Boolean))).sort().forEach(function (item) { var option = document.createElement('option'); option.value = item; option.textContent = item; citySelect.appendChild(option); });
      Array.from(new Set(businesses.map(function (item) { return item.category; }).filter(Boolean))).sort().forEach(function (item) { var option = document.createElement('option'); option.value = item; option.textContent = item; categorySelect.appendChild(option); });
      function update() { var q = search.value.trim().toLowerCase(), matches = businesses.filter(function (item) { return (!q || [item.name, item.description, item.city, item.state, item.category].join(' ').toLowerCase().indexOf(q) !== -1) && (!stateSelect.value || item.state === stateSelect.value) && (!citySelect.value || item.city === citySelect.value) && (!categorySelect.value || item.category === categorySelect.value); }); grid.innerHTML = matches.map(function (item) { return '<article class="business-card">' + (item.featured ? '<span class="featured-label">Featured listing</span>' : '') + '<h2>' + api.escapeHTML(item.name) + '</h2><div class="business-meta">' + api.escapeHTML([item.category, item.city, item.state].filter(Boolean).join(' · ')) + '</div><p>' + api.escapeHTML(item.description || '') + '</p>' + (item.website ? '<a href="' + api.escapeHTML(item.website) + '" target="_blank" rel="noopener noreferrer">Visit website →</a>' : '') + '</article>'; }).join(''); empty.hidden = matches.length > 0; }
      [search, stateSelect, citySelect, categorySelect].forEach(function (element) { element.addEventListener('input', update); element.addEventListener('change', update); }); update();
    });
  }
  document.addEventListener('ne-news-ready', render); document.addEventListener('DOMContentLoaded', render);
}());
