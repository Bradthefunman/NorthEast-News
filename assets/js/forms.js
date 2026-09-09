(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[data-form-type]').forEach(function (form) {
      if (form.dataset.bound) return; form.dataset.bound = 'true';
      form.addEventListener('submit', function (event) {
        event.preventDefault(); var type = form.dataset.formType, message = form.querySelector('[data-form-message]'), endpoint = window.NENews && window.NENews.CONFIG.forms ? window.NENews.CONFIG.forms[type] : '', honey = form.querySelector('[name="_honey"]');
        if (honey && honey.value) return;
        if (!endpoint) { if (message) { message.textContent = type === 'newsletter' ? 'Newsletter signup is not active yet; your email was not stored.' : 'This form is ready, but delivery has not been connected yet.'; message.className = 'form-status'; } return; }
        if (message) { message.textContent = 'Sending…'; message.className = 'form-status'; }
        var payload = {}; Array.prototype.forEach.call(new FormData(form).entries(), function (entry) { if (entry[0] !== '_honey') payload[entry[0]] = entry[1]; });
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) }).then(function (response) { if (!response.ok) throw new Error('Unable to submit'); form.reset(); if (message) { message.textContent = type === 'newsletter' ? 'You’re on the list.' : 'Thanks — your submission was sent.'; message.className = 'form-status success'; } }).catch(function () { if (message) { message.textContent = 'We could not send that right now. Please try again later.'; message.className = 'form-status error'; } });
      });
    });
  });
}());
