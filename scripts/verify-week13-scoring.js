'use strict';

/**
 * Week 13 scoring checks. No Firestore writes.
 *   node scripts/verify-week13-scoring.js
 */

const assert = require('assert');
const config = require('../firebase/functions/challenge-scoring-config');
const scoring = require('../firebase/functions/challenge-scoring');

function actionById(id) {
  return config.allActions().find(function (action) {
    return action.actionId === id;
  });
}

function summary(type, when) {
  return {
    summaryType: type,
    summaryId: type,
    summaryText: 'Overview built from stored records.',
    generatedAt: when,
    structuredFindings: { sections: [{ title: 'Horse Overview', content: 'Records' }] },
  };
}

function main() {
  var week = config.WEEKS.find(function (item) {
    return item.weekNumber === 13;
  });
  assert.ok(week, 'week 13 exists');
  assert.strictEqual(week.start, '2026-11-23');
  assert.strictEqual(week.end, '2026-11-29');

  var scored = (week.actions || []).filter(function (action) {
    return action.points > 0;
  });
  var total = scored.reduce(function (sum, action) {
    return sum + action.points;
  }, 0);
  assert.strictEqual(scored.length, 5);
  assert.strictEqual(total, 50);
  assert.deepStrictEqual(
    scored.map(function (action) {
      return action.points;
    }),
    [5, 15, 10, 15, 5]
  );

  var feedback = actionById('week13-feedback');
  var reflection = actionById('week13-reflection');
  assert.strictEqual(feedback.source, 'hub');
  assert.strictEqual(feedback.points, 10);
  assert.strictEqual(feedback.maxCount, 1);
  assert.strictEqual(reflection.source, 'hub');
  assert.strictEqual(reflection.points, 5);
  assert.strictEqual(reflection.maxCount, 1);
  assert.strictEqual(
    scoring.awardIdFor('participant', feedback, 'edit-1'),
    scoring.awardIdFor('participant', feedback, 'edit-2')
  );
  assert.strictEqual(
    scoring.awardIdFor('participant', feedback, 'edit-1'),
    'participant__week13-feedback'
  );

  var equifacts = actionById('week13-equifacts');
  var situational = actionById('week13-situational-summary');
  var during = '2026-11-24T15:00:00.000Z';
  var before = '2026-11-22T15:00:00.000Z';
  var editedOld = summary('equifacts_new_owner', before);
  editedOld.ownerEditedAt = during;

  assert.strictEqual(scoring.qualifies(equifacts, summary('equifacts_new_owner', during), 'aiSummaries'), true);
  assert.strictEqual(scoring.qualifies(equifacts, summary('provider_handoff', during), 'aiSummaries'), false);
  assert.strictEqual(scoring.qualifies(equifacts, summary('something_wrong', during), 'aiSummaries'), false);
  assert.strictEqual(scoring.qualifies(equifacts, { summaryType: 'equifacts_new_owner', summaryText: '' }, 'aiSummaries'), false);
  assert.strictEqual(scoring.qualifies(situational, summary('provider_handoff', during), 'aiSummaries'), true);
  assert.strictEqual(scoring.qualifies(situational, summary('something_wrong', during), 'aiSummaries'), true);
  assert.strictEqual(scoring.qualifies(situational, summary('equifacts_new_owner', during), 'aiSummaries'), false);
  assert.strictEqual(scoring.creditAllows(equifacts, summary('equifacts_new_owner', during)), true);
  assert.strictEqual(scoring.creditAllows(equifacts, summary('equifacts_new_owner', before)), false);
  assert.strictEqual(scoring.creditAllows(equifacts, editedOld), true);
  assert.strictEqual(scoring.creditAllows(situational, summary('provider_handoff', before)), false);

  var profile = actionById('week13-profile-or-barn');
  var prior = { name: 'River', breed: 'Quarter Horse', updatedAt: before };
  var renamed = { name: 'River', breed: 'Appendix', updatedAt: during };
  var untouched = { name: 'River', breed: 'Quarter Horse', updatedAt: during, createdAt: '2026-08-01T00:00:00.000Z', streak: { updatedAt: during } };
  assert.strictEqual(scoring.qualifies(profile, renamed, 'horseProfiles', prior), true);
  assert.strictEqual(scoring.qualifies(profile, prior, 'horseProfiles', prior), false);
  assert.strictEqual(scoring.qualifies(profile, untouched, 'horseProfiles'), false);
  assert.strictEqual(scoring.creditAllows(profile, renamed), true);
  assert.strictEqual(scoring.creditAllows(profile, prior), false);
  assert.strictEqual(
    scoring.qualifies(
      profile,
      { keeping: 'boarding', boardingBarn: { name: 'North Barn' }, updatedAt: during },
      'horseKeeping',
      { keeping: 'home', boardingBarn: null, updatedAt: before }
    ),
    true
  );

  var watched = config.watchedCollections();
  assert.ok(watched.indexOf('horseProfiles') !== -1);
  assert.ok(watched.indexOf('horseKeeping') !== -1);
  assert.strictEqual(watched.indexOf('aiSummaries'), -1);

  console.log('Week 13 scoring checks passed. 5 + 15 + 10 + 15 + 5 = 50.');
}

main();
