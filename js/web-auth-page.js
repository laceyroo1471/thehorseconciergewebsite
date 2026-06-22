/**
 * sign-in.html — create account or sign in (no horse profile required).
 */
(function () {
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

  var emailEl = document.getElementById('web-auth-email');
  var passwordEl = document.getElementById('web-auth-password');
  var btnSignIn = document.getElementById('web-auth-signin');
  var btnCreate = document.getElementById('web-auth-create');
  var errEl = document.getElementById('web-auth-error');
  var busyEl = document.getElementById('web-auth-busy');
  var formEl = document.getElementById('web-auth-form');
  var signedInEl = document.getElementById('web-auth-signed-in');

  function safeReturnUrl(raw) {
    if (!raw || typeof raw !== 'string') return '/find-providers';
    if (raw.indexOf('//') !== -1 || raw.charAt(0) !== '/') return '/find-providers';
    return raw;
  }

  var returnUrl = safeReturnUrl(new URLSearchParams(window.location.search).get('return'));

  function setBusy(msg) {
    if (!busyEl) return;
    busyEl.textContent = msg || '';
    busyEl.hidden = !msg;
  }

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  function mapAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'That email already has an account — use Sign in instead.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  function redirectAfterAuth() {
    window.location.assign(returnUrl);
  }

  function updateSignedInUi(user) {
    if (!user) return;
    if (formEl) formEl.hidden = true;
    if (signedInEl) {
      signedInEl.hidden = false;
      var emailNode = signedInEl.querySelector('.web-auth-email');
      if (emailNode) emailNode.textContent = user.email || user.uid;
    }
    redirectAfterAuth();
  }

  function getCredentials() {
    return {
      email: (emailEl && emailEl.value.trim()) || '',
      password: (passwordEl && passwordEl.value) || '',
    };
  }

  function handleSignIn() {
    showError('');
    var creds = getCredentials();
    if (!creds.email || !creds.password) {
      showError('Enter your email and password.');
      return;
    }
    setBusy('Signing in…');
    auth
      .signInWithEmailAndPassword(creds.email, creds.password)
      .catch(function (err) {
        setBusy('');
        showError(mapAuthError(err.code));
      });
  }

  function handleCreate() {
    showError('');
    var creds = getCredentials();
    if (!creds.email || !creds.password) {
      showError('Enter your email and password.');
      return;
    }
    if (creds.password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    setBusy('Creating your account…');
    auth
      .createUserWithEmailAndPassword(creds.email, creds.password)
      .catch(function (err) {
        setBusy('');
        showError(mapAuthError(err.code));
      });
  }

  if (btnSignIn) btnSignIn.addEventListener('click', handleSignIn);
  if (btnCreate) btnCreate.addEventListener('click', handleCreate);

  if (passwordEl) {
    passwordEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleSignIn();
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (user) {
      setBusy('');
      updateSignedInUi(user);
    }
  });
})();
