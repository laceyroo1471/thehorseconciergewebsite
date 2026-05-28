/**
 * Firebase Auth + Firestore horse profile save — start-horse-profile page only.
 * NOTE: start-horse-profile.html uses start-profile-auth-compat.js (script tags) so auth works
 * when the page is opened as a file or anywhere ES module imports fail. Keep this file in sync.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const DRAFT_KEY = "thc_horse_profile_draft_v1";
const LAST_CREATED_HORSE_ID_KEY = "thc_last_created_horse_id_v1";
const SNAPSHOT_PAGE = "horse-snapshot.html";
/** Keep under Firestore’s ~1 MiB doc limit; large base64 photos should use Storage later. */
const MAX_PHOTO_STRING_LENGTH = 600000;

function redirectToHorseSnapshot() {
  const href = (window.location.href || "").toLowerCase();
  const path = (window.location.pathname || "").toLowerCase();
  if (!href.includes("start-horse-profile") && !path.includes("start-horse-profile")) return;
  window.location.assign(SNAPSHOT_PAGE);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const emailEl = document.getElementById("auth-email");
const passwordEl = document.getElementById("auth-password");
const errEl = document.getElementById("auth-error");
const statusEl = document.getElementById("auth-status");
const firestoreStatusEl = document.getElementById("horse-firestore-status");
const btnSignIn = document.getElementById("auth-submit-signin");
const btnCreate = document.getElementById("auth-submit-create");
const btnSignOut = document.getElementById("auth-sign-out");
const busyEl = document.getElementById("auth-busy");
const continueSnapshotEl = document.getElementById("auth-continue-snapshot");

let saveInProgress = false;

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

/**
 * Reads session draft and writes horseProfiles (matches thc-native create shape).
 * @returns {"saved"|"noop"|"error"}
 */
export async function trySaveHorseDraftToFirestore(user) {
  if (!user || saveInProgress) return "noop";

  let raw;
  try {
    raw = sessionStorage.getItem(DRAFT_KEY);
  } catch (e) {
    return "noop";
  }
  if (!raw) return "noop";

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch (e) {
    return "noop";
  }
  if (!draft || typeof draft !== "object" || !String(draft.name || "").trim()) return "noop";

  saveInProgress = true;
  clearFirestoreStatus();

  const hadPhoto = !!draft.photoDataUrl;
  let photo = draft.photoDataUrl || null;
  let photoDroppedForSize = false;
  if (photo && photo.length > MAX_PHOTO_STRING_LENGTH) {
    photo = null;
    photoDroppedForSize = true;
  }

  const payload = {
    name: String(draft.name).trim(),
    breed: draft.breed || "",
    age: draft.age || "",
    color: draft.color || "",
    gender: draft.gender || "",
    height: draft.height || "",
    weight: draft.weight || "",
    description: draft.description || "",
    photo,
    userId: user.uid,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const docRef = await addDoc(collection(db, "horseProfiles"), payload);
    try {
      sessionStorage.setItem(LAST_CREATED_HORSE_ID_KEY, docRef.id);
    } catch (e) {
      /* ignore quota */
    }
    sessionStorage.removeItem(DRAFT_KEY);

    let msg =
      "Your horse profile was saved. It will show in The Horse Concierge app for this account.";
    if (photoDroppedForSize || (hadPhoto && !photo)) {
      msg +=
        " The photo was not stored (too large for web save). Add a photo from the app if you like.";
    }
    showFirestoreSuccess(msg);
    return "saved";
  } catch (e) {
    console.error(e);
    showFirestoreError(mapFirestoreError(e.code || ""));
    setContinueSnapshotVisible(true);
    return "error";
  } finally {
    saveInProgress = false;
  }
}

async function handleSignIn() {
  clearError();
  clearFirestoreStatus();
  if (!emailEl || !passwordEl) return;
  const email = emailEl.value.trim();
  const password = passwordEl.value;
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
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    setBusy("Saving your horse…");
    const saveResult = await trySaveHorseDraftToFirestore(cred.user);
    setBusy("");
    if (saveResult !== "error") redirectToHorseSnapshot();
  } catch (e) {
    setBusy("");
    showError(mapAuthError(e.code || ""));
  } finally {
    if (btnSignIn) btnSignIn.disabled = false;
    if (btnCreate) btnCreate.disabled = false;
  }
}

async function handleCreate() {
  clearError();
  clearFirestoreStatus();
  if (!emailEl || !passwordEl) return;
  const email = emailEl.value.trim();
  const password = passwordEl.value;
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
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    setBusy("Saving your horse…");
    const saveResult = await trySaveHorseDraftToFirestore(cred.user);
    setBusy("");
    if (saveResult !== "error") redirectToHorseSnapshot();
  } catch (e) {
    setBusy("");
    showError(mapAuthError(e.code || ""));
  } finally {
    if (btnSignIn) btnSignIn.disabled = false;
    if (btnCreate) btnCreate.disabled = false;
  }
}

function updateAuthUi(user) {
  const authFields = document.getElementById("auth-email-fields");
  if (!statusEl) return;

  if (user) {
    statusEl.hidden = false;
    const emailNode = statusEl.querySelector(".auth-status-email");
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

onAuthStateChanged(auth, function (user) {
  updateAuthUi(user);
  clearError();
});

window.addEventListener("thcHorseDraftReady", function () {
  void (async function () {
    const r = await trySaveHorseDraftToFirestore(auth.currentUser);
    if (r === "saved") redirectToHorseSnapshot();
  })();
});

if (btnSignIn) btnSignIn.addEventListener("click", handleSignIn);
if (btnCreate) btnCreate.addEventListener("click", handleCreate);

if (btnSignOut) {
  btnSignOut.addEventListener("click", function () {
    setBusy("");
    clearFirestoreStatus();
    signOut(auth).catch(function () {
      showError("Could not sign out. Try again.");
    });
  });
}
