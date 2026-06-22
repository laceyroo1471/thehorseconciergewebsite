/**
 * Star-only provider ratings for the web (mirrors app StarRating with allowComments=false).
 * Written reviews require the mobile app + care team membership.
 */
(function (root) {
  var DEVICE_KEY = 'thc_device_id';
  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (id) return id;
      id =
        'device_' +
        Date.now() +
        '_' +
        Math.random().toString(36).substr(2, 9);
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    } catch (e) {
      return (
        'device_' +
        Date.now() +
        '_' +
        Math.random().toString(36).substr(2, 9)
      );
    }
  }

  function ensureFirebase() {
    if (typeof firebase === 'undefined') return null;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.firestore();
  }

  function renderSummaryHtml(avg, count) {
    if (count > 0 && avg > 0) {
      var full = Math.round(avg);
      var stars =
        '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
      var reviewLabel = count === 1 ? 'review' : 'reviews';
      return (
        '<span class="provider-rating-stars" aria-hidden="true">' +
        stars +
        '</span>' +
        '<span class="provider-detail-rating__text">' +
        avg.toFixed(1) +
        ' · ' +
        count +
        ' ' +
        reviewLabel +
        '</span>'
      );
    }
    return (
      '<span class="provider-detail-rating__text">No ratings yet</span>'
    );
  }

  function updateSummary(el, avg, count) {
    if (!el) return;
    el.innerHTML = renderSummaryHtml(avg, count);
    el.classList.toggle(
      'provider-detail-rating--empty',
      !(count > 0 && avg > 0)
    );
  }

  function recalculateAndUpdateProvider(db, providerId) {
    return db
      .collection('ratings')
      .where('providerId', '==', providerId)
      .get()
      .then(function (snap) {
        var total = 0;
        var count = 0;
        snap.forEach(function (doc) {
          var data = doc.data();
          if (data.rating) {
            total += data.rating;
            count++;
          }
        });
        var avg =
          count > 0 ? Math.round((total / count) * 10) / 10 : 0;
        return db
          .collection('providers')
          .doc(providerId)
          .set(
            {
              ratingsAverage: avg,
              numberOfRatings: count,
            },
            { merge: true }
          )
          .then(function () {
            return { avg: avg, count: count };
          });
      });
  }

  function buildStarButtons(userRating, disabled) {
    var html =
      '<div class="provider-star-input__stars" role="group" aria-label="Your rating">';
    for (var s = 1; s <= 5; s++) {
      var filled = s <= userRating;
      html +=
        '<button type="button" class="provider-star-btn' +
        (filled ? ' provider-star-btn--filled' : '') +
        '" data-star="' +
        s +
        '" aria-label="' +
        s +
        ' out of 5 stars"' +
        (disabled ? ' disabled' : '') +
        '>' +
        (filled ? '★' : '☆') +
        '</button>';
    }
    html += '</div>';
    return html;
  }

  function init(options) {
    var container =
      options.container ||
      document.getElementById('provider-rating-widget');
    if (!container || !options.providerId) return;

    var db = ensureFirebase();
    if (!db) return;

    var providerId = options.providerId;
    var providerName = options.providerName || 'Provider';
    var summaryEl =
      options.summaryEl ||
      document.getElementById('provider-rating-summary');
    var starHost =
      container.querySelector('#provider-star-input') || container;
    var statusEl = container.querySelector('#provider-rating-status');
    var userRating = 0;
    var isLoading = false;

    function setStatus(msg, isError) {
      if (!statusEl) return;
      statusEl.textContent = msg || '';
      statusEl.hidden = !msg;
      statusEl.classList.toggle(
        'provider-rating-widget__status--error',
        !!isError
      );
    }

    function paintStars() {
      starHost.innerHTML = buildStarButtons(userRating, isLoading);
    }

    function loadExistingRating() {
      var deviceId = getDeviceId();
      var docId = providerId + '_' + deviceId;
      return db
        .collection('ratings')
        .doc(docId)
        .get()
        .then(function (doc) {
          if (doc.exists && doc.data().rating) {
            userRating = doc.data().rating;
            try {
              localStorage.setItem(
                'rating_' + providerId,
                String(userRating)
              );
            } catch (e) {}
          } else {
            try {
              var saved = localStorage.getItem('rating_' + providerId);
              if (saved) userRating = parseInt(saved, 10) || 0;
            } catch (e2) {}
          }
          paintStars();
        })
        .catch(function () {
          paintStars();
        });
    }

    function submitRating(stars) {
      if (isLoading || stars < 1 || stars > 5) return;
      isLoading = true;
      setStatus('Saving your rating…');
      paintStars();

      var deviceId = getDeviceId();
      var docId = providerId + '_' + deviceId;
      var ratingData = {
        providerId: providerId,
        providerName: providerName,
        deviceId: deviceId,
        rating: stars,
        timestamp: new Date(),
        isAuthenticated: false,
      };

      db.collection('ratings')
        .doc(docId)
        .set(ratingData)
        .then(function () {
          try {
            localStorage.setItem('rating_' + providerId, String(stars));
          } catch (e) {}
          userRating = stars;
          return recalculateAndUpdateProvider(db, providerId);
        })
        .then(function (stats) {
          updateSummary(summaryEl, stats.avg, stats.count);
          setStatus('Thanks — your rating was saved.');
          paintStars();
        })
        .catch(function (err) {
          console.error(err);
          setStatus('Could not save your rating. Please try again.', true);
          paintStars();
        })
        .finally(function () {
          isLoading = false;
          paintStars();
        });
    }

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.provider-star-btn');
      if (!btn || isLoading) return;
      submitRating(parseInt(btn.getAttribute('data-star'), 10));
    });

    paintStars();
    loadExistingRating();
  }

  function renderSectionHtml(avg, count) {
    var hasRatings = count > 0 && avg > 0;
    var emptyClass = hasRatings ? '' : ' provider-detail-rating--empty';
    return (
      '<div class="provider-detail-rating' +
      emptyClass +
      '" id="provider-rating-summary">' +
      renderSummaryHtml(avg, count) +
      '</div>' +
      '<section class="provider-rating-widget" id="provider-rating-widget" aria-label="Rate this provider">' +
      '<h2 class="provider-rating-widget__heading">Rate this provider</h2>' +
      '<div class="provider-star-input" id="provider-star-input"></div>' +
      '<p class="provider-rating-widget__status" id="provider-rating-status" hidden></p>' +
      '<p class="provider-rating-widget__review-note">' +
      'Written reviews are only available in The Horse Concierge app. Add this provider to your horse\u2019s care team first, then leave your review from the app — we only accept written reviews from owners who use the provider.' +
      '</p></section>'
    );
  }

  root.ThcProviderStarRating = {
    init: init,
    renderSummaryHtml: renderSummaryHtml,
    renderSectionHtml: renderSectionHtml,
  };
})(typeof window !== 'undefined' ? window : globalThis);
