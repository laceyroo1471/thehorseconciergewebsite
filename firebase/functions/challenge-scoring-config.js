'use strict';

/**
 * Horsemanship Challenge 2026 — scoring catalog.
 *
 * credit:
 *   anytime     — existing app data counts even if logged before the week opens
 *   week_window — only events whose timestamp falls on that week's dates (GPS / rides)
 *
 * status:
 *   live            — award automatically
 *   pending_points  — detect later; do not award until points + status: live
 *   pending_feature — app collection may not exist yet
 *   manual          — award only if you write challengeActions yourself
 */

var CHALLENGE_ID = 'horsemanship-2026';

function week(weekNumber, start, end, theme, feature, actions) {
  return {
    weekNumber: weekNumber,
    start: start,
    end: end,
    theme: theme,
    feature: feature,
    actions: actions,
  };
}

function action(spec) {
  return Object.assign(
    {
      maxCount: 1,
      credit: 'anytime',
      source: 'app',
      collections: [],
      qualify: 'exists',
      status: 'pending_points',
      points: null,
    },
    spec
  );
}

var WEEKS = [
  week(1, '2026-08-31', '2026-09-06', 'Nutrition Basics Certification', 'Feed Room', [
    action({
      actionId: 'week1-horse-profile',
      label: 'Create a horse profile in the app',
      points: null,
      status: 'pending_points',
      collections: ['horseProfiles'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week1-feed',
      label: 'Log diet in the app (Feed and Supplements)',
      points: 10,
      status: 'live',
      collections: ['feedEntries'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week1-question',
      label: 'Submit a question for Mad Barn',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week1-madbarn-diet-eval',
      label: 'Schedule a Mad Barn consult or submit a nutrition evaluation',
      points: 10,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week1-certification',
      label: 'Upload Introduction to Equine Nutrition certification',
      points: 15,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week1-gps-ride',
      label: 'Track a ride or hand walk with GPS',
      points: 5,
      maxCount: 2,
      status: 'live',
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gps',
    }),
  ]),

  week(2, '2026-09-07', '2026-09-13', 'Anatomy and Conformation', 'Conformation Photos', [
    action({
      actionId: 'week2-conformation-photos',
      label: 'Add conformation photos in the app',
      collections: ['conformationPhotos', 'horsePhotos'],
      qualify: 'hasPhoto',
      photoKind: 'conformation',
      credit: 'anytime',
    }),
  ]),

  week(3, '2026-09-14', '2026-09-20', 'Hoof Care and Lameness', 'Hoof Photos', [
    action({
      actionId: 'week3-hoof-photos',
      label: 'Add hoof photos in the app',
      collections: ['hoofPhotos', 'horsePhotos'],
      qualify: 'hasPhoto',
      photoKind: 'hoof',
      credit: 'anytime',
    }),
  ]),

  week(4, '2026-09-21', '2026-09-27', 'Riding & Saving', 'Calendar', [
    action({
      actionId: 'week4-appointments',
      label: 'Add your next appointments in the app',
      collections: ['calendarEvents'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week4-gps-ride',
      label: 'Track a ride or hand walk with GPS',
      points: null,
      maxCount: 2,
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gps',
    }),
  ]),

  week(5, '2026-09-28', '2026-10-04', 'Saddle Fit', 'Tack Room', [
    action({
      actionId: 'week5-saddle-document',
      label: 'Document saddle and fit observations in the app',
      collections: ['tackItems', 'tackRoom'],
      qualify: 'hasObservation',
      photoKind: 'saddle',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-anatomy-photo',
      label: 'Upload anatomical drawing photo in the app',
      points: 10,
      status: 'live',
      collections: ['horsePhotos', 'tackPhotos'],
      qualify: 'hasPhoto',
      photoKind: 'anatomy',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-english-saddle-photo',
      label: 'Upload an English saddle photo in the app',
      points: 5,
      status: 'live',
      collections: ['tackItems', 'tackPhotos'],
      qualify: 'hasPhoto',
      photoKind: 'english',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-western-saddle-photo',
      label: 'Upload a Western saddle photo in the app',
      points: 5,
      status: 'live',
      collections: ['tackItems', 'tackPhotos'],
      qualify: 'hasPhoto',
      photoKind: 'western',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-famous-saddles-visit',
      label: 'Visit Famous Saddles',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-western-visit',
      label: 'Visit the Western saddle partner',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-yef-opportunities',
      label: 'Visit YEF opportunities page',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-case-study',
      label: 'Submit a horse for the Saturday case study',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-career-interest',
      label: 'Submit saddle-fitting career interest',
      points: 5,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week5-live-zoom',
      label: 'Attend Saturday live Zoom saddle fitting',
      points: 5,
      status: 'manual',
      source: 'hub',
      credit: 'anytime',
    }),
  ]),

  week(6, '2026-10-05', '2026-10-11', 'Bits and Communication', 'Tack Room', [
    action({
      actionId: 'week6-bits',
      label: 'Add bits to the app with an observation',
      collections: ['tackItems', 'tackRoom', 'bits'],
      qualify: 'hasObservation',
      photoKind: 'bit',
      credit: 'anytime',
    }),
  ]),

  week(7, '2026-10-12', '2026-10-18', 'Recovery', 'Journeys', [
    action({
      actionId: 'week7-journey',
      label: 'Start a journey in the app',
      collections: ['journeys'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week7-gps-ride',
      label: 'Track a ride or hand walk with GPS',
      points: null,
      maxCount: 2,
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gps',
    }),
  ]),

  week(8, '2026-10-19', '2026-10-25', 'Equine Behavior', 'GPS features', [
    action({
      actionId: 'week8-gps-comment',
      label: 'Add a comment to one GPS-tracked ride or hand walk',
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gpsCommented',
    }),
  ]),

  week(9, '2026-10-26', '2026-11-01', 'First Aid', 'Care Team / Find providers', [
    action({
      actionId: 'week9-care-team',
      label: 'Add your care team in the app',
      collections: ['careTeamMembers', 'horseProviders'],
      credit: 'anytime',
    }),
  ]),

  week(10, '2026-11-02', '2026-11-08', 'Trailer and Hauling Safety', 'Trailer', [
    action({
      actionId: 'week10-trailer',
      label: 'Log your trailer in the app',
      points: 10,
      status: 'live',
      collections: ['trailers'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week10-trailer-maintenance',
      label: 'Log trailer maintenance in the app',
      points: 10,
      status: 'live',
      collections: ['trailerMaintenance', 'careRecords'],
      qualify: 'trailerMaintenance',
      credit: 'anytime',
    }),
    action({
      actionId: 'week10-question',
      label: 'Submit a question for Brad',
      points: 10,
      status: 'live',
      source: 'hub',
      credit: 'anytime',
    }),
    action({
      actionId: 'week10-gps-ride',
      label: 'Track a ride or hand walk with GPS',
      points: 5,
      maxCount: 2,
      status: 'live',
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gps',
    }),
  ]),

  week(11, '2026-11-09', '2026-11-15', 'Emergency Preparedness', 'Emergency contacts', [
    action({
      actionId: 'week11-emergency-contacts',
      label: 'Add emergency contacts in the app',
      collections: ['emergencyContacts'],
      status: 'pending_feature',
      credit: 'anytime',
    }),
  ]),

  week(12, '2026-11-16', '2026-11-22', 'Ride Week / Catch Up', 'Trails', [
    action({
      actionId: 'week12-trail-review',
      label: 'Locate a trail and leave a review or submit one',
      collections: ['trailReviews', 'trails'],
      credit: 'anytime',
    }),
    action({
      actionId: 'week12-gps-ride',
      label: 'Track a ride or hand walk with GPS',
      points: null,
      maxCount: 2,
      collections: ['rideLogs', 'rides', 'gpsTracks', 'trackedActivities', 'activities'],
      credit: 'week_window',
      qualify: 'gps',
    }),
  ]),

  week(13, '2026-11-23', '2026-11-29', 'Horse history and competition wrap', 'Equifacts', [
    action({
      actionId: 'week13-horse-history',
      label: 'Create a shareable horse history',
      collections: ['horseHistories', 'equifacts'],
      credit: 'anytime',
    }),
  ]),
];

function allActions() {
  var list = [];
  WEEKS.forEach(function (w) {
    (w.actions || []).forEach(function (a) {
      list.push(Object.assign({}, a, { weekNumber: w.weekNumber, weekStart: w.start, weekEnd: w.end }));
    });
  });
  return list;
}

function actionsForCollection(collectionName) {
  return allActions().filter(function (a) {
    return a.source === 'app' && (a.collections || []).indexOf(collectionName) !== -1;
  });
}

function hubActionById(actionId) {
  return allActions().find(function (a) {
    return a.source === 'hub' && a.actionId === actionId;
  });
}

function watchedCollections() {
  var set = {};
  allActions().forEach(function (a) {
    (a.collections || []).forEach(function (name) {
      set[name] = true;
    });
  });
  return Object.keys(set);
}

module.exports = {
  CHALLENGE_ID: CHALLENGE_ID,
  WEEKS: WEEKS,
  allActions: allActions,
  actionsForCollection: actionsForCollection,
  hubActionById: hubActionById,
  watchedCollections: watchedCollections,
};
