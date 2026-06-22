/**
 * Provider contact unlock after Firebase auth (client-side only).
 */
(function (root) {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pickField(data, keys) {
    for (var i = 0; i < keys.length; i++) {
      var val = data[keys[i]];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
    return '';
  }

  function renderContactUnlocked(data, user) {
    var phone = pickField(data, ['phoneNumber', 'phone', 'Phone Number']);
    var email = pickField(data, ['emailAddress', 'email', 'Email Address']);
    var contact = pickField(data, ['contactPerson', 'contact', 'Contact Person']);

    var lines = '';
    if (contact) {
      lines +=
        '<p class="provider-detail-field"><strong>Contact</strong><br>' +
        escapeHtml(contact) +
        '</p>';
    }
    if (phone) {
      lines +=
        '<p class="provider-detail-field"><strong>Phone</strong><br>' +
        '<a href="tel:' +
        escapeHtml(phone.replace(/\s/g, '')) +
        '">' +
        escapeHtml(phone) +
        '</a></p>';
    }
    if (email) {
      lines +=
        '<p class="provider-detail-field"><strong>Email</strong><br>' +
        '<a href="mailto:' +
        escapeHtml(email) +
        '">' +
        escapeHtml(email) +
        '</a></p>';
    }
    if (!lines) {
      lines =
        '<p class="body-text">This listing has no contact details on file yet.</p>';
    }

    return (
      '<div class="funnel-gate provider-detail-gate provider-detail-gate--unlocked">' +
      '<h2 class="funnel-gate-title">Contact details</h2>' +
      '<p class="funnel-panel-note provider-detail-gate__signed-in">Signed in as <strong>' +
      escapeHtml(user.email || 'your account') +
      '</strong></p>' +
      '<div class="provider-detail-contact">' +
      lines +
      '</div>' +
      '<div class="funnel-gate-actions" style="margin-top:20px;">' +
      '<button type="button" class="btn-ghost" id="provider-contact-sign-out">Sign out</button>' +
      '</div></div>'
    );
  }

  function renderGateSignedOut(returnPath) {
    if (root.ThcContactAccessGate) {
      return root.ThcContactAccessGate.render(returnPath);
    }
    return '';
  }

  function attachSignOut(auth) {
    var btn = document.getElementById('provider-contact-sign-out');
    if (!btn || !auth) return;
    btn.addEventListener('click', function () {
      auth.signOut();
    });
  }

  function ensureFirebase() {
    if (typeof firebase === 'undefined') return false;
    if (!firebase.apps.length) {
      firebase.initializeApp({
        apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
        authDomain: 'thc-native.firebaseapp.com',
        projectId: 'thc-native',
        storageBucket: 'thc-native.firebasestorage.app',
        messagingSenderId: '542948479136',
        appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
      });
    }
    return true;
  }

  function init(options) {
    var gateEl = document.getElementById('provider-contact-gate');
    if (!gateEl || !ensureFirebase()) return;

    var auth = firebase.auth();
    var providerData = options && options.providerData;
    var returnPath =
      (options && options.returnPath) ||
      window.location.pathname ||
      '/find-providers';

    function refresh(user) {
      if (user && providerData) {
        gateEl.innerHTML = renderContactUnlocked(providerData, user);
        attachSignOut(auth);
      } else {
        gateEl.innerHTML = renderGateSignedOut(returnPath);
      }
    }

    auth.onAuthStateChanged(refresh);
  }

  function bootFromSlug(slug) {
    if (!slug || !ensureFirebase()) return;

    var db = firebase.firestore();
    var returnPath = '/providers/' + slug;

    db.collection('providers')
      .where('slug', '==', slug)
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return;
        init({ providerData: snap.docs[0].data(), returnPath: returnPath });
      });
  }

  root.ThcProviderContactUnlock = { init: init, bootFromSlug: bootFromSlug };
})(typeof window !== 'undefined' ? window : globalThis);
