/**
 * Homepage Horsemanship Challenge promo dialog.
 * Shows through Nov 30, 2026 unless the visitor dismissed it.
 */
(function () {
  var END_YMD = '2026-11-30';
  var STORAGE_KEY = 'thcChallengePromoDismissed_v1';
  var SHOW_DELAY_MS = 1400;

  var dialog = document.getElementById('thc-dialog-challenge');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  function parseEndLocal(ymd) {
    var parts = String(ymd).split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1;
    var d = parseInt(parts[2], 10);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(y, m, d, 23, 59, 59, 999);
  }

  function campaignActive() {
    var end = parseEndLocal(END_YMD);
    if (!end) return false;
    return Date.now() <= end.getTime();
  }

  function wasDismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      /* ignore */
    }
  }

  function closePromo() {
    markDismissed();
    if (dialog.open) dialog.close();
  }

  dialog.querySelectorAll('[data-challenge-promo-dismiss]').forEach(function (el) {
    el.addEventListener('click', function () {
      closePromo();
    });
  });

  dialog.addEventListener('cancel', function () {
    markDismissed();
  });

  if (!campaignActive() || wasDismissed()) return;

  window.setTimeout(function () {
    if (!campaignActive() || wasDismissed() || dialog.open) return;
    try {
      dialog.showModal();
    } catch (e) {
      /* ignore */
    }
  }, SHOW_DELAY_MS);
})();
