/**
 * Web funnel scaffolding — prevents form navigation until Firebase is wired.
 */
(function () {
  document.querySelectorAll("form[data-funnel-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
    });
  });
})();
