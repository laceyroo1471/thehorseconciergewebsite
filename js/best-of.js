/**
 * best-of.html — provider profile lookup and share-link copy for Best of contest.
 */
(function () {
  var SITE_ORIGIN = 'https://www.thehorseconcierge.com';

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var form = document.getElementById('best-of-lookup-form');
  var nameInput = document.getElementById('best-of-name');
  var statusEl = document.getElementById('best-of-lookup-status');
  var resultsEl = document.getElementById('best-of-lookup-results');

  if (!form || typeof firebase === 'undefined') return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var Loc = window.ThcProviderLocation;
  var providersCache = null;

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.hidden = !msg;
    statusEl.className = 'find-providers-status' + (isError ? ' find-providers-status--error' : '');
  }

  function pickField(data, keys) {
    for (var i = 0; i < keys.length; i++) {
      var val = data[keys[i]];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  }

  function loadProviders() {
    if (providersCache) return Promise.resolve(providersCache);
    return db
      .collection('providers')
      .get()
      .then(function (snap) {
        providersCache = snap.docs
          .map(function (doc) {
            return Object.assign({ id: doc.id }, doc.data());
          })
          .filter(function (p) {
            return p.visibleInDirectory !== false && p.slug;
          });
        return providersCache;
      });
  }

  function normalizeQuery(q) {
    return String(q || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function matchScore(provider, query) {
    var name = normalizeQuery(
      pickField(provider, ['businessName', 'Business Name'])
    );
    if (!name) return 0;
    if (name === query) return 100;
    if (name.indexOf(query) === 0) return 80;
    if (name.indexOf(query) !== -1) return 60;
    var parts = query.split(' ');
    var hits = parts.filter(function (p) {
      return p.length > 1 && name.indexOf(p) !== -1;
    }).length;
    if (hits === 0) return 0;
    return 30 + hits * 10;
  }

  function searchProviders(query) {
    var normalized = normalizeQuery(query);
    if (!normalized) return Promise.resolve([]);
    return loadProviders().then(function (providers) {
      return providers
        .map(function (p) {
          return { provider: p, score: matchScore(p, normalized) };
        })
        .filter(function (row) {
          return row.score > 0;
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 8)
        .map(function (row) {
          return row.provider;
        });
    });
  }

  function profileUrl(slug) {
    return SITE_ORIGIN + '/providers/' + encodeURIComponent(slug);
  }

  function shareText(name, url) {
    return (
      'Vote for ' +
      name +
      ' in Best of The Horse Concierge 2026! Leave a star rating (1 point) or written review in the app (5 points) on their profile: ' +
      url
    );
  }

  function copyText(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        if (btn) {
          var original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () {
            btn.textContent = original;
          }, 2000);
        }
      });
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (btn) btn.textContent = 'Copied!';
    } catch (_) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function renderResult(provider) {
    var businessName =
      pickField(provider, ['businessName', 'Business Name']) || 'Provider';
    var categoryLabel =
      provider.seoCategoryLabel ||
      (Loc
        ? Loc.categoryLabel(
            pickField(provider, [
              'serviceCategory',
              'servicesCategory',
              'Services Category',
            ]),
            {}
          )
        : 'Equine Professional');
    var city = pickField(provider, ['city', 'City']);
    var state = provider.seoStateCode || pickField(provider, ['state', 'State']);
    var locationLine = [city, state].filter(Boolean).join(', ');
    var url = profileUrl(provider.slug);
    var text = shareText(businessName, url);

    return (
      '<div class="best-of-profile-result">' +
      '<div class="best-of-profile-result__head">' +
      '<div>' +
      '<div class="best-of-profile-result__name">' +
      escapeHtml(businessName) +
      '</div>' +
      '<div class="best-of-profile-result__meta">' +
      escapeHtml(categoryLabel) +
      (locationLine ? ' · ' + escapeHtml(locationLine) : '') +
      '</div>' +
      '</div>' +
      '<a class="btn-ghost best-of-profile-result__view" href="' +
      escapeHtml(url) +
      '" target="_blank" rel="noopener noreferrer">View profile</a>' +
      '</div>' +
      '<label class="form-label best-of-profile-result__label">Your profile link</label>' +
      '<div class="best-of-share-row">' +
      '<input class="form-input best-of-share-input" type="text" readonly value="' +
      escapeHtml(url) +
      '">' +
      '<button type="button" class="btn-primary best-of-copy-btn" data-copy="' +
      escapeHtml(url) +
      '">Copy link</button>' +
      '</div>' +
      '<label class="form-label best-of-profile-result__label">Suggested share text</label>' +
      '<div class="best-of-share-row best-of-share-row--stack">' +
      '<textarea class="form-input form-textarea best-of-share-text" readonly rows="3">' +
      escapeHtml(text) +
      '</textarea>' +
      '<button type="button" class="btn-ghost best-of-copy-btn best-of-copy-btn--text">Copy text</button>' +
      '</div>' +
      '</div>'
    );
  }

  function bindCopyButtons() {
    if (!resultsEl) return;
    resultsEl.querySelectorAll('.best-of-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (!text && btn.classList.contains('best-of-copy-btn--text')) {
          var ta = btn.closest('.best-of-share-row');
          text = ta ? ta.querySelector('.best-of-share-text').value : '';
        }
        copyText(text || '', btn);
      });
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var query = nameInput ? nameInput.value.trim() : '';
    if (!query) {
      setStatus('Enter a business name to search.', true);
      return;
    }

    setStatus('Searching…');
    if (resultsEl) {
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
    }

    searchProviders(query)
      .then(function (matches) {
        if (!matches.length) {
          setStatus(
            'No matching listings found. Try a shorter name, or list your services if you are not in the directory yet.',
            true
          );
          return;
        }
        setStatus(
          matches.length === 1
            ? 'Found your listing — copy your link below.'
            : 'Found ' + matches.length + ' possible matches — select yours.'
        );
        if (resultsEl) {
          resultsEl.innerHTML = matches.map(renderResult).join('');
          resultsEl.hidden = false;
          bindCopyButtons();
        }
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Search failed. Check your connection and try again.', true);
      });
  });

  var params = new URLSearchParams(window.location.search);
  var prefill = params.get('q') || params.get('name');
  if (prefill && nameInput) {
    nameInput.value = prefill;
  }
})();
