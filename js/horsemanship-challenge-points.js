/**
 * Horsemanship Challenge — outbound click point tracking.
 *
 * Mark links with:
 *   data-challenge-point-action="week1-madbarn-diet-eval"
 *   data-challenge-point-points="10"
 *   data-challenge-point-week="1"
 *   data-challenge-point-label="Mad Barn nutrition evaluation"
 *
 * On click (signed-in challenge user):
 *   1) Writes challengeRegistrations/{uid}.pointActions[actionId] (idempotent)
 *   2) Best-effort audit row in challengePointEvents
 *   3) Opens the destination URL
 *
 * Not signed in → prompt to sign in; remembers the pending action for this tab.
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

  function statusEl() {
    return document.getElementById('challenge-point-track-status');
  }

  function setStatus(msg, isError) {
    var el = statusEl();
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    el.classList.toggle('challenge-point-track-status--error', !!isError);
  }

  function readActionFromEl(el) {
    if (!el) return null;
    var actionId = (el.getAttribute('data-challenge-point-action') || '').trim();
    var href = (el.getAttribute('href') || '').trim();
    if (!actionId || !href) return null;
    return {
      actionId: actionId,
      points: parseInt(el.getAttribute('data-challenge-point-points') || '0', 10) || 0,
      weekNumber: parseInt(el.getAttribute('data-challenge-point-week') || '0', 10) || 0,
      label: (el.getAttribute('data-challenge-point-label') || actionId).trim(),
      href: href,
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
      destinationUrl: action.href,
      challengeId: CHALLENGE_ID,
      status: 'auto_claimed',
      verificationPartner: 'Mad Barn',
      verificationNote:
        'Outbound click logged automatically. Verify against Mad Barn Challenge diet submissions.',
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
          destinationUrl: action.href,
          status: 'auto_claimed',
          verificationPartner: 'Mad Barn',
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

  function claimAndOpen(user, action) {
    setStatus('Saving your ' + action.points + ' points…');
    return writePointAction(user, action)
      .then(function () {
        clearPending();
        setStatus(
          action.points +
            ' points logged for “' +
            action.label +
            '”. Opening Mad Barn — we’ll verify submissions with them.'
        );
        openDestination(action.href);
      })
      .catch(function (err) {
        console.error(err);
        setStatus(
          'Could not save points automatically. Opening Mad Barn anyway — email info@thehorseconcierge.com if this keeps happening.',
          true
        );
        openDestination(action.href);
      });
  }

  function handleTrackedClick(e) {
    var el = e.currentTarget;
    var action = readActionFromEl(el);
    if (!action) return;

    e.preventDefault();

    var user = auth.currentUser;
    if (!user) {
      savePending(action);
      setStatus(
        'Sign in with your Challenge account first so we can credit ' +
          action.points +
          ' points automatically. We’ll bring you right back.',
        true
      );
      window.setTimeout(function () {
        window.location.href = DOOR_SIGNIN;
      }, 1200);
      return;
    }

    claimAndOpen(user, action);
  }

  function wireLinks() {
    document.querySelectorAll('[data-challenge-point-action]').forEach(function (el) {
      el.addEventListener('click', handleTrackedClick);
    });
  }

  function resumePendingIfAny(user) {
    if (!user) return;
    var pending = loadPending();
    if (!pending || !pending.actionId || !pending.href) return;
    claimAndOpen(user, pending);
  }

  wireLinks();

  auth.onAuthStateChanged(function (user) {
    if (user) resumePendingIfAny(user);
  });
})();
