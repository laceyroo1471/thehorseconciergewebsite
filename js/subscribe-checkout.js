/**
 * subscribe.html — Stripe Checkout via existing createStripeCheckoutSession Cloud Function.
 */
(function () {
  var firebaseConfig = {
    apiKey: "AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY",
    authDomain: "thc-native.firebaseapp.com",
    projectId: "thc-native",
    storageBucket: "thc-native.firebasestorage.app",
    messagingSenderId: "542948479136",
    appId: "1:542948479136:web:80f6bb4ae1740a3a8439c5",
  };

  if (typeof firebase === "undefined") return;

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  var auth = firebase.auth();
  var functions = firebase.app().functions("us-central1");

  var btnOwner = document.getElementById("subscribe-owner");
  var btnProvider = document.getElementById("subscribe-provider");
  var authWall = document.getElementById("subscribe-auth-wall");
  var authSignedIn = document.getElementById("subscribe-auth-signed-in");
  var authEmailFields = document.getElementById("subscribe-auth-fields");
  var authEmail = document.getElementById("subscribe-auth-email");
  var authPassword = document.getElementById("subscribe-auth-password");
  var authSignIn = document.getElementById("subscribe-auth-signin");
  var authCreate = document.getElementById("subscribe-auth-create");
  var authError = document.getElementById("subscribe-auth-error");
  var authBusy = document.getElementById("subscribe-auth-busy");
  var statusBanner = document.getElementById("subscribe-status-banner");
  var checkoutNote = document.getElementById("subscribe-checkout-note");

  var processing = false;

  function setBusy(msg) {
    if (!authBusy) return;
    if (msg) {
      authBusy.textContent = msg;
      authBusy.hidden = false;
    } else {
      authBusy.textContent = "";
      authBusy.hidden = true;
    }
  }

  function showAuthError(msg) {
    if (!authError) return;
    authError.textContent = msg;
    authError.hidden = !msg;
  }

  function setCheckoutEnabled(enabled) {
    if (btnOwner) btnOwner.disabled = !enabled || processing;
    if (btnProvider) btnProvider.disabled = !enabled || processing;
  }

  function updateAuthUi(user) {
    if (user) {
      if (authWall) authWall.hidden = true;
      if (authSignedIn) {
        authSignedIn.hidden = false;
        var emailNode = authSignedIn.querySelector(".subscribe-auth-email");
        if (emailNode) emailNode.textContent = user.email || user.uid;
      }
      if (authEmailFields) authEmailFields.hidden = true;
      if (checkoutNote) checkoutNote.hidden = false;
      setCheckoutEnabled(true);
    } else {
      if (authWall) authWall.hidden = false;
      if (authSignedIn) authSignedIn.hidden = true;
      if (authEmailFields) authEmailFields.hidden = false;
      if (checkoutNote) checkoutNote.hidden = true;
      setCheckoutEnabled(false);
    }
  }

  function mapAuthError(code) {
    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email.";
      case "auth/wrong-password":
      case "auth/invalid-credential":
      case "auth/user-not-found":
        return "Incorrect email or password.";
      case "auth/email-already-in-use":
        return "That email already has an account — sign in instead.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      default:
        return "Could not sign in. Try again.";
    }
  }

  function showReturnStatus() {
    if (!statusBanner) return;
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get("success") === "true") {
        statusBanner.textContent =
          "Payment received — your subscription is activating. Open the app with the same email to use premium features.";
        statusBanner.className = "subscribe-status-banner subscribe-status-banner--success";
        statusBanner.hidden = false;
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      } else if (params.get("canceled") === "true") {
        statusBanner.textContent = "Checkout was canceled. You can try again whenever you’re ready.";
        statusBanner.className = "subscribe-status-banner subscribe-status-banner--muted";
        statusBanner.hidden = false;
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    } catch (ignore) {}
  }

  function startCheckout(roleScope) {
    var user = auth.currentUser;
    if (!user) {
      showAuthError("Sign in or create an account to subscribe.");
      if (authWall) authWall.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (processing) return;
    processing = true;
    setCheckoutEnabled(false);
    setBusy("Opening secure checkout…");
    showAuthError("");

    var callable = functions.httpsCallable("createStripeCheckoutSession");
    callable({
      roleScope: roleScope,
      returnBaseUrl: window.location.origin,
    })
      .then(function (result) {
        var url = result.data && result.data.url;
        if (url) {
          window.location.assign(url);
          return;
        }
        throw new Error("Checkout could not be started.");
      })
      .catch(function (err) {
        console.error(err);
        var msg =
          (err && err.message) ||
          "Could not start checkout. If this keeps happening, the subscription service may need to be configured.";
        showAuthError(msg);
        setBusy("");
        processing = false;
        setCheckoutEnabled(!!auth.currentUser);
      });
  }

  function handleSignIn() {
    if (!authEmail || !authPassword) return;
    showAuthError("");
    setBusy("Signing in…");
    auth
      .signInWithEmailAndPassword(authEmail.value.trim(), authPassword.value)
      .then(function () {
        setBusy("");
      })
      .catch(function (e) {
        setBusy("");
        showAuthError(mapAuthError(e.code || ""));
      });
  }

  function handleCreate() {
    if (!authEmail || !authPassword) return;
    showAuthError("");
    if (authPassword.value.length < 6) {
      showAuthError("Password must be at least 6 characters.");
      return;
    }
    setBusy("Creating account…");
    auth
      .createUserWithEmailAndPassword(authEmail.value.trim(), authPassword.value)
      .then(function () {
        setBusy("");
      })
      .catch(function (e) {
        setBusy("");
        showAuthError(mapAuthError(e.code || ""));
      });
  }

  auth.onAuthStateChanged(function (user) {
    updateAuthUi(user);
  });

  if (btnOwner) {
    btnOwner.addEventListener("click", function () {
      startCheckout("owner");
    });
  }
  if (btnProvider) {
    btnProvider.addEventListener("click", function () {
      startCheckout("provider");
    });
  }
  if (authSignIn) authSignIn.addEventListener("click", handleSignIn);
  if (authCreate) authCreate.addEventListener("click", handleCreate);

  showReturnStatus();
})();
