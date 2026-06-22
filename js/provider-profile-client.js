/**
 * Client-side provider profile for /providers/{slug}
 * Used when static serve rewrites here (local dev). Production uses Vercel SSR API.
 */
(function () {
  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var root = document.getElementById('provider-profile-root');
  if (!root || typeof firebase === 'undefined') return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var Loc = window.ThcProviderLocation;

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

  function parseSlug() {
    var m = window.location.pathname.match(/\/providers\/([^/?#]+)/i);
    if (m) return decodeURIComponent(m[1]).toLowerCase();
    var params = new URLSearchParams(window.location.search);
    return (params.get('slug') || '').toLowerCase();
  }

  function renderNotFound(slug) {
    document.title = 'Provider not found — The Horse Concierge';
    root.innerHTML =
      '<div class="section">' +
      '<h1 class="heading-lg">Provider not found</h1>' +
      (slug
        ? '<p class="body-text">No listing matches <strong>' + escapeHtml(slug) + '</strong>.</p>'
        : '<p class="body-text">That provider listing could not be found.</p>') +
      '<a class="btn-primary" href="/find-providers" style="margin-top:24px;display:inline-flex;">Search the directory</a>' +
      '</div>';
  }

  function renderStars(avg) {
    if (!Loc || !Loc.renderStarGlyphs) return '';
    return (
      '<div class="provider-detail-rating">' +
      '<span class="provider-rating-stars">' +
      Loc.renderStarGlyphs(avg) +
      '</span>' +
      '<span class="provider-detail-rating__text">' +
      escapeHtml(avg.toFixed(1)) +
      '</span></div>'
    );
  }

  function renderProfile(data, id, reviews) {
    var businessName = pickField(data, ['businessName', 'Business Name']) || 'Provider';
    var categoryLabel =
      data.seoCategoryLabel ||
      (Loc ? Loc.categoryLabel(pickField(data, ['serviceCategory', 'servicesCategory', 'Services Category']), {}) : 'Equine Professional');
    var city = pickField(data, ['city', 'City']);
    var state = data.seoStateCode || pickField(data, ['state', 'State']);
    var slug = data.slug || parseSlug();
    var locationLine = [city, state].filter(Boolean).join(', ');
    var subhead = categoryLabel + (locationLine ? ' in ' + locationLine : '');

    var stats = Loc ? Loc.pickRatingStats(data) : { avg: 0, count: 0 };
    var ratingBlock =
      window.ThcProviderStarRating && window.ThcProviderStarRating.renderSectionHtml
        ? window.ThcProviderStarRating.renderSectionHtml(stats.avg, stats.count)
        : '';

    var description = pickField(data, [
      'description',
      'brieflyDescribeYourServices',
      'Briefly Describe Your Services',
    ]);
    var website = pickField(data, [
      'websiteOrSocialMediaPage',
      'websiteOrSocials',
      'website',
      'Website or Social Media Page',
    ]);
    if (website && !/^https?:\/\//i.test(website)) website = 'https://' + website;

    var details = '';
    if (description) {
      details +=
        '<p class="provider-detail-field provider-detail-field--desc"><strong>About</strong><br>' +
        escapeHtml(description) +
        '</p>';
    }
    if (website) {
      details +=
        '<p class="provider-detail-field"><strong>Website</strong><br>' +
        '<a href="' +
        escapeHtml(website) +
        '" target="_blank" rel="noopener noreferrer">Visit website</a></p>';
    }

    var reviewsHtml = '';
    if (reviews.length) {
      reviewsHtml =
        '<section class="provider-reviews" aria-label="Reviews"><h2 class="heading-md provider-reviews__title">Reviews</h2>';
      reviews.forEach(function (r) {
        reviewsHtml +=
          '<article class="provider-review">' +
          '<div class="provider-review__head">' +
          '<span class="provider-rating-stars">' +
          (Loc ? Loc.renderStarGlyphs(r.rating) : '') +
          '</span>' +
          '<span class="provider-review__author">' +
          escapeHtml(r.reviewerName || 'Anonymous') +
          '</span></div>' +
          '<p class="provider-review__body">' +
          escapeHtml(r.comment) +
          '</p></article>';
      });
      reviewsHtml += '</section>';
    }

    var pageTitle =
      businessName +
      ' | ' +
      categoryLabel +
      (state ? ' in ' + state : '') +
      ' | The Horse Concierge';
    document.title = pageTitle;

    var metaDesc =
      businessName +
      ' — ' +
      categoryLabel +
      (locationLine ? ' in ' + locationLine : '') +
      '. View on The Horse Concierge.';
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', metaDesc);

    root.innerHTML =
      '<div class="section provider-detail-back">' +
      '<nav class="provider-breadcrumb" aria-label="Breadcrumb">' +
      '<a href="/find-providers" class="snapshot-footer__link">Find providers</a>' +
      ' · <span>' +
      escapeHtml(categoryLabel) +
      '</span>' +
      (state ? ' · <span>' + escapeHtml(state) + '</span>' : '') +
      '</nav></div>' +
      '<article class="section provider-detail-card">' +
      '<h1 class="heading-lg provider-detail-card__title">' +
      escapeHtml(businessName) +
      '</h1>' +
      '<p class="provider-detail-card__subhead">' +
      escapeHtml(subhead) +
      '</p>' +
      ratingBlock +
      details +
      '<div id="provider-contact-gate">' +
      (window.ThcContactAccessGate
        ? window.ThcContactAccessGate.render('/providers/' + slug)
        : '') +
      '</div>' +
      '<section id="provider-claim-panel" class="provider-claim-panel" aria-label="Claim this listing">' +
      '<p class="provider-claim-panel__loading body-text">Loading claim options…</p>' +
      '</section>' +
      reviewsHtml +
      '</article>';
  }

  function loadReviews(providerId) {
    return db
      .collection('ratings')
      .where('providerId', '==', providerId)
      .limit(25)
      .get()
      .then(function (snap) {
        return snap.docs
          .map(function (doc) {
            var d = doc.data();
            if (!d.comment || !String(d.comment).trim()) return null;
            return {
              rating: d.rating || 0,
              comment: String(d.comment).trim(),
              reviewerName: d.reviewerName || 'Anonymous',
            };
          })
          .filter(Boolean)
          .slice(0, 10);
      })
      .catch(function () {
        return [];
      });
  }

  var slug = parseSlug();
  if (!slug) {
    renderNotFound('');
    return;
  }

  db.collection('providers')
    .where('slug', '==', slug)
    .limit(1)
    .get()
    .then(function (snap) {
      if (snap.empty) {
        renderNotFound(slug);
        return;
      }
      var doc = snap.docs[0];
      var data = doc.data();
      if (data.visibleInDirectory === false || !data.slug) {
        renderNotFound(slug);
        return;
      }
      return loadReviews(doc.id).then(function (reviews) {
        renderProfile(data, doc.id, reviews);
        if (window.ThcProviderContactUnlock) {
          window.ThcProviderContactUnlock.init({
            providerData: data,
            returnPath: '/providers/' + data.slug,
          });
        }
        if (window.ThcProviderStarRating) {
          window.ThcProviderStarRating.init({
            providerId: doc.id,
            providerName:
              pickField(data, ['businessName', 'Business Name']) || 'Provider',
          });
        }
        if (window.ThcProviderClaim) {
          window.ThcProviderClaim.init({
            providerId: doc.id,
            slug: data.slug || slug,
            businessName:
              pickField(data, ['businessName', 'Business Name']) || 'Provider',
            returnPath: '/providers/' + (data.slug || slug),
            providerData: data,
          });
        }
      });
    })
    .catch(function (err) {
      console.error(err);
      root.innerHTML =
        '<div class="section"><p class="body-text">Unable to load this profile. Check your connection and try again.</p>' +
        '<a class="btn-primary" href="/find-providers" style="margin-top:16px;display:inline-flex;">Back to search</a></div>';
    });
})();
