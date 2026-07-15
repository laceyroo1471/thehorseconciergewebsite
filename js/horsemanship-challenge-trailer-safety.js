/**
 * Week 10 Trailer Safety — hybrid daily unlock.
 * Schedule headers always visible; day bodies unlock Mon–Sun.
 * After Sunday (week end), all content stays unlocked for arrears.
 *
 * Preview: FORCE_UNLOCK_ALL = true so partners can review the full page.
 * Before go-live (Nov 1, 2026): set FORCE_UNLOCK_ALL = false.
 */
(function () {
  var WEEK_START = '2026-11-01'; // Monday of Week 10
  var FORCE_UNLOCK_ALL = true; // set false before Nov 1 for daily drip

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

  var weekStart = parseYmdLocal(WEEK_START);
  if (!weekStart) return;

  var today = startOfToday();
  var weekEnd = addDays(weekStart, 6); // Sunday Nov 7
  var afterWeek = today.getTime() > weekEnd.getTime();
  var unlockAll = FORCE_UNLOCK_ALL || afterWeek;

  var banner = document.getElementById('challenge-unlock-banner');
  if (banner) {
    if (FORCE_UNLOCK_ALL && !afterWeek) {
      banner.hidden = false;
      banner.textContent =
        'Preview mode: all days are unlocked for partner review. Daily drip activates when FORCE_UNLOCK_ALL is set to false before November 1, 2026.';
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
