/**
 * Location helpers for find-providers (ported from thc-native lib/locationUtils.ts).
 */
(function (root) {
  function toRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 3959;
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function filterProvidersByDistance(providers, userLat, userLon, radiusMiles) {
    return providers
      .map(function (provider) {
        if (
          typeof provider.latitude !== 'number' ||
          typeof provider.longitude !== 'number'
        ) {
          return null;
        }
        var distance = calculateDistance(
          userLat,
          userLon,
          provider.latitude,
          provider.longitude
        );
        return Object.assign({}, provider, {
          distance: Math.round(distance * 10) / 10,
        });
      })
      .filter(function (p) {
        return p !== null && p.distance <= radiusMiles;
      })
      .sort(function (a, b) {
        return a.distance - b.distance;
      });
  }

  function isNational(provider) {
    var region = provider.region || [];
    return Array.isArray(region) && region.indexOf('national') !== -1;
  }

  function sortProvidersByTier(providers) {
    return providers.slice().sort(function (a, b) {
      function tierPriority(provider) {
        var listingType = provider.listingType || provider['Listing Type'];
        if (!listingType) return 3;
        var type = String(listingType).toLowerCase().trim();
        if (type === 'featured') return 1;
        if (type === 'plus') return 2;
        return 3;
      }

      var aP = tierPriority(a);
      var bP = tierPriority(b);
      if (aP !== bP) return aP - bP;

      var aNat = isNational(a);
      var bNat = isNational(b);
      if (aNat !== bNat) return aNat ? 1 : -1;

      return (a.distance || 999) - (b.distance || 999);
    });
  }

  function pickCategory(provider) {
    return (
      provider.serviceCategory ||
      provider.servicesCategory ||
      provider['Services Category'] ||
      provider['Service Category'] ||
      ''
    );
  }

  function pickBusinessName(provider) {
    return provider.businessName || provider['Business Name'] || 'Provider';
  }

  function pickCityState(provider) {
    var city = provider.city || provider.City || '';
    var state = provider.state || provider.State || '';
    if (city && state) return city + ', ' + state;
    return city || state || '';
  }

  function pickRatingStats(provider) {
    var avg = Number(
      provider.ratingsAverage != null
        ? provider.ratingsAverage
        : provider['Rating Average']
    );
    var count = Number(
      provider.numberOfRatings != null
        ? provider.numberOfRatings
        : provider['Number of Ratings']
    );
    if (isNaN(avg)) avg = 0;
    if (isNaN(count)) count = 0;
    return { avg: avg, count: count };
  }

  function renderStarGlyphs(avg) {
    var rounded = Math.round(avg);
    if (rounded < 0) rounded = 0;
    if (rounded > 5) rounded = 5;
    var full = '★★★★★'.slice(0, rounded);
    var empty = '☆☆☆☆☆'.slice(0, 5 - rounded);
    return full + empty;
  }

  function categoryLabel(raw, categoryMap) {
    if (!raw) return 'Equine Professional';
    if (categoryMap && categoryMap[raw]) return categoryMap[raw];
    return raw;
  }

  function matchesKeyword(provider, keywordLower) {
    if (!keywordLower) return true;

    var businessName = (
      provider.businessName ||
      provider['Business Name'] ||
      ''
    ).toLowerCase();
    if (businessName.indexOf(keywordLower) !== -1) return true;

    var contactPerson = (
      provider.contactPerson ||
      provider.contact ||
      provider['Contact Person'] ||
      ''
    ).toLowerCase();
    if (contactPerson.indexOf(keywordLower) !== -1) return true;

    var description = (
      provider.description ||
      provider.brieflyDescribeYourServices ||
      provider['Briefly Describe Your Services'] ||
      ''
    ).toLowerCase();
    if (description.indexOf(keywordLower) !== -1) return true;

    var specialtiesRaw = provider.specialties || provider.Specialties;
    var specialties = Array.isArray(specialtiesRaw)
      ? specialtiesRaw.join(' ').toLowerCase()
      : String(specialtiesRaw || '').toLowerCase();
    if (specialties.indexOf(keywordLower) !== -1) return true;

    return false;
  }

  function filterProvidersByKeyword(providers, keyword) {
    var keywordLower = String(keyword || '')
      .trim()
      .toLowerCase();
    if (!keywordLower) return providers.slice();
    return providers.filter(function (p) {
      return matchesKeyword(p, keywordLower);
    });
  }

  root.ThcProviderLocation = {
    filterProvidersByDistance: filterProvidersByDistance,
    filterProvidersByKeyword: filterProvidersByKeyword,
    matchesKeyword: matchesKeyword,
    sortProvidersByTier: sortProvidersByTier,
    isNational: isNational,
    pickCategory: pickCategory,
    pickBusinessName: pickBusinessName,
    pickCityState: pickCityState,
    pickRatingStats: pickRatingStats,
    renderStarGlyphs: renderStarGlyphs,
    categoryLabel: categoryLabel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
