/**
 * Week 3 What's It Weigh Wednesday — peak ground force (lb) on a 1,000-lb horse.
 *
 * Opens Wed Sep 16 6:00 AM ET through Sun Sep 20 8:00 PM ET.
 * Preview: ?weighW3Preview=1 or #weighW3Preview=1
 * Reset dismiss: ?weighW3Reset=1 or #weighW3Reset=1
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var CONTEST_ID = 'weigh-wednesday-w3';
  var FIELD = 'weighWednesdayW3';
  var STORAGE_DISMISS = 'thcWeighW3Dismissed_v1';
  var PENDING_KEY = 'thcWeighW3PendingGuesses';
  var OPEN_MS = Date.parse('2026-09-16T06:00:00-04:00');
  var CLOSE_MS = Date.parse('2026-09-20T20:00:00-04:00');
  var CARD_RETIRE_MS = CLOSE_MS + 4 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 900;
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';

  var ITEMS = [
    { id: 'walkFore', group: 'Walk', detail: 'Forelimb ground force' },
    { id: 'walkHind', group: 'Walk', detail: 'Hindlimb ground force' },
    { id: 'trotFore', group: 'Trot', detail: 'Forelimb ground force' },
    { id: 'trotHind', group: 'Trot', detail: 'Hindlimb ground force' },
    { id: 'canterTrailFore', group: 'Canter', detail: 'Trailing forelimb ground force' },
  ];

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  function readParams() {
    var search = new URLSearchParams(window.location.search || '');
    var hash = String(window.location.hash || '').replace(/^#/, '');
    var fromHash = new URLSearchParams(hash);
    return {
      get: function (key) {
        return search.get(key) || fromHash.get(key);
      },
    };
  }

  var params = readParams();
  var preview = params.get('weighW3Preview') === '1';
  if (params.get('weighW3Reset') === '1') {
    try {
      localStorage.removeItem(STORAGE_DISMISS);
    } catch (e) {}
  }

  var auth = null;
  var db = null;
  var dialog = null;
  var form = null;
  var statusEl = null;
  var currentUser = null;
  var hasSubmitted = false;
  var myPlace = 0;
  var myAvgPct = null;

  function inWindow() {
    if (preview) return true;
    var t = Date.now();
    return t >= OPEN_MS && t <= CLOSE_MS;
  }
  function windowClosed() {
    if (preview) return false;
    return Date.now() > CLOSE_MS;
  }
  function windowNotOpenYet() {
    if (preview) return false;
    return Date.now() < OPEN_MS;
  }
  function cardRetired() {
    if (preview) return false;
    return Date.now() > CARD_RETIRE_MS;
  }
  function wasDismissed() {
    try {
      return localStorage.getItem(STORAGE_DISMISS) === '1';
    } catch (e) {
      return false;
    }
  }
  function markDismissedLocal() {
    try {
      localStorage.setItem(STORAGE_DISMISS, '1');
    } catch (e) {}
  }

  function ordinal(n) {
    var place = Number(n);
    if (!place || place < 1) return '';
    var mod100 = place % 100;
    if (mod100 >= 11 && mod100 <= 13) return place + 'th';
    switch (place % 10) {
      case 1:
        return place + 'st';
      case 2:
        return place + 'nd';
      case 3:
        return place + 'rd';
      default:
        return place + 'th';
    }
  }
  function formatAvgOff(pct) {
    var n = Number(pct);
    if (isNaN(n) || n < 0) return '';
    return n.toFixed(1) + ' average off';
  }
  function personalResultNote() {
    if (!myPlace || myAvgPct == null || isNaN(Number(myAvgPct))) return '';
    return 'You placed ' + ordinal(myPlace) + ' · ' + formatAvgOff(myAvgPct) + '.';
  }

  function guessesFromRegistration(data) {
    var block = data && data[FIELD];
    if (!block || !block.guesses) return null;
    return block.guesses;
  }
  function isCompleteGuesses(guesses) {
    if (!guesses) return false;
    return ITEMS.every(function (item) {
      var row = guesses[item.id];
      var lb = row && typeof row === 'object' ? Number(row.lb) : Number(row);
      return !isNaN(lb) && lb >= 0;
    });
  }

  function ensureFirebase() {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    return true;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function itemRowsHtml() {
    return ITEMS.map(function (item, idx) {
      return (
        '<div class="weigh-item weigh-item--lb">' +
        '<div class="weigh-item__num">' +
        (idx + 1) +
        '</div>' +
        '<div class="weigh-item__copy">' +
        '<p class="weigh-item__vessel">' +
        escapeHtml(item.group) +
        '</p>' +
        '<p class="weigh-item__product">' +
        escapeHtml(item.detail) +
        '</p>' +
        '</div>' +
        '<div class="weigh-item__fields">' +
        '<label class="weigh-item__field">' +
        '<span>lb</span>' +
        '<input class="form-input" type="number" name="' +
        item.id +
        '-lb" min="0" max="10000" step="1" inputmode="numeric" required>' +
        '</label>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ensureDialog() {
    dialog = document.getElementById('thc-dialog-weigh-w3');
    if (dialog) {
      form = dialog.querySelector('#weigh-w3-form');
      statusEl = dialog.querySelector('#weigh-w3-status');
      return dialog;
    }
    dialog = document.createElement('dialog');
    dialog.id = 'thc-dialog-weigh-w3';
    dialog.className = 'thc-dialog thc-dialog--challenge thc-dialog--weigh';
    dialog.innerHTML =
      '<div class="thc-dialog__inner thc-dialog__inner--challenge">' +
      '<button type="button" class="thc-dialog-close" data-weigh-w3-dismiss aria-label="Close">&times;</button>' +
      '<div class="thc-dialog__body weigh-dialog__body">' +
      '<p class="thc-dialog__eyebrow">Mid-week bonus · up to 9 points</p>' +
      '<h2 class="thc-dialog__title">What’s It Weigh Wednesday</h2>' +
      '<p class="thc-dialog__text">Guess the <strong>pounds of peak ground force</strong> on a <strong>1,000-lb horse</strong> at each gait and limb. Closest overall wins. Open Wednesday 6:00 AM through Sunday 8:00 PM ET. Official values stay sealed until then.</p>' +
      '<form id="weigh-w3-form" class="weigh-form" novalidate>' +
      '<div class="weigh-form__list">' +
      itemRowsHtml() +
      '</div>' +
      '<p class="weigh-form__hint">Enter pounds for all five. Once you lock them in, they cannot be changed. Results score automatically Sunday at 8:00 PM ET.</p>' +
      '<p id="weigh-w3-status" class="weigh-form__status" hidden></p>' +
      '<div class="thc-dialog__actions">' +
      '<button type="submit" class="btn-primary" data-weigh-w3-submit>Lock in my 5 guesses</button>' +
      '<button type="button" class="btn-ghost" data-weigh-w3-dismiss>Not now</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    form = dialog.querySelector('#weigh-w3-form');
    statusEl = dialog.querySelector('#weigh-w3-status');
    return dialog;
  }

  function setStatus(msg, isError, isSuccess) {
    if (!statusEl) return;
    statusEl.hidden = !msg;
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('weigh-form__status--error', !!isError);
    statusEl.classList.toggle('weigh-form__status--success', !!isSuccess);
  }

  function fillForm(guesses) {
    if (!form || !guesses) return;
    ITEMS.forEach(function (item) {
      var row = guesses[item.id];
      var lb = row && typeof row === 'object' ? row.lb : row;
      var el = form.querySelector('[name="' + item.id + '-lb"]');
      if (el && lb != null) el.value = lb;
    });
  }

  function setFormLocked(locked) {
    if (!form) return;
    form.querySelectorAll('input').forEach(function (el) {
      el.disabled = !!locked;
    });
    var submit = form.querySelector('[data-weigh-w3-submit]');
    if (submit) submit.hidden = !!locked;
    var dismissBtn = form.querySelector('[data-weigh-w3-dismiss]');
    if (dismissBtn) dismissBtn.textContent = locked ? 'Close' : 'Not now';
  }

  function updateCards() {
    document.querySelectorAll('[data-weigh-w3-card]').forEach(function (card) {
      if (windowNotOpenYet() || cardRetired()) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      var title = card.querySelector('[data-weigh-w3-title]');
      var note = card.querySelector('[data-weigh-w3-note]');
      var openBtn = card.querySelector('[data-weigh-w3-open]');
      var eyebrow = card.querySelector('.weigh-card__eyebrow');
      card.classList.toggle('weigh-card--recorded', hasSubmitted);
      var scoredNote = personalResultNote();
      if (eyebrow) {
        eyebrow.textContent = scoredNote ? 'Results in' : hasSubmitted ? 'Entry recorded' : 'Mid-week bonus';
      }
      if (title) title.textContent = 'What’s It Weigh Wednesday';
      if (hasSubmitted) {
        if (note) {
          note.textContent = scoredNote
            ? scoredNote
            : windowClosed()
              ? 'Your guesses are in. Results post after Sunday 8:00 PM ET.'
              : 'Your five guesses are locked in. Official values stay sealed until Sunday 8:00 PM ET.';
        }
        if (openBtn) {
          openBtn.hidden = false;
          openBtn.textContent = 'View your guesses';
        }
      } else if (windowClosed()) {
        if (note) note.textContent = 'Submissions are closed. Results score automatically.';
        if (openBtn) openBtn.hidden = true;
        setFormLocked(true);
      } else {
        if (note) {
          note.textContent =
            'Mid-week bonus · up to 9 points. Guess the pounds of ground force on a 1,000-lb horse at each gait. Closest overall wins.';
        }
        if (openBtn) {
          openBtn.hidden = false;
          openBtn.textContent = 'Enter my guesses';
        }
      }
    });
  }

  function openDialog() {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (dialog.open) return;
    try {
      dialog.showModal();
    } catch (e) {}
  }
  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
  }

  function persistDismiss() {
    markDismissedLocal();
    if (!db || !currentUser) return Promise.resolve();
    var ref = db.collection('challengeRegistrations').doc(currentUser.uid);
    var update = {};
    update[FIELD + '.contestId'] = CONTEST_ID;
    update[FIELD + '.dismissedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    return ref.update(update).catch(function () {
      var nested = {};
      nested[FIELD] = {
        contestId: CONTEST_ID,
        dismissedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      return ref.set(nested, { merge: true });
    });
  }

  function readGuessesFromForm() {
    var guesses = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      var el = form.querySelector('[name="' + item.id + '-lb"]');
      var lb = el ? Number(el.value) : NaN;
      if (isNaN(lb) || lb < 0) return null;
      guesses[item.id] = { lb: lb };
    }
    return guesses;
  }

  function readPartialFromForm() {
    var partial = {};
    ITEMS.forEach(function (item) {
      var el = form.querySelector('[name="' + item.id + '-lb"]');
      var raw = el ? String(el.value).trim() : '';
      if (raw === '') return;
      partial[item.id] = { lb: raw };
    });
    return partial;
  }

  function savePending() {
    try {
      var partial = readPartialFromForm();
      if (!Object.keys(partial).length) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(partial));
    } catch (e) {}
  }
  function loadPending() {
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function clearPending() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {}
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (hasSubmitted) {
      setStatus('Your guesses are already locked in.', false);
      return;
    }
    if (windowClosed()) {
      setStatus('Submissions closed Sunday at 8:00 PM ET.', true);
      return;
    }
    if (!currentUser) {
      savePending();
      setStatus('Sign in with your Challenge account first — we saved what you typed.', true);
      window.setTimeout(function () {
        window.location.href = DOOR_SIGNIN;
      }, 1400);
      return;
    }
    var guesses = readGuessesFromForm();
    if (!guesses) {
      setStatus('Enter pounds of ground force for all five gaits.', true);
      return;
    }
    setStatus('Saving your five guesses…');
    var payload = {};
    payload[FIELD] = {
      contestId: CONTEST_ID,
      challengeId: CHALLENGE_ID,
      guesses: guesses,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
      dismissedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    db.collection('challengeRegistrations')
      .doc(currentUser.uid)
      .set(payload, { merge: true })
      .then(function () {
        hasSubmitted = true;
        markDismissedLocal();
        clearPending();
        setFormLocked(true);
        setStatus(
          'Recorded — all five guesses are locked in. Official values stay sealed until Sunday 8:00 PM ET.',
          false,
          true
        );
        updateCards();
        window.setTimeout(function () {
          closeDialog();
        }, 1900);
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Could not save guesses. Stay signed in and try again.', true);
      });
  }

  function applyRegistration(data) {
    var guesses = guessesFromRegistration(data);
    var block = data && data[FIELD];
    hasSubmitted = isCompleteGuesses(guesses);
    myPlace = block && block.place ? Number(block.place) : 0;
    myAvgPct = block && block.avgPct != null ? Number(block.avgPct) : null;
    if (hasSubmitted) {
      clearPending();
      fillForm(guesses);
      setFormLocked(true);
      var scoredNote = personalResultNote();
      setStatus(
        scoredNote ||
          'Recorded — your five guesses are locked in. Official values stay sealed until Sunday 8:00 PM ET.',
        false,
        true
      );
    } else if (block && block.dismissedAt) {
      markDismissedLocal();
    }
    updateCards();
  }

  function restorePendingIfAny() {
    if (hasSubmitted || windowClosed()) return;
    var pending = loadPending();
    if (!pending) return;
    fillForm(pending);
    setStatus('Welcome back — your guesses are still here. Review them and lock them in.');
    openDialog();
  }

  function shouldAutoPopup() {
    if (!inWindow()) return false;
    if (hasSubmitted) return false;
    if (!currentUser) return false;
    if (preview) return true;
    if (wasDismissed()) return false;
    return true;
  }

  var autoPopupDone = false;
  function tryAutoPopup() {
    if (autoPopupDone) return;
    if (!shouldAutoPopup()) return;
    autoPopupDone = true;
    openDialog();
  }

  function wire() {
    if (!document.querySelector('[data-weigh-w3-card]')) return;
    ensureDialog();
    updateCards();

    dialog.querySelectorAll('[data-weigh-w3-dismiss]').forEach(function (el) {
      el.addEventListener('click', function () {
        persistDismiss();
        closeDialog();
      });
    });
    dialog.addEventListener('cancel', function () {
      persistDismiss();
    });
    if (form) form.addEventListener('submit', handleSubmit);
    document.querySelectorAll('[data-weigh-w3-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDialog();
      });
    });

    if (ensureFirebase()) {
      auth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (!user || !db) {
          hasSubmitted = false;
          myPlace = 0;
          myAvgPct = null;
          updateCards();
          return;
        }
        var restored = false;
        db.collection('challengeRegistrations')
          .doc(user.uid)
          .onSnapshot(
            function (snap) {
              applyRegistration(snap.exists ? snap.data() || {} : null);
              if (!restored) {
                restored = true;
                restorePendingIfAny();
                tryAutoPopup();
              }
            },
            function () {
              applyRegistration(null);
              if (!restored) {
                restored = true;
                restorePendingIfAny();
                tryAutoPopup();
              }
            }
          );
      });
    } else {
      updateCards();
    }

    window.setTimeout(tryAutoPopup, SHOW_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
