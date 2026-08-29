/**
 * Horsemanship Challenge — Hub click + form point tracking.
 *
 * Links:
 *   data-challenge-point-action="week1-madbarn-diet-eval"
 *   data-challenge-point-points="10"
 *   data-challenge-point-week="1"
 *   data-challenge-point-label="Mad Barn nutrition evaluation"
 *
 * Forms (same attributes on the <form>):
 *   data-challenge-point-action="week1-question"
 *
 * On click / submit (signed-in challenge user):
 *   1) Writes challengeRegistrations/{uid}.pointActions[actionId] (idempotent)
 *   2) Best-effort audit row in challengePointEvents
 *   3) Cloud Functions copy that into challengeActions / challengeScores
 *
 * Not signed in → prompt to sign in. Link clicks remember the pending action
 * for this tab; forms ask for sign-in first so the email still goes through.
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var PENDING_KEY = 'thcChallengePendingPointAction';

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  if (typeof firebase === 'undefined') return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function statusTarget(fromEl) {
    if (fromEl) {
      var panel = fromEl.closest ? fromEl.closest('.funnel-panel') : null;
      if (panel) {
        var local = panel.querySelector('.challenge-point-track-status');
        if (local) return local;
      }
    }
    return document.getElementById('challenge-point-track-status');
  }

  function setStatus(fromEl, msg, isError) {
    var el = statusTarget(fromEl);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    el.classList.toggle('challenge-point-track-status--error', !!isError);
  }

  function readActionFromEl(el) {
    if (!el) return null;
    var actionId = (el.getAttribute('data-challenge-point-action') || '').trim();
    if (!actionId) return null;
    var href = (el.getAttribute('href') || '').trim();
    var isForm = el.tagName === 'FORM';
    if (!isForm && !href) return null;
    return {
      actionId: actionId,
      points: parseInt(el.getAttribute('data-challenge-point-points') || '0', 10) || 0,
      weekNumber: parseInt(el.getAttribute('data-challenge-point-week') || '0', 10) || 0,
      label: (el.getAttribute('data-challenge-point-label') || actionId).trim(),
      partner: (el.getAttribute('data-challenge-point-partner') || '').trim(),
      href: href,
      isForm: isForm,
    };
  }

  function savePending(action) {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(action));
    } catch (e) {}
  }

  function loadPending() {
    try {
      var raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearPending() {
    try {
      sessionStorage.removeItem(PENDING_KEY);
    } catch (e) {}
  }

  function openDestination(href) {
    var win = window.open(href, '_blank', 'noopener,noreferrer');
    if (!win) {
      window.location.href = href;
    }
  }

  function writePointAction(user, action) {
    var actionPayload = {
      actionId: action.actionId,
      points: action.points,
      weekNumber: action.weekNumber,
      label: action.label,
      destinationUrl: action.href || '',
      challengeId: CHALLENGE_ID,
      status: 'auto_claimed',
      verificationPartner: action.partner || '',
      verificationNote: 'Logged automatically from the Challenge Hub.',
      clickedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    var regUpdate = {
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    regUpdate['pointActions.' + action.actionId] = actionPayload;

    var regWrite = db
      .collection('challengeRegistrations')
      .doc(user.uid)
      .set(regUpdate, { merge: true });

    var eventId = user.uid + '__' + action.actionId;
    var eventWrite = db
      .collection('challengePointEvents')
      .doc(eventId)
      .set(
        {
          userId: user.uid,
          email: user.email || '',
          challengeId: CHALLENGE_ID,
          actionId: action.actionId,
          points: action.points,
          weekNumber: action.weekNumber,
          label: action.label,
          destinationUrl: action.href || '',
          status: 'auto_claimed',
          verificationPartner: action.partner || '',
          clickedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .catch(function (err) {
        console.warn('challengePointEvents write skipped:', err);
      });

    return Promise.all([regWrite, eventWrite]);
  }

  function promptSignIn(el, action) {
    setStatus(
      el,
      'Sign in with your Challenge account first so we can credit ' +
        action.points +
        ' points automatically. We’ll bring you right back.',
      true
    );
    window.setTimeout(function () {
      window.location.href = DOOR_SIGNIN;
    }, 1200);
  }

  function claimAndOpen(user, action, el) {
    setStatus(el, 'Saving your ' + action.points + ' points…');
    return writePointAction(user, action)
      .then(function () {
        clearPending();
        setStatus(el, action.points + ' points logged for “' + action.label + '”. Opening the link.');
        openDestination(action.href);
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          el,
          'Could not save points automatically. Opening the link anyway — email info@thehorseconcierge.com if this keeps happening.',
          true
        );
        openDestination(action.href);
      });
  }

  function nativeSubmit(form) {
    HTMLFormElement.prototype.submit.call(form);
  }

  function handleTrackedClick(e) {
    var el = e.currentTarget;
    var action = readActionFromEl(el);
    if (!action || action.isForm) return;

    e.preventDefault();

    var user = auth.currentUser;
    if (!user) {
      savePending(action);
      promptSignIn(el, action);
      return;
    }

    claimAndOpen(user, action, el);
  }

  function handleTrackedSubmit(e) {
    var form = e.currentTarget;
    var action = readActionFromEl(form);
    if (!action) return;

    var user = auth.currentUser;
    if (!user) {
      e.preventDefault();
      promptSignIn(form, action);
      return;
    }

    if (form.getAttribute('data-challenge-points-logged') === '1') return;

    e.preventDefault();
    setStatus(form, 'Saving your ' + action.points + ' points…');
    writePointAction(user, action)
      .then(function () {
        form.setAttribute('data-challenge-points-logged', '1');
        setStatus(form, action.points + ' points logged for “' + action.label + '”. Sending your form…');
        nativeSubmit(form);
      })
      .catch(function (err) {
        console.error(err);
        form.setAttribute('data-challenge-points-logged', '1');
        setStatus(
          form,
          'Could not save points automatically — sending your form anyway. Email info@thehorseconcierge.com if the points don’t show.',
          true
        );
        nativeSubmit(form);
      });
  }

  function fillAutofillForms(user) {
    document.querySelectorAll('form[data-challenge-autofill-user]').forEach(function (form) {
      var nameEl = form.querySelector('input[name="name"]');
      var emailEl = form.querySelector('input[name="email"]');
      if (nameEl && !nameEl.value) nameEl.value = (user && user.displayName) || '';
      if (emailEl) emailEl.value = (user && user.email) || '';
    });
  }

  function wireLinksAndForms() {
    document.querySelectorAll('[data-challenge-point-action]').forEach(function (el) {
      if (el.tagName === 'FORM') {
        el.addEventListener('submit', handleTrackedSubmit);
      } else {
        el.addEventListener('click', handleTrackedClick);
      }
    });
  }

  function resumePendingIfAny(user) {
    if (!user) return;
    var pending = loadPending();
    if (!pending || !pending.actionId || !pending.href || pending.isForm) return;
    claimAndOpen(user, pending, null);
  }

  wireLinksAndForms();

  auth.onAuthStateChanged(function (user) {
    fillAutofillForms(user);
    if (user) resumePendingIfAny(user);
  });
})();
