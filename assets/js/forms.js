(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[data-form-type]').forEach(function (form) {
      if (form.dataset.bound) return; form.dataset.bound = 'true';
      form.addEventListener('submit', function (event) {
        event.preventDefault(); var type = form.dataset.formType, message = form.querySelector('[data-form-message]'), endpoint = window.NENews && window.NENews.CONFIG.forms ? window.NENews.CONFIG.forms[type] : '', honey = form.querySelector('[name="_honey"]');
        if (honey && honey.value) return;
        if (!endpoint && type === 'sponsorship') {
          var email = window.NENews && window.NENews.CONFIG.sponsorshipEmail;
          if (email) {
            var fields = Array.from(new FormData(form).entries()).filter(function (entry) { return entry[0] !== '_honey' && entry[1]; });
            var body = fields.map(function (entry) { return entry[0].replace(/_/g, ' ') + ': ' + entry[1]; }).join('\n');
            var business = form.elements.business ? form.elements.business.value.trim() : '';
            window.location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('NorthEast News sponsorship inquiry' + (business ? ' — ' + business : '')) + '&body=' + encodeURIComponent(body);
            if (message) { message.textContent = 'Your email app should open with the inquiry. Please send the message there to complete it.'; message.className = 'form-status'; }
            return;
          }
        }
        if (!endpoint) { if (message) { message.textContent = type === 'newsletter' ? 'Newsletter signup is not active yet; your email was not stored.' : 'This form is ready, but delivery has not been connected yet.'; message.className = 'form-status'; } return; }
        if (message) { message.textContent = 'Sending…'; message.className = 'form-status'; }
        var payload = {}; Array.from(new FormData(form).entries()).forEach(function (entry) { if (entry[0] !== '_honey') payload[entry[0]] = entry[1]; });
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) }).then(function (response) { if (!response.ok) throw new Error('Unable to submit'); form.reset(); if (message) { message.textContent = type === 'newsletter' ? 'You’re on the list.' : 'Thanks — your submission was sent.'; message.className = 'form-status success'; } }).catch(function () { if (message) { message.textContent = 'We could not send that right now. Please try again later.'; message.className = 'form-status error'; } });
      });
    });
  });
}());
