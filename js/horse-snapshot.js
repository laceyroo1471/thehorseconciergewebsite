/**
 * Horse Snapshot (ES module). horse-snapshot.html uses horse-snapshot-compat.js instead.
 * Keep logic aligned when changing behavior.
 *
 * Horse Snapshot dashboard: Firebase Auth + read horseProfiles (latest or last-created id).
 * Local-only care fields via horse-snapshot-local.js.
 *
 * Firestore: query uses where('userId','==', uid) only — no composite index required.
 * Sorting by createdAt is done client-side (see plan: optional composite index for server order).
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import {
  loadLocalSnapshot,
  saveLocalSnapshot,
  daysSinceDateString,
  hasCompleteNextCareEvent,
} from "./horse-snapshot-local.js";

const LAST_CREATED_HORSE_ID_KEY = "thc_last_created_horse_id_v1";
const START_PROFILE = "start-horse-profile.html";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

var currentUid = null;
var currentHorseId = null;
var currentHorseData = null;

function el(id) {
  return document.getElementById(id);
}

function tsToMillis(val) {
  if (!val) return 0;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (val.seconds != null) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return 0;
}

function pickHorseDoc(docs, preferredId) {
  if (preferredId) {
    var hit = docs.find(function (d) {
      return d.id === preferredId;
    });
    if (hit) return hit;
  }
  if (!docs.length) return null;
  return docs.slice().sort(function (a, b) {
    return tsToMillis(b.data().createdAt) - tsToMillis(a.data().createdAt);
  })[0];
}

async function loadHorseForUser(uid) {
  var preferredId = null;
  try {
    preferredId = sessionStorage.getItem(LAST_CREATED_HORSE_ID_KEY);
  } catch (e) {
    /* ignore */
  }

  if (preferredId) {
    var dref = doc(db, "horseProfiles", preferredId);
    var one = await getDoc(dref);
    if (one.exists() && one.data().userId === uid) {
      return { id: one.id, data: one.data() };
    }
  }

  var q = query(collection(db, "horseProfiles"), where("userId", "==", uid));
  var snap = await getDocs(q);
  var docs = [];
  snap.forEach(function (d) {
    docs.push(d);
  });
  var picked = pickHorseDoc(docs, null);
  if (!picked) return null;
  return { id: picked.id, data: picked.data() };
}

function sexLabel(gender) {
  if (!gender) return "—";
  var g = String(gender).toLowerCase();
  if (g === "mare" || g === "gelding" || g === "stallion") {
    return g.charAt(0).toUpperCase() + g.slice(1);
  }
  return String(gender);
}

function renderHorseCard(data) {
  var photoEl = el("snapshot-horse-photo");
  var photoPh = el("snapshot-horse-photo-ph");
  var nameEl = el("snapshot-horse-name");
  var metaEl = el("snapshot-horse-meta");
  if (nameEl) nameEl.textContent = data.name || "Your horse";
  if (metaEl) {
    var parts = [];
    if (data.age) parts.push(data.age);
    parts.push(sexLabel(data.gender));
    if (data.breed) parts.push(data.breed);
    metaEl.textContent = parts.filter(Boolean).join(" · ") || "—";
  }
  if (photoEl && photoPh) {
    if (data.photo) {
      photoEl.src = data.photo;
      photoEl.hidden = false;
      photoEl.alt = data.name || "Horse photo";
      photoPh.hidden = true;
    } else {
      photoEl.removeAttribute("src");
      photoEl.hidden = true;
      photoEl.alt = "";
      photoPh.hidden = false;
    }
  }
}

function renderLocalFields(uid, horseId) {
  var snap = loadLocalSnapshot(uid, horseId);

  var farrierInput = el("snapshot-farrier-date");
  var farrierDisplay = el("snapshot-farrier-display");
  var farrierDays = el("snapshot-farrier-days");
  if (farrierInput) farrierInput.value = snap.lastFarrierDate || "";
  if (farrierDisplay) {
    if (snap.lastFarrierDate) {
      farrierDisplay.textContent = "Saved: " + snap.lastFarrierDate;
      farrierDisplay.hidden = false;
    } else {
      farrierDisplay.textContent = "";
      farrierDisplay.hidden = true;
    }
  }
  if (farrierDays) {
    var days = daysSinceDateString(snap.lastFarrierDate);
    if (snap.lastFarrierDate && days != null) {
      farrierDays.textContent = days + " Days since Last Farrier Visit";
    } else {
      farrierDays.textContent = "\u2014 Days since Last Farrier Visit";
    }
  }

  var feedDate = el("snapshot-feed-date");
  var feedNote = el("snapshot-feed-note");
  var feedDisplay = el("snapshot-feed-display");
  if (feedDate) feedDate.value = snap.lastFeedChangeDate || "";
  if (feedNote) feedNote.value = snap.lastFeedChangeNote || "";
  if (feedDisplay) {
    if (snap.lastFeedChangeDate || (snap.lastFeedChangeNote && snap.lastFeedChangeNote.trim())) {
      var fd = snap.lastFeedChangeDate ? "Saved: " + snap.lastFeedChangeDate : "";
      if (snap.lastFeedChangeNote && snap.lastFeedChangeNote.trim()) {
        fd += (fd ? " — " : "") + snap.lastFeedChangeNote.trim();
      }
      feedDisplay.textContent = fd;
      feedDisplay.hidden = false;
    } else {
      feedDisplay.textContent = "";
      feedDisplay.hidden = true;
    }
  }
  var feedDays = el("snapshot-feed-days");
  if (feedDays) {
    var feedDayCount = daysSinceDateString(snap.lastFeedChangeDate);
    if (snap.lastFeedChangeDate && feedDayCount != null) {
      feedDays.textContent = feedDayCount + " Days since last feed change";
    } else {
      feedDays.textContent = "\u2014 Days since last feed change";
    }
  }

  var ne = snap.nextCareEvent || { date: "", type: "", note: "" };
  var neDate = el("snapshot-next-date");
  var neType = el("snapshot-next-type");
  var neNote = el("snapshot-next-note");
  var neDisplay = el("snapshot-next-display");
  var addAnother = el("snapshot-next-add-another");
  if (neDate) neDate.value = ne.date || "";
  if (neType) neType.value = ne.type || "";
  if (neNote) neNote.value = ne.note || "";
  if (neDisplay) {
    if (ne.date && ne.type) {
      neDisplay.textContent =
        "Saved: " + ne.type + " on " + ne.date + (ne.note ? " — " + ne.note : "");
      neDisplay.hidden = false;
    } else {
      neDisplay.textContent = "";
      neDisplay.hidden = true;
    }
  }
  if (addAnother) {
    addAnother.hidden = !hasCompleteNextCareEvent(snap);
  }
}

function wireLocalForms(uid, horseId) {
  var farrierForm = el("snapshot-form-farrier");
  if (farrierForm) {
    farrierForm.onsubmit = function (e) {
      e.preventDefault();
      var snap = loadLocalSnapshot(uid, horseId);
      var inp = el("snapshot-farrier-date");
      snap.lastFarrierDate = inp && inp.value ? inp.value : "";
      saveLocalSnapshot(uid, horseId, snap);
      renderLocalFields(uid, horseId);
    };
  }

  var feedForm = el("snapshot-form-feed");
  if (feedForm) {
    feedForm.onsubmit = function (e) {
      e.preventDefault();
      var snap = loadLocalSnapshot(uid, horseId);
      var d = el("snapshot-feed-date");
      var n = el("snapshot-feed-note");
      snap.lastFeedChangeDate = d && d.value ? d.value : "";
      snap.lastFeedChangeNote = n && n.value ? n.value.trim() : "";
      saveLocalSnapshot(uid, horseId, snap);
      renderLocalFields(uid, horseId);
    };
  }

  var nextForm = el("snapshot-form-next");
  if (nextForm) {
    nextForm.onsubmit = function (e) {
      e.preventDefault();
      var snap = loadLocalSnapshot(uid, horseId);
      var d = el("snapshot-next-date");
      var t = el("snapshot-next-type");
      var n = el("snapshot-next-note");
      var newDate = d && d.value ? d.value : "";
      var newType = t && t.value ? t.value : "";
      var newNote = n && n.value ? n.value.trim() : "";
      snap.nextCareEvent = { date: newDate, type: newType, note: newNote };
      saveLocalSnapshot(uid, horseId, snap);
      renderLocalFields(uid, horseId);
    };
  }
}

function setView(mode) {
  var loading = el("snapshot-view-loading");
  var empty = el("snapshot-view-empty");
  var main = el("snapshot-view-main");
  if (loading) loading.hidden = mode !== "loading";
  if (empty) empty.hidden = mode !== "empty";
  if (main) main.hidden = mode !== "main";
}

onAuthStateChanged(auth, async function (user) {
  if (!user) {
    window.location.href = START_PROFILE;
    return;
  }

  currentUid = user.uid;
  setView("loading");

  try {
    var horse = await loadHorseForUser(user.uid);
    if (!horse) {
      currentHorseId = null;
      currentHorseData = null;
      setView("empty");
      return;
    }

    currentHorseId = horse.id;
    currentHorseData = horse.data;
    renderHorseCard(horse.data);
    renderLocalFields(user.uid, horse.id);
    wireLocalForms(user.uid, horse.id);
    setView("main");
  } catch (err) {
    console.error(err);
    setView("empty");
  }
});

var signOutBtn = el("snapshot-sign-out");
if (signOutBtn) {
  signOutBtn.addEventListener("click", function () {
    signOut(auth).catch(function () {});
  });
}
