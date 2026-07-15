/**
 * horsemanship-challenge.html — landing page (Firebase registration wiring comes in a later step).
 */
(function () {
  var form = document.getElementById('challenge-register-form');
  var createBtn = document.getElementById('challenge-create-account');
  var signInUrl = 'sign-in.html?return=/horsemanship-challenge';

  function goToSignIn(e) {
    if (e) e.preventDefault();
    window.location.href = signInUrl;
  }

  if (form) form.addEventListener('submit', goToSignIn);
  if (createBtn) createBtn.addEventListener('click', goToSignIn);
})();
