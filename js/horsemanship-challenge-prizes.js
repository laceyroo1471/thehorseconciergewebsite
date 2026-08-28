/**
 * horsemanship-challenge-prizes.html — Prize Hub (members only).
 * Same auth gate as the Challenge Hub. Weekly prize details drip on each Monday.
 *
 * Partner / internal preview (skips sign-in; does not reveal locked packs):
 *   #preview=thc-hc-preview-2026
 * Simulate a date (hash survives the static-server .html redirect):
 *   #preview=thc-hc-preview-2026&asOf=2026-11-23
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var PREVIEW_KEY = 'thc-hc-preview-2026';
  var PREVIEW_STORAGE_KEY = 'thcChallengeWeekPreview';

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var loadingEl = document.getElementById('challenge-hub-loading');
  var deniedEl = document.getElementById('challenge-hub-denied');
  var mainEl = document.getElementById('challenge-hub-main');
  var nameEm = document.getElementById('challenge-hub-name-em');

  function hasPreviewAccess() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('preview');
      if (q && q === PREVIEW_KEY) {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, PREVIEW_KEY);
        return true;
      }
      var hash = String(window.location.hash || '').replace(/^#/, '');
      if (
        hash === PREVIEW_KEY ||
        hash === 'preview=' + PREVIEW_KEY ||
        hash.indexOf('preview=' + PREVIEW_KEY) === 0
      ) {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, PREVIEW_KEY);
        return true;
      }
      return sessionStorage.getItem(PREVIEW_STORAGE_KEY) === PREVIEW_KEY;
    } catch (e) {
      return false;
    }
  }

  var previewAccess = hasPreviewAccess();

  if (typeof firebase === 'undefined' && !previewAccess) {
    if (loadingEl) loadingEl.hidden = true;
    if (deniedEl) deniedEl.hidden = false;
    return;
  }

  var auth = null;
  var db = null;
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
  }

  function showDenied() {
    if (loadingEl) loadingEl.hidden = true;
    if (mainEl) mainEl.hidden = true;
    if (deniedEl) deniedEl.hidden = false;
  }

  function parseYmdLocal(ymd) {
    var parts = String(ymd || '').split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function startOfToday() {
    var params = new URLSearchParams(window.location.search);
    var hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
    var asOf =
      params.get('asOf') ||
      params.get('previewDate') ||
      hashParams.get('asOf') ||
      hashParams.get('previewDate');
    var simulated = asOf ? parseYmdLocal(asOf) : null;
    if (simulated) return simulated;
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  var CHALLENGE_END = parseYmdLocal('2026-11-30');

  function unlockPrizeCards() {
    var grid = document.getElementById('challenge-prize-grid');
    if (!grid) return;

    var today = startOfToday();
    var cards = grid.querySelectorAll('.prize-week-card[data-week-start]');

    cards.forEach(function (card) {
      var start = parseYmdLocal(card.getAttribute('data-week-start'));
      var end = parseYmdLocal(card.getAttribute('data-week-end'));
      var label = card.getAttribute('data-week-label') || '';
      var statusEl = card.querySelector('.prize-week-card__status');
      var packEl = card.querySelector('.prize-week-card__pack');
      if (!start || !end) return;

      var isOpen =
        today.getTime() >= start.getTime() &&
        (!CHALLENGE_END || today.getTime() <= CHALLENGE_END.getTime());
      var isLive = isOpen && today.getTime() <= end.getTime();

      card.classList.toggle('prize-week-card--locked', !isOpen);
      card.classList.toggle('prize-week-card--open', isOpen);
      card.classList.toggle('prize-week-card--live', isLive);

      if (packEl) packEl.hidden = !isOpen;

      if (statusEl) {
        if (!isOpen) {
          statusEl.textContent = 'Coming ' + label;
        } else if (isLive) {
          statusEl.textContent = 'This week’s prize';
        } else {
          statusEl.textContent = 'This week’s prize';
        }
      }
    });
  }

  function showHub(registration) {
    if (loadingEl) loadingEl.hidden = true;
    if (deniedEl) deniedEl.hidden = true;
    if (mainEl) mainEl.hidden = false;
    if (nameEm) {
      var name = (registration && registration.name) || '';
      nameEm.textContent = name ? ', ' + name.split(' ')[0] : '';
    }
    unlockPrizeCards();
  }

  function loadRegistration(uid) {
    return db
      .collection('challengeRegistrations')
      .doc(uid)
      .get()
      .then(function (snap) {
        if (!snap.exists) return null;
        var data = snap.data() || {};
        if (data.challengeId && data.challengeId !== CHALLENGE_ID) return null;
        if (data.status === 'inactive') return null;
        return data;
      });
  }

  if (previewAccess) {
    showHub({ name: 'Preview' });
    var hash = String(window.location.hash || '');
    if (
      hash.indexOf(PREVIEW_KEY) !== -1 &&
      hash.indexOf('asOf=') === -1 &&
      history.replaceState
    ) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  if (auth) {
    auth.onAuthStateChanged(function (user) {
      if (previewAccess) return;
      if (!user) {
        showDenied();
        return;
      }
      loadRegistration(user.uid)
        .then(function (registration) {
          if (registration) {
            showHub(registration);
          } else {
            showDenied();
          }
        })
        .catch(function (err) {
          console.warn(err);
          showDenied();
        });
    });
  } else if (!previewAccess) {
    showDenied();
  }
})();
