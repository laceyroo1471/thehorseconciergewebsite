/**
 * Provider listing claim flow (mirrors app ProviderDetailModal claim logic).
 */
(function (root) {
  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

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

  function ensureFirebase() {
    if (typeof firebase === 'undefined') return null;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return {
      db: firebase.firestore(),
      auth: firebase.auth(),
    };
  }

  function signInUrl(returnPath) {
    return '/sign-in?return=' + encodeURIComponent(returnPath || '/find-providers');
  }

  function getUserPendingClaims(db, user) {
    var byUser = db
      .collection('providerClaims')
      .where('userId', '==', user.uid)
      .where('status', '==', 'pending')
      .get();

    var byEmail = user.email
      ? db
          .collection('providerClaims')
          .where('providerEmail', '==', user.email)
          .where('status', '==', 'pending')
          .get()
      : Promise.resolve({ empty: true, docs: [] });

    return Promise.all([byUser, byEmail]).then(function (results) {
      var map = {};
      results.forEach(function (snap) {
        snap.docs.forEach(function (doc) {
          var data = doc.data();
          map[doc.id] = {
            id: doc.id,
            userId: data.userId,
            providerId: data.providerId,
            providerEmail: data.providerEmail,
            status: data.status,
          };
        });
      });
      return Object.keys(map).map(function (id) {
        return map[id];
      });
    });
  }

  function sendVerificationEmail(auth, email) {
    return auth.sendPasswordResetEmail(email);
  }

  function createProviderClaim(fb, user, providerId, providerEmail, region) {
    var db = fb.db;
    var auth = fb.auth;

    return db
      .collection('providers')
      .doc(providerId)
      .get()
      .then(function (providerDoc) {
        if (!providerDoc.exists) {
          throw new Error('Provider not found');
        }
        var providerData = providerDoc.data();
        if (providerData.claimedBy) {
          throw new Error('This listing has already been claimed');
        }

        var q1 = db
          .collection('providerClaims')
          .where('userId', '==', user.uid)
          .where('providerId', '==', providerId)
          .where('status', '==', 'pending')
          .get();
        var q2 = db
          .collection('providerClaims')
          .where('providerEmail', '==', providerEmail)
          .where('providerId', '==', providerId)
          .where('status', '==', 'pending')
          .get();

        return Promise.all([q1, q2]).then(function (checks) {
          if (!checks[0].empty || !checks[1].empty) {
            if (
              !checks[1].empty &&
              checks[1].docs[0].data().userId !== user.uid
            ) {
              return checks[1].docs[0].ref.update({ userId: user.uid });
            }
            throw new Error('You already have a pending claim for this listing');
          }

          return sendVerificationEmail(auth, providerEmail).then(function () {
            var claim = {
              userId: user.uid,
              providerId: providerId,
              providerEmail: providerEmail,
              status: 'pending',
              claimMethod: 'auto',
              submittedAt: new Date(),
              region:
                region ||
                (providerData.region && providerData.region[0]) ||
                'unknown',
            };
            return db.collection('providerClaims').add(claim);
          });
        });
      });
  }

  function completeClaimVerification(fb, user, claimId) {
    var db = fb.db;
    return db
      .collection('providerClaims')
      .doc(claimId)
      .get()
      .then(function (claimDoc) {
        if (!claimDoc.exists) throw new Error('Claim not found');
        var claim = claimDoc.data();
        if (claim.userId !== user.uid) throw new Error('Unauthorized');
        if (claim.status !== 'pending') {
          throw new Error('Claim is no longer pending');
        }

        return claimDoc.ref
          .update({
            status: 'approved',
            reviewedAt: new Date(),
          })
          .then(function () {
            return db.collection('providers').doc(claim.providerId).get();
          })
          .then(function (providerDoc) {
            var providerData = providerDoc.exists ? providerDoc.data() : {};
            var previousOwner = providerData.claimedBy;

            function finishClaim() {
              return db
                .collection('providers')
                .doc(claim.providerId)
                .update({
                  claimedBy: claim.userId,
                  claimedAt: new Date(),
                })
                .then(function () {
                  return db
                    .collection('providerAccounts')
                    .doc(claim.userId)
                    .get();
                })
                .then(function (accountDoc) {
                  if (accountDoc.exists) {
                    var existing = accountDoc.data();
                    var listings = existing.claimedListings || [];
                    if (listings.indexOf(claim.providerId) === -1) {
                      listings.push(claim.providerId);
                    }
                    return accountDoc.ref.update({
                      claimedListings: listings,
                      lastLoginAt: new Date(),
                    });
                  }
                  return accountDoc.ref.set({
                    userId: claim.userId,
                    email: claim.providerEmail,
                    claimedListings: [claim.providerId],
                    createdAt: new Date(),
                    lastLoginAt: new Date(),
                  });
                });
            }

            if (previousOwner && previousOwner !== claim.userId) {
              return db
                .collection('providerAccounts')
                .doc(previousOwner)
                .get()
                .then(function (prevDoc) {
                  if (prevDoc.exists) {
                    var prevData = prevDoc.data();
                    var updated = (prevData.claimedListings || []).filter(
                      function (id) {
                        return id !== claim.providerId;
                      }
                    );
                    if (updated.length === 0) {
                      return prevDoc.ref.delete().catch(function () {});
                    }
                    return prevDoc.ref
                      .update({ claimedListings: updated })
                      .catch(function () {});
                  }
                })
                .then(finishClaim);
            }

            return finishClaim();
          });
      });
  }

  function createManualReviewRequest(
    fb,
    user,
    providerId,
    email,
    phone,
    reason,
    verificationDoc,
    region
  ) {
    var db = fb.db;
    return db
      .collection('providers')
      .doc(providerId)
      .get()
      .then(function (providerDoc) {
        if (!providerDoc.exists) throw new Error('Provider not found');
        var providerData = providerDoc.data();

        return db
          .collection('providerClaims')
          .where('userId', '==', user.uid)
          .where('providerId', '==', providerId)
          .where('status', 'in', ['pending', 'manual_review'])
          .get()
          .then(function (existing) {
            if (!existing.empty) {
              throw new Error(
                'You already have a pending request for this listing'
              );
            }

            var claim = {
              userId: user.uid,
              providerId: providerId,
              providerEmail: email,
              status: 'manual_review',
              claimMethod: 'manual',
              submittedAt: new Date(),
              region:
                region ||
                (providerData.region && providerData.region[0]) ||
                'unknown',
              manualReviewEmail: email,
              manualReviewPhone: phone,
              manualReviewReason: reason,
              manualReviewDoc: verificationDoc,
            };
            return db.collection('providerClaims').add(claim);
          });
      });
  }

  function init(options) {
    var panel = document.getElementById('provider-claim-panel');
    if (!panel || !options.providerId) return;

    var fb = ensureFirebase();
    if (!fb) return;

    var providerId = options.providerId;
    var businessName = options.businessName || 'this listing';
    var returnPath = options.returnPath || '/providers/' + (options.slug || '');
    var providerData = options.providerData || null;
    var pendingClaims = [];
    var manualReviewClaim = null;
    var view = 'main';
    var busy = false;
    var message = '';
    var messageError = false;

    function listingEmail() {
      if (!providerData) return '';
      return pickField(providerData, [
        'emailAddress',
        'email',
        'Email Address',
      ]);
    }

    function listingRegion() {
      if (!providerData) return 'unknown';
      if (providerData.region && providerData.region[0]) {
        return providerData.region[0];
      }
      return pickField(providerData, ['Region', 'region']) || 'unknown';
    }

    function isClaimed() {
      return !!(providerData && providerData.claimedBy);
    }

    function isOwnedBy(user) {
      return (
        user &&
        providerData &&
        providerData.claimedBy &&
        providerData.claimedBy === user.uid
      );
    }

    function pendingForProvider() {
      return pendingClaims.find(function (c) {
        return c.providerId === providerId;
      });
    }

    function renderSignedOut() {
      var url = signInUrl(returnPath);
      return (
        '<h2 class="provider-claim-panel__title">Are you this provider?</h2>' +
        '<p class="body-text provider-claim-panel__copy">Claim your listing to manage contact info, respond to inquiries, and access the provider portal.</p>' +
        '<div class="funnel-gate-actions provider-claim-panel__actions">' +
        '<a class="btn-primary" href="' +
        url +
        '">Sign in to claim</a>' +
        '<a class="btn-ghost" href="' +
        url +
        '">Create account</a>' +
        '</div>'
      );
    }

    function renderManualSubmitted() {
      return (
        '<h2 class="provider-claim-panel__title">Manual review submitted</h2>' +
        '<p class="body-text provider-claim-panel__copy">An ambassador will review your request within 5 business days. You will be notified when a decision is made.</p>' +
        renderMessage()
      );
    }

    function renderOwned() {
      return (
        '<h2 class="provider-claim-panel__title">Your listing</h2>' +
        '<p class="body-text provider-claim-panel__copy provider-claim-panel__copy--success">' +
        'You have claimed <strong>' +
        escapeHtml(businessName) +
        '</strong>. Manage your listing in The Horse Concierge app provider portal.</p>' +
        '<p class="funnel-panel-note">Download the app from the App Store (iPhone &amp; iPad) or Google Play (Android) and open Provider Portal.</p>'
      );
    }

    function renderPending(user) {
      return (
        '<h2 class="provider-claim-panel__title">Verification pending</h2>' +
        '<p class="body-text provider-claim-panel__copy">We sent a verification email for this listing. It may appear as a password reset email from Firebase.</p>' +
        '<ul class="provider-claim-panel__steps">' +
        '<li>Open the email and set your password (this is your provider portal login).</li>' +
        '<li>Return here while signed in as <strong>' +
        escapeHtml(user.email || 'your account') +
        '</strong>.</li>' +
        '<li>Click <strong>Complete verification</strong> below.</li>' +
        '</ul>' +
        '<div class="funnel-gate-actions provider-claim-panel__actions">' +
        '<button type="button" class="btn-primary" id="provider-claim-complete" ' +
        (busy ? 'disabled' : '') +
        '>' +
        (busy ? 'Completing…' : 'Complete verification') +
        '</button>' +
        '</div>' +
        renderMessage() +
        '<p class="funnel-panel-note"><button type="button" class="btn-link" id="provider-claim-manual-link">Need manual review instead?</button></p>'
      );
    }

    function renderClaimable() {
      var email = listingEmail();
      if (view === 'email') {
        return (
          '<h2 class="provider-claim-panel__title">Enter your email</h2>' +
          '<p class="body-text provider-claim-panel__copy">This listing has no email on file. Enter your business email — we will send a verification link to confirm ownership.</p>' +
          '<div class="form-group">' +
          '<label class="form-label" for="provider-claim-email">Business email</label>' +
          '<input class="form-input" type="email" id="provider-claim-email" autocomplete="email" required>' +
          '</div>' +
          renderMessage() +
          '<div class="funnel-gate-actions provider-claim-panel__actions">' +
          '<button type="button" class="btn-primary" id="provider-claim-email-submit" ' +
          (busy ? 'disabled' : '') +
          '>' +
          (busy ? 'Sending…' : 'Send verification email') +
          '</button>' +
          '<button type="button" class="btn-ghost" id="provider-claim-cancel">Cancel</button>' +
          '</div>'
        );
      }
      if (view === 'manual') {
        return renderManualForm(false);
      }

      var emailNote = email
        ? '<p class="funnel-panel-note">Verification will be sent to the email on this listing.</p>'
        : '';

      return (
        '<h2 class="provider-claim-panel__title">Claim this listing</h2>' +
        '<p class="body-text provider-claim-panel__copy">Verify ownership to unlock the provider portal and manage <strong>' +
        escapeHtml(businessName) +
        '</strong>.</p>' +
        emailNote +
        renderMessage() +
        '<div class="funnel-gate-actions provider-claim-panel__actions">' +
        '<button type="button" class="btn-primary" id="provider-claim-start" ' +
        (busy ? 'disabled' : '') +
        '>' +
        (busy ? 'Sending…' : 'Claim this listing') +
        '</button>' +
        '</div>' +
        '<p class="funnel-panel-note"><button type="button" class="btn-link" id="provider-claim-manual-link">Wrong or missing email? Request manual review</button></p>'
      );
    }

    function renderClaimedByOther() {
      if (view === 'manual') {
        return renderManualForm(true);
      }
      return (
        '<h2 class="provider-claim-panel__title">Listing already claimed</h2>' +
        '<p class="body-text provider-claim-panel__copy">Another account has claimed this listing. If this is your business, you can request an ownership review with verification documents.</p>' +
        renderMessage() +
        '<div class="funnel-gate-actions provider-claim-panel__actions">' +
        '<button type="button" class="btn-primary" id="provider-claim-dispute">Report incorrect claim</button>' +
        '</div>'
      );
    }

    function renderManualForm(isDispute) {
      return (
        '<h2 class="provider-claim-panel__title">Request manual review</h2>' +
        '<p class="funnel-panel-note provider-claim-panel__disclaimer">' +
        (isDispute
          ? 'An ambassador will review your ownership dispute. Include verification details below.'
          : 'Only use this if the listing email is missing or incorrect. Otherwise, claim via email verification and update your listing after approval.') +
        '</p>' +
        '<div class="form-group">' +
        '<label class="form-label" for="provider-claim-mr-email">Correct email</label>' +
        '<input class="form-input" type="email" id="provider-claim-mr-email" autocomplete="email" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label" for="provider-claim-mr-phone">Phone number</label>' +
        '<input class="form-input" type="tel" id="provider-claim-mr-phone" autocomplete="tel" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label" for="provider-claim-mr-reason">Reason</label>' +
        '<textarea class="form-input form-textarea" id="provider-claim-mr-reason" rows="3" required>' +
        (isDispute
          ? 'Listing claimed by wrong person - ownership dispute'
          : '') +
        '</textarea>' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label" for="provider-claim-mr-doc">Business verification (URL or description)</label>' +
        '<textarea class="form-input form-textarea" id="provider-claim-mr-doc" rows="3" required placeholder="Link to website, business license, or other proof"></textarea>' +
        '</div>' +
        renderMessage() +
        '<div class="funnel-gate-actions provider-claim-panel__actions">' +
        '<button type="button" class="btn-primary" id="provider-claim-mr-submit" ' +
        (busy ? 'disabled' : '') +
        '>' +
        (busy ? 'Submitting…' : 'Submit for review') +
        '</button>' +
        '<button type="button" class="btn-ghost" id="provider-claim-cancel">Cancel</button>' +
        '</div>'
      );
    }

    function renderMessage() {
      if (!message) return '';
      return (
        '<p class="provider-claim-panel__message' +
        (messageError ? ' provider-claim-panel__message--error' : '') +
        '" role="alert">' +
        escapeHtml(message) +
        '</p>'
      );
    }

    function paint(user) {
      var html = '';
      if (!user) {
        html = renderSignedOut();
      } else if (isOwnedBy(user)) {
        html = renderOwned();
      } else if (pendingForProvider()) {
        html = renderPending(user);
      } else if (manualReviewClaim) {
        html = renderManualSubmitted();
      } else if (isClaimed()) {
        html = renderClaimedByOther();
      } else {
        html = renderClaimable();
      }
      panel.innerHTML = html;
    }

    function setMessage(msg, isError) {
      message = msg || '';
      messageError = !!isError;
    }

    function reloadProviderData() {
      return fb.db
        .collection('providers')
        .doc(providerId)
        .get()
        .then(function (doc) {
          if (doc.exists) providerData = doc.data();
        });
    }

    function refresh(user) {
      if (!user) {
        paint(null);
        return Promise.resolve();
      }
      var pendingPromise = getUserPendingClaims(fb.db, user);
      var activePromise = fb.db
        .collection('providerClaims')
        .where('userId', '==', user.uid)
        .where('providerId', '==', providerId)
        .where('status', '==', 'manual_review')
        .limit(1)
        .get();

      return Promise.all([pendingPromise, activePromise]).then(function (results) {
        pendingClaims = results[0];
        manualReviewClaim = results[1].empty ? null : results[1].docs[0].id;
        paint(user);
      });
    }

    function handleClaimStart(user) {
      var email = listingEmail();
      if (!email) {
        view = 'email';
        paint(user);
        return;
      }
      busy = true;
      setMessage('');
      paint(user);
      createProviderClaim(fb, user, providerId, email, listingRegion())
        .then(function () {
          busy = false;
          setMessage(
            'Verification email sent to ' +
              email +
              '. Check your inbox (including spam), set your password, then click Complete verification.',
            false
          );
          return refresh(user);
        })
        .catch(function (err) {
          busy = false;
          setMessage(err.message || 'Failed to start claim.', true);
          paint(user);
        });
    }

    function handleEmailSubmit(user) {
      var input = document.getElementById('provider-claim-email');
      var email = input ? input.value.trim() : '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setMessage('Enter a valid email address.', true);
        paint(user);
        return;
      }
      busy = true;
      setMessage('');
      paint(user);
      createProviderClaim(fb, user, providerId, email, listingRegion())
        .then(function () {
          busy = false;
          view = 'main';
          setMessage(
            'Verification email sent to ' +
              email +
              '. Check your inbox, set your password, then click Complete verification.',
            false
          );
          return refresh(user);
        })
        .catch(function (err) {
          busy = false;
          setMessage(err.message || 'Failed to send verification email.', true);
          paint(user);
        });
    }

    function handleComplete(user) {
      var claim = pendingForProvider();
      if (!claim) {
        setMessage('No pending claim found for this listing.', true);
        paint(user);
        return;
      }
      busy = true;
      setMessage('');
      paint(user);
      completeClaimVerification(fb, user, claim.id)
        .then(function () {
          busy = false;
          view = 'main';
          setMessage('Claim approved! You can now access the provider portal in the app.', false);
          return reloadProviderData().then(function () {
            return refresh(user);
          });
        })
        .catch(function (err) {
          busy = false;
          setMessage(err.message || 'Failed to complete verification.', true);
          paint(user);
        });
    }

    function handleManualSubmit(user) {
      var email = (
        document.getElementById('provider-claim-mr-email') || {}
      ).value;
      var phone = (
        document.getElementById('provider-claim-mr-phone') || {}
      ).value;
      var reason = (
        document.getElementById('provider-claim-mr-reason') || {}
      ).value;
      var docInfo = (document.getElementById('provider-claim-mr-doc') || {})
        .value;
      email = (email || '').trim();
      phone = (phone || '').trim();
      reason = (reason || '').trim();
      docInfo = (docInfo || '').trim();
      if (!email || !phone || !reason || !docInfo) {
        setMessage('Please fill out all fields.', true);
        paint(user);
        return;
      }
      busy = true;
      setMessage('');
      paint(user);
      createManualReviewRequest(
        fb,
        user,
        providerId,
        email,
        phone,
        reason,
        docInfo,
        listingRegion()
      )
        .then(function () {
          busy = false;
          view = 'main';
          setMessage(
            'Manual review request submitted. An ambassador will review within 5 business days.',
            false
          );
          return refresh(user);
        })
        .catch(function (err) {
          busy = false;
          setMessage(err.message || 'Failed to submit request.', true);
          paint(user);
        });
    }

    panel.addEventListener('click', function (e) {
      var user = fb.auth.currentUser;
      if (e.target.id === 'provider-claim-start') {
        if (!user) return;
        handleClaimStart(user);
      } else if (e.target.id === 'provider-claim-email-submit') {
        if (!user) return;
        handleEmailSubmit(user);
      } else if (e.target.id === 'provider-claim-complete') {
        if (!user) return;
        handleComplete(user);
      } else if (e.target.id === 'provider-claim-manual-link') {
        view = 'manual';
        setMessage('');
        paint(user);
      } else if (e.target.id === 'provider-claim-dispute') {
        view = 'manual';
        setMessage('');
        paint(user);
      } else if (e.target.id === 'provider-claim-mr-submit') {
        if (!user) return;
        handleManualSubmit(user);
      } else if (e.target.id === 'provider-claim-cancel') {
        view = 'main';
        setMessage('');
        paint(user);
      }
    });

    fb.auth.onAuthStateChanged(function (user) {
      refresh(user);
    });
  }

  function bootFromSlug(slug) {
    if (!slug) return;
    var fb = ensureFirebase();
    if (!fb) return;
    fb.db
      .collection('providers')
      .where('slug', '==', slug)
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return;
        var doc = snap.docs[0];
        var data = doc.data();
        init({
          providerId: doc.id,
          slug: data.slug || slug,
          businessName:
            pickField(data, ['businessName', 'Business Name']) || 'Provider',
          returnPath: '/providers/' + (data.slug || slug),
          providerData: data,
        });
      });
  }

  root.ThcProviderClaim = { init: init, bootFromSlug: bootFromSlug };
})(typeof window !== 'undefined' ? window : globalThis);
