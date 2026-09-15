/**
 * Week 4 Riding & Saving — Hub calculators, calendar list, Saturday swap, Sunday reveal.
 *
 * Live app field bindings (inspected 2026-09-15, rebound 2026-09-15):
 *   feedRoomItems.supplier, packagePrice, packageNetWeight, price, packageSize, packageUnit
 *   horseFeedAssignments.amountPerFeeding, amountPerFeedingUnit, feedingsPerDay,
 *     amount, amountUnit, frequency, feedRoomItemId, status
 *   hayAnalyses.packagePrice, packageNetWeight, supplier, forageName
 *   horseForageAssignments.amountPerFeeding, amountPerFeedingUnit, feedingsPerDay,
 *     feedingRate, feedingRateUnit, hayAnalysisId, status
 *   calendarEvents.date (YYYY-MM-DD), title, type, isTreatmentTask
 *   feedRoomCostReviews — reserved OTA completion event (empty at inspect)
 *
 * Hub estimates never overwrite Digital Feed Room records.
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var DOOR_SIGNIN = 'horsemanship-challenge.html?signin=1#register';
  var TSC_ALIASES = {
    'tractor supply': true,
    'tractor supply co': true,
    'tractor supply company': true,
    tsc: true,
  };

  var ROUND_METHODS = [
    { id: 'round-ground', label: 'No feeder / on the ground', waste: 0.57, custom: false },
    { id: 'round-hay-sleigh', label: 'Hay sleigh-style open cradle', waste: 0.33, custom: false },
    { id: 'round-ring', label: 'Standard open ring feeder', waste: 0.19, custom: false },
    { id: 'round-tombstone', label: 'Tombstone-style feeder', waste: 0.19, custom: false },
    { id: 'round-cone', label: 'Cone-style feeder', waste: 0.19, custom: false },
    { id: 'round-tombstone-saver', label: 'Tombstone Saver-style feeder', waste: 0.13, custom: false },
    { id: 'round-covered-cradle', label: 'Covered cradle-style feeder', waste: 0.11, custom: false },
    { id: 'round-hayhut', label: 'Hay Hut-style covered feeder', waste: 0.09, custom: false },
    { id: 'round-cinch-net', label: 'Cinch Net-style system', waste: 0.06, custom: false },
    { id: 'round-waste-less', label: 'Waste Less-style restrictive feeder', waste: 0.05, custom: false },
    { id: 'round-custom', label: 'My feeding method is not listed', waste: null, custom: true },
  ];

  var SQUARE_METHODS = [
    { id: 'square-ground', label: 'On the ground without a feeder', waste: 0.13, custom: false },
    { id: 'square-hayrack', label: 'Hayrack-style feeder', waste: 0.05, custom: false },
    { id: 'square-basket', label: 'Basket-style feeder', waste: 0.03, custom: false },
    { id: 'square-slat', label: 'Restrictive slat-style feeder', waste: 0.01, custom: false },
    { id: 'square-net', label: 'Individual hay net or hay bag', waste: null, custom: true },
    { id: 'square-custom', label: 'My feeding method is not listed', waste: null, custom: true },
  ];

  var ROUND_FEEDERS = [
    { id: 'round-waste-less', label: 'Waste Less-style restrictive feeder', waste: 0.05, price: 999.99, product: 'Hay Optimizer Pasture Hay Feeder', retailer: 'Cashmans', url: 'https://www.cashmans.com/collections/pasture-and-round-bale-feeders', match: 'Comparable restricted-access design' },
    { id: 'round-cinch-net', label: 'Cinch Net-style system', waste: 0.06, price: 149.99, product: 'Round Bale Hay Net', retailer: 'Texas Haynet', url: 'https://texashaynet.com/', match: 'Comparable round-bale net' },
    { id: 'round-hayhut', label: 'Hay Hut-style covered feeder', waste: 0.09, price: 1045, product: 'Hayhut', retailer: 'Hayhuts', url: 'https://www.hayhuts.com/products.htm', match: 'Same named design' },
    { id: 'round-covered-cradle', label: 'Covered cradle-style feeder', waste: 0.11, price: 3999.99, product: 'Covered Tombstone Round-Bale Feeder', retailer: 'Cashmans', url: 'https://www.cashmans.com/products/tombstone-round-bale-pasture-feeder-roof', match: 'Comparable covered feeder' },
    { id: 'round-tombstone-saver', label: 'Tombstone Saver-style feeder', waste: 0.13, price: 2499.99, product: 'Sioux Steel Tombstone Saver', retailer: 'Barn World', url: 'https://barnworld.com/products/round-bale-feeder-for-horses', match: 'Same named design' },
    { id: 'round-cone', label: 'Cone-style feeder', waste: 0.19, price: 1700, product: 'Hay Manager Bale Feeder', retailer: 'The Hay Manager', url: 'https://thehaymanager.com/', match: 'Comparable cone/suspended design' },
    { id: 'round-tombstone', label: 'Tombstone-style feeder', waste: 0.19, price: 449.99, product: 'Priefert Tombstone Round-Bale Feeder', retailer: 'Buchheit', url: 'https://www.buchheits.com/p/round-bale-feeder-tombstone', match: 'Same general design' },
    { id: 'round-ring', label: 'Standard open ring feeder', waste: 0.19, price: 323.99, product: 'CountyLine Galvanized Round-Bale Ring', retailer: 'Tractor Supply', url: 'https://www.tractorsupply.com/tsc/product/countyline-galvanized-bale-feeder-8-ft-dia', match: 'Comparable open ring' },
    { id: 'round-hay-sleigh', label: 'Hay sleigh-style open cradle', waste: 0.33, price: 599.99, product: 'Tarter Galvanized Cradle Bale Feeder', retailer: 'Tractor Supply', url: 'https://www.tractorsupply.com/tsc/catalog/hay-feeders', match: 'Comparable open cradle' },
  ];

  var SQUARE_FEEDERS = [
    { id: 'square-slat', label: 'Restrictive slat-style feeder', waste: 0.01, price: 1300, product: 'Small Square Bale Feeder', retailer: 'Craig Cameron Store', url: 'https://www.craigcameronstore.com/products/small-square-bale-feeder', match: 'Comparable restrictive feeder' },
    { id: 'square-basket', label: 'Basket-style feeder', waste: 0.03, price: 499.99, product: 'Tarter Equine Hay Basket', retailer: 'The Stock Shop', url: 'https://thestockshop.org/products/tarter-equine-hay-basket', match: 'Same named product/design' },
    { id: 'square-hayrack', label: 'Hayrack-style feeder', waste: 0.05, price: 580, product: 'Priefert 5-ft Bunk Horse Feeder with Hay Rack', retailer: 'NRS World', url: 'https://nrsworld.com/', match: 'Comparable hayrack design' },
    { id: 'square-net-cashmans', label: 'Individual hay net example', waste: null, price: 49.99, product: 'Square Bale Web Slow Feeder', retailer: 'Cashmans', url: 'https://www.cashmans.com/products/square-bale-web-slow-feeder-horses', match: 'No universal research waste rate' },
    { id: 'square-net-chewy', label: 'Individual hay net example', waste: null, price: 26.36, product: 'Tough1 Slow Feed Square Bale Horse Feeder', retailer: 'Chewy', url: 'https://www.chewy.com/tough1-slow-feed-square-bale-horse/dp/3801519', match: 'No universal research waste rate' },
  ];

  var SATURDAY_ROWS = [
    { id: 'stall-fork', item: 'Stall fork', tsc: "Producer's Pride Stall Shavings Fork", tscPrice: 46.99, alt: 'Replacement stall fork', retailer: 'Temu', altPrice: 12, note: 'User-observed Temu price. Compare durability, shipping and replacement frequency.', source: 'https://www.tractorsupply.com/tsc/catalog/rakes-forks' },
    { id: 'muck-tub', item: 'Muck bucket/tub', tsc: 'Little Giant DuraFlex Muck Tub, 70 qt.', tscPrice: 34.99, alt: 'Muck bucket/tub', retailer: 'Big Lots', altPrice: 8, note: 'User-observed Big Lots price; inventory and price vary by store.', source: 'https://www.tractorsupply.com/tsc/product/miller-mfg-little-giant-duraflex-muck-tub-70-qt-2577804' },
    { id: 'supplement-container', item: 'Supplement container', tsc: 'IRIS USA Airtight Pet Food Storage Container, 35 lb.', tscPrice: 34.99, alt: 'Airtight rice container from 2-pack', retailer: 'Temu', altPrice: 5, note: 'Temu price is $10 for two. This is a smaller-capacity function comparison, not an equivalent container.', source: 'https://www.tractorsupply.com/tsc/catalog/pet-food-storage-containers' },
    { id: 'feed-container', item: 'Feed storage container', tsc: 'Van Ness Pet Food Storage Container, 50 lb.', tscPrice: 39.99, alt: 'IRIS airtight food storage combo, 30 lb. + 11 lb.', retailer: 'Walmart', altPrice: 26.99, note: 'Different total capacity; compare seal quality and food-safe use before choosing.', source: 'https://www.tractorsupply.com/tsc/product/van-ness-50-lb-pet-food-storage-container-fc50' },
  ];

  var REWARD_TIERS = {
    neighbor: { label: 'Neighbor 1×', rate: 1, threshold: 200, cert: 2 },
    preferred: { label: 'Preferred 1.5×', rate: 1.5, threshold: 500, cert: 5 },
    preferredPlus: { label: 'Preferred Plus 2×', rate: 2, threshold: 1000, cert: 10 },
    tscCard: { label: 'TSC personal credit card 5×', rate: 5, threshold: 1000, cert: 10 },
  };

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  var auth = null;
  var db = null;
  var currentUser = null;
  var registration = null;
  var progress = {};
  var snapshot = {
    barnFeedCost: null,
    retailers: [],
    hayLb: null,
    hayCost: null,
    hayComplete: false,
    missing: [],
    supplementYearCost: null,
    supplementLines: [],
    supplementMissing: [],
    supplementCount: 0,
    calculatedAt: null,
  };
  var calendarItems = [];

  function num(v) {
    var n = Number(v);
    return isFinite(n) ? n : NaN;
  }
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    var sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(n).toFixed(2);
  }
  function moneyWhole(n) {
    if (n == null || !isFinite(n)) return '—';
    var sign = n < 0 ? '-' : '';
    return sign + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  }
  function isSupplementItem(item) {
    return String((item && item.category) || '').toLowerCase() === 'supplement';
  }
  function pounds(n) {
    if (n == null || !isFinite(n)) return '—';
    var digits = Math.abs(n) >= 100 ? 0 : 1;
    return (
      n.toLocaleString('en-US', {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
      }) + ' lb'
    );
  }
  function pctLabel(n) {
    if (n == null || !isFinite(n)) return '—';
    return (n * 100).toFixed(0) + '%';
  }
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }
  function setVal(id, value) {
    var el = document.getElementById(id);
    if (!el || value == null || value === '') return;
    el.value = value;
  }
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  function show(id, on) {
    var el = document.getElementById(id);
    if (el) el.hidden = !on;
  }
  function todayYmd() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function normalizeRetailer(name) {
    var n = String(name || '')
      .trim()
      .toLowerCase();
    if (!n) return { id: 'other', label: 'Other / Not specified' };
    if (TSC_ALIASES[n]) return { id: 'tsc', label: String(name).trim() || 'Tractor Supply' };
    return { id: 'other', label: String(name).trim() };
  }

  function parseLooseNumber(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    var s = String(v || '').trim();
    if (!s) return NaN;
    var frac = s.match(/^(\d+)\s*\/\s*(\d+)/);
    if (frac) {
      var den = Number(frac[2]);
      return den ? Number(frac[1]) / den : NaN;
    }
    var m = s.replace(/,/g, '').match(/-?[\d.]+/);
    return m ? num(m[0]) : NaN;
  }

  function parseMoney(v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    var s = String(v || '').replace(/[^0-9.]/g, '');
    return s ? num(s) : NaN;
  }

  function toLb(amount, unit) {
    var n = parseLooseNumber(amount);
    if (!(n > 0)) return NaN;
    var u = String(unit || '').toLowerCase();
    if (!u || /lb|pound/.test(u)) return n;
    if (/oz|ounce/.test(u)) return n / 16;
    if (/kg|kilogram/.test(u)) return n * 2.20462;
    if (/(^|[^a-z])g(ram)?s?([^a-z]|$)/.test(u) && !/kg/.test(u)) return n / 453.592;
    return NaN;
  }

  function parseAmountLb(amount, unit) {
    var raw = String(amount == null ? '' : amount).trim();
    var fromText = raw.match(/([\d.]+)\s*(lb|lbs|pound)/i);
    if (fromText) return num(fromText[1]);
    return toLb(raw, unit);
  }

  function packagePriceOf(item) {
    var priced = parseMoney(item && item.packagePrice);
    if (priced > 0) return priced;
    return parseMoney(item && item.price);
  }

  function packageWeightLb(item) {
    var net = toLb(item && item.packageNetWeight, (item && item.packageWeightUnit) || (item && item.packageUnit));
    if (net > 0) return net;
    return toLb(item && item.packageSize, (item && item.packageUnit) || (item && item.packageWeightUnit));
  }

  function servingLb(asg) {
    var weighed = toLb(asg && asg.amountPerFeeding, asg && asg.amountPerFeedingUnit);
    if (weighed > 0) return weighed;
    return parseAmountLb(asg && asg.amount, asg && asg.amountUnit);
  }

  function timesPerDay(asg) {
    var n = num(asg && asg.feedingsPerDay);
    if (n > 0 && n <= 8) return n;
    return parseTimesPerDay(asg && asg.frequency);
  }

  function parseTimesPerDay(freq) {
    var f = String(freq || '').toLowerCase();
    if (!f) return NaN;
    if (/24\/7|free\s*choice/.test(f)) return 1;
    if (/twice|2x|2\s*x|am\s*pm|two/.test(f)) return 2;
    if (/three|3x|3\s*x/.test(f)) return 3;
    if (/once|1x|1\s*x|daily|sid/.test(f)) return 1;
    var n = num(f);
    return n > 0 && n <= 8 ? n : NaN;
  }

  function queryByUser(col) {
    return db
      .collection(col)
      .where('userId', '==', currentUser.uid)
      .get()
      .then(function (snap) {
        var rows = [];
        snap.forEach(function (doc) {
          var d = doc.data() || {};
          d.__id = doc.id;
          rows.push(d);
        });
        return rows;
      })
      .catch(function () {
        return [];
      });
  }

  function loadSnapshot() {
    if (!db || !currentUser) return Promise.resolve();
    return Promise.all([
      queryByUser('feedRoomItems'),
      queryByUser('horseFeedAssignments'),
      queryByUser('hayAnalyses'),
      queryByUser('horseForageAssignments'),
      queryByUser('feedRoomCostReviews'),
      queryByUser('calendarEvents'),
    ]).then(function (parts) {
      snapshot = deriveSnapshot(parts[0], parts[1], parts[2], parts[3], parts[4]);
      calendarItems = deriveCalendar(parts[5]);
      renderSnapshotHints();
      renderTuesdayFromSnapshot();
      renderWednesdayPrefill();
      renderThursday();
      renderFriday();
      renderCalendar();
      renderSundayProgress();
    });
  }

  function deriveSnapshot(items, assignments, hayDocs, forageAssigns, reviews) {
    var itemMap = {};
    items.forEach(function (it) {
      if (it.archivedAt || it.status === 'archived') return;
      itemMap[it.__id] = it;
    });
    var missing = [];
    var retailerTotals = {};
    var barnFeed = 0;
    var feedComplete = false;
    var supplementMonthly = 0;
    var supplementLines = {};
    var supplementMissing = [];
    var supplementIds = {};

    assignments.forEach(function (asg) {
      if (asg.status && asg.status !== 'active') return;
      var item = itemMap[asg.feedRoomItemId];
      if (!item) return;
      var supp = isSupplementItem(item);
      var label = item.productName || item.brand || (supp ? 'A supplement' : 'A feed product');
      if (supp) supplementIds[item.__id] = true;
      var price = packagePriceOf(item);
      var weight = packageWeightLb(item);
      var dailyLb = servingLb(asg);
      var times = timesPerDay(asg);
      if (!(price > 0) || !(weight > 0)) {
        missing.push(label + ' needs package weight and price');
        if (supp) supplementMissing.push(label + ' needs package weight and price');
        return;
      }
      if (!(dailyLb > 0) || !(times > 0)) {
        missing.push(label + ' needs a weighed serving and frequency');
        if (supp) supplementMissing.push(label + ' needs a weighed serving and frequency');
        return;
      }
      var monthly = dailyLb * times * 30 * (price / weight);
      if (!isFinite(monthly)) return;
      feedComplete = true;
      barnFeed += monthly;
      if (supp) {
        supplementMonthly += monthly;
        if (!supplementLines[label]) supplementLines[label] = 0;
        supplementLines[label] += monthly;
      }
      var route = normalizeRetailer(item.supplier);
      var key = route.id === 'tsc' ? 'tsc:' + route.label : 'other:' + route.label;
      if (!retailerTotals[key]) {
        retailerTotals[key] = { id: route.id, label: route.label, monthlyCost: 0 };
      }
      retailerTotals[key].monthlyCost += monthly;
    });

    var hayLb = 0;
    var hayCost = 0;
    var hayComplete = false;
    var hayMap = {};
    hayDocs.forEach(function (h) {
      hayMap[h.__id] = h;
    });
    forageAssigns.forEach(function (asg) {
      if (asg.status && asg.status !== 'active') return;
      var hay = hayMap[asg.hayAnalysisId];
      if (!hay) return;
      var price = packagePriceOf(hay);
      var weight = packageWeightLb(hay);
      var perFeeding = toLb(asg.amountPerFeeding, asg.amountPerFeedingUnit);
      var times = num(asg.feedingsPerDay);
      var daily =
        perFeeding > 0 ? perFeeding * (times > 0 ? times : 1) : parseAmountLb(asg.feedingRate, asg.feedingRateUnit);
      if (!(price > 0) || !(weight > 0)) {
        missing.push((hay.forageName || 'Hay') + ' needs bale weight and price in the Digital Feed Room');
        return;
      }
      if (!(daily > 0)) {
        missing.push((hay.forageName || 'Hay') + ' needs a daily feeding rate');
        return;
      }
      hayLb += daily * 30;
      hayCost += daily * 30 * (price / weight);
      hayComplete = true;
    });
    if (!forageAssigns.length) {
      hayDocs.forEach(function (hay) {
        var price = packagePriceOf(hay);
        var weight = packageWeightLb(hay);
        if (price > 0 && weight > 0) hayComplete = true;
        else missing.push((hay.forageName || 'Hay') + ' needs bale weight and price in the Digital Feed Room');
      });
    }

    if (reviews && reviews.length) {
      var latest = reviews
        .slice()
        .sort(function (a, b) {
          var tb = (b.calculatedAt && b.calculatedAt.seconds) || 0;
          var ta = (a.calculatedAt && a.calculatedAt.seconds) || 0;
          return tb - ta;
        })[0];
      if (latest) {
        if (num(latest.barnFeedCostMonthly) > 0) barnFeed = num(latest.barnFeedCostMonthly);
        if (Array.isArray(latest.retailerSubtotals) && latest.retailerSubtotals.length) {
          retailerTotals = {};
          latest.retailerSubtotals.forEach(function (row) {
            var route = normalizeRetailer(row.name || row.retailer);
            var key = route.id + ':' + route.label;
            retailerTotals[key] = {
              id: route.id,
              label: route.label,
              monthlyCost: num(row.monthlyCost),
            };
          });
        }
        if (num(latest.barnHay30DayLb) > 0) hayLb = num(latest.barnHay30DayLb);
        if (num(latest.barnHay30DayCost) > 0) hayCost = num(latest.barnHay30DayCost);
        hayComplete = hayComplete || (num(latest.barnHay30DayLb) > 0 && num(latest.barnHay30DayCost) > 0);
      }
    }

    return {
      barnFeedCost: feedComplete ? barnFeed : null,
      retailers: Object.keys(retailerTotals).map(function (k) {
        return retailerTotals[k];
      }),
      hayLb: hayComplete && hayLb > 0 ? hayLb : null,
      hayCost: hayComplete && hayCost > 0 ? hayCost : null,
      hayComplete: hayComplete && hayLb > 0 && hayCost > 0,
      missing: unique(missing),
      supplementYearCost: supplementMonthly > 0 ? supplementMonthly * 12 : null,
      supplementLines: Object.keys(supplementLines)
        .map(function (name) {
          return { name: name, yearCost: supplementLines[name] * 12 };
        })
        .sort(function (a, b) {
          return b.yearCost - a.yearCost;
        }),
      supplementMissing: unique(supplementMissing),
      supplementCount: Object.keys(supplementIds).length,
      calculatedAt: new Date().toISOString(),
    };
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (x) {
      if (seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }

  function deriveCalendar(events) {
    var today = todayYmd();
    return events
      .filter(function (e) {
        if (e.isArchived || e.archivedAt) return false;
        if (e.isTreatmentTask === true) return false;
        var ds = typeof e.date === 'string' ? e.date.slice(0, 10) : '';
        return ds && ds >= today;
      })
      .map(function (e) {
        return {
          id: e.__id,
          date: String(e.date).slice(0, 10),
          title: e.title || e.type || 'Calendar item',
          type: e.type || '',
          horses: Array.isArray(e.horseNames) ? e.horseNames.join(', ') : '',
        };
      })
      .sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });
  }

  function persistProgress(patch) {
    progress = Object.assign({}, progress, patch, { updatedAt: new Date().toISOString() });
    if (!db || !currentUser) return Promise.resolve();
    return db
      .collection('challengeRegistrations')
      .doc(currentUser.uid)
      .set({ week4Progress: progress }, { merge: true })
      .catch(function (err) {
        console.warn('week4Progress save skipped', err);
      });
  }

  function persistSwap(swap) {
    if (!db || !currentUser) return Promise.reject(new Error('signin'));
    var ref = db.collection('challengeRegistrations').doc(currentUser.uid);
    var actionPayload = {
      actionId: 'week4-buy-this-instead',
      points: 5,
      weekNumber: 4,
      label: 'Buy This Instead of That',
      challengeId: CHALLENGE_ID,
      status: 'auto_claimed',
      correct: true,
      clickedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    return ref.set({ week4Swap: swap }, { merge: true }).then(function () {
      return ref
        .update(new firebase.firestore.FieldPath('pointActions', 'week4-buy-this-instead'), actionPayload)
        .catch(function () {
          var nested = { pointActions: {} };
          nested.pointActions['week4-buy-this-instead'] = actionPayload;
          return ref.set(nested, { merge: true });
        });
    });
  }

  function renderSnapshotHints() {
    var missingHtml = snapshot.missing.length
      ? '<p class="w4-note">Still needed in your Digital Feed Room:</p><ul class="w4-missing">' +
        snapshot.missing
          .map(function (m) {
            return '<li>' + escapeHtml(m) + '</li>';
          })
          .join('') +
        '</ul>'
      : '';
    var mon = document.getElementById('w4-monday-status');
    if (mon) {
      if (snapshot.hayComplete) {
        mon.innerHTML =
          '<p class="w4-status w4-status--ok">Hay cost is in the Digital Feed Room. Monday’s 15 points score from that completed hay record.</p>' +
          missingHtml;
      } else {
        mon.innerHTML =
          '<p class="w4-status">Open the app and add hay bale weight and price so the Digital Feed Room can calculate cost.</p>' +
          missingHtml;
      }
    }
  }

  function renderFriday() {
    var host = document.getElementById('w4-friday-supplements');
    if (!host) return;
    var heading = '<p class="challenge-day__action-label w4-today-points">A year of your supplements</p>';
    if (!currentUser) {
      host.innerHTML =
        heading +
        '<p class="body-text" style="font-size:0.95rem; margin:0;">Sign in to load the supplements from your Digital Feed Room. Then compare that yearly cost to testing.</p>';
      return;
    }
    if (!snapshot.supplementCount) {
      host.innerHTML =
        heading +
        '<p class="body-text" style="font-size:0.95rem; margin:0;">No supplements are assigned in your Digital Feed Room yet. Add them with package weight and price to see what a year costs.</p>';
      return;
    }
    var missingHtml = snapshot.supplementMissing.length
      ? '<p class="w4-note">Still needed for a full year number:</p><ul class="w4-missing">' +
        snapshot.supplementMissing
          .map(function (m) {
            return '<li>' + escapeHtml(m) + '</li>';
          })
          .join('') +
        '</ul>'
      : '';
    if (snapshot.supplementYearCost == null) {
      host.innerHTML =
        heading +
        '<p class="body-text" style="font-size:0.95rem; margin:0 0 8px;">Add package weight and price in the Digital Feed Room to see what a year of these supplements costs.</p>' +
        missingHtml;
      return;
    }
    var listHtml = snapshot.supplementLines.length
      ? '<ul class="w4-missing">' +
        snapshot.supplementLines
          .map(function (row) {
            return '<li>' + escapeHtml(row.name) + ' · ' + moneyWhole(row.yearCost) + '/year</li>';
          })
          .join('') +
        '</ul>'
      : '';
    var note =
      snapshot.supplementMissing.length
        ? 'From the supplements we can price so far, at the rates you feed today.'
        : 'From the supplements you are feeding today, at your current rates.';
    host.innerHTML =
      heading +
      '<p class="w4-year-cost">' +
      moneyWhole(snapshot.supplementYearCost) +
      '</p>' +
      '<p class="w4-note" style="margin-top:0;">' +
      note +
      '</p>' +
      listHtml +
      missingHtml;
  }

  function tscSubtotal() {
    return snapshot.retailers
      .filter(function (r) {
        return r.id === 'tsc';
      })
      .reduce(function (sum, r) {
        return sum + (num(r.monthlyCost) || 0);
      }, 0);
  }

  function otherRetailers() {
    return snapshot.retailers.filter(function (r) {
      return r.id !== 'tsc';
    });
  }

  function fillMethodSelect(selectId, methods, selected) {
    var el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML =
      '<option value="">Select a feeding method</option>' +
      methods
        .map(function (m) {
          return (
            '<option value="' +
            m.id +
            '"' +
            (selected === m.id ? ' selected' : '') +
            '>' +
            escapeHtml(m.label) +
            '</option>'
          );
        })
        .join('');
  }

  function methodById(list, id) {
    return list.filter(function (m) {
      return m.id === id;
    })[0];
  }

  function renderTuesdayFromSnapshot() {
    var runs = progress.monthly_feed_runs;
    if (runs != null && runs !== '') setVal('w4-monthly-runs', runs);
    setText(
      'w4-runs-loaded',
      runs == null || runs === ''
        ? 'Monday’s feed-run count will load here after you save it.'
        : 'You currently make about ' + runs + ' feed runs each month.'
    );
    if (snapshot.barnFeedCost != null) setVal('w4-barn-feed-cost', snapshot.barnFeedCost.toFixed(2));
    var tsc = tscSubtotal();
    var others = otherRetailers();
    show('w4-tsc-block', tsc > 0);
    show('w4-tsc-results', tsc > 0);
    if (tsc > 0) {
      setText('w4-tsc-subtotal', 'TSC-tagged products in your Feed Room: ' + money(tsc) + '/month.');
      if (!val('w4-smart-eligible')) setVal('w4-smart-eligible', tsc.toFixed(2));
    }
    var splitHost = document.getElementById('w4-retailer-split');
    if (splitHost) {
      var rows = snapshot.retailers || [];
      if (!rows.length) {
        splitHost.innerHTML =
          '<p class="w4-note">No supplier is tagged on your Feed Room products yet. You can still use Any store and Fewer runs below.</p>';
      } else {
        splitHost.innerHTML =
          '<ul class="w4-missing">' +
          rows
            .map(function (r) {
              return (
                '<li><strong>' +
                escapeHtml(r.label) +
                '</strong> · ' +
                money(r.monthlyCost) +
                '/month' +
                (r.id === 'tsc' ? ' · TSC illustration below is optional' : '') +
                '</li>'
              );
            })
            .join('') +
          '</ul>' +
          (others.length
            ? '<p class="w4-note">Use Any store for the non-TSC rows — or for any other shop you want to compare.</p>'
            : '<p class="w4-note">Your tagged products are Tractor Supply. Any store still works if you want to test a mill, co-op, or online discount. Leave it blank if you do not have one.</p>');
      }
    }
    recalcTuesday();
  }

  function currentRuns() {
    if (progress.monthly_feed_runs != null && progress.monthly_feed_runs !== '') {
      return num(progress.monthly_feed_runs);
    }
    var raw = val('w4-monthly-runs');
    if (raw === '' || raw == null) return NaN;
    return num(raw);
  }

  function recalcTuesday() {
    var tsc = tscSubtotal();
    var hasTsc = tsc > 0;
    var eligible = hasTsc
      ? Math.min(Math.max(num(val('w4-smart-eligible')) || 0, 0), tsc)
      : 0;
    var smart = hasTsc ? eligible * 0.05 : 0;
    var delivery = Math.max(num(val('w4-delivery-fees')) || 0, 0);
    var tier = REWARD_TIERS[val('w4-reward-status')] || REWARD_TIERS.neighbor;
    var starting = Math.max(num(val('w4-starting-points')) || 0, 0);
    var qualifying = Math.max(eligible - smart, 0);
    var earned = Math.floor(qualifying) * tier.rate;
    var pool = starting + earned;
    var issued = Math.floor(pool / tier.threshold);
    var certMonth = issued * tier.cert;
    var ending = pool - issued * tier.threshold;

    var discountPct = num(val('w4-retailer-discount-pct'));
    var discountEligible = num(val('w4-retailer-discount-eligible'));
    var otherSave = 0;
    if (!isNaN(discountPct) && discountPct > 0 && !isNaN(discountEligible) && discountEligible > 0) {
      otherSave = discountEligible * (discountPct / 100);
    }

    var miles = num(val('w4-miles'));
    var mpg = num(val('w4-mpg'));
    var fuelPrice = num(val('w4-fuel-price'));
    var replaced = num(val('w4-trips-replaced'));
    var runs = currentRuns();
    if (!isNaN(runs) && !isNaN(replaced)) replaced = Math.min(Math.max(replaced, 0), runs);
    var tripCost = miles > 0 && mpg > 0 && fuelPrice > 0 ? (miles / mpg) * fuelPrice : NaN;
    var fuelMonth = 0;
    var fuelBlank = false;
    if (runs === 0 || replaced === 0) fuelMonth = 0;
    else if (!isFinite(tripCost) || isNaN(replaced)) {
      fuelBlank = true;
      fuelMonth = 0;
    } else fuelMonth = tripCost * replaced;

    var monthly = smart + certMonth + otherSave + (fuelBlank ? 0 : fuelMonth) - delivery;
    var year = simulateYear({
      smart: smart,
      other: otherSave,
      fuel: fuelBlank ? 0 : fuelMonth,
      delivery: delivery,
      starting: starting,
      qualifying: qualifying,
      tier: tier,
    });

    show('w4-tsc-results', tsc > 0);
    setText('w4-out-smart', tsc > 0 ? money(smart) : '—');
    setText('w4-out-cert', tsc > 0 ? money(certMonth) : '—');
    setText('w4-out-points-left', tsc > 0 ? String(Math.round(ending)) : '—');
    setText('w4-out-other', money(otherSave));
    setText('w4-out-trip', isFinite(tripCost) ? money(tripCost) : '—');
    setText('w4-out-fuel', fuelBlank ? '—' : money(fuelMonth));
    setText('w4-out-delivery', money(delivery));
    setText('w4-out-monthly', money(monthly));
    setText('w4-out-annual', money(year.annual));
    setText(
      'w4-annual-callout',
      'At ' +
        money(monthly) +
        ' per month, that is approximately ' +
        money(year.annual) +
        ' per year. That could cover a tack purchase, a veterinary bill, farrier visits, or money kept in the farm account.'
    );
  }

  function simulateYear(opts) {
    var pts = opts.starting;
    var certs = 0;
    var i;
    for (i = 0; i < 12; i++) {
      pts += Math.floor(opts.qualifying) * opts.tier.rate;
      var issued = Math.floor(pts / opts.tier.threshold);
      certs += issued * opts.tier.cert;
      pts = pts - issued * opts.tier.threshold;
    }
    var annual =
      opts.smart * 12 + opts.other * 12 + opts.fuel * 12 - opts.delivery * 12 + certs;
    return { annual: annual, ending: pts, certs: certs };
  }

  function saveMondayRuns() {
    var n = num(val('w4-monthly-runs'));
    if (isNaN(n) || n < 0) {
      setText('w4-monday-runs-status', 'Enter 0 or a positive number.');
      return;
    }
    persistProgress({ monthly_feed_runs: n }).then(function () {
      setText('w4-monday-runs-status', 'Saved.');
      renderTuesdayFromSnapshot();
    });
  }

  function effectiveHay() {
    var appLb = snapshot.hayLb;
    var appCost = snapshot.hayCost;
    var hubLb = num(val('w4-hub-hay-lb'));
    var hubCost = num(val('w4-hub-hay-cost'));
    var useHub = (!appLb || !appCost) && hubLb > 0 && hubCost > 0;
    if (progress.hayOverride && hubLb > 0 && hubCost > 0) useHub = true;
    return {
      lb: useHub ? hubLb : appLb,
      cost: useHub ? hubCost : appCost,
      source: useHub ? 'Hub estimate' : 'From Digital Feed Room',
    };
  }

  function wasteFor(methodList, methodId, customId) {
    var method = methodById(methodList, methodId);
    if (!method) return { pct: NaN, source: '' };
    if (method.custom) {
      var custom = num(val(customId)) / 100;
      if (isNaN(custom) || custom < 0 || custom > 0.9) return { pct: NaN, source: 'Your estimate' };
      return { pct: custom, source: 'Your estimate' };
    }
    return { pct: method.waste, source: 'Research-based estimate' };
  }

  function recalcWednesday() {
    var format = val('w4-hay-format');
    show('w4-round-fields', format === 'round' || format === 'both');
    show('w4-square-fields', format === 'square' || format === 'both');
    show('w4-both-share', format === 'both');
    var roundMethod = val('w4-round-method');
    var squareMethod = val('w4-square-method');
    show('w4-round-custom-wrap', !!(methodById(ROUND_METHODS, roundMethod) || {}).custom);
    show('w4-square-custom-wrap', !!(methodById(SQUARE_METHODS, squareMethod) || {}).custom);

    var hay = effectiveHay();
    var host = document.getElementById('w4-hay-baseline');
    if (!host) return;
    if (!format || !(hay.lb > 0) || !(hay.cost > 0)) {
      host.innerHTML =
        '<p class="w4-note">Add 30-day hay pounds and cost — from the Digital Feed Room when complete, or as a Hub-only estimate that will not change the app.</p>';
      return;
    }
    var roundShare = format === 'round' ? 1 : format === 'square' ? 0 : num(val('w4-round-share')) / 100;
    if (format === 'both' && (isNaN(roundShare) || roundShare < 0 || roundShare > 1)) {
      host.innerHTML = '<p class="w4-note">Enter what percentage of your hay is fed as round bales.</p>';
      return;
    }
    var squareShare = 1 - roundShare;
    var costPerLb = hay.cost / hay.lb;
    var roundWaste = format === 'square' ? { pct: 0, source: '' } : wasteFor(ROUND_METHODS, roundMethod, 'w4-round-custom');
    var squareWaste =
      format === 'round' ? { pct: 0, source: '' } : wasteFor(SQUARE_METHODS, squareMethod, 'w4-square-custom');
    if ((format === 'round' || format === 'both') && isNaN(roundWaste.pct)) {
      host.innerHTML = '<p class="w4-note">Choose how you feed round bales. Waste percentages stay hidden until you select a method.</p>';
      return;
    }
    if ((format === 'square' || format === 'both') && isNaN(squareWaste.pct)) {
      host.innerHTML = '<p class="w4-note">Choose how you feed small-square bales, or enter your own waste estimate for nets and unlisted methods.</p>';
      return;
    }

    var roundLb = hay.lb * (format === 'square' ? 0 : format === 'round' ? 1 : roundShare);
    var squareLb = hay.lb * (format === 'round' ? 0 : format === 'square' ? 1 : squareShare);
    var roundWasteLb = roundLb * 12 * roundWaste.pct;
    var squareWasteLb = squareLb * 12 * squareWaste.pct;
    var roundConsumed = roundLb * 12 * (1 - roundWaste.pct);
    var squareConsumed = squareLb * 12 * (1 - squareWaste.pct);
    var totalWasteLb = roundWasteLb + squareWasteLb;
    var totalWasteCost = totalWasteLb * costPerLb;
    var baseline = {
      format: format,
      source: hay.source,
      total30Lb: hay.lb,
      total30Cost: hay.cost,
      costPerLb: costPerLb,
      roundShare: roundShare,
      squareShare: squareShare,
      roundMethod: roundMethod,
      squareMethod: squareMethod,
      roundWaste: roundWaste,
      squareWaste: squareWaste,
      roundLb30: roundLb,
      squareLb30: squareLb,
      roundWasteLbAnnual: roundWasteLb,
      squareWasteLbAnnual: squareWasteLb,
      totalWasteLbAnnual: totalWasteLb,
      totalWasteCostAnnual: totalWasteCost,
      roundConsumedAnnual: roundConsumed,
      squareConsumedAnnual: squareConsumed,
      roundBaleWeight: num(val('w4-round-bale-weight')),
      squareBaleWeight: num(val('w4-square-bale-weight')),
    };
    progress.hayBaseline = baseline;

    var cards = '';
    if (format !== 'square') {
      cards += resultCard('Round bales', [
        ['Purchased in 30 days', pounds(roundLb)],
        ['Waste rate*', pctLabel(roundWaste.pct)],
        ['Wasted this year', pounds(roundWasteLb)],
        ['Waste cost this year', money(roundWasteLb * costPerLb)],
        ['Horses actually ate this year', pounds(roundConsumed)],
      ]);
    }
    if (format !== 'round') {
      cards += resultCard('Small square bales', [
        ['Purchased in 30 days', pounds(squareLb)],
        ['Waste rate*', pctLabel(squareWaste.pct)],
        ['Wasted this year', pounds(squareWasteLb)],
        ['Waste cost this year', money(squareWasteLb * costPerLb)],
        ['Horses actually ate this year', pounds(squareConsumed)],
      ]);
    }
    cards += resultCard('Whole barn', [
      ['Source', hay.source],
      ['Hay wasted this year', pounds(totalWasteLb)],
      ['Waste cost this year', money(totalWasteCost)],
    ]);
    cards +=
      '<p class="w4-disclaimer">* Waste rates come from University of Minnesota horse-feeding studies. ' +
      '<a href="https://extension.umn.edu/agriculture/animals-and-livestock/horse/feeding-horses-with-a-round-bale-feeder" target="_blank" rel="noopener noreferrer">Round-bale feeder study</a>' +
      ' · ' +
      '<a href="https://conservancy.umn.edu/items/ad66464a-c76e-4c02-9b0b-cdc6bcd4c4fe" target="_blank" rel="noopener noreferrer">Small-square bale feeder study</a>.' +
      ' These are estimates. Your hay, weather, and herd will differ.</p>';
    if (format === 'both') {
      cards +=
        '<p class="w4-disclaimer">This estimate uses your barn’s average hay cost per pound. Actual costs may differ between round and small-square bales.</p>';
    }
    host.innerHTML = cards;
    renderThursday();
  }

  function resultCard(title, rows) {
    return (
      '<article class="w4-card">' +
      '<h4>' +
      escapeHtml(title) +
      '</h4>' +
      rows
        .map(function (row) {
          return (
            '<p class="w4-card__row"><span>' +
            escapeHtml(row[0]) +
            '</span><strong>' +
            escapeHtml(row[1]) +
            '</strong></p>'
          );
        })
        .join('') +
      '</article>'
    );
  }

  function saveHayBaseline() {
    recalcWednesday();
    if (!progress.hayBaseline) {
      setText('w4-hay-save-status', 'Complete the hay fields before saving.');
      return;
    }
    persistProgress({
      hayBaseline: progress.hayBaseline,
      hayOverride: !snapshot.hayComplete || !!val('w4-hub-hay-lb'),
    }).then(function () {
      setText('w4-hay-save-status', 'Saved for Thursday’s exercise.');
      renderThursday();
    });
  }

  function scenarioRow(feeder, consumed, currentCost, costPerLb, baleWeight) {
    if (feeder.waste == null) {
      return {
        feeder: feeder,
        hayLb: null,
        bales: null,
        hayCost: null,
        savings: null,
        payback: null,
        year1: null,
        year3: null,
        roi: null,
        noRate: true,
      };
    }
    var hayLb = consumed / (1 - feeder.waste);
    var hayCost = hayLb * costPerLb;
    var savings = currentCost - hayCost;
    var extras = num(val('w4-feeder-extras')) || 0;
    var totalCost = feeder.price + extras;
    var payback = savings > 0 ? (totalCost / savings) * 12 : null;
    var year1 = savings - totalCost;
    var year3 = savings * 3 - totalCost;
    var roi = totalCost > 0 ? year1 / totalCost : null;
    return {
      feeder: feeder,
      hayLb: hayLb,
      bales: baleWeight > 0 ? hayLb / baleWeight : null,
      hayCost: hayCost,
      savings: savings,
      payback: payback,
      year1: year1,
      year3: year3,
      roi: roi,
      noRate: false,
    };
  }

  var feederCompare = {};

  function renderThursday() {
    var host = document.getElementById('w4-feeder-grid');
    var missing = document.getElementById('w4-thu-missing');
    var baseline = progress.hayBaseline;
    if (!host) return;
    if (!baseline) {
      feederCompare = {};
      host.innerHTML = '';
      if (missing) {
        missing.hidden = false;
        missing.innerHTML =
          'Save Wednesday’s hay numbers first so Thursday can compare feeders against the hay your horses actually eat. <a href="#day-wednesday">Go to Wednesday</a>. Calendar planning below still works.';
      }
      return;
    }
    if (missing) missing.hidden = true;
    var extras = num(val('w4-feeder-extras')) || 0;
    var keepRound = val('w4-compare-round');
    var keepSquare = val('w4-compare-square');
    feederCompare = {};
    var html = '';
    if (baseline.format !== 'square') {
      html += feederCompareBlock('round', 'Round bales', ROUND_FEEDERS, {
        consumed: baseline.roundConsumedAnnual,
        currentCost: baseline.roundLb30 * 12 * baseline.costPerLb,
        costPerLb: baseline.costPerLb,
        baleWeight: baseline.roundBaleWeight,
        extras: extras,
        waste: baseline.roundWaste.pct,
      });
    }
    if (baseline.format !== 'round') {
      html += feederCompareBlock('square', 'Small square bales', SQUARE_FEEDERS, {
        consumed: baseline.squareConsumedAnnual,
        currentCost: baseline.squareLb30 * 12 * baseline.costPerLb,
        costPerLb: baseline.costPerLb,
        baleWeight: baseline.squareBaleWeight,
        extras: extras,
        waste: baseline.squareWaste.pct,
      });
    }
    html +=
      '<p class="w4-disclaimer">* Waste rates come from University of Minnesota horse-feeding studies. ' +
      '<a href="https://extension.umn.edu/agriculture/animals-and-livestock/horse/feeding-horses-with-a-round-bale-feeder" target="_blank" rel="noopener noreferrer">Round-bale feeder study</a>' +
      ' · ' +
      '<a href="https://conservancy.umn.edu/items/ad66464a-c76e-4c02-9b0b-cdc6bcd4c4fe" target="_blank" rel="noopener noreferrer">Small-square bale feeder study</a>. ' +
      'Example products are a similar design, not a recommendation. Prices change. Freight, tax, and installation are included only if you add them above.</p>';
    host.innerHTML = html;
    if (keepRound) {
      var roundSel = document.getElementById('w4-compare-round');
      if (roundSel) {
        roundSel.value = keepRound;
        paintCompare('round');
      }
    }
    if (keepSquare) {
      var squareSel = document.getElementById('w4-compare-square');
      if (squareSel) {
        squareSel.value = keepSquare;
        paintCompare('square');
      }
    }
  }

  function feederCompareBlock(kind, title, feeders, ctx) {
    feederCompare[kind] = ctx;
    feederCompare[kind].feeders = feeders;
    var currentHayLb = ctx.waste < 1 && ctx.waste >= 0 ? ctx.consumed / (1 - ctx.waste) : NaN;
    var bales =
      ctx.baleWeight > 0 && currentHayLb > 0 ? (currentHayLb / ctx.baleWeight).toFixed(1) + ' bales' : '';
    return (
      '<div class="w4-panel">' +
      '<h4 class="challenge-day__resource-title">' +
      escapeHtml(title) +
      '</h4>' +
      resultCard('Your current setup', [
        ['Waste rate*', pctLabel(ctx.waste)],
        ['Hay needed this year', currentHayLb > 0 ? pounds(currentHayLb) + (bales ? ' · ' + bales : '') : '—'],
        ['Annual hay cost', money(ctx.currentCost)],
      ]) +
      '<label class="form-label" for="w4-compare-' +
      kind +
      '">Compare a feeder</label>' +
      '<select class="form-input" id="w4-compare-' +
      kind +
      '" data-feeder-kind="' +
      kind +
      '">' +
      '<option value="">Select a feeder</option>' +
      feeders
        .map(function (f) {
          return '<option value="' + escapeHtml(f.id) + '">' + escapeHtml(f.label) + '</option>';
        })
        .join('') +
      '</select>' +
      '<div id="w4-compare-' +
      kind +
      '-out"></div>' +
      '</div>'
    );
  }

  function paintCompare(kind) {
    var ctx = feederCompare[kind];
    var out = document.getElementById('w4-compare-' + kind + '-out');
    var selected = val('w4-compare-' + kind);
    if (!ctx || !out) return;
    if (!selected) {
      out.innerHTML = '';
      return;
    }
    var feeder = (ctx.feeders || []).filter(function (f) {
      return f.id === selected;
    })[0];
    if (!feeder) {
      out.innerHTML = '';
      return;
    }
    var row = scenarioRow(feeder, ctx.consumed, ctx.currentCost, ctx.costPerLb, ctx.baleWeight);
    if (row.noRate) {
      out.innerHTML =
        '<p class="w4-note">This design does not have a published waste rate. Enter your own estimate on Wednesday, or pick another feeder.</p>';
      return;
    }
    var payback =
      row.payback == null ? 'Does not pay for itself' : 'About ' + Math.round(row.payback) + ' months';
    var bales = row.bales ? row.bales.toFixed(1) + ' bales' : '';
    var product = feeder.product
      ? escapeHtml(feeder.product) +
        (feeder.url
          ? ' · <a href="' +
            escapeHtml(feeder.url) +
            '" target="_blank" rel="noopener noreferrer">' +
            escapeHtml(feeder.retailer) +
            '</a>'
          : '')
      : '';
    out.innerHTML =
      '<div class="w4-compare-highlight">' +
      '<div><span>Annual savings</span><strong>' +
      money(row.savings) +
      '</strong></div>' +
      '<div><span>Payback</span><strong>' +
      escapeHtml(payback) +
      '</strong></div>' +
      '</div>' +
      resultCard(feeder.label, [
        ['Study waste*', pctLabel(feeder.waste)],
        ['Hay needed this year', pounds(row.hayLb) + (bales ? ' · ' + bales : '')],
        ['Annual hay cost', money(row.hayCost)],
        ['Example price', money((feeder.price || 0) + (ctx.extras || 0))],
        ['3-year net', money(row.year3)],
      ]) +
      (product ? '<p class="w4-note">' + product + '. ' + escapeHtml(feeder.match || '') + '</p>' : '');
  }

  function renderCalendar() {
    var host = document.getElementById('w4-calendar-list');
    if (!host) return;
    var credited = Math.min(calendarItems.length, 3);
    setText(
      'w4-calendar-progress',
      credited
        ? credited + ' qualifying future item' + (credited === 1 ? '' : 's') + ' · ' + credited * 5 + ' of 15 points'
        : '0 of 15 points so far. Existing future appointments count.'
    );
    if (!calendarItems.length) {
      host.innerHTML =
        '<p class="w4-note">No future calendar items yet. Add an appointment, delivery, sale-day pickup, ride, or intentional hand-walk in the app.</p>';
      return;
    }
    host.innerHTML =
      '<ul class="w4-cal-list">' +
      calendarItems
        .slice(0, 12)
        .map(function (item, idx) {
          var pts = idx < 3 ? ' · 5 pts' : '';
          return (
            '<li><strong>' +
            escapeHtml(item.date) +
            '</strong> — ' +
            escapeHtml(item.title) +
            (item.horses ? ' · ' + escapeHtml(item.horses) : '') +
            pts +
            '</li>'
          );
        })
        .join('') +
      '</ul>';
  }

  function renderSaturdayGrid() {
    var select = document.getElementById('w4-sat-example');
    if (!select) return;
    if (!select.getAttribute('data-filled')) {
      select.setAttribute('data-filled', '1');
      select.innerHTML =
        '<option value="">Select an example</option>' +
        SATURDAY_ROWS.map(function (row) {
          return '<option value="' + escapeHtml(row.id) + '">' + escapeHtml(row.item) + '</option>';
        }).join('');
    }
    paintSaturdayExample();
  }

  function paintSaturdayExample() {
    var out = document.getElementById('w4-sat-example-out');
    if (!out) return;
    var row = SATURDAY_ROWS.filter(function (r) {
      return r.id === val('w4-sat-example');
    })[0];
    if (!row) {
      out.innerHTML = '';
      return;
    }
    var save = row.tscPrice - row.altPrice;
    out.innerHTML =
      '<div class="w4-compare-highlight">' +
      '<div><span>Barn-aisle example</span><strong>' +
      money(row.tscPrice) +
      '</strong></div>' +
      '<div><span>What we use</span><strong>' +
      money(row.altPrice) +
      '</strong></div>' +
      '</div>' +
      resultCard(row.item, [
        ['Barn-aisle example', row.tsc],
        ['What The Horse Concierge uses', row.alt + ' · ' + row.retailer],
        ['Saved', money(save) + ' · ' + ((save / row.tscPrice) * 100).toFixed(0) + '%'],
      ]) +
      '<p class="w4-note">' +
      escapeHtml(row.note) +
      (row.source
        ? ' <a href="' +
          escapeHtml(row.source) +
          '" target="_blank" rel="noopener noreferrer">TSC listing</a>'
        : '') +
      '</p>';
  }

  function swapItemName(swap) {
    if (!swap) return '';
    return String(swap.item_name || swap.replacement || swap.barn_item || '').trim();
  }

  function swapLine(row) {
    var item = swapItemName(row);
    var twoSided =
      row.barn_item && row.replacement && String(row.barn_item).trim() !== String(row.replacement).trim();
    if (twoSided) {
      return (
        '<strong>' +
        escapeHtml(row.displayName || 'Participant') +
        '</strong> said: Buy ' +
        escapeHtml(row.replacement) +
        ' instead of ' +
        escapeHtml(row.barn_item) +
        ' at ' +
        escapeHtml(row.retailer_source) +
        ' for ' +
        money(row.unit_price) +
        '.'
      );
    }
    return (
      '<strong>' +
      escapeHtml(row.displayName || 'Participant') +
      '</strong> swaps ' +
      escapeHtml(item) +
      ' from ' +
      escapeHtml(row.retailer_source) +
      ' — last known ' +
      money(row.unit_price) +
      '.'
    );
  }

  function fillSwapForm(swap) {
    if (!swap) return;
    setVal('w4-swap-item', swapItemName(swap));
    setVal('w4-swap-source', swap.retailer_source);
    setVal('w4-swap-price', swap.unit_price_text || swap.unit_price);
  }

  function handleSwapSubmit(e) {
    e.preventDefault();
    if (!currentUser) {
      window.location.href = DOOR_SIGNIN;
      return;
    }
    var itemName = val('w4-swap-item').trim();
    var where = val('w4-swap-source').trim();
    var priceText = val('w4-swap-price').trim();
    var price = parseMoney(priceText);
    var swap = {
      barn_item: itemName,
      replacement: itemName,
      item_name: itemName,
      retailer_source: where,
      unit_price: price,
      unit_price_text: priceText,
      displayName: publicName(registration && (registration.name || registration.displayName)),
      updatedAt: new Date().toISOString(),
    };
    if (!itemName || !where || !(price > 0)) {
      setText('w4-swap-status', 'Add the item name, where you buy it, and the last price you paid.');
      return;
    }
    persistSwap(swap)
      .then(function () {
        setText('w4-swap-status', 'Saved. Sunday will publish accepted finds using your challenge display name.');
        renderSundayReveal();
      })
      .catch(function () {
        setText('w4-swap-status', 'Could not save. Stay signed in and try again.');
      });
  }

  function publicName(name) {
    var parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return 'Participant';
    if (parts.length === 1) return parts[0];
    var initial = parts[parts.length - 1].charAt(0).toUpperCase();
    return parts[0] + ' ' + initial + '.';
  }

  function renderSundayReveal() {
    var host = document.getElementById('w4-sunday-reveal');
    if (!host) return;
    var own = registration && registration.week4Swap;
    var start = '';
    if (validSwap(own)) {
      start =
        '<p class="w4-note">' +
        swapLine({
          displayName: publicName(registration.name),
          barn_item: own.barn_item,
          replacement: own.replacement,
          item_name: own.item_name,
          retailer_source: own.retailer_source,
          unit_price: own.unit_price,
        }) +
        '</p>';
    }
    host.innerHTML = start + '<p class="w4-note">Community finds appear here as accepted submissions come in.</p>';
    if (!db) return;
    db.collection('challengeWeek4Reveal')
      .doc('live')
      .get()
      .then(function (snap) {
        if (!snap.exists) return;
        var entries = ((snap.data() || {}).entries || []).filter(validSwap);
        if (!entries.length) return;
        host.innerHTML =
          '<ul class="w4-reveal-list">' +
          entries
            .map(function (row) {
              return '<li>' + swapLine(row) + '</li>';
            })
            .join('') +
          '</ul>' +
          '<p class="w4-disclaimer">Submitted finds are not endorsements. Compare function, safety, and current price before you buy.</p>';
      })
      .catch(function () {});
  }

  function validSwap(swap) {
    return !!(
      swap &&
      String(swap.barn_item || '').trim() &&
      String(swap.replacement || '').trim() &&
      String(swap.retailer_source || '').trim() &&
      Number(swap.unit_price) > 0
    );
  }

  function renderSundayProgress() {
    var host = document.getElementById('w4-sunday-progress');
    if (!host) return;
    var weekly = (registration && registration.weeklyPoints) || {};
    var total = num(weekly['4']) || 0;
    var wiw = registration && registration.weighWednesdayW4;
    var wiwPts = wiw && wiw.points != null ? num(wiw.points) : 0;
    var base = Math.max(total - (isFinite(wiwPts) ? wiwPts : 0), 0);
    var missing = [];
    if (!snapshot.hayComplete) missing.push('Finish hay cost in the Digital Feed Room · 15 pts');
    if (calendarItems.length < 3) {
      missing.push(
        'Confirm future calendar items · ' + Math.min(calendarItems.length, 3) * 5 + ' of 15 pts so far'
      );
    }
    if (!validSwap(registration && registration.week4Swap)) missing.push('Saturday Buy This Instead of That · 5 pts');
    if (!(wiw && wiw.guesses)) missing.push('What’s It Weigh Wednesday bonus · up to 9 pts · closes Sunday 8:00 PM ET');
    missing.push('Two GPS rides or hand-walks this week · 5 pts each, plus one attached observation · 5 pts');
    host.innerHTML =
      '<p class="w4-score">Base week: <strong>' +
      (isFinite(base) ? Math.round(base) : 0) +
      ' / 50</strong>' +
      (wiwPts ? ' · WIW bonus: <strong>' + Math.round(wiwPts) + '</strong>' : '') +
      '</p>' +
      '<ul class="w4-missing">' +
      missing
        .map(function (m) {
          return '<li>' + escapeHtml(m) + '</li>';
        })
        .join('') +
      '</ul>';
  }

  function renderWednesdayPrefill() {
    var label = document.getElementById('w4-hay-source');
    if (snapshot.hayComplete) {
      setVal('w4-hub-hay-lb', snapshot.hayLb.toFixed(1));
      setVal('w4-hub-hay-cost', snapshot.hayCost.toFixed(2));
      if (label) label.textContent = 'From Digital Feed Room · 30-day barn hay';
    } else if (label) {
      label.textContent = 'Hub-only estimate — does not change the app';
    }
    fillMethodSelect('w4-round-method', ROUND_METHODS, progress.hayBaseline && progress.hayBaseline.roundMethod);
    fillMethodSelect('w4-square-method', SQUARE_METHODS, progress.hayBaseline && progress.hayBaseline.squareMethod);
    if (progress.hayBaseline) {
      setVal('w4-hay-format', progress.hayBaseline.format);
      if (progress.hayBaseline.roundShare != null) {
        setVal('w4-round-share', Math.round(progress.hayBaseline.roundShare * 100));
      }
    }
    recalcWednesday();
  }

  function restoreTuesdayInputs(inputs) {
    if (!inputs) return;
    setVal('w4-smart-eligible', inputs.smartEligible);
    if (inputs.rewardStatus) setVal('w4-reward-status', inputs.rewardStatus);
    setVal('w4-starting-points', inputs.startingPoints);
    setVal('w4-delivery-fees', inputs.delivery);
    setVal('w4-miles', inputs.miles);
    setVal('w4-mpg', inputs.mpg);
    setVal('w4-fuel-price', inputs.fuelPrice);
    setVal('w4-trips-replaced', inputs.tripsReplaced);
    setVal('w4-retailer-discount-pct', inputs.discountPct);
    setVal('w4-retailer-discount-eligible', inputs.discountEligible);
    var checks = {
      'w4-plan-bulk': inputs.planBulk,
      'w4-plan-loyalty': inputs.planLoyalty,
      'w4-plan-recurring': inputs.planRecurring,
      'w4-plan-sale': inputs.planSale,
    };
    Object.keys(checks).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.checked = !!checks[id];
    });
  }

  function applyRegistration(data) {
    registration = data || {};
    progress = Object.assign({}, registration.week4Progress || {});
    if (progress.monthly_feed_runs != null) setVal('w4-monthly-runs', progress.monthly_feed_runs);
    fillSwapForm(registration.week4Swap);
    restoreTuesdayInputs(progress.tuesdayInputs);
    renderTuesdayFromSnapshot();
    renderWednesdayPrefill();
    renderFriday();
    renderSundayReveal();
    renderSundayProgress();
  }

  function wireCalcs() {
    [
      'w4-smart-eligible',
      'w4-reward-status',
      'w4-starting-points',
      'w4-delivery-fees',
      'w4-miles',
      'w4-mpg',
      'w4-fuel-price',
      'w4-trips-replaced',
      'w4-retailer-discount-pct',
      'w4-retailer-discount-eligible',
      'w4-barn-feed-cost',
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', recalcTuesday);
      if (el) el.addEventListener('change', recalcTuesday);
    });
    [
      'w4-hay-format',
      'w4-round-share',
      'w4-round-method',
      'w4-square-method',
      'w4-round-custom',
      'w4-square-custom',
      'w4-hub-hay-lb',
      'w4-hub-hay-cost',
      'w4-round-bale-weight',
      'w4-square-bale-weight',
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', recalcWednesday);
      if (el) el.addEventListener('change', recalcWednesday);
    });
    var extras = document.getElementById('w4-feeder-extras');
    if (extras) extras.addEventListener('input', renderThursday);
    var satSel = document.getElementById('w4-sat-example');
    if (satSel && !satSel.getAttribute('data-wired')) {
      satSel.setAttribute('data-wired', '1');
      satSel.addEventListener('change', paintSaturdayExample);
    }
    var feederHost = document.getElementById('w4-feeder-grid');
    if (feederHost && !feederHost.getAttribute('data-wired')) {
      feederHost.setAttribute('data-wired', '1');
      feederHost.addEventListener('change', function (evt) {
        var kind = evt.target && evt.target.getAttribute('data-feeder-kind');
        if (kind) paintCompare(kind);
      });
    }
    var monBtn = document.getElementById('w4-save-runs');
    if (monBtn) monBtn.addEventListener('click', saveMondayRuns);
    var hayBtn = document.getElementById('w4-save-hay');
    if (hayBtn) hayBtn.addEventListener('click', saveHayBaseline);
    var tueSave = document.getElementById('w4-save-tuesday');
    if (tueSave) {
      tueSave.addEventListener('click', function () {
        persistProgress({
          tuesdayInputs: {
            smartEligible: val('w4-smart-eligible'),
            rewardStatus: val('w4-reward-status'),
            startingPoints: val('w4-starting-points'),
            delivery: val('w4-delivery-fees'),
            miles: val('w4-miles'),
            mpg: val('w4-mpg'),
            fuelPrice: val('w4-fuel-price'),
            tripsReplaced: val('w4-trips-replaced'),
            discountPct: val('w4-retailer-discount-pct'),
            discountEligible: val('w4-retailer-discount-eligible'),
            planBulk: !!(document.getElementById('w4-plan-bulk') || {}).checked,
            planLoyalty: !!(document.getElementById('w4-plan-loyalty') || {}).checked,
            planRecurring: !!(document.getElementById('w4-plan-recurring') || {}).checked,
            planSale: !!(document.getElementById('w4-plan-sale') || {}).checked,
          },
        }).then(function () {
          setText('w4-tuesday-save-status', 'Saved. Come back anytime — your estimate will still be here.');
        });
      });
    }
    var swap = document.getElementById('w4-swap-form');
    if (swap) swap.addEventListener('submit', handleSwapSubmit);
  }

  function wire() {
    if (!document.getElementById('w4-monday-status') && !document.getElementById('w4-swap-form')) return;
    fillMethodSelect('w4-round-method', ROUND_METHODS, '');
    fillMethodSelect('w4-square-method', SQUARE_METHODS, '');
    renderSaturdayGrid();
    renderThursday();
    renderFriday();
    renderSundayReveal();
    renderSundayProgress();
    wireCalcs();
    if (typeof firebase === 'undefined') return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(function (user) {
      currentUser = user;
      if (!user) {
        registration = null;
        renderSaturdayGrid();
        renderThursday();
        renderFriday();
        renderSundayReveal();
        renderSundayProgress();
        return;
      }
      db.collection('challengeRegistrations')
        .doc(user.uid)
        .onSnapshot(function (snap) {
          applyRegistration(snap.exists ? snap.data() || {} : {});
        });
      loadSnapshot();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
