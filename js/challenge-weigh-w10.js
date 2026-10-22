/**
 * Week 10 What's It Weigh Wednesday — trailer dry weight, water, gear ratio, tongue weight.
 *
 * Opens Wed Nov 4 6:00 AM ET through Sun Nov 8 8:00 PM ET.
 * Edits allowed until the deadline. Official answers post when Sunday scoring runs.
 * Preview: ?weighW10Preview=1 or #weighW10Preview=1
 * Reset dismiss: ?weighW10Reset=1 or #weighW10Reset=1
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var CONTEST_ID = 'weigh-wednesday-w10';
  var FIELD = 'weighWednesdayW10';
  var STORAGE_DISMISS = 'thcWeighW10Dismissed_v1';
  var PENDING_KEY = 'thcWeighW10PendingGuesses';
  var OPEN_MS = Date.parse('2026-11-04T06:00:00-05:00');
  var CLOSE_MS = Date.parse('2026-11-08T20:00:00-05:00');
  var CARD_RETIRE_MS = CLOSE_MS + 4 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 900;
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var PREVIEW_KEY = 'thc-hc-preview-2026';

  var ITEMS = [
    {
      id: 'dryWeight',
      kind: 'number',
      unit: 'pounds',
      max: '80000',
      step: '1',
      group: 'Guess the dry weight',
      detail:
        'Look at the two photos of this Double D SafeTack Reverse two-horse trailer with a 13′ short-wall living quarters and slide-out. What do you estimate its dry weight is, before adding horses, water, tack, or travel supplies? Enter your estimate in pounds.',
      photosFit: 'contain',
      photos: [
        {
          src: 'Images/challenge/weigh-w10-safetack-rear.jpg',
          alt: 'Double D SafeTack Reverse trailer with the awning out, seen from the rear three-quarter',
        },
        {
          src: 'Images/challenge/weigh-w10-safetack-side.jpg',
          alt: 'Side view of the same Double D SafeTack Reverse trailer, living quarters toward the front',
        },
      ],
    },
    {
      id: 'waterAdded',
      kind: 'number',
      unit: 'pounds',
      max: '5000',
      step: '1',
      group: 'Just add water',
      detail:
        'You fill your trailer’s empty fresh-water tank with 40 US gallons of water. Approximately how much weight have you added? Count only the water — not the tank. Enter your estimate in pounds, rounded to the nearest whole pound.',
    },
    {
      id: 'gearDiff',
      kind: 'number',
      unit: 'pounds',
      max: '20000',
      step: '1',
      group: 'Same truck. Same engine. Different towing capacity.',
      detail:
        'Per Double D’s lesson, approximately how many more pounds can the truck with a 4.30 gear ratio tow compared with the same truck with a 3.73 gear ratio? Enter the difference in pounds.',
    },
    {
      id: 'tongueWeight',
      kind: 'number',
      unit: 'pounds',
      max: '5000',
      step: '1',
      group: 'Put Double D’s calculator to work',
      detail:
        'Use the Double D tongue weight calculator in Monday’s Trailer Safety lesson and enter this example bumper-pull trailer. Enter the tongue weight in pounds.',
      specs: [
        'Trailer weight: 5,000 pounds',
        'Length of body: 16 feet',
        'Distance from the center of the axles to the back of the trailer: 6 feet',
      ],
    },
    {
      id: 'hitchShare',
      kind: 'number',
      unit: 'percent',
      max: '100',
      step: '0.1',
      group: 'What percentage rests on the hitch?',
      detail:
        'A bumper-pull trailer has these specifications. You load two horses weighing 1,100 pounds each, 250 pounds of tack and supplies, and 200 pounds of water. Determine the approximate tongue weight, then express it as a percentage of the total loaded trailer weight. Enter your answer as a percentage, rounded to one decimal place.',
      specs: [
        'Empty trailer weight: 4,500 pounds',
        'Length of body: 18 feet',
        'Distance from the center of the axles to the back of the trailer: 7 feet',
        'Load: two horses at 1,100 pounds each, 250 pounds of tack and supplies, 200 pounds of water',
      ],
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
  var preview =
    params.get('weighW10Preview') === '1' ||
    params.get('preview') === PREVIEW_KEY ||
    params.get('unlockAll') === '1';
  if (params.get('weighW10Reset') === '1') {
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
  var myGuesses = null;
  var officialActuals = null;

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
  function answersRevealed() {
    return windowClosed() && !!officialActuals;
  }
  function fieldName(item) {
    if (item.unit === 'percent') return item.id + '-pct';
    return item.id + '-lb';
  }
  function storedNumber(item, row) {
    if (row == null) return NaN;
    if (typeof row === 'number') return row;
    if (typeof row !== 'object') return NaN;
    if (item.unit === 'percent') return Number(row.pct);
    return Number(row.lb);
  }
  function payloadFor(item, n) {
    if (item.unit === 'percent') return { pct: n };
    return { lb: n };
  }
  function formatAmount(item, n) {
    var num = Number(n);
    if (isNaN(num)) return '';
    if (item.unit === 'percent') return num.toFixed(1) + '%';
    var whole = Math.abs(num - Math.round(num)) < 0.001;
    var text = whole
      ? Math.round(num).toLocaleString('en-US')
      : num.toLocaleString('en-US', { maximumFractionDigits: 1 });
    return text + ' lb';
  }
  function formatOfficialValue(item, row) {
    if (row && typeof row === 'object' && row.display) return String(row.display);
    var n = storedNumber(item, row);
    if (isNaN(n)) return '—';
    return formatAmount(item, n);
  }
  function guessValue(item) {
    if (!myGuesses || myGuesses[item.id] == null) return null;
    var n = storedNumber(item, myGuesses[item.id]);
    return isNaN(n) ? null : n;
  }
  function guessSuffix(item, yours) {
    if (yours == null) return '';
    var label = formatAmount(item, yours);
    if (!label) return '';
    return ' · your guess ' + label;
  }
  function setOfficial(actuals) {
    if (!actuals || typeof actuals !== 'object') return;
    officialActuals = actuals;
    renderAnswers();
    updateCards();
  }

  function answersPanelHtml() {
    return (
      '<div class="weigh-answers" data-weigh-answers hidden>' +
      '<p class="weigh-answers__title">Official answers</p>' +
      '<ul class="weigh-answers__list" data-weigh-answers-list></ul>' +
      '</div>'
    );
  }
  function renderAnswers() {
    if (!form) return;
    var panel = form.querySelector('[data-weigh-answers]');
    var list = form.querySelector('[data-weigh-answers-list]');
    var hint = form.querySelector('.weigh-form__hint');
    if (!panel || !list) return;
    if (!answersRevealed()) {
      panel.hidden = true;
      if (hint) {
        hint.textContent =
          'Enter each weight in pounds, and the hitch share as a percentage. Official answers post here Sunday at 8:00 PM ET when scores go up.';
      }
      return;
    }
    panel.hidden = false;
    list.innerHTML = ITEMS.map(function (item) {
      var yours = guessValue(item);
      return (
        '<li class="weigh-answers__row">' +
        '<span class="weigh-answers__label">' +
        escapeHtml(item.group) +
        '</span>' +
        '<span class="weigh-answers__values"><span class="weigh-answers__official">' +
        escapeHtml(formatOfficialValue(item, officialActuals[item.id])) +
        '</span>' +
        guessSuffix(item, yours) +
        '</span></li>'
      );
    }).join('');
    if (hint) hint.textContent = 'Official answers posted when this week scored Sunday at 8:00 PM ET.';
  }
  function loadContestReveal() {
    if (!windowClosed() || !db) return;
    db.collection('challengeContests')
      .doc(CONTEST_ID)
      .get()
      .then(function (snap) {
        if (!snap.exists) return;
        var data = snap.data() || {};
        if (!data.scoredAt && !data.scoredAtMs) return;
        setOfficial(data.revealedActuals || data.actuals);
      })
      .catch(function () {});
  }

  function guessesFromRegistration(data) {
    var block = data && data[FIELD];
    if (!block || !block.guesses) return null;
    return block.guesses;
  }
  function isCompleteGuesses(guesses) {
    if (!guesses) return false;
    return ITEMS.every(function (item) {
      var n = storedNumber(item, guesses[item.id]);
      return !isNaN(n) && n > 0;
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

  function numberFieldHtml(item) {
    var suffix = item.unit === 'percent' ? '%' : 'lb';
    var max = item.max || (item.unit === 'percent' ? '100' : '80000');
    var step = item.step || (item.unit === 'percent' ? '0.1' : '1');
    return (
      '<label class="weigh-item__field"><span>' +
      suffix +
      '</span>' +
      '<input class="form-input" type="number" name="' +
      fieldName(item) +
      '" min="0" max="' +
      max +
      '" step="' +
      step +
      '" inputmode="' +
      (item.unit === 'percent' ? 'decimal' : 'numeric') +
      '" required></label>'
    );
  }

  function specsHtml(item) {
    if (!item.specs || !item.specs.length) return '';
    return (
      '<ul class="weigh-specs">' +
      item.specs
        .map(function (line) {
          return '<li>' + escapeHtml(line) + '</li>';
        })
        .join('') +
      '</ul>'
    );
  }

  function photosHtml(item) {
    var photos = item.photos || [];
    if (!photos.length) return '';
    var imgs = photos
      .map(function (photo) {
        return (
          '<img class="weigh-item__photo" src="' +
          escapeHtml(photo.src) +
          '" alt="' +
          escapeHtml(photo.alt || item.group) +
          '">'
        );
      })
      .join('');
    if (photos.length === 1) return imgs;
    var fit = item.photosFit === 'contain' ? ' weigh-item__photos--contain' : '';
    return '<div class="weigh-item__photos' + fit + '">' + imgs + '</div>';
  }

  function itemRowsHtml() {
    return ITEMS.map(function (item, idx) {
      var photo = photosHtml(item);
      var unitClass = item.unit === 'percent' ? 'weigh-item--pct' : 'weigh-item--lb';
      return (
        '<div class="weigh-item ' +
        unitClass +
        (photo ? ' weigh-item--photo' : '') +
        '">' +
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
        specsHtml(item) +
        photo +
        '</div>' +
        '<div class="weigh-item__fields">' +
        numberFieldHtml(item) +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ensureDialog() {
    dialog = document.getElementById('thc-dialog-weigh-w10');
    if (dialog) {
      form = dialog.querySelector('#weigh-w10-form');
      statusEl = dialog.querySelector('#weigh-w10-status');
      return dialog;
    }
    dialog = document.createElement('dialog');
    dialog.id = 'thc-dialog-weigh-w10';
    dialog.className = 'thc-dialog thc-dialog--challenge thc-dialog--weigh thc-dialog--weigh-w10';
    dialog.innerHTML =
      '<div class="thc-dialog__inner thc-dialog__inner--challenge">' +
      '<button type="button" class="thc-dialog-close" data-weigh-w10-dismiss aria-label="Close">&times;</button>' +
      '<div class="thc-dialog__body weigh-dialog__body">' +
      '<p class="thc-dialog__eyebrow">Mid-week bonus · up to 9 points</p>' +
      '<h2 class="thc-dialog__title">What’s It Weigh Wednesday</h2>' +
      '<p class="thc-dialog__text">Five trailer questions from Monday’s lesson and these photos. Closest overall wins. Open through Sunday, November 8 at 8:00 PM ET. You may edit until the deadline. Official answers post here when it scores Sunday at 8:00 PM ET.</p>' +
      '<aside class="weigh-honor" role="note">' +
      '<p class="weigh-honor__title">Answer it yourself</p>' +
      '<p>Guess from the photos, Monday’s Trailer Safety lesson, and what you already know. The Double D tongue weight calculator in that lesson is allowed, and a calculator is fine for the arithmetic. Google, image search, AI, looking up this trailer’s published weight, and asking someone else to find the answer are off limits. <a href="horsemanship-challenge-rules.html#wiww">Official Rules, section 4A</a>.</p>' +
      '</aside>' +
      '<form id="weigh-w10-form" class="weigh-form" novalidate>' +
      '<div class="weigh-form__list">' +
      itemRowsHtml() +
      '</div>' +
      answersPanelHtml() +
      '<p class="weigh-form__hint">Enter each weight in pounds, and the hitch share as a percentage. Official answers post here Sunday at 8:00 PM ET when scores go up.</p>' +
      '<p id="weigh-w10-status" class="weigh-form__status" hidden></p>' +
      '<div class="thc-dialog__actions">' +
      '<button type="submit" class="btn-primary" data-weigh-w10-submit>Save my 5 guesses</button>' +
      '<button type="button" class="btn-ghost" data-weigh-w10-dismiss>Not now</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    form = dialog.querySelector('#weigh-w10-form');
    statusEl = dialog.querySelector('#weigh-w10-status');
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
      var n = storedNumber(item, guesses[item.id]);
      if (isNaN(n)) return;
      var el = form.querySelector('[name="' + fieldName(item) + '"]');
      if (el) el.value = n;
    });
  }

  function setFormLocked(locked) {
    if (!form) return;
    form.querySelectorAll('input').forEach(function (el) {
      el.disabled = !!locked;
    });
    var submit = form.querySelector('[data-weigh-w10-submit]');
    if (submit) {
      submit.hidden = !!locked;
      submit.textContent = hasSubmitted ? 'Update my guesses' : 'Save my 5 guesses';
    }
    var dismissBtn = form.querySelector('[data-weigh-w10-dismiss]');
    if (dismissBtn) dismissBtn.textContent = locked ? 'Close' : 'Not now';
  }

  function updateCards() {
    document.querySelectorAll('[data-weigh-w10-card]').forEach(function (card) {
      if (windowNotOpenYet() || cardRetired()) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      var title = card.querySelector('[data-weigh-w10-title]');
      var note = card.querySelector('[data-weigh-w10-note]');
      var openBtn = card.querySelector('[data-weigh-w10-open]');
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
            ? scoredNote + (answersRevealed() ? ' Official answers are in.' : '')
            : windowClosed()
              ? answersRevealed()
                ? 'Your guesses are in. Official answers are posted below.'
                : 'Your guesses are in. Official answers post Sunday at 8:00 PM ET.'
              : 'Your five guesses are saved. You may edit them until Sunday 8:00 PM ET.';
        }
        if (openBtn) {
          openBtn.hidden = false;
          openBtn.textContent = answersRevealed()
            ? 'View guesses & answers'
            : windowClosed()
              ? 'View your guesses'
              : 'Edit my guesses';
        }
      } else if (windowClosed()) {
        if (note) {
          note.textContent = answersRevealed()
            ? 'Submissions are closed. Official answers are posted.'
            : 'Submissions are closed. Official answers post Sunday at 8:00 PM ET.';
        }
        if (openBtn) {
          openBtn.hidden = !answersRevealed();
          openBtn.textContent = 'See the official answers';
        }
        setFormLocked(true);
      } else {
        if (note) {
          note.textContent =
            'Mid-week bonus · up to 9 points. Five trailer-weight questions. Closest overall wins. Monday’s lesson and the tongue weight calculator are allowed. Answer it yourself.';
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
      var el = form.querySelector('[name="' + fieldName(item) + '"]');
      var n = el ? Number(el.value) : NaN;
      if (isNaN(n) || n <= 0) return null;
      guesses[item.id] = payloadFor(item, n);
    }
    return guesses;
  }

  function readPartialFromForm() {
    var partial = {};
    ITEMS.forEach(function (item) {
      var el = form.querySelector('[name="' + fieldName(item) + '"]');
      var raw = el ? String(el.value).trim() : '';
      if (raw === '') return;
      partial[item.id] = payloadFor(item, Number(raw));
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
    if (windowClosed()) {
      setStatus('Submissions closed Sunday at 8:00 PM ET.', true);
      return;
    }
    var guesses = readGuessesFromForm();
    if (!guesses) {
      setStatus('Enter a number greater than 0 for each question.', true);
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
        myGuesses = guesses;
        markDismissedLocal();
        clearPending();
        setFormLocked(false);
        setStatus('Saved. You may edit until Sunday 8:00 PM ET.', false, true);
        updateCards();
        window.setTimeout(function () {
          closeDialog();
        }, 1600);
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
    myGuesses = guesses;
    myPlace = block && block.place ? Number(block.place) : 0;
    myAvgPct = block && block.avgPct != null ? Number(block.avgPct) : null;
    if (block && block.official) setOfficial(block.official);
    if (hasSubmitted) {
      clearPending();
      fillForm(guesses);
      setFormLocked(windowClosed());
      var scoredNote = personalResultNote();
      setStatus(
        scoredNote ||
          (answersRevealed()
            ? 'Your five guesses are locked in. Official answers are posted below.'
            : windowClosed()
              ? 'Your five guesses are locked in.'
              : 'Saved. You may edit until Sunday 8:00 PM ET.'),
        false,
        true
      );
      renderAnswers();
    } else if (block && block.dismissedAt) {
      markDismissedLocal();
    }
    updateCards();
  }

  function restorePendingIfAny() {
    if (windowClosed()) return;
    var pending = loadPending();
    if (!pending) return;
    fillForm(pending);
    setStatus('Welcome back — your guesses are still here. Review them and save.');
    openDialog();
  }

  function shouldAutoPopup() {
    if (!inWindow()) return false;
    if (hasSubmitted) return false;
    if (preview) return true;
    if (!currentUser) return false;
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
    if (!document.querySelector('[data-weigh-w10-card]')) return;
    ensureDialog();
    updateCards();

    dialog.querySelectorAll('[data-weigh-w10-dismiss]').forEach(function (el) {
      el.addEventListener('click', function () {
        persistDismiss();
        closeDialog();
      });
    });
    dialog.addEventListener('cancel', function () {
      persistDismiss();
    });
    if (form) form.addEventListener('submit', handleSubmit);
    document.querySelectorAll('[data-weigh-w10-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDialog();
      });
    });

    if (ensureFirebase()) {
      auth.onAuthStateChanged(function (user) {
        currentUser = user;
        if (!user || !db) {
          hasSubmitted = false;
          myGuesses = null;
          myPlace = 0;
          myAvgPct = null;
          updateCards();
          renderAnswers();
          return;
        }
        loadContestReveal();
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
