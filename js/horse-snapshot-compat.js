/**
 * Horse Snapshot — Firebase compat (plain scripts). Mirrors horse-snapshot.js + horse-snapshot-local.js.
 * Config: keep in sync with js/firebase-config.js
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

  var LAST_CREATED_HORSE_ID_KEY = "thc_last_created_horse_id_v1";
  var START_PROFILE = "start-horse-profile.html";

  function el(id) {
    return document.getElementById(id);
  }

  function snapshotStorageKey(uid, horseId) {
    return "thc_web_snapshot_v1:" + uid + ":" + horseId;
  }

  function defaultSnapshot() {
    return {
      lastFarrierDate: "",
      lastFeedChangeDate: "",
      lastFeedChangeNote: "",
      nextCareEvent: { date: "", type: "", note: "" },
    };
  }

  function normalizeSnapshot(o) {
    var d = defaultSnapshot();
    if (typeof o.lastFarrierDate === "string") d.lastFarrierDate = o.lastFarrierDate;
    if (typeof o.lastFeedChangeDate === "string") d.lastFeedChangeDate = o.lastFeedChangeDate;
    if (typeof o.lastFeedChangeNote === "string") d.lastFeedChangeNote = o.lastFeedChangeNote;
    if (o.nextCareEvent && typeof o.nextCareEvent === "object") {
      d.nextCareEvent = {
        date: typeof o.nextCareEvent.date === "string" ? o.nextCareEvent.date : "",
        type: typeof o.nextCareEvent.type === "string" ? o.nextCareEvent.type : "",
        note: typeof o.nextCareEvent.note === "string" ? o.nextCareEvent.note : "",
      };
    }
    return d;
  }

  function loadLocalSnapshot(uid, horseId) {
    if (!uid || !horseId) return defaultSnapshot();
    try {
      var raw = localStorage.getItem(snapshotStorageKey(uid, horseId));
      if (!raw) return defaultSnapshot();
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return defaultSnapshot();
      return normalizeSnapshot(o);
    } catch (err) {
      return defaultSnapshot();
    }
  }

  function saveLocalSnapshot(uid, horseId, data) {
    if (!uid || !horseId) return;
    try {
      localStorage.setItem(snapshotStorageKey(uid, horseId), JSON.stringify(normalizeSnapshot(data)));
    } catch (err) {
      console.warn("snapshot local save failed", err);
    }
  }

  function daysSinceDateString(isoDate) {
    if (!isoDate || typeof isoDate !== "string") return null;
    var parts = isoDate.split("-");
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(day)) return null;
    var then = new Date(y, m, day);
    var now = new Date();
    var startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diffMs = startToday.getTime() - then.getTime();
    var days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days < 0) return null;
    return days;
  }

  function hasCompleteNextCareEvent(snap) {
    if (!snap || !snap.nextCareEvent) return false;
    return !!(snap.nextCareEvent.date && snap.nextCareEvent.type);
  }

  if (typeof firebase === "undefined") {
    var loadEl = el("snapshot-view-loading");
    if (loadEl) {
      loadEl.querySelector(".body-text").textContent =
        "Could not load Firebase. Check your internet connection or try a local server (npx serve) instead of opening the file directly.";
    }
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  var auth = firebase.auth();
  var db = firebase.firestore();

  function tsToMillis(val) {
    if (!val) return 0;
    if (typeof val.toMillis === "function") return val.toMillis();
    if (val.seconds != null) return val.seconds * 1000;
    if (val instanceof Date) return val.getTime();
    return 0;
  }

  function pickHorseDoc(docs, preferredId) {
    if (preferredId) {
      for (var i = 0; i < docs.length; i++) {
        if (docs[i].id === preferredId) return docs[i];
      }
    }
    if (!docs.length) return null;
    return docs.slice().sort(function (a, b) {
      return tsToMillis(b.data().createdAt) - tsToMillis(a.data().createdAt);
    })[0];
  }

  function loadHorseForUser(uid) {
    var preferredId = null;
    try {
      preferredId = sessionStorage.getItem(LAST_CREATED_HORSE_ID_KEY);
    } catch (e) {
      /* ignore */
    }

    if (preferredId) {
      return db
        .collection("horseProfiles")
        .doc(preferredId)
        .get()
        .then(function (docSnap) {
          if (docSnap.exists && docSnap.data().userId === uid) {
            return { id: docSnap.id, data: docSnap.data() };
          }
          return loadHorseFromQuery(uid);
        });
    }
    return loadHorseFromQuery(uid);
  }

  function loadHorseFromQuery(uid) {
    return db
      .collection("horseProfiles")
      .where("userId", "==", uid)
      .get()
      .then(function (snap) {
        var docs = [];
        snap.forEach(function (d) {
          docs.push(d);
        });
        var picked = pickHorseDoc(docs, null);
        if (!picked) return null;
        return { id: picked.id, data: picked.data() };
      });
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
        snap.nextCareEvent = {
          date: d && d.value ? d.value : "",
          type: t && t.value ? t.value : "",
          note: n && n.value ? n.value.trim() : "",
        };
        saveLocalSnapshot(uid, horseId, snap);
        renderLocalFields(uid, horseId);
      };
    }
  }

  function setView(mode, errorText) {
    var loading = el("snapshot-view-loading");
    var empty = el("snapshot-view-empty");
    var errPanel = el("snapshot-view-error");
    var errMsg = el("snapshot-error-msg");
    var main = el("snapshot-view-main");
    if (loading) loading.hidden = mode !== "loading";
    if (empty) empty.hidden = mode !== "empty";
    if (errPanel) errPanel.hidden = mode !== "error";
    if (main) main.hidden = mode !== "main";
    if (errMsg && errorText) errMsg.textContent = errorText;
  }

  function showAccountLine(user) {
    var line = el("snapshot-account-line");
    if (!line || !user) return;
    line.textContent =
      "Signed in as " + (user.email || user.uid) + (user.uid ? " · UID: " + user.uid : "");
    line.hidden = false;
  }

  function formatFirestoreError(e) {
    var code = e && e.code ? e.code : "";
    if (code === "permission-denied") {
      return "Firestore blocked reading your horse (permission denied). Add a rule to allow signed-in users to read documents where userId matches their account UID.";
    }
    return (e && e.message) || "Could not load your horse. Check the browser console (F12) for details.";
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) {
      window.location.href = START_PROFILE;
      return;
    }

    showAccountLine(user);
    setView("loading");

    loadHorseForUser(user.uid)
      .then(function (horse) {
        if (!horse) {
          setView("empty");
          return;
        }
        renderHorseCard(horse.data);
        renderLocalFields(user.uid, horse.id);
        wireLocalForms(user.uid, horse.id);
        setView("main");
      })
      .catch(function (err) {
        console.error(err);
        setView("error", formatFirestoreError(err));
      });
  });

  var signOutBtn = el("snapshot-sign-out");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () {
      auth.signOut().catch(function () {});
    });
  }
})();
