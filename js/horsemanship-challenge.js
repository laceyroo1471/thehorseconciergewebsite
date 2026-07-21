/**
 * horsemanship-challenge.html — door / registration page.
 * Signed-in + registered → auto-open hub.
 * Returning users can sign in with email/password only.
 */
(function () {
  var FB_GROUP_URL = 'https://www.facebook.com/groups/1388463146804189';
  var HUB_URL = 'horsemanship-challenge-hub.html';
  var CHALLENGE_ID = 'horsemanship-2026';

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var form = document.getElementById('challenge-register-form');
  var signInForm = document.getElementById('challenge-signin-form');
  var registerPanel = document.getElementById('challenge-register-panel');
  var signInPanel = document.getElementById('challenge-signin-panel');
  var alreadyEl = document.getElementById('challenge-already-registered');
  var registeredNameEl = document.getElementById('challenge-registered-name');
  var fbLink = document.getElementById('challenge-fb-group-link');
  var busyEl = document.getElementById('challenge-register-busy');
  var errEl = document.getElementById('challenge-register-error');
  var successEl = document.getElementById('challenge-register-success');
  var submitBtn = document.getElementById('challenge-register-submit');
  var signInBusyEl = document.getElementById('challenge-signin-busy');
  var signInErrEl = document.getElementById('challenge-signin-error');
  var signInSubmitBtn = document.getElementById('challenge-signin-submit');
  var authTabs = document.getElementById('challenge-auth-tabs');
  var tabSignIn = document.getElementById('challenge-tab-signin');
  var tabRegister = document.getElementById('challenge-tab-register');

  var redirecting = false;
  var guestMode = 'signin';

  if (typeof firebase === 'undefined') {
    if (errEl) {
      errEl.textContent = 'Could not load Firebase. Refresh the page or try again shortly.';
      errEl.hidden = false;
    }
    return;
  }

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function normalizeEmail(email) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function setBusy(msg) {
    if (busyEl) {
      busyEl.textContent = msg || '';
      busyEl.hidden = !msg;
    }
    if (submitBtn) submitBtn.disabled = !!msg;
  }

  function setSignInBusy(msg) {
    if (signInBusyEl) {
      signInBusyEl.textContent = msg || '';
      signInBusyEl.hidden = !msg;
    }
    if (signInSubmitBtn) signInSubmitBtn.disabled = !!msg;
  }

  function showError(msg) {
    if (errEl) {
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
    }
    if (successEl) successEl.hidden = true;
  }

  function showSignInError(msg) {
    if (signInErrEl) {
      signInErrEl.textContent = msg || '';
      signInErrEl.hidden = !msg;
    }
  }

  function showSuccess(msg) {
    if (successEl) {
      successEl.textContent = msg || '';
      successEl.hidden = !msg;
    }
    if (errEl) errEl.hidden = true;
  }

  function mapAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
        return 'Incorrect email or password. Use the same login as The Horse Concierge app.';
      case 'auth/email-already-in-use':
        return 'That email already has an account — enter the correct password to register for the challenge.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'permission-denied':
        return 'Could not save registration — Firestore rules may need updating for challengeRegistrations.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  function hasFbGroupUrl() {
    return typeof FB_GROUP_URL === 'string' && /^https?:\/\/.+/i.test(FB_GROUP_URL.trim());
  }

  function wireFbLinks() {
    if (!fbLink) return;
    if (hasFbGroupUrl()) {
      fbLink.href = FB_GROUP_URL.trim();
      fbLink.hidden = false;
    } else {
      fbLink.hidden = true;
    }
  }

  function syncTabs(mode) {
    if (tabSignIn) tabSignIn.setAttribute('aria-selected', mode === 'signin' ? 'true' : 'false');
    if (tabRegister) tabRegister.setAttribute('aria-selected', mode === 'register' ? 'true' : 'false');
  }

  function setPanel(mode) {
    // mode: 'register' | 'signin' | 'already'
    if (mode === 'register' || mode === 'signin') guestMode = mode;

    if (registerPanel) registerPanel.hidden = mode !== 'register';
    if (signInPanel) signInPanel.hidden = mode !== 'signin';
    if (alreadyEl) alreadyEl.hidden = mode !== 'already';
    if (authTabs) authTabs.hidden = mode === 'already';

    if (mode === 'register' || mode === 'signin') syncTabs(mode);
  }

  function showAlreadyRegistered(registration, autoOpen) {
    setPanel('already');
    if (registeredNameEl) {
      var name = (registration && registration.name) || '';
      registeredNameEl.textContent = name
        ? 'Welcome back, ' + name + '. Opening your Challenge Hub…'
        : 'Welcome back. Opening your Challenge Hub…';
    }
    wireFbLinks();
    if (autoOpen !== false) {
      redirecting = true;
      setTimeout(openHub, 400);
    }
  }

  function getReferralPartner() {
    try {
      return new URLSearchParams(window.location.search).get('ref') || '';
    } catch (e) {
      return '';
    }
  }

  function validateForm() {
    var name = val('challenge-name');
    var email = normalizeEmail(val('challenge-email'));
    var password =
      (document.getElementById('challenge-password') &&
        document.getElementById('challenge-password').value) ||
      '';
    var horseHousing = val('challenge-housing');
    var yearsOwned = val('challenge-years');
    var primaryDiscipline = val('challenge-discipline');
    var horseCountRaw = val('challenge-horse-count');
    var consentEl = document.getElementById('challenge-email-consent');
    var emailConsent = !!(consentEl && consentEl.checked);

    if (!name) return showError('Please enter your name.'), null;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError('Please enter a valid email.'), null;
    }
    if (!password || password.length < 6) {
      return showError('Password must be at least 6 characters.'), null;
    }
    if (!horseHousing) return showError('Please select where you keep your horse.'), null;
    if (!yearsOwned) return showError('Please select how long you have owned horses.'), null;
    if (!primaryDiscipline) return showError('Please select your primary discipline.'), null;
    if (horseCountRaw === '' || isNaN(Number(horseCountRaw)) || Number(horseCountRaw) < 0) {
      return showError('Please enter how many horses you own (use 0 if none).'), null;
    }
    if (!emailConsent) {
      return showError('Please agree to receive challenge emails to continue.'), null;
    }

    return {
      name: name,
      email: email,
      password: password,
      horseHousing: horseHousing,
      yearsOwned: yearsOwned,
      primaryDiscipline: primaryDiscipline,
      horseCount: Math.floor(Number(horseCountRaw)),
      emailConsent: true,
      referralPartner: getReferralPartner(),
    };
  }

  function writeUserProfile(user, name) {
    return db
      .collection('users')
      .doc(user.uid)
      .set(
        {
          uid: user.uid,
          email: user.email,
          role: 'user',
          name: name,
          displayName: name,
          isEarlyAdopter: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  function ensureAuth(email, password, name) {
    var user = auth.currentUser;
    if (user && normalizeEmail(user.email) === normalizeEmail(email)) {
      return writeUserProfile(user, name).then(function () {
        return user;
      });
    }

    function signUpOrIn() {
      return auth
        .createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          return writeUserProfile(cred.user, name).then(function () {
            if (cred.user.updateProfile) {
              return cred.user.updateProfile({ displayName: name }).then(function () {
                return cred.user;
              });
            }
            return cred.user;
          });
        })
        .catch(function (err) {
          if (err.code === 'auth/email-already-in-use') {
            return auth.signInWithEmailAndPassword(email, password).then(function (cred) {
              return writeUserProfile(cred.user, name).then(function () {
                return cred.user;
              });
            });
          }
          throw err;
        });
    }

    if (user && normalizeEmail(user.email) !== normalizeEmail(email)) {
      return auth.signOut().then(signUpOrIn);
    }

    return signUpOrIn();
  }

  function saveRegistration(user, data) {
    var payload = {
      userId: user.uid,
      name: data.name,
      email: data.email,
      challengeId: CHALLENGE_ID,
      horseHousing: data.horseHousing,
      yearsOwned: data.yearsOwned,
      primaryDiscipline: data.primaryDiscipline,
      horseCount: data.horseCount,
      emailConsent: true,
      emailConsentAt: firebase.firestore.FieldValue.serverTimestamp(),
      referralPartner: data.referralPartner || '',
      status: 'active',
      source: 'web',
      registeredAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    return db
      .collection('challengeRegistrations')
      .doc(user.uid)
      .set(payload, { merge: true })
      .then(function () {
        return payload;
      });
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

  function openHub() {
    window.location.assign(HUB_URL);
  }

  function openGuestTab(mode) {
    showError('');
    showSignInError('');
    setPanel(mode === 'register' ? 'register' : 'signin');
    if (mode === 'signin') {
      var email = val('challenge-email');
      var signInEmail = document.getElementById('challenge-signin-email');
      if (signInEmail && email) signInEmail.value = email;
    }
  }

  if (tabSignIn) {
    tabSignIn.addEventListener('click', function () {
      openGuestTab('signin');
    });
  }
  if (tabRegister) {
    tabRegister.addEventListener('click', function () {
      openGuestTab('register');
    });
  }

  document.querySelectorAll('[data-challenge-open-tab]').forEach(function (el) {
    el.addEventListener('click', function () {
      openGuestTab(el.getAttribute('data-challenge-open-tab') || 'signin');
    });
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('');
      showSuccess('');

      var data = validateForm();
      if (!data) return;

      setBusy('Creating your registration…');

      ensureAuth(data.email, data.password, data.name)
        .then(function (user) {
          setBusy('Unlocking the Challenge Hub…');
          return saveRegistration(user, data);
        })
        .then(function () {
          setBusy('');
          showSuccess('You’re in — opening the Challenge Hub…');
          redirecting = true;
          setTimeout(openHub, 600);
        })
        .catch(function (err) {
          console.error(err);
          setBusy('');
          showError(mapAuthError(err.code) || err.message || 'Registration failed.');
        });
    });
  }

  if (signInForm) {
    signInForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showSignInError('');

      var email = normalizeEmail(val('challenge-signin-email'));
      var password =
        (document.getElementById('challenge-signin-password') &&
          document.getElementById('challenge-signin-password').value) ||
        '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return showSignInError('Please enter a valid email.');
      }
      if (!password || password.length < 6) {
        return showSignInError('Please enter your password.');
      }

      setSignInBusy('Signing you in…');

      auth
        .signInWithEmailAndPassword(email, password)
        .then(function (cred) {
          setSignInBusy('Opening your Challenge Hub…');
          return loadRegistration(cred.user.uid).then(function (registration) {
            if (!registration) {
              throw { code: 'no-registration' };
            }
            redirecting = true;
            openHub();
          });
        })
        .catch(function (err) {
          console.error(err);
          setSignInBusy('');
          if (err && err.code === 'no-registration') {
            showSignInError(
              'No challenge registration found for this account. Create your registration below.'
            );
            setPanel('register');
            var regEmail = document.getElementById('challenge-email');
            if (regEmail) regEmail.value = email;
            return;
          }
          showSignInError(mapAuthError(err.code) || err.message || 'Sign in failed.');
        });
    });
  }

  // Default guest view = Sign In (cross-device). Register tab always available.
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('register') === '1' || window.location.hash === '#register-form') {
      setPanel('register');
    } else {
      setPanel('signin');
    }
  } catch (e) {
    setPanel('signin');
  }

  auth.onAuthStateChanged(function (user) {
    if (redirecting) return;

    if (!user) {
      setPanel(guestMode || 'signin');
      return;
    }

    loadRegistration(user.uid)
      .then(function (registration) {
        if (redirecting) return;
        if (registration) {
          showAlreadyRegistered(registration, true);
        } else {
          // Signed into app but not challenge yet — keep Register available
          setPanel('register');
        }
      })
      .catch(function (err) {
        console.warn(err);
        if (!redirecting) setPanel(guestMode || 'signin');
      });
  });
})();
