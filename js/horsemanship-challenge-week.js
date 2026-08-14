/**
 * Shared Horsemanship Challenge week page — gate + daily drip unlock.
 *
 * Config via #challenge-week-config data attributes:
 *   data-week-start="YYYY-MM-DD"   Monday of the week (required)
 *   data-week-number="1"           Display number for banners
 *   data-unlock-label="September 1, 2026"  Human date for lock screen / preview
 *
 * Partner / internal preview (does not open the page to the public):
 *   Add ?preview=thc-hc-preview-2026 to the week URL.
 *   Access is remembered in this browser tab/session via sessionStorage.
 *   Example: horsemanship-challenge-week-01-nutrition.html?preview=thc-hc-preview-2026
 *
 * Dev overrides (avoid shipping true to production):
 *   FORCE_PAGE_ACCESS = true  — always open page + all days
 *   FORCE_UNLOCK_ALL = true   — unlock all days once page is open
 */
(function () {
  var FORCE_PAGE_ACCESS = false;
  var FORCE_UNLOCK_ALL = false;

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

  if (beforeWeek && !forceOpen) {
    if (lockedEl) lockedEl.hidden = false;
    if (openEl) openEl.hidden = true;
    return;
  }

  if (lockedEl) lockedEl.hidden = true;
  if (openEl) openEl.hidden = false;

  var unlockAll = FORCE_UNLOCK_ALL || afterWeek || forceOpen;
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
    } else if (FORCE_UNLOCK_ALL && !afterWeek && !previewAccess) {
      banner.hidden = false;
      banner.textContent =
        'Preview mode: all days are unlocked for partner review. Daily drip activates when FORCE_UNLOCK_ALL is set to false.';
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
})();
