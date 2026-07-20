/**
 * horsemanship-challenge-hub.html — Challenge Hub (members only).
 * Requires Firebase Auth + challengeRegistrations/{uid}.
 */
(function () {
  var FB_GROUP_URL = 'https://www.facebook.com/groups/1048920771114090/';
  var DOOR_URL = 'horsemanship-challenge.html#register';
  var CHALLENGE_ID = 'horsemanship-2026';

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
  var fbLinks = [
    document.getElementById('challenge-hub-fb'),
    document.getElementById('challenge-hub-fb-cta'),
  ];

  if (typeof firebase === 'undefined') {
    if (loadingEl) loadingEl.hidden = true;
    if (deniedEl) deniedEl.hidden = false;
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

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
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /** Weeks stay open for catch-up through the end of the challenge. */
  var CHALLENGE_END = parseYmdLocal('2026-11-30');

  function unlockWeekCards() {
    var grid = document.getElementById('challenge-week-grid');
    if (!grid) return;

    var today = startOfToday();
    var cards = grid.querySelectorAll('.challenge-week-card[data-week-start]');

    cards.forEach(function (card) {
      var start = parseYmdLocal(card.getAttribute('data-week-start'));
      var end = parseYmdLocal(card.getAttribute('data-week-end'));
      var href = (card.getAttribute('data-week-href') || '').trim();
      var label = card.getAttribute('data-week-label') || '';
      var statusEl = card.querySelector('.challenge-week-card__status');
      if (!start || !end) return;

      var isOpen = today.getTime() >= start.getTime() && (!CHALLENGE_END || today.getTime() <= CHALLENGE_END.getTime());
      var isLive = isOpen && today.getTime() <= end.getTime();

      card.classList.toggle('challenge-week-card--locked', !isOpen);
      card.classList.toggle('challenge-week-card--open', isOpen);
      card.classList.toggle('challenge-week-card--live', isLive);
      card.classList.toggle('challenge-week-card--link', isOpen && !!href);

      if (statusEl) {
        if (!isOpen) {
          statusEl.textContent = 'Opens ' + label.replace(/^Opens\s+/i, '');
        } else if (isLive) {
          statusEl.textContent = href
            ? 'Open now — click to enter · ' + label
            : 'Open now · ' + label;
        } else {
          statusEl.textContent = href
            ? 'Available — click to catch up · ' + label
            : 'Available through Nov 30 · ' + label;
        }
      }

      // Promote to / demote from link when page exists
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
        } else {
          card.setAttribute('href', href);
        }
      } else if (card.tagName === 'A') {
        var div = document.createElement('div');
        div.className = card.className.replace(/\bchallenge-week-card--link\b/g, '').trim();
        for (var j = 0; j < card.attributes.length; j++) {
          var a = card.attributes[j];
          if (a.name === 'class' || a.name === 'href') continue;
          div.setAttribute(a.name, a.value);
        }
        while (card.firstChild) div.appendChild(card.firstChild);
        card.parentNode.replaceChild(div, card);
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

  auth.onAuthStateChanged(function (user) {
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
})();
