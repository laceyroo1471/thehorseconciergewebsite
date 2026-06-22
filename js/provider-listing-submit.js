/**
 * providers.html — submit new listing to providerSubmissions (same as app).
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

  var form = document.getElementById('provider-listing-form');
  if (!form || typeof firebase === 'undefined') return;

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();
  var storage = firebase.storage();

  var categorySelect = document.getElementById('prov-category');
  var errEl = document.getElementById('provider-listing-error');
  var busyEl = document.getElementById('provider-listing-busy');
  var successEl = document.getElementById('provider-listing-success');
  var submitBtn = document.getElementById('provider-listing-submit');

  function normalizeEmail(email) {
    return String(email || '')
      .trim()
      .toLowerCase();
  }

  function setBusy(msg) {
    if (busyEl) {
      busyEl.textContent = msg || '';
      busyEl.hidden = !msg;
    }
    if (submitBtn) submitBtn.disabled = !!msg;
  }

  function showError(msg) {
    if (errEl) {
      errEl.textContent = msg || '';
      errEl.hidden = !msg;
    }
    if (successEl) successEl.hidden = true;
  }

  function showSuccess(msg) {
    if (successEl) {
      successEl.textContent = msg || '';
      successEl.hidden = !msg;
    }
    if (errEl) errEl.hidden = true;
  }

  function mapAuthError(code) {
    switch (code) {
      case 'auth/invalid-email':
        return 'Please enter a valid email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
        return 'That email already has an account — enter the correct password to sign in and submit.';
      case 'auth/email-already-in-use':
        return 'That email already has an account — enter your password to sign in and submit.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function loadCategories() {
    if (!categorySelect) return Promise.resolve();
    return db
      .collection('metadata')
      .doc('serviceCatagories')
      .get()
      .then(function (snap) {
        if (!snap.exists) return;
        var categories = snap.data().categories || [];
        categories
          .filter(function (c) {
            return c && c.label && c.value;
          })
          .sort(function (a, b) {
            return a.label.localeCompare(b.label);
          })
          .forEach(function (cat) {
            var opt = document.createElement('option');
            opt.value = cat.value;
            opt.textContent = cat.label;
            categorySelect.appendChild(opt);
          });
      })
      .catch(function (err) {
        console.error('Categories load failed:', err);
      });
  }

  function geocodeAddress(city, state, zip) {
    var address = [city, state, zip].filter(Boolean).join(', ');
    var url =
      'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(address) +
      '&countrycodes=us&limit=1';
    return fetch(url, { headers: { 'User-Agent': 'THC-Website/1.0' } })
      .then(function (res) {
        if (!res.ok) return null;
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.length) return null;
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
        };
      })
      .catch(function () {
        return null;
      });
  }

  function writeUserProfile(user, contactPerson, zip) {
    return db
      .collection('users')
      .doc(user.uid)
      .set(
        {
          uid: user.uid,
          email: user.email,
          role: 'user',
          name: contactPerson,
          displayName: contactPerson,
          zipCode: zip,
          isEarlyAdopter: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  }

  function ensureAuth(email, password, contactPerson, zip) {
    var user = auth.currentUser;
    if (user && normalizeEmail(user.email) === normalizeEmail(email)) {
      return Promise.resolve(user);
    }

    function signUpOrIn() {
      return auth
        .createUserWithEmailAndPassword(email, password)
        .then(function (cred) {
          return writeUserProfile(cred.user, contactPerson, zip).then(function () {
            return cred.user;
          });
        })
        .catch(function (err) {
          if (err.code === 'auth/email-already-in-use') {
            return auth.signInWithEmailAndPassword(email, password);
          }
          throw err;
        });
    }

    if (user && normalizeEmail(user.email) !== normalizeEmail(email)) {
      return auth.signOut().then(signUpOrIn);
    }

    return signUpOrIn();
  }

  function uploadLogo(file, businessName) {
    var timestamp = Date.now();
    var safeName = businessName.replace(/[^a-zA-Z0-9]/g, '_') || 'logo';
    var ref = storage.ref(
      'business-logos/' + timestamp + '_' + safeName + '.jpg'
    );
    return ref.put(file).then(function () {
      return ref.getDownloadURL();
    });
  }

  function validateForm() {
    var missing = [];
    if (!val('biz-name')) missing.push('Business name');
    if (!val('provider-name')) missing.push('Provider / contact name');
    if (!val('prov-phone')) missing.push('Phone');
    if (!val('prov-email')) missing.push('Email');
    if (!val('prov-city')) missing.push('City');
    if (!val('prov-state')) missing.push('State');
    if (!val('prov-zip')) missing.push('ZIP code');
    if (!categorySelect || !categorySelect.value) missing.push('Category');
    if (!val('prov-desc')) missing.push('Description');
    if (val('acct-password').length < 6) missing.push('Password (6+ characters)');

    if (missing.length) {
      showError('Please fill out: ' + missing.join(', ') + '.');
      return null;
    }

    var email = val('prov-email');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('Please enter a valid email address.');
      return null;
    }

    var zip = val('prov-zip').replace(/\D/g, '');
    if (!/^\d{5}$/.test(zip)) {
      showError('Please enter a valid 5-digit ZIP code.');
      return null;
    }

    return {
      businessName: val('biz-name'),
      contactPerson: val('provider-name'),
      phone: val('prov-phone'),
      email: email,
      website: val('prov-web'),
      city: val('prov-city'),
      state: val('prov-state'),
      zip: zip,
      travelRadius: val('prov-radius').replace(/\D/g, ''),
      serviceCategory: categorySelect.value,
      description: val('prov-desc'),
      password: val('acct-password'),
      referralSource: val('prov-referral') || 'web',
    };
  }

  function submitListing(data, user) {
    var logoInput = document.getElementById('prov-logo');
    var logoFile =
      logoInput && logoInput.files && logoInput.files[0]
        ? logoInput.files[0]
        : null;

    setBusy('Geocoding address…');

    return geocodeAddress(data.city, data.state, data.zip)
      .then(function (coords) {
        setBusy(logoFile ? 'Uploading logo…' : 'Submitting listing…');
        var logoPromise = logoFile
          ? uploadLogo(logoFile, data.businessName).catch(function (err) {
              console.warn('Logo upload failed:', err);
              return null;
            })
          : Promise.resolve(null);

        return logoPromise.then(function (logoUrl) {
          var submission = {
            businessName: data.businessName,
            contactPerson: data.contactPerson,
            phoneNumber: data.phone,
            phone: data.phone,
            email: data.email,
            website: data.website,
            city: data.city,
            state: data.state,
            zip: data.zip,
            travelRadius: data.travelRadius,
            serviceCategory: data.serviceCategory,
            description: data.description,
            licensed: false,
            insured: false,
            referralSource: data.referralSource,
            status: 'pending',
            createdAt: new Date(),
            listingType: 'basic',
            source: 'web',
          };

          if (logoUrl) submission.logo = logoUrl;
          if (coords) {
            submission.latitude = coords.latitude;
            submission.longitude = coords.longitude;
          }
          if (user) {
            submission.submitterUserId = user.uid;
            submission.submitterEmail = user.email || data.email;
          }

          return db.collection('providerSubmissions').add(submission);
        });
      });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError('');
    showSuccess('');

    var data = validateForm();
    if (!data) return;

    setBusy('Creating account…');

    ensureAuth(data.email, data.password, data.contactPerson, data.zip)
      .then(function (user) {
        return submitListing(data, user);
      })
      .then(function () {
        setBusy('');
        showSuccess(
          'Listing submitted for review! A member of our team will manually approve your profile before it appears in the directory. Use the same email and password to sign in once approved.'
        );
        form.reset();
        if (categorySelect) categorySelect.selectedIndex = 0;
      })
      .catch(function (err) {
        console.error(err);
        setBusy('');
        showError(mapAuthError(err.code) || err.message || 'Submission failed.');
      });
  });

  loadCategories();
})();
