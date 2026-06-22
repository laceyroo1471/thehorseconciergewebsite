'use strict';

/**
 * Shared "get contact details" panel (Node SSR).
 * @param {string} [returnPath]
 */
function renderContactAccessGate(returnPath) {
  var path = returnPath || '/find-providers';
  var signInUrl = '/sign-in?return=' + encodeURIComponent(path);

  return (
    '<div id="provider-contact-gate">' +
    '<div class="funnel-gate provider-detail-gate">' +
    '<h2 class="funnel-gate-title">Get provider contact details</h2>' +
    '<p class="funnel-gate-copy">Phone and email are hidden from public view to protect providers from spam. ' +
    'Create a free account or sign in on the web — the same email and password work in the mobile app. No horse profile required.</p>' +
    '<div class="funnel-gate-actions provider-detail-gate__account">' +
    '<a class="btn-primary" href="' +
    signInUrl +
    '">Create Free Account</a>' +
    '<a class="btn-ghost" href="' +
    signInUrl +
    '">Sign in</a>' +
    '</div>' +
    '<p class="provider-detail-gate__app-label">Prefer the app? Download for your device:</p>' +
    '<div class="download-btns provider-detail-gate__stores">' +
    '<a class="store-btn" href="https://apps.apple.com/us/app/the-horse-concierge/id6749463193" target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store for iPhone and iPad">' +
    '<div class="store-btn-icon" aria-hidden="true">🍎</div>' +
    '<div>' +
    '<div class="store-btn-text-top">Download on the</div>' +
    '<div class="store-btn-text-main">App Store</div>' +
    '<div class="store-btn-text-sub">iPhone &amp; iPad</div>' +
    '</div></a>' +
    '<a class="store-btn" href="https://play.google.com/store/apps/details?id=com.thehorseconcierge.app" target="_blank" rel="noopener noreferrer" aria-label="Get The Horse Concierge on Google Play for Android">' +
    '<div class="store-btn-icon" aria-hidden="true">▶</div>' +
    '<div>' +
    '<div class="store-btn-text-top">Get it on</div>' +
    '<div class="store-btn-text-main">Google Play</div>' +
    '<div class="store-btn-text-sub">Android</div>' +
    '</div></a>' +
    '</div></div></div>'
  );
}

module.exports = { renderContactAccessGate };
