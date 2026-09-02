/**
 * What's It Weigh Wednesday — mid-week bonus popup + guess form.
 *
 * Opens Wed Sep 2 6:00 AM ET through Sun Sep 6 8:00 PM ET.
 * Preview locally: add ?weighPreview=1 (auto-opens even if dismissed).
 * Reset local dismiss: add ?weighReset=1.
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var CONTEST_ID = 'weigh-wednesday-w1';
  var STORAGE_DISMISS = 'thcWeighWednesdayDismissed_v1';
  var PENDING_KEY = 'thcWeighWednesdayPendingGuesses';
  var OPEN_MS = Date.parse('2026-09-02T06:00:00-04:00');
  var CLOSE_MS = Date.parse('2026-09-06T20:00:00-04:00');
  /** Keep the card up briefly after close so entrants see results are pending, then retire it. */
  var CARD_RETIRE_MS = CLOSE_MS + 4 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 900;
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var FLYER_SRC = 'Images/challenge/whats-it-weigh-wednesday.jpg?v=20260901b';

  /** Grouped by measuring vessel so both fills of the same container sit together. */
  var ITEMS = [
    { id: 'scoopBeet', vessel: '3 QT feed scoop', product: 'UNBEETABLE® Beet Pulp' },
    { id: 'scoopTimothy', vessel: '3 QT feed scoop', product: 'Standlee® Timothy Pellets' },
    { id: 'cupBeet', vessel: '1.25 LB feed cup', product: 'UNBEETABLE® Beet Pulp' },
    { id: 'cupTimothy', vessel: '1.25 LB feed cup', product: 'Standlee® Timothy Pellets' },
    { id: 'quarterAmino', vessel: '1/4 cup measuring cup', product: 'Mad Barn® AminoTrace+ Pellets' },
    {
      id: 'quarterVermont',
      vessel: '1/4 cup measuring cup',
      product: 'Custom Equine Nutrition® Vermont Blend Powder',
    },
  ];

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var params = new URLSearchParams(window.location.search || '');
  var preview = params.get('weighPreview') === '1';
  if (params.get('weighReset') === '1') {
    try {
      localStorage.removeItem(STORAGE_DISMISS);
    } catch (e) {
      /* ignore */
    }
  }

  var auth = null;
  var db = null;
  var dialog = null;
  var form = null;
  var statusEl = null;
  var currentUser = null;
  var hasSubmitted = false;

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
    } catch (e) {
      /* ignore */
    }
  }

  function guessesFromRegistration(data) {
    var block = data && data.weighWednesday;
    if (!block || !block.guesses) return null;
    return block.guesses;
  }

  function isCompleteGuesses(guesses) {
    if (!guesses) return false;
    return ITEMS.every(function (item) {
      var row = guesses[item.id];
      if (!row || typeof row !== 'object') return false;
      var lb = Number(row.lb);
      var oz = Number(row.oz);
      return !isNaN(lb) && !isNaN(oz) && lb >= 0 && oz >= 0;
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
        '<div class="weigh-item">' +
        '<div class="weigh-item__num">' +
        (idx + 1) +
        '</div>' +
        '<div class="weigh-item__copy">' +
        '<p class="weigh-item__vessel">' +
        escapeHtml(item.vessel) +
        '</p>' +
        '<p class="weigh-item__product">' +
        escapeHtml(item.product) +
        '</p>' +
        '</div>' +
        '<div class="weigh-item__fields">' +
        '<label class="weigh-item__field">' +
        '<span>lb</span>' +
        '<input class="form-input" type="number" name="' +
        item.id +
        '-lb" min="0" max="50" step="1" inputmode="numeric" required>' +
        '</label>' +
        '<label class="weigh-item__field">' +
        '<span>oz</span>' +
        '<input class="form-input" type="number" name="' +
        item.id +
        '-oz" min="0" max="159" step="0.1" inputmode="decimal" required>' +
        '</label>' +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ensureDialog() {
    dialog = document.getElementById('thc-dialog-weigh-wednesday');
    if (dialog) {
      form = dialog.querySelector('#weigh-wednesday-form');
      statusEl = dialog.querySelector('#weigh-wednesday-status');
      return dialog;
    }

    dialog = document.createElement('dialog');
    dialog.id = 'thc-dialog-weigh-wednesday';
    dialog.className = 'thc-dialog thc-dialog--challenge thc-dialog--weigh';
    dialog.innerHTML =
      '<div class="thc-dialog__inner thc-dialog__inner--challenge">' +
      '<button type="button" class="thc-dialog-close thc-dialog-close--on-media" data-weigh-dismiss aria-label="Close">&times;</button>' +
      '<div class="thc-dialog__media thc-dialog__media--weigh">' +
      '<img src="' +
      FLYER_SRC +
      '" alt="What’s It Weigh Wednesday — same container, different contents, different weight. Submissions close Sunday 8 PM EST." width="682" height="1024" decoding="async">' +
      '</div>' +
      '<div class="thc-dialog__body weigh-dialog__body">' +
      '<p class="thc-dialog__eyebrow">Mid-week bonus · up to 9 points</p>' +
      '<h2 class="thc-dialog__title">What’s It Weigh Wednesday</h2>' +
      '<p class="thc-dialog__text">Guess the exact weight of all six fills. Closest overall by average % difference wins. Open through Sunday 8:00 PM ET — results score automatically.</p>' +
      '<a class="weigh-flyer-link" href="' +
      FLYER_SRC +
      '" target="_blank" rel="noopener noreferrer">See the full flyer</a>' +
      '<form id="weigh-wednesday-form" class="weigh-form" novalidate>' +
      '<div class="weigh-form__list">' +
      itemRowsHtml() +
      '</div>' +
      '<p class="weigh-form__hint">Enter pounds and ounces for each. 16 oz = 1 lb. All six required.</p>' +
      '<p id="weigh-wednesday-status" class="weigh-form__status" hidden></p>' +
      '<div class="thc-dialog__actions">' +
      '<button type="submit" class="btn-primary" data-weigh-submit>Lock in my 6 guesses</button>' +
      '<button type="button" class="btn-ghost" data-weigh-dismiss>Not now</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    form = dialog.querySelector('#weigh-wednesday-form');
    statusEl = dialog.querySelector('#weigh-wednesday-status');
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
      var row = guesses[item.id] || {};
      var lb = form.querySelector('[name="' + item.id + '-lb"]');
      var oz = form.querySelector('[name="' + item.id + '-oz"]');
      if (lb && row.lb != null) lb.value = row.lb;
      if (oz && row.oz != null) oz.value = row.oz;
    });
  }

  function setFormLocked(locked) {
    if (!form) return;
    form.querySelectorAll('input').forEach(function (el) {
      el.disabled = !!locked;
    });
    var submit = form.querySelector('[data-weigh-submit]');
    if (submit) submit.hidden = !!locked;
    // "Not now" implies the entry is still pending, which is wrong once it is saved.
    var dismissBtn = form.querySelector('[data-weigh-dismiss]');
    if (dismissBtn) dismissBtn.textContent = locked ? 'Close' : 'Not now';
  }

  /** Confirm in place, then get out of the way — the page card is the lasting receipt. */
  function confirmAndClose() {
    if (statusEl) {
      try {
        statusEl.scrollIntoView({ block: 'center' });
      } catch (e) {
        statusEl.scrollIntoView();
      }
    }
    window.setTimeout(function () {
      closeDialog();
      revealCard();
    }, 1900);
  }

  function revealCard() {
    var card = document.querySelector('[data-weigh-wednesday-card]');
    if (!card || card.hidden) return;
    var rect = card.getBoundingClientRect();
    var viewH = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.top >= 0 && rect.bottom <= viewH) return;
    try {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      card.scrollIntoView();
    }
  }

  function cardRetired() {
    if (preview) return false;
    return Date.now() > CARD_RETIRE_MS;
  }

  function updateCards() {
    document.querySelectorAll('[data-weigh-wednesday-card]').forEach(function (card) {
      if (windowNotOpenYet() || cardRetired()) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      var title = card.querySelector('[data-weigh-card-title]');
      var note = card.querySelector('[data-weigh-card-note]');
      var openBtn = card.querySelector('[data-weigh-open]');
      var eyebrow = card.querySelector('.weigh-card__eyebrow');
      card.classList.toggle('weigh-card--recorded', hasSubmitted);
      if (eyebrow) {
        eyebrow.textContent = hasSubmitted ? 'Entry recorded' : 'Mid-week bonus';
      }
      if (hasSubmitted) {
        if (title) title.textContent = 'What’s It Weigh Wednesday';
        if (note) {
          note.textContent = windowClosed()
            ? 'Your guesses are in. Results post after Sunday 8:00 PM ET.'
            : 'Your six guesses are locked in. Results score automatically Sunday evening.';
        }
        if (openBtn) {
          openBtn.hidden = false;
          openBtn.textContent = 'View your guesses';
        }
      } else if (windowClosed()) {
        if (title) title.textContent = 'What’s It Weigh Wednesday';
        if (note) note.textContent = 'Submissions are closed. Results score automatically.';
        if (openBtn) openBtn.hidden = true;
        setFormLocked(true);
        setStatus('Submissions closed Sunday at 8:00 PM ET. Results score automatically.');
      } else {
        if (title) title.textContent = 'What’s It Weigh Wednesday';
        if (note) {
          note.textContent =
            'Mid-week bonus · up to 9 points. Guess all 6 weights (lb / oz). Closest overall wins.';
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
    } catch (e) {
      /* ignore */
    }
  }

  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
  }

  function persistDismiss() {
    markDismissedLocal();
    if (!db || !currentUser) return Promise.resolve();
    var ref = db.collection('challengeRegistrations').doc(currentUser.uid);
    return ref
      .update({
        'weighWednesday.contestId': CONTEST_ID,
        'weighWednesday.dismissedAt': firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch(function () {
        return ref.set(
          {
            weighWednesday: {
              contestId: CONTEST_ID,
              dismissedAt: firebase.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      })
      .catch(function (err) {
        console.warn('weigh dismiss write skipped', err);
      });
  }

  function readGuessesFromForm() {
    var guesses = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var item = ITEMS[i];
      var lbEl = form.querySelector('[name="' + item.id + '-lb"]');
      var ozEl = form.querySelector('[name="' + item.id + '-oz"]');
      var lb = lbEl ? Number(lbEl.value) : NaN;
      var oz = ozEl ? Number(ozEl.value) : NaN;
      if (isNaN(lb) || isNaN(oz) || lb < 0 || oz < 0) return null;
      guesses[item.id] = { lb: lb, oz: oz };
    }
    return guesses;
  }

  /** Keep partly typed guesses through the sign-in round trip. */
  function readPartialFromForm() {
    var partial = {};
    ITEMS.forEach(function (item) {
      var lbEl = form.querySelector('[name="' + item.id + '-lb"]');
      var ozEl = form.querySelector('[name="' + item.id + '-oz"]');
      var lbRaw = lbEl ? String(lbEl.value).trim() : '';
      var ozRaw = ozEl ? String(ozEl.value).trim() : '';
      if (lbRaw === '' && ozRaw === '') return;
      partial[item.id] = { lb: lbRaw, oz: ozRaw };
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
    } catch (e) {
      /* ignore */
    }
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
    } catch (e) {
      /* ignore */
    }
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
      setStatus(
        'Sign in with your Challenge account first — we saved what you typed and will bring you right back.',
        true
      );
      window.setTimeout(function () {
        window.location.href = DOOR_SIGNIN;
      }, 1400);
      return;
    }
    var guesses = readGuessesFromForm();
    if (!guesses) {
      setStatus('Enter pounds and ounces for all six items.', true);
      return;
    }
    setStatus('Saving your six guesses…');
    var payload = {
      weighWednesday: {
        contestId: CONTEST_ID,
        challengeId: CHALLENGE_ID,
        guesses: guesses,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        dismissedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
    };
    db.collection('challengeRegistrations')
      .doc(currentUser.uid)
      .set(payload, { merge: true })
      .then(function () {
        hasSubmitted = true;
        markDismissedLocal();
        clearPending();
        setFormLocked(true);
        setStatus('Recorded — all six guesses are locked in. Results score automatically Sunday evening.', false, true);
        updateCards();
        confirmAndClose();
      })
      .catch(function (err) {
        console.error(err);
        setStatus('Could not save guesses. Stay signed in and try again.', true);
      });
  }

  function applyRegistration(data) {
    var guesses = guessesFromRegistration(data);
    hasSubmitted = isCompleteGuesses(guesses);
    if (hasSubmitted) {
      clearPending();
      fillForm(guesses);
      setFormLocked(true);
      setStatus('Recorded — your six guesses are locked in. Results score automatically Sunday evening.', false, true);
    } else if (data && data.weighWednesday && data.weighWednesday.dismissedAt) {
      markDismissedLocal();
    }
    updateCards();
  }

  /** After a sign-in round trip, put their typing back and reopen the form. */
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
    // Hub and week pages are both members-only, so a signed-out visitor has
    // nothing behind this dialog but a sign-in wall.
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
    ensureDialog();
    updateCards();

    dialog.querySelectorAll('[data-weigh-dismiss]').forEach(function (el) {
      el.addEventListener('click', function () {
        persistDismiss();
        closeDialog();
      });
    });
    dialog.addEventListener('cancel', function () {
      persistDismiss();
    });
    if (form) form.addEventListener('submit', handleSubmit);

    document.querySelectorAll('[data-weigh-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDialog();
      });
    });

    if (ensureFirebase()) {
      auth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (!user || !db) {
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
