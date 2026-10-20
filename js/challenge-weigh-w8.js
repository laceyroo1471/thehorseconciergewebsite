/**
 * Week 8 What's It Weigh Wednesday — Grazers handful in grams, plus four behavior questions.
 *
 * Opens Wed Oct 21 6:00 AM ET through Sun Oct 25 8:00 PM ET.
 * Edits allowed until the deadline. Official answers post when Sunday scoring runs.
 * Preview: ?weighW8Preview=1 or #weighW8Preview=1
 * Reset dismiss: ?weighW8Reset=1 or #weighW8Reset=1
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var CONTEST_ID = 'weigh-wednesday-w8';
  var FIELD = 'weighWednesdayW8';
  var STORAGE_DISMISS = 'thcWeighW8Dismissed_v1';
  var PENDING_KEY = 'thcWeighW8PendingGuesses';
  var OPEN_MS = Date.parse('2026-10-21T06:00:00-04:00');
  var CLOSE_MS = Date.parse('2026-10-25T20:00:00-04:00');
  var CARD_RETIRE_MS = CLOSE_MS + 4 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 900;
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var PREVIEW_KEY = 'thc-hc-preview-2026';

  var ITEMS = [
    {
      id: 'grazersHandful',
      kind: 'number',
      unit: 'grams',
      group: 'Grazers handful',
      link: {
        href: 'https://equinebalancedsupport.com/',
        label: 'Equine Balanced Support',
      },
      detail:
        'is supporting the challenge this week with a 5 lb bag of Grazers for our first place winner! Guess how much this handful of their Grazers treats weighs.',
      photos: [
        {
          src: 'Images/challenge/weigh-w8-grazers-handful-1.png',
          alt: 'A hand holding a pile of green Grazers pellets outdoors',
        },
        {
          src: 'Images/challenge/weigh-w8-grazers-handful-2.jpg',
          alt: 'Another view of the same handful of Grazers pellets',
        },
      ],
    },
    {
      id: 'halterApproach',
      kind: 'choice',
      unit: 'exact',
      group: 'Approaching with a halter',
      detail:
        'A horse consistently backs away when its handler approaches with a halter. The handler begins approaching more slowly, stopping before the horse retreats, and rewarding the horse for remaining relaxed. Over several sessions, the horse begins allowing the handler to approach. Which learning process best describes what the handler is attempting?',
      choices: [
        { value: 1, label: 'Habituation through repeated exposure alone' },
        { value: 2, label: 'Counterconditioning by changing the horse’s emotional response' },
        { value: 3, label: 'Negative reinforcement by removing pressure after retreat' },
        { value: 4, label: 'Flooding by preventing the horse from escaping' },
      ],
    },
    {
      id: 'mutualGrooming',
      kind: 'choice',
      unit: 'exact',
      group: 'Mutual grooming',
      detail:
        'Two horses regularly groom each other around the withers and neck. What is this behavior called?',
      choices: [
        { value: 1, label: 'Displacement grooming' },
        { value: 2, label: 'Allogrooming' },
        { value: 3, label: 'Stereotypic grooming' },
        { value: 4, label: 'Counterconditioning' },
      ],
    },
    {
      id: 'pressureRelease',
      kind: 'choice',
      unit: 'exact',
      group: 'Pressure and release',
      detail:
        'A horse learns to step backward when a handler applies pressure and releases it immediately after the horse takes a step. What learning principle is being used?',
      choices: [
        { value: 1, label: 'Positive reinforcement' },
        { value: 2, label: 'Negative reinforcement' },
        { value: 3, label: 'Positive punishment' },
        { value: 4, label: 'Habituation' },
      ],
    },
    {
      id: 'pawing',
      kind: 'choice',
      unit: 'exact',
      group: 'Pawing at the stall door',
      detail:
        'A horse paws at the stall door before feeding time. One morning, the owner feeds the horse while it is pawing. Over the following days, the horse begins pawing earlier and more frequently. Which learning principle best explains the increase in pawing?',
      choices: [
        { value: 1, label: 'Classical conditioning' },
        { value: 2, label: 'Positive reinforcement' },
        { value: 3, label: 'Negative reinforcement' },
        { value: 4, label: 'Sensitization' },
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
    params.get('weighW8Preview') === '1' ||
    params.get('preview') === PREVIEW_KEY ||
    params.get('unlockAll') === '1';
  if (params.get('weighW8Reset') === '1') {
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
  function isChoice(item) {
    return item && item.kind === 'choice';
  }
  function fieldName(item) {
    if (item.unit === 'percent') return item.id + '-pct';
    if (item.unit === 'dollars') return item.id + '-dollars';
    if (item.unit === 'pounds') return item.id + '-lb';
    if (item.unit === 'grams') return item.id + '-g';
    return item.id;
  }
  function storedNumber(item, row) {
    if (row == null) return NaN;
    if (typeof row === 'number') return row;
    if (typeof row !== 'object') return NaN;
    if (item.unit === 'pounds') return Number(row.lb);
    if (item.unit === 'percent') return Number(row.pct);
    if (item.unit === 'dollars') return Number(row.dollars);
    if (item.unit === 'grams') return Number(row.grams);
    return Number(row.choice != null ? row.choice : row.value);
  }
  function payloadFor(item, n) {
    if (item.unit === 'pounds') return { lb: n };
    if (item.unit === 'percent') return { pct: n };
    if (item.unit === 'dollars') return { dollars: n };
    if (item.unit === 'grams') return { grams: n };
    return { choice: n };
  }
  function choiceLabel(item, n) {
    if (!item.choices) return '';
    for (var i = 0; i < item.choices.length; i++) {
      if (Math.abs(Number(item.choices[i].value) - n) < 1e-9) return item.choices[i].label;
    }
    return '';
  }
  function formatNumber(n, digits) {
    var num = Number(n);
    if (isNaN(num)) return '';
    return num.toFixed(digits);
  }
  function formatOfficialValue(item, row) {
    if (row && typeof row === 'object' && row.display) return String(row.display);
    var n = storedNumber(item, row);
    if (isNaN(n)) return '—';
    if (isChoice(item)) return choiceLabel(item, n) || String(n);
    if (item.unit === 'percent') return formatNumber(n, 2) + '%';
    if (item.unit === 'dollars') return '$' + formatNumber(n, 2);
    if (item.unit === 'grams') {
      var grams = Math.abs(n - Math.round(n)) < 0.001 ? String(Math.round(n)) : formatNumber(n, 2);
      return grams + ' g';
    }
    return formatNumber(n, 2) + ' lb';
  }
  function guessValue(item) {
    if (!myGuesses || myGuesses[item.id] == null) return null;
    var n = storedNumber(item, myGuesses[item.id]);
    return isNaN(n) ? null : n;
  }
  function guessSuffix(item, yours) {
    if (yours == null) return '';
    var label = formatOfficialValue(item, payloadFor(item, yours));
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
          'Enter the handful in grams and answer all four questions. Official answers post here Sunday at 8:00 PM ET when scores go up.';
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
      return !isNaN(n) && n >= 0 && (!isChoice(item) || !!choiceLabel(item, n));
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

  function choiceFieldsHtml(item) {
    return (
      '<fieldset class="weigh-choices" aria-label="' +
      escapeHtml(item.group) +
      '">' +
      item.choices
        .map(function (choice, idx) {
          return (
            '<label class="weigh-choice"><input type="radio" name="' +
            item.id +
            '" value="' +
            choice.value +
            '"' +
            (idx === 0 ? ' required' : '') +
            '><span>' +
            escapeHtml(choice.label) +
            '</span></label>'
          );
        })
        .join('') +
      '</fieldset>'
    );
  }

  function numberFieldHtml(item) {
    var suffix =
      item.unit === 'percent' ? '%' : item.unit === 'dollars' ? '$' : item.unit === 'grams' ? 'g' : 'lb';
    var max = item.unit === 'percent' ? '100' : item.unit === 'dollars' ? '20' : item.unit === 'grams' ? '2000' : '50';
    return (
      '<label class="weigh-item__field"><span>' +
      suffix +
      '</span>' +
      '<input class="form-input" type="number" name="' +
      fieldName(item) +
      '" min="0" max="' +
      max +
      '" step="0.01" inputmode="decimal" required></label>'
    );
  }

  function productHtml(item) {
    var link = item.link
      ? '<a href="' +
        escapeHtml(item.link.href) +
        '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(item.link.label) +
        '</a>'
      : '';
    var before = item.lead ? escapeHtml(item.lead) + ' ' : '';
    var after = item.detail ? (link || item.lead ? ' ' : '') + escapeHtml(item.detail) : '';
    if (!link && !item.lead) return escapeHtml(item.detail || '');
    return before + link + after;
  }

  function photosHtml(item) {
    var photos = item.photos || (item.photo ? [{ src: item.photo, alt: item.photoAlt || item.group }] : []);
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
    return '<div class="weigh-item__photos">' + imgs + '</div>';
  }

  function itemRowsHtml() {
    return ITEMS.map(function (item, idx) {
      var choice = isChoice(item);
      var photo = photosHtml(item);
      return (
        '<div class="weigh-item ' +
        (choice ? 'weigh-item--choice' : 'weigh-item--number') +
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
        productHtml(item) +
        '</p>' +
        photo +
        '</div>' +
        '<div class="weigh-item__fields">' +
        (choice ? choiceFieldsHtml(item) : numberFieldHtml(item)) +
        '</div>' +
        '</div>'
      );
    }).join('');
  }

  function ensureDialog() {
    dialog = document.getElementById('thc-dialog-weigh-w8');
    if (dialog) {
      form = dialog.querySelector('#weigh-w8-form');
      statusEl = dialog.querySelector('#weigh-w8-status');
      return dialog;
    }
    dialog = document.createElement('dialog');
    dialog.id = 'thc-dialog-weigh-w8';
    dialog.className = 'thc-dialog thc-dialog--challenge thc-dialog--weigh';
    dialog.innerHTML =
      '<div class="thc-dialog__inner thc-dialog__inner--challenge">' +
      '<button type="button" class="thc-dialog-close" data-weigh-w8-dismiss aria-label="Close">&times;</button>' +
      '<div class="thc-dialog__body weigh-dialog__body">' +
      '<p class="thc-dialog__eyebrow">Mid-week bonus · up to 9 points</p>' +
      '<h2 class="thc-dialog__title">What’s It Weigh Wednesday</h2>' +
      '<p class="thc-dialog__text">Guess the weight of this Grazers handful, then answer four behavior questions. Closest overall wins. Open through Sunday, October 25 at 8:00 PM ET. You may edit until the deadline. Official answers post here when it scores Sunday at 8:00 PM ET.</p>' +
      '<aside class="weigh-honor" role="note">' +
      '<p class="weigh-honor__title">Google and AI are prohibited</p>' +
      '<p>Answer from your own knowledge. Google and other search engines, including image search, retailer or manufacturer sites, AI tools and chatbots, and help from other people are prohibited. A calculator is fine for arithmetic only. <a href="horsemanship-challenge-rules.html#wiww">Official Rules, section 4A</a>.</p>' +
      '</aside>' +
      '<form id="weigh-w8-form" class="weigh-form" novalidate>' +
      '<div class="weigh-form__list">' +
      itemRowsHtml() +
      '</div>' +
      answersPanelHtml() +
      '<p class="weigh-form__hint">Enter the handful in grams and answer all four questions. Official answers post here Sunday at 8:00 PM ET when scores go up.</p>' +
      '<p id="weigh-w8-status" class="weigh-form__status" hidden></p>' +
      '<div class="thc-dialog__actions">' +
      '<button type="submit" class="btn-primary" data-weigh-w8-submit>Save my 5 guesses</button>' +
      '<button type="button" class="btn-ghost" data-weigh-w8-dismiss>Not now</button>' +
      '</div>' +
      '</form>' +
      '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    form = dialog.querySelector('#weigh-w8-form');
    statusEl = dialog.querySelector('#weigh-w8-status');
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
      if (isChoice(item)) {
        form.querySelectorAll('[name="' + item.id + '"]').forEach(function (el) {
          el.checked = Math.abs(Number(el.value) - n) < 1e-9;
        });
        return;
      }
      var el = form.querySelector('[name="' + fieldName(item) + '"]');
      if (el) el.value = n;
    });
  }

  function setFormLocked(locked) {
    if (!form) return;
    form.querySelectorAll('input').forEach(function (el) {
      el.disabled = !!locked;
    });
    var submit = form.querySelector('[data-weigh-w8-submit]');
    if (submit) {
      submit.hidden = !!locked;
      submit.textContent = hasSubmitted ? 'Update my guesses' : 'Save my 5 guesses';
    }
    var dismissBtn = form.querySelector('[data-weigh-w8-dismiss]');
    if (dismissBtn) dismissBtn.textContent = locked ? 'Close' : 'Not now';
  }

  function updateCards() {
    document.querySelectorAll('[data-weigh-w8-card]').forEach(function (card) {
      if (windowNotOpenYet() || cardRetired()) {
        card.hidden = true;
        return;
      }
      card.hidden = false;
      var title = card.querySelector('[data-weigh-w8-title]');
      var note = card.querySelector('[data-weigh-w8-note]');
      var openBtn = card.querySelector('[data-weigh-w8-open]');
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
            'Mid-week bonus · up to 9 points. A Grazers handful and four behavior questions. Closest overall wins. Google and AI are prohibited.';
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
      if (isChoice(item)) {
        var selected = form.querySelector('[name="' + item.id + '"]:checked');
        var choice = selected ? Number(selected.value) : NaN;
        if (isNaN(choice) || !choiceLabel(item, choice)) return null;
        guesses[item.id] = payloadFor(item, choice);
        continue;
      }
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
      if (isChoice(item)) {
        var selected = form.querySelector('[name="' + item.id + '"]:checked');
        if (!selected) return;
        partial[item.id] = payloadFor(item, Number(selected.value));
        return;
      }
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
      setStatus('Enter a gram weight greater than 0 and answer each multiple-choice question.', true);
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
    if (!document.querySelector('[data-weigh-w8-card]')) return;
    ensureDialog();
    updateCards();

    dialog.querySelectorAll('[data-weigh-w8-dismiss]').forEach(function (el) {
      el.addEventListener('click', function () {
        persistDismiss();
        closeDialog();
      });
    });
    dialog.addEventListener('cancel', function () {
      persistDismiss();
    });
    if (form) form.addEventListener('submit', handleSubmit);
    document.querySelectorAll('[data-weigh-w8-open]').forEach(function (btn) {
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
