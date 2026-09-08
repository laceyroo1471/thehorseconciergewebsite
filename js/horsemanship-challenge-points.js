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
 *   data-challenge-point-action="week2-eei-class-pick"
 *
 * On click / submit (signed-in challenge user):
 *   1) Writes challengeRegistrations/{uid}.pointActions[actionId] (idempotent)
 *   2) Best-effort audit row in challengePointEvents
 *   3) Cloud Functions copy that into challengeActions / challengeScores
 *   4) Forms email via Formsubmit ajax so the page does not refresh
 *
 * Not signed in → prompt to sign in. Forms never native-POST unsigned.
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var PENDING_KEY = 'thcChallengePendingPointAction';
  var FORMSUBMIT_AJAX = 'https://formsubmit.co/ajax/info@thehorseconcierge.com';

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
  var latestRegistration = null;

  function statusTarget(fromEl) {
    if (fromEl && fromEl.closest) {
      var host = fromEl.closest('.funnel-panel, .challenge-day__action, .challenge-question-panel');
      if (host) {
        var local = host.querySelector('.challenge-point-track-status');
        if (local) return local;
      }
    }
    if (fromEl && fromEl.parentNode) {
      var sibling = fromEl.parentNode.querySelector('.challenge-point-track-status');
      if (sibling) return sibling;
    }
    return document.getElementById('challenge-point-track-status');
  }

  function setStatus(fromEl, msg, isError, isSuccess) {
    var el = statusTarget(fromEl);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    el.classList.toggle('challenge-point-track-status--error', !!isError);
    el.classList.toggle('challenge-point-track-status--success', !!isSuccess && !isError);
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

  function identityFrom(user, registration) {
    var name = '';
    if (registration && registration.name) name = String(registration.name).trim();
    if (!name && user && user.displayName) name = String(user.displayName).trim();
    var email = '';
    if (user && user.email) email = String(user.email).trim();
    if (!email && registration && registration.email) email = String(registration.email).trim();
    if (!name && email) name = email;
    return { name: name, email: email };
  }

  function applyIdentityToForm(form, user, registration) {
    if (!form) return identityFrom(user, registration);
    var id = identityFrom(user, registration);
    var nameEl = form.querySelector('input[name="name"]');
    var emailEl = form.querySelector('input[name="email"]');
    if (nameEl && !String(nameEl.value || '').trim() && id.name) nameEl.value = id.name;
    if (emailEl && id.email) emailEl.value = id.email;
    return id;
  }

  function setFormBusy(form, busy) {
    if (!form) return;
    form.querySelectorAll('button[type="submit"]').forEach(function (btn) {
      btn.disabled = !!busy;
    });
  }

  function showFormReceived(form, action, already) {
    if (!form || !action) return;
    form.setAttribute('data-challenge-points-logged', '1');
    form.classList.add('challenge-question-form--received');
    form.querySelectorAll('input, textarea, select, button').forEach(function (el) {
      if (el.type === 'hidden') return;
      el.disabled = true;
    });
    var msg = already
      ? action.points + ' points already logged for “' + action.label + '”.'
      : action.points + ' points received for “' + action.label + '”. You’re all set.';
    setStatus(form, msg, false, true);
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

    var regRef = db.collection('challengeRegistrations').doc(user.uid);
    var regWrite = regRef
      .update(
        new firebase.firestore.FieldPath('pointActions', action.actionId),
        actionPayload,
        'updatedAt',
        firebase.firestore.FieldValue.serverTimestamp()
      )
      .catch(function () {
        var nested = {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          pointActions: {},
        };
        nested.pointActions[action.actionId] = actionPayload;
        return regRef.set(nested, { merge: true });
      });

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
        setStatus(el, action.points + ' points logged for “' + action.label + '”. Opening the link.', false, true);
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

  function sendFormEmail(form) {
    var actionUrl = (form.getAttribute('action') || '').trim();
    var ajaxUrl = FORMSUBMIT_AJAX;
    if (actionUrl.indexOf('https://formsubmit.co/') === 0) {
      ajaxUrl = actionUrl.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
    }

    var hasFile = !!form.querySelector('input[type="file"]');
    var request;
    if (hasFile) {
      var fd = new FormData(form);
      fd.delete('_next');
      request = fetch(ajaxUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fd,
      });
    } else {
      var data = {};
      new FormData(form).forEach(function (value, key) {
        if (key === '_next') return;
        data[key] = value;
      });
      request = fetch(ajaxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(data),
      });
    }

    return request.then(function (res) {
      if (!res.ok) throw new Error('formsubmit ' + res.status);
      return res.json().catch(function () {
        return {};
      });
    });
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

    e.preventDefault();

    if (form.getAttribute('data-challenge-points-logged') === '1') {
      setStatus(form, 'Already received — your points are logged.', false, true);
      return;
    }

    var user = auth.currentUser;
    if (!user) {
      promptSignIn(form, action);
      return;
    }

    applyIdentityToForm(form, user, latestRegistration);
    var id = identityFrom(user, latestRegistration);
    if (!id.email) {
      setStatus(form, 'Stay signed in with your Challenge account so we can credit these points.', true);
      return;
    }

    setFormBusy(form, true);
    setStatus(form, 'Saving your ' + action.points + ' points…');
    writePointAction(user, action)
      .then(function () {
        return sendFormEmail(form).catch(function (err) {
          console.warn('form email skipped', err);
          return { emailFailed: true };
        });
      })
      .then(function (emailResult) {
        showFormReceived(form, action, false);
        if (emailResult && emailResult.emailFailed) {
          setStatus(
            form,
            action.points + ' points received for “' + action.label + '”. You’re all set.',
            false,
            true
          );
        }
      })
      .catch(function (err) {
        console.error(err);
        setFormBusy(form, false);
        setStatus(
          form,
          'Could not save points. Stay signed in and try again, or email info@thehorseconcierge.com.',
          true
        );
      });
  }

  function fillAutofillForms(user, registration) {
    document.querySelectorAll('form[data-challenge-autofill-user]').forEach(function (form) {
      applyIdentityToForm(form, user, registration);
    });
  }

  function markClaimedForms(registration) {
    var actions = (registration && registration.pointActions) || {};
    document.querySelectorAll('form[data-challenge-point-action]').forEach(function (form) {
      var action = readActionFromEl(form);
      if (!action) return;
      if (actions[action.actionId]) showFormReceived(form, action, true);
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

  function loadRegistration(uid) {
    return db
      .collection('challengeRegistrations')
      .doc(uid)
      .get()
      .then(function (snap) {
        return snap.exists ? snap.data() || {} : null;
      })
      .catch(function (err) {
        console.warn('challenge registration read skipped', err);
        return null;
      });
  }

  wireLinksAndForms();

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      latestRegistration = null;
      fillAutofillForms(null, null);
      return;
    }
    loadRegistration(user.uid).then(function (registration) {
      latestRegistration = registration;
      fillAutofillForms(user, registration);
      markClaimedForms(registration);
      resumePendingIfAny(user);
    });
  });
})();
