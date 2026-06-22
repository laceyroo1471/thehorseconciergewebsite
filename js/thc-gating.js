/**
 * Shared routing: full-page paywall vs app-download vs schedule-limit modals.
 * Expects <dialog id="thc-dialog-app"> and <dialog id="thc-dialog-schedule"> on the page.
 *
 * Web subscribe is paused — set WEB_SUBSCRIBE_ENABLED to true to send paywall actions to subscribe.html again.
 */
(function () {
  var WEB_SUBSCRIBE_ENABLED = false;
  var PAYWALL = "subscribe.html";

  function showAppDialog() {
    var appDlg = document.getElementById("thc-dialog-app");
    if (appDlg && typeof appDlg.showModal === "function") appDlg.showModal();
  }

  function closestAction(el) {
    if (!el || !el.closest) return null;
    return el.closest("[data-thc-action]");
  }

  document.addEventListener("click", function (e) {
    var el = closestAction(e.target);
    if (!el) return;
    var action = el.getAttribute("data-thc-action");
    if (!action) return;

    if (action === "paywall") {
      if (el.tagName === "A" && el.getAttribute("href")) return;
      e.preventDefault();
      if (WEB_SUBSCRIBE_ENABLED) {
        window.location.href = PAYWALL;
      } else {
        showAppDialog();
      }
      return;
    }
    if (action === "app") {
      e.preventDefault();
      showAppDialog();
      return;
    }
    if (action === "schedule-limit") {
      e.preventDefault();
      var schedDlg = document.getElementById("thc-dialog-schedule");
      if (schedDlg && typeof schedDlg.showModal === "function") schedDlg.showModal();
      return;
    }
  });

  document.addEventListener("click", function (e) {
    var closeBtn = e.target.closest(".thc-dialog-close");
    if (!closeBtn) return;
    var dlg = closeBtn.closest("dialog");
    if (dlg && typeof dlg.close === "function") dlg.close();
  });
})();
