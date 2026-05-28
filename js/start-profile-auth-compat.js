/**
 * start-horse-profile: Auth + Firestore using Firebase compat (plain script tags).
 * Keeps logic in sync with start-profile-auth.js; use compat so buttons work from file:// and all hosts.
 * Config: mirror js/firebase-config.js
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

  var DRAFT_KEY = "thc_horse_profile_draft_v1";
  var LAST_CREATED_HORSE_ID_KEY = "thc_last_created_horse_id_v1";
  var SNAPSHOT_PAGE = "horse-snapshot.html";
  var MAX_PHOTO_STRING_LENGTH = 600000;

  if (typeof firebase === "undefined") {
    var fatal = document.getElementById("auth-error");
    if (fatal) {
      fatal.textContent =
        "Could not load Firebase (check your connection). If you opened this file from your computer, use a local server instead of double‑clicking the HTML file.";
      fatal.hidden = false;
    }
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var auth = firebase.auth();
  var db = firebase.firestore();

  var emailEl = document.getElementById("auth-email");
  var passwordEl = document.getElementById("auth-password");
  var errEl = document.getElementById("auth-error");
  var statusEl = document.getElementById("auth-status");
  var firestoreStatusEl = document.getElementById("horse-firestore-status");
  var btnSignIn = document.getElementById("auth-submit-signin");
  var btnCreate = document.getElementById("auth-submit-create");
  var btnSignOut = document.getElementById("auth-sign-out");
  var busyEl = document.getElementById("auth-busy");
  var continueSnapshotEl = document.getElementById("auth-continue-snapshot");

  var saveInProgress = false;

  function redirectToHorseSnapshot() {
    var href = (window.location.href || "").toLowerCase();
    var path = (window.location.pathname || "").toLowerCase();
    if (!href.includes("start-horse-profile") && !path.includes("start-horse-profile")) return;
    window.location.assign(SNAPSHOT_PAGE);
  }

  function setBusy(message) {
    if (!busyEl) return;
    if (message) {
      busyEl.textContent = message;
      busyEl.hidden = false;
    } else {
      busyEl.textContent = "";
      busyEl.hidden = true;
    }
  }

  function setContinueSnapshotVisible(visible) {
    if (!continueSnapshotEl) return;
    continueSnapshotEl.hidden = !visible;
  }

  function showError(message) {
    if (!errEl) return;
    errEl.textContent = message;
    errEl.hidden = false;
  }

  function clearError() {
    if (!errEl) return;
    errEl.textContent = "";
    errEl.hidden = true;
    setContinueSnapshotVisible(false);
  }

  function clearFirestoreStatus() {
    if (!firestoreStatusEl) return;
    firestoreStatusEl.textContent = "";
    firestoreStatusEl.hidden = true;
    firestoreStatusEl.classList.remove("horse-firestore-status--success", "horse-firestore-status--error");
  }

  function showFirestoreSuccess(message) {
    if (!firestoreStatusEl) return;
    firestoreStatusEl.textContent = message;
    firestoreStatusEl.hidden = false;
    firestoreStatusEl.classList.remove("horse-firestore-status--error");
    firestoreStatusEl.classList.add("horse-firestore-status--success");
  }

  function showFirestoreError(message) {
    if (!firestoreStatusEl) return;
    firestoreStatusEl.textContent = message;
    firestoreStatusEl.hidden = false;
    firestoreStatusEl.classList.remove("horse-firestore-status--success");
    firestoreStatusEl.classList.add("horse-firestore-status--error");
  }

  function mapAuthError(code) {
    switch (code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      case "auth/user-disabled":
        return "This account has been disabled.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Incorrect email or password. Try again or create an account.";
      case "auth/email-already-in-use":
        return "That email already has an account. Sign in instead.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  function mapFirestoreError(code) {
    if (code === "permission-denied") {
      return "Could not save: permission denied. Check Firestore rules and that you’re signed in.";
    }
    return "Could not save your horse. Check your connection and try again.";
  }

  function trySaveHorseDraftToFirestore(user) {
    if (!user || saveInProgress) return Promise.resolve("noop");

    var raw;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch (e) {
      return Promise.resolve("noop");
    }
    if (!raw) return Promise.resolve("noop");

    var draft;
    try {
      draft = JSON.parse(raw);
    } catch (e) {
      return Promise.resolve("noop");
    }
    if (!draft || typeof draft !== "object" || !String(draft.name || "").trim()) {
      return Promise.resolve("noop");
    }

    saveInProgress = true;
    clearFirestoreStatus();

    var hadPhoto = !!draft.photoDataUrl;
    var photo = draft.photoDataUrl || null;
    var photoDroppedForSize = false;
    if (photo && photo.length > MAX_PHOTO_STRING_LENGTH) {
      photo = null;
      photoDroppedForSize = true;
    }

    var payload = {
      name: String(draft.name).trim(),
      breed: draft.breed || "",
      age: draft.age || "",
      color: draft.color || "",
      gender: draft.gender || "",
      height: draft.height || "",
      weight: draft.weight || "",
      description: draft.description || "",
      photo: photo,
      userId: user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return db
      .collection("horseProfiles")
      .add(payload)
      .then(function (docRef) {
        try {
          sessionStorage.setItem(LAST_CREATED_HORSE_ID_KEY, docRef.id);
        } catch (e) {
          /* ignore */
        }
        sessionStorage.removeItem(DRAFT_KEY);
        var msg =
          "Your horse profile was saved. It will show in The Horse Concierge app for this account.";
        if (photoDroppedForSize || (hadPhoto && !photo)) {
          msg +=
            " The photo was not stored (too large for web save). Add a photo from the app if you like.";
        }
        showFirestoreSuccess(msg);
        return "saved";
      })
      .catch(function (e) {
        console.error(e);
        showFirestoreError(mapFirestoreError(e.code || ""));
        setContinueSnapshotVisible(true);
        return "error";
      })
      .finally(function () {
        saveInProgress = false;
      });
  }

  function handleSignIn() {
    clearError();
    clearFirestoreStatus();
    if (!emailEl || !passwordEl) return;
    var email = emailEl.value.trim();
    var password = passwordEl.value;
    if (!email) {
      showError("Enter your email.");
      return;
    }
    if (!password) {
      showError("Enter your password.");
      return;
    }
    if (btnSignIn) btnSignIn.disabled = true;
    if (btnCreate) btnCreate.disabled = true;
    setBusy("Signing you in…");
    auth
      .signInWithEmailAndPassword(email, password)
      .then(function (cred) {
        setBusy("Saving your horse…");
        return trySaveHorseDraftToFirestore(cred.user).then(function (saveResult) {
          setBusy("");
          if (saveResult !== "error") redirectToHorseSnapshot();
        });
      })
      .catch(function (e) {
        setBusy("");
        showError(mapAuthError(e.code || ""));
      })
      .finally(function () {
        if (btnSignIn) btnSignIn.disabled = false;
        if (btnCreate) btnCreate.disabled = false;
      });
  }

  function handleCreate() {
    clearError();
    clearFirestoreStatus();
    if (!emailEl || !passwordEl) return;
    var email = emailEl.value.trim();
    var password = passwordEl.value;
    if (!email) {
      showError("Enter your email.");
      return;
    }
    if (password.length < 6) {
      showError("Password must be at least 6 characters.");
      return;
    }
    if (btnSignIn) btnSignIn.disabled = true;
    if (btnCreate) btnCreate.disabled = true;
    setBusy("Creating your account…");
    auth
      .createUserWithEmailAndPassword(email, password)
      .then(function (cred) {
        setBusy("Saving your horse…");
        return trySaveHorseDraftToFirestore(cred.user).then(function (saveResult) {
          setBusy("");
          if (saveResult !== "error") redirectToHorseSnapshot();
        });
      })
      .catch(function (e) {
        setBusy("");
        showError(mapAuthError(e.code || ""));
      })
      .finally(function () {
        if (btnSignIn) btnSignIn.disabled = false;
        if (btnCreate) btnCreate.disabled = false;
      });
  }

  function updateAuthUi(user) {
    var authFields = document.getElementById("auth-email-fields");
    if (!statusEl) return;

    if (user) {
      statusEl.hidden = false;
      var emailNode = statusEl.querySelector(".auth-status-email");
      if (emailNode) emailNode.textContent = user.email || user.uid;
      if (authFields) authFields.hidden = true;
      if (btnSignIn) btnSignIn.style.display = "none";
      if (btnCreate) btnCreate.style.display = "none";
      if (btnSignOut) btnSignOut.hidden = false;
    } else {
      statusEl.hidden = true;
      if (authFields) authFields.hidden = false;
      if (btnSignIn) btnSignIn.style.display = "";
      if (btnCreate) btnCreate.style.display = "";
      if (btnSignOut) btnSignOut.hidden = true;
      clearFirestoreStatus();
    }
  }

  auth.onAuthStateChanged(function (user) {
    updateAuthUi(user);
    clearError();
  });

  window.addEventListener("thcHorseDraftReady", function () {
    trySaveHorseDraftToFirestore(auth.currentUser).then(function (r) {
      if (r === "saved") redirectToHorseSnapshot();
    });
  });

  if (btnSignIn) btnSignIn.addEventListener("click", handleSignIn);
  if (btnCreate) btnCreate.addEventListener("click", handleCreate);

  if (btnSignOut) {
    btnSignOut.addEventListener("click", function () {
      setBusy("");
      clearFirestoreStatus();
      auth.signOut().catch(function () {
        showError("Could not sign out. Try again.");
      });
    });
  }
})();
