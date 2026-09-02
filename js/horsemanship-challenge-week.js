/**
 * Shared Horsemanship Challenge week page — members gate + daily drip unlock.
 *
 * Week pages are members only while the Challenge is running. A visitor must be
 * signed in with an active registration to see anything. Once the Challenge ends
 * (CHALLENGE_END_YMD) the pages open to the public as evergreen content.
 *
 * Config via #challenge-week-config data attributes:
 *   data-week-start="YYYY-MM-DD"   Monday of the week (required)
 *   data-week-number="1"           Display number for banners
 *   data-unlock-label="September 1, 2026"  Human date for lock screen / preview
 *
 * Partner / internal preview (skips the week lock; does not open the public drip):
 *   Add ?preview=thc-hc-preview-2026 to the week URL.
 *   Access is remembered in this browser tab/session via sessionStorage.
 *   During a live week, days still drip by the real date.
 *   Before the week starts, preview opens the full schedule for partner review.
 *   Simulate a date: ?asOf=2026-09-01 or #preview=...&asOf=2026-09-01
 *   Force every day open: ?unlockAll=1
 *
 * Dev overrides (avoid shipping true to production):
 *   FORCE_PAGE_ACCESS = true  — always open the page
 *   FORCE_UNLOCK_ALL = true   — unlock all days once page is open
 */
(function () {
  var FORCE_PAGE_ACCESS = false;
  var FORCE_UNLOCK_ALL = false;

  var CHALLENGE_ID = 'horsemanship-2026';
  /** After this date the week pages stop requiring a sign-in. */
  var CHALLENGE_END_YMD = '2026-11-30';
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var DOOR_REGISTER = 'horsemanship-challenge.html#register';

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  /** Share this privately with education partners — not a public “open sesame”. */
  var PREVIEW_KEY = 'thc-hc-preview-2026';
  var PREVIEW_STORAGE_KEY = 'thcChallengeWeekPreview';

  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function parseYmdLocal(ymd) {
    var parts = String(ymd || '').split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function readUrlFlag(name) {
    try {
      var params = new URLSearchParams(window.location.search);
      var hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''));
      return params.get(name) || hashParams.get(name);
    } catch (e) {
      return null;
    }
  }

  function startOfToday() {
    var asOf = readUrlFlag('asOf') || readUrlFlag('previewDate');
    var simulated = asOf ? parseYmdLocal(asOf) : null;
    if (simulated) return simulated;
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  function addDays(date, n) {
    var out = new Date(date.getTime());
    out.setDate(out.getDate() + n);
    return out;
  }

  function monthDayLabel(date) {
    return MONTHS[date.getMonth()] + ' ' + date.getDate();
  }

  function hasPreviewAccess() {
    try {
      var params = new URLSearchParams(window.location.search);
      var q = params.get('preview');
      if (q && q === PREVIEW_KEY) {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, PREVIEW_KEY);
        return true;
      }
      // Hash survives static-server redirects that strip ?query (e.g. serve .html → clean URL)
      var hash = String(window.location.hash || '').replace(/^#/, '');
      if (
        hash === PREVIEW_KEY ||
        hash === 'preview=' + PREVIEW_KEY ||
        hash.indexOf('preview=' + PREVIEW_KEY) === 0
      ) {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, PREVIEW_KEY);
        return true;
      }
      return sessionStorage.getItem(PREVIEW_STORAGE_KEY) === PREVIEW_KEY;
    } catch (e) {
      return false;
    }
  }

  var previewAccess = hasPreviewAccess();
  var forcePageAccess = FORCE_PAGE_ACCESS || previewAccess;
  var explicitUnlockAll =
    FORCE_UNLOCK_ALL || readUrlFlag('unlockAll') === '1' || readUrlFlag('unlockAll') === 'true';

  var config = document.getElementById('challenge-week-config');
  var weekStartYmd = config && config.getAttribute('data-week-start');
  var weekNumber = (config && config.getAttribute('data-week-number')) || '';
  var unlockLabel = (config && config.getAttribute('data-unlock-label')) || '';

  var weekStart = parseYmdLocal(weekStartYmd);
  if (!weekStart) return;

  var today = startOfToday();
  var weekEnd = addDays(weekStart, 6);
  var beforeWeek = today.getTime() < weekStart.getTime();
  var afterWeek = today.getTime() > weekEnd.getTime();

  var lockedEl = document.getElementById('challenge-week-locked');
  var openEl = document.getElementById('challenge-week-open');

  var weekRendered = false;

  requireMembership(renderWeek);

  /**
   * Members gate. Runs on the real clock so an ?asOf= value cannot open the page.
   * Preview key and the post-Challenge public window both skip it.
   */
  function requireMembership(onAllowed) {
    if (forcePageAccess || challengeIsOver()) {
      allow(null, onAllowed);
      return;
    }

    if (lockedEl) lockedEl.hidden = true;
    if (openEl) openEl.hidden = true;
    var checkingEl = buildCheckingPanel();

    if (typeof firebase === 'undefined') {
      showMembersOnly(checkingEl);
      return;
    }

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    var auth = firebase.auth();
    var db = firebase.firestore();

    auth.onAuthStateChanged(function (user) {
      if (!user) {
        showMembersOnly(checkingEl);
        return;
      }
      db.collection('challengeRegistrations')
        .doc(user.uid)
        .get()
        .then(function (snap) {
          if (!snap.exists) {
            showMembersOnly(checkingEl);
            return;
          }
          var data = snap.data() || {};
          if (data.challengeId && data.challengeId !== CHALLENGE_ID) {
            showMembersOnly(checkingEl);
            return;
          }
          if (data.status === 'inactive') {
            showMembersOnly(checkingEl);
            return;
          }
          allow(checkingEl, onAllowed);
        })
        .catch(function (err) {
          console.warn('week gate check failed', err);
          showMembersOnly(checkingEl);
        });
    });
  }

  /**
   * Auth state can resolve to null before a persisted session is restored, so the
   * denied panel has to be cleared again once access is granted.
   */
  function allow(checkingEl, onAllowed) {
    if (checkingEl) checkingEl.hidden = true;
    var denied = document.getElementById('challenge-week-denied');
    if (denied) denied.hidden = true;
    if (weekRendered) return;
    weekRendered = true;
    onAllowed();
  }

  function challengeIsOver() {
    var end = parseYmdLocal(CHALLENGE_END_YMD);
    if (!end) return false;
    var now = new Date();
    var realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return realToday.getTime() > end.getTime();
  }

  function weekEyebrow() {
    return weekNumber ? 'Week ' + weekNumber : 'The 2026 Horsemanship Challenge';
  }

  function gateHost() {
    return document.getElementById('main-content') || document.body;
  }

  function buildCheckingPanel() {
    var el = document.createElement('div');
    el.id = 'challenge-week-checking';
    el.className = 'section challenge-hub-status';
    el.innerHTML =
      '<p class="body-text" style="margin:0 auto; text-align:center;">Opening ' +
      weekEyebrow() +
      '…</p>';
    var host = gateHost();
    host.insertBefore(el, host.firstChild);
    return el;
  }

  function showMembersOnly(checkingEl) {
    if (checkingEl) checkingEl.hidden = true;
    if (lockedEl) lockedEl.hidden = true;
    if (openEl) openEl.hidden = true;

    var existing = document.getElementById('challenge-week-denied');
    if (existing) {
      existing.hidden = false;
      return;
    }

    var el = document.createElement('div');
    el.id = 'challenge-week-denied';
    el.className = 'section challenge-hub-status';
    el.innerHTML =
      '<div class="challenge-gate-locked" style="max-width:560px; margin:0 auto;">' +
      '<div class="challenge-gate-locked__inner">' +
      '<img class="challenge-hub-brand__logo" src="Images/ColorLogo.svg" width="220" height="44" alt="The Horse Concierge">' +
      '<p class="section-label" style="justify-content:center;">' +
      weekEyebrow() +
      '</p>' +
      '<h1 class="heading-lg" style="text-align:center;">Members<br><em>only.</em></h1>' +
      '<p class="body-text" style="margin:16px auto 0; text-align:center;">Weekly content is for Challenge participants. Sign in with the email and password you used to register. New here? Registration is open all season on the door page.</p>' +
      '<div class="hero-actions" style="justify-content:center; margin-top:28px;">' +
      '<a class="btn-primary" href="' +
      DOOR_SIGNIN +
      '">Sign In</a>' +
      '<a class="btn-ghost" href="' +
      DOOR_REGISTER +
      '">Register</a>' +
      '</div>' +
      '</div>' +
      '</div>';
    var host = gateHost();
    host.insertBefore(el, host.firstChild);
  }

  function renderWeek() {
    if (beforeWeek && !forcePageAccess) {
      if (lockedEl) lockedEl.hidden = false;
      if (openEl) openEl.hidden = true;
      return;
    }

    if (lockedEl) lockedEl.hidden = true;
    if (openEl) openEl.hidden = false;

    var unlockAll = explicitUnlockAll || afterWeek || (forcePageAccess && beforeWeek);
    var weekLabel = weekNumber ? 'Week ' + weekNumber : 'This week';
    var unlockDateLabel = unlockLabel || monthDayLabel(weekStart) + ', ' + weekStart.getFullYear();

    var banner = document.getElementById('challenge-unlock-banner');
    if (banner) {
      if (previewAccess && beforeWeek) {
        banner.hidden = false;
        banner.textContent =
          'Private preview — for partner review only. Public access unlocks ' + unlockDateLabel + '.';
      } else if (FORCE_PAGE_ACCESS && beforeWeek) {
        banner.hidden = false;
        banner.textContent =
          'Preview mode: page access is forced open for partner review. Public access unlocks ' +
          unlockDateLabel +
          '.';
      } else if (explicitUnlockAll && !afterWeek) {
        banner.hidden = false;
        banner.textContent =
          'Preview mode: all days are unlocked for partner review. Daily drip is the public default.';
      } else if (afterWeek) {
        banner.hidden = false;
        banner.textContent =
          weekLabel + ' has ended — the full schedule stays open so you can complete anything in arrears.';
      } else {
        banner.hidden = true;
      }
    }

    var days = document.querySelectorAll('.challenge-day[data-day]');
    days.forEach(function (el) {
      var dayIndex = parseInt(el.getAttribute('data-day'), 10);
      if (isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) return;

      var unlockDate = addDays(weekStart, dayIndex);
      var isUnlocked = unlockAll || today.getTime() >= unlockDate.getTime();
      var body = el.querySelector('.challenge-day__body');
      var lockedNote = el.querySelector('.challenge-day__locked-note');

      el.classList.toggle('challenge-day--locked', !isUnlocked);
      el.classList.toggle('challenge-day--open', isUnlocked);

      if (body) {
        if (isUnlocked) {
          body.removeAttribute('hidden');
        } else {
          body.setAttribute('hidden', '');
        }
      }

      if (lockedNote) {
        if (!isUnlocked) {
          lockedNote.hidden = false;
          lockedNote.textContent =
            'Content unlocks ' + DAY_NAMES[dayIndex] + ', ' + monthDayLabel(unlockDate) + '.';
        } else {
          lockedNote.hidden = true;
        }
      }
    });
  }
})();
