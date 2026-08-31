/**
 * horsemanship-challenge-hub.html — Challenge Hub (members only).
 * Requires Firebase Auth + challengeRegistrations/{uid}.
 */
(function () {
  var FB_GROUP_URL = 'https://www.facebook.com/groups/1388463146804189';
  var DOOR_URL = 'horsemanship-challenge.html#register';
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
  var pointsEl = document.getElementById('challenge-hub-points');
  var registrationUnsub = null;
  var fbLinks = [
    document.getElementById('challenge-hub-fb'),
    document.getElementById('challenge-hub-fb-cta'),
  ];

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

  function hasFbGroupUrl() {
    return typeof FB_GROUP_URL === 'string' && /^https?:\/\/.+/i.test(FB_GROUP_URL.trim());
  }

  function wireFb() {
    fbLinks.forEach(function (link) {
      if (!link) return;
      if (hasFbGroupUrl()) {
        link.href = FB_GROUP_URL.trim();
        link.hidden = false;
      } else {
        link.href = '#';
        link.addEventListener('click', function (e) {
          e.preventDefault();
          alert('The Facebook Group link will be added here shortly.');
        });
      }
    });
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

  /** Weeks stay open for catch-up through the end of the challenge. */
  var CHALLENGE_END = parseYmdLocal('2026-11-30');

  function cleanScheduleLabel(label) {
    return String(label || '').replace(/^(Opens|Reveals)\s+/i, '');
  }

  function setCardStatus(card, kind, isOpen, isLive, href, label) {
    var statusEl = card.querySelector('.challenge-week-card__status');
    if (!statusEl) return;
    var cleanLabel = cleanScheduleLabel(label);
    if (kind === 'prize') {
      if (!isOpen) {
        statusEl.textContent = 'Reveals ' + cleanLabel;
      } else if (isLive) {
        statusEl.textContent = href
          ? 'Open now — click to see this week’s pack · ' + cleanLabel
          : 'Open now · ' + cleanLabel;
      } else {
        statusEl.textContent = href
          ? 'Available — click to see this week’s pack · ' + cleanLabel
          : 'Available through Nov 30 · ' + cleanLabel;
      }
      return;
    }
    if (!isOpen) {
      statusEl.textContent = 'Opens ' + cleanLabel;
    } else if (isLive) {
      statusEl.textContent = href
        ? 'Open now — click to enter · ' + cleanLabel
        : 'Open now · ' + cleanLabel;
    } else {
      statusEl.textContent = href
        ? 'Available — click to catch up · ' + cleanLabel
        : 'Available through Nov 30 · ' + cleanLabel;
    }
  }

  function applyPrizeReveal(card, isOpen) {
    var themeEl = card.querySelector('.challenge-week-card__theme');
    var prizeName = (card.getAttribute('data-prize-name') || '').trim();
    if (themeEl) {
      themeEl.textContent = isOpen && prizeName
        ? prizeName
        : (themeEl.getAttribute('data-locked-label') || 'Prize pack');
    }

    var visual = card.querySelector('.challenge-prize-card__visual');
    var imageSrc = (card.getAttribute('data-prize-image') || '').trim();
    if (!visual) return;
    if (isOpen && imageSrc) {
      if (!visual.querySelector('img')) {
        var img = document.createElement('img');
        img.src = imageSrc;
        img.alt = card.getAttribute('data-prize-image-alt') || prizeName || 'This week’s prize pack';
        img.width = 400;
        img.height = 500;
        img.loading = 'lazy';
        visual.appendChild(img);
      }
      visual.hidden = false;
    } else {
      visual.hidden = true;
    }
  }

  function promoteOrDemoteCard(card, isOpen, href) {
    if (isOpen && href) {
      if (card.tagName !== 'A') {
        var link = document.createElement('a');
        link.className = card.className;
        link.href = href;
        for (var i = 0; i < card.attributes.length; i++) {
          var attr = card.attributes[i];
          if (attr.name === 'class') continue;
          link.setAttribute(attr.name, attr.value);
        }
        while (card.firstChild) link.appendChild(card.firstChild);
        card.parentNode.replaceChild(link, card);
        return link;
      }
      card.setAttribute('href', href);
      return card;
    }
    if (card.tagName === 'A') {
      var div = document.createElement('div');
      div.className = card.className.replace(/\bchallenge-week-card--link\b/g, '').trim();
      for (var j = 0; j < card.attributes.length; j++) {
        var a = card.attributes[j];
        if (a.name === 'class' || a.name === 'href') continue;
        div.setAttribute(a.name, a.value);
      }
      while (card.firstChild) div.appendChild(card.firstChild);
      card.parentNode.replaceChild(div, card);
      return div;
    }
    return card;
  }

  function unlockScheduleCards(gridId, kind) {
    var grid = document.getElementById(gridId);
    if (!grid) return;

    var today = startOfToday();
    var cards = grid.querySelectorAll('.challenge-week-card[data-week-start]');

    cards.forEach(function (card) {
      var start = parseYmdLocal(card.getAttribute('data-week-start'));
      var end = parseYmdLocal(card.getAttribute('data-week-end'));
      var href = (card.getAttribute('data-week-href') || '').trim();
      var label = card.getAttribute('data-week-label') || '';
      if (!start || !end) return;

      var isOpen = today.getTime() >= start.getTime() && (!CHALLENGE_END || today.getTime() <= CHALLENGE_END.getTime());
      var isLive = isOpen && today.getTime() <= end.getTime();

      card.classList.toggle('challenge-week-card--locked', !isOpen);
      card.classList.toggle('challenge-week-card--open', isOpen);
      card.classList.toggle('challenge-week-card--live', isLive);
      card.classList.toggle('challenge-week-card--link', isOpen && !!href);
      if (kind === 'prize') {
        card.classList.toggle('challenge-prize-card--locked', !isOpen);
        card.classList.toggle('challenge-prize-card--open', isOpen);
      }

      if (kind === 'prize') applyPrizeReveal(card, isOpen);
      setCardStatus(card, kind, isOpen, isLive, href, label);
      promoteOrDemoteCard(card, isOpen, href);
    });
  }

  function unlockWeekCards() {
    unlockScheduleCards('challenge-week-grid', 'week');
    unlockScheduleCards('challenge-prize-grid', 'prize');
  }

  function showHub(registration) {
    if (loadingEl) loadingEl.hidden = true;
    if (deniedEl) deniedEl.hidden = true;
    if (mainEl) mainEl.hidden = false;
    if (nameEm) {
      var name = (registration && registration.name) || '';
      nameEm.textContent = name ? ', ' + name.split(' ')[0] : '';
    }
    if (pointsEl) {
      if (previewAccess) {
        pointsEl.hidden = true;
      } else {
        var total = Number(registration && registration.pointsTotal) || 0;
        pointsEl.hidden = false;
        var label = total === 1 ? '1 point so far' : total + ' points so far';
        pointsEl.innerHTML =
          label + '<span class="challenge-hub-points__meta">Your Challenge score</span>';
      }
    }
    wireFb();
    unlockWeekCards();
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
    if (String(window.location.hash || '').indexOf(PREVIEW_KEY) !== -1) {
      if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#prizes');
      }
      var prizesEl = document.getElementById('prizes');
      if (prizesEl) prizesEl.scrollIntoView();
    }
  }

  if (auth) {
    auth.onAuthStateChanged(function (user) {
      if (registrationUnsub) {
        registrationUnsub();
        registrationUnsub = null;
      }
      if (previewAccess) return;
      if (!user) {
        showDenied();
        return;
      }
      registrationUnsub = db
        .collection('challengeRegistrations')
        .doc(user.uid)
        .onSnapshot(
          function (snap) {
            if (!snap.exists) {
              showDenied();
              return;
            }
            var data = snap.data() || {};
            if (data.challengeId && data.challengeId !== CHALLENGE_ID) {
              showDenied();
              return;
            }
            if (data.status === 'inactive') {
              showDenied();
              return;
            }
            showHub(data);
          },
          function (err) {
            console.warn(err);
            loadRegistration(user.uid)
              .then(function (registration) {
                if (registration) {
                  showHub(registration);
                } else {
                  showDenied();
                }
              })
              .catch(function () {
                showDenied();
              });
          }
        );
    });
  } else if (!previewAccess) {
    showDenied();
  }
})();
