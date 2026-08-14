/**
 * Week 10 Trailer Safety — page gate + hybrid daily unlock.
 * Page locked until Monday Nov 2, 2026 (unless preview / FORCE_PAGE_ACCESS).
 * Schedule headers always visible once open; day bodies unlock Mon–Sun.
 * After Sunday (week end), all content stays unlocked for arrears.
 *
 * Partner / internal preview:
 *   Add ?preview=thc-hc-preview-2026 to the URL (remembered for this browser session).
 *
 * Dev overrides (avoid shipping true to production):
 *   FORCE_PAGE_ACCESS = true
 *   FORCE_UNLOCK_ALL = true
 */
(function () {
  var WEEK_START = '2026-11-02'; // Monday of Week 10
  var FORCE_PAGE_ACCESS = false;
  var FORCE_UNLOCK_ALL = false;
  var PREVIEW_KEY = 'thc-hc-preview-2026';
  var PREVIEW_STORAGE_KEY = 'thcChallengeWeekPreview';

  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  function parseYmdLocal(ymd) {
    var parts = String(ymd).split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d);
  }

  function startOfToday() {
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
      return sessionStorage.getItem(PREVIEW_STORAGE_KEY) === PREVIEW_KEY;
    } catch (e) {
      return false;
    }
  }

  var previewAccess = hasPreviewAccess();
  var forceOpen = FORCE_PAGE_ACCESS || previewAccess;

  var weekStart = parseYmdLocal(WEEK_START);
  if (!weekStart) return;

  var today = startOfToday();
  var weekEnd = addDays(weekStart, 6); // Sunday Nov 8
  var beforeWeek = today.getTime() < weekStart.getTime();
  var afterWeek = today.getTime() > weekEnd.getTime();

  var lockedEl = document.getElementById('challenge-week-locked');
  var openEl = document.getElementById('challenge-week-open');

  if (beforeWeek && !forceOpen) {
    if (lockedEl) lockedEl.hidden = false;
    if (openEl) openEl.hidden = true;
    return;
  }

  if (lockedEl) lockedEl.hidden = true;
  if (openEl) openEl.hidden = false;

  var unlockAll = FORCE_UNLOCK_ALL || afterWeek || forceOpen;

  var banner = document.getElementById('challenge-unlock-banner');
  if (banner) {
    if (previewAccess && beforeWeek) {
      banner.hidden = false;
      banner.textContent =
        'Private preview — for partner review only. Public access unlocks November 2, 2026.';
    } else if (FORCE_PAGE_ACCESS && beforeWeek) {
      banner.hidden = false;
      banner.textContent =
        'Preview mode: page access is forced open for partner review. Public access unlocks November 2, 2026.';
    } else if (FORCE_UNLOCK_ALL && !afterWeek && !previewAccess) {
      banner.hidden = false;
      banner.textContent =
        'Preview mode: all days are unlocked for partner review. Daily drip activates when FORCE_UNLOCK_ALL is set to false.';
    } else if (afterWeek) {
      banner.hidden = false;
      banner.textContent =
        'Week 10 has ended — the full schedule stays open so you can complete anything in arrears.';
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
})();
