/**
 * find-providers.html — live directory search (category + ZIP + radius).
 */
(function () {
  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var form = document.getElementById('find-providers-form');
  var categorySelect = document.getElementById('search-category');
  var nameInput = document.getElementById('search-name');
  var zipInput = document.getElementById('search-zip');
  var radiusSelect = document.getElementById('search-radius');
  var statusEl = document.getElementById('find-providers-status');
  var resultsEl = document.getElementById('find-providers-results');
  var sampleBlock = document.getElementById('find-providers-sample');
  var samplePill = document.getElementById('find-providers-sample-pill');

  if (!form || typeof firebase === 'undefined' || !window.ThcProviderLocation) return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();

  var Loc = window.ThcProviderLocation;
  var categoryLabelMap = {};
  var providersCache = null;

  function setStatus(msg, isError) {
    if (!statusEl) return;
    statusEl.textContent = msg || '';
    statusEl.hidden = !msg;
    statusEl.className = 'find-providers-status' + (isError ? ' find-providers-status--error' : '');
  }

  function loadCategories() {
    return db
      .collection('metadata')
      .doc('serviceCatagories')
      .get()
      .then(function (snap) {
        if (!snap.exists || !categorySelect) return;
        var categories = snap.data().categories || [];
        categories
          .filter(function (c) {
            return c && c.label && String(c.label).trim();
          })
          .sort(function (a, b) {
            return a.label.localeCompare(b.label);
          })
          .forEach(function (cat) {
            categoryLabelMap[cat.value] = cat.label;
            var opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = cat.label;
            categorySelect.appendChild(opt);
          });
      })
      .catch(function (err) {
        console.error('Categories load failed:', err);
      });
  }

  function loadProviders() {
    if (providersCache) return Promise.resolve(providersCache);
    return db
      .collection('providers')
      .get()
      .then(function (snap) {
        providersCache = snap.docs
          .map(function (doc) {
            var data = doc.data();
            return Object.assign({ id: doc.id }, data);
          })
          .filter(function (p) {
            return p.visibleInDirectory !== false && p.slug;
          });
        return providersCache;
      });
  }

  function geocodeZip(zip) {
    return fetch('/api/geocode?zip=' + encodeURIComponent(zip))
      .then(function (res) {
        if (res.ok) return res.json();
        return geocodeZipDirect(zip);
      })
      .catch(function () {
        return geocodeZipDirect(zip);
      });
  }

  function geocodeZipDirect(zip) {
    var url =
      'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(zip) +
      '&countrycodes=us&limit=1';
    return fetch(url, {
      headers: { 'User-Agent': 'THC-Website/1.0' },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Geocode failed');
        return res.json();
      })
      .then(function (data) {
        if (!data.length) throw new Error('ZIP not found');
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      });
  }

  function renderResults(providers, searchCenter, emptyMessage) {
    if (!resultsEl) return;
    if (sampleBlock) sampleBlock.hidden = true;
    if (samplePill) samplePill.hidden = true;

    if (window.ThcFindProvidersMap) {
      window.ThcFindProvidersMap.destroy();
    }

    if (!providers.length) {
      resultsEl.innerHTML =
        '<p class="body-text find-providers-empty">' +
        escapeHtml(emptyMessage || 'No providers matched your search. Try a wider radius, different category, or another name.') +
        '</p>';
      return;
    }

    var listProviders = providers.slice(0, 50);
    var mappableCount = listProviders.filter(function (p) {
      return window.ThcFindProvidersMap && window.ThcFindProvidersMap.hasValidCoords(p);
    }).length;

    var mapSection = '';
    if (mappableCount > 0) {
      mapSection =
        '<div class="find-providers-map-section">' +
        '<p class="find-providers-map-label">Map</p>' +
        '<div id="find-providers-map" class="find-providers-map" aria-label="Map of search results"></div>';
      if (mappableCount < listProviders.length) {
        mapSection +=
          '<p class="find-providers-map-note">' +
          mappableCount +
          ' of ' +
          listProviders.length +
          ' results shown on the map (others have no location on file).</p>';
      }
      mapSection += '</div>';
    }

    var html = listProviders
      .map(function (p) {
        var name = Loc.pickBusinessName(p);
        var cat = Loc.categoryLabel(Loc.pickCategory(p), categoryLabelMap);
        var loc = Loc.pickCityState(p);
        var metaParts = [cat];
        if (loc) metaParts.push(loc);
        if (p.distance != null) metaParts.push(p.distance + ' mi');
        var meta = metaParts.join(' · ');

        var stats = Loc.pickRatingStats(p);
        var ratingHtml;
        if (stats.count > 0 && stats.avg > 0) {
          var reviewLabel = stats.count === 1 ? 'review' : 'reviews';
          ratingHtml =
            '<div class="provider-result-rating">' +
            '<div class="provider-result-rating__stars" aria-hidden="true">' +
            Loc.renderStarGlyphs(stats.avg) +
            '</div>' +
            '<p class="provider-result-rating__text">' +
            '<span class="provider-result-rating__avg">' +
            stats.avg.toFixed(1) +
            '</span> ⭐ (' +
            stats.count +
            ' ' +
            reviewLabel +
            ')</p></div>';
        } else {
          ratingHtml =
            '<div class="provider-result-rating provider-result-rating--empty">' +
            '<p class="provider-result-rating__text">No ratings yet</p></div>';
        }

        var href = '/providers/' + encodeURIComponent(p.slug);
        return (
          '<a class="funnel-teaser-card funnel-teaser-card--link provider-result-card" href="' +
          href +
          '">' +
          '<div class="funnel-teaser-name">' +
          escapeHtml(name) +
          '</div>' +
          '<div class="funnel-teaser-meta">' +
          escapeHtml(meta) +
          '</div>' +
          ratingHtml +
          '</a>'
        );
      })
      .join('');

    resultsEl.innerHTML =
      mapSection +
      '<div class="funnel-placeholder-grid find-providers-results-grid" aria-label="Search results">' +
      html +
      '</div>';
    if (providers.length > 50) {
      resultsEl.innerHTML +=
        '<p class="funnel-panel-note">Showing 50 of ' +
        providers.length +
        ' results. Refine your search or use the app for more filters.</p>';
    }

    if (mapSection && window.ThcFindProvidersMap) {
      var mapEl = document.getElementById('find-providers-map');
      window.ThcFindProvidersMap.render(mapEl, {
        center: searchCenter,
        providers: listProviders,
        pickName: function (p) {
          return Loc.pickBusinessName(p);
        },
      });
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function runSearch(e) {
    if (e) e.preventDefault();

    var category = categorySelect ? categorySelect.value : '';
    var keyword = nameInput ? nameInput.value.trim() : '';
    var zip = zipInput ? zipInput.value.trim().replace(/\D/g, '') : '';
    var radius = radiusSelect ? parseInt(radiusSelect.value, 10) : 50;
    var hasKeyword = keyword.length > 0;
    var hasZip = /^\d{5}$/.test(zip);

    if (!hasKeyword && !hasZip) {
      setStatus('Enter a provider name or a 5-digit ZIP code to search.', true);
      return;
    }

    if (hasZip && !hasKeyword && !/^\d{5}$/.test(zip)) {
      setStatus('Please enter a valid 5-digit ZIP code.', true);
      return;
    }

    setStatus('Searching…');
    if (resultsEl) resultsEl.innerHTML = '';

    if (hasKeyword) {
      loadProviders()
        .then(function (allProviders) {
          var filtered = Loc.filterProvidersByKeyword(allProviders, keyword);
          if (category) {
            filtered = filtered.filter(function (p) {
              return Loc.pickCategory(p) === category;
            });
          }
          filtered = Loc.sortProvidersByTier(filtered);
          if (filtered.length) {
            setStatus(
              filtered.length +
                ' provider(s) matching "' +
                keyword +
                '"'
            );
          } else {
            setStatus('');
          }
          renderResults(
            filtered,
            null,
            'No providers found matching "' + keyword + '". Try a different spelling or search term.'
          );
        })
        .catch(function (err) {
          console.error(err);
          setStatus('Search failed. Please try again.', true);
        });
      return;
    }

    Promise.all([loadProviders(), geocodeZip(zip)])
      .then(function (pair) {
        var allProviders = pair[0];
        var coords = pair[1];

        var local = allProviders.filter(function (p) {
          return !Loc.isNational(p);
        });
        var national = allProviders.filter(function (p) {
          return Loc.isNational(p);
        });

        var filtered = Loc.filterProvidersByDistance(
          local,
          coords.latitude,
          coords.longitude,
          radius
        );

        if (category) {
          filtered = filtered.filter(function (p) {
            return Loc.pickCategory(p) === category;
          });
          var nationalFiltered = national.filter(function (p) {
            return Loc.pickCategory(p) === category;
          });
          filtered = filtered.concat(nationalFiltered);
        } else {
          filtered = filtered.concat(national);
        }

        filtered = Loc.sortProvidersByTier(filtered);
        setStatus(filtered.length ? filtered.length + ' provider(s) found' : '');
        renderResults(filtered, coords);
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Search failed. Check your ZIP and try again.', true);
      });
  }

  function applyQueryParams() {
    var params = new URLSearchParams(window.location.search);
    var keyword =
      params.get('q') || params.get('name') || params.get('keyword') || '';
    var zip = (params.get('zip') || '').replace(/\D/g, '');
    var category = params.get('category') || '';
    if (nameInput && keyword) nameInput.value = keyword;
    if (zipInput && /^\d{5}$/.test(zip)) zipInput.value = zip;
    if (categorySelect && category) categorySelect.value = category;
    if (keyword || /^\d{5}$/.test(zip)) runSearch();
  }

  form.addEventListener('submit', runSearch);
  loadCategories().then(applyQueryParams);
})();
