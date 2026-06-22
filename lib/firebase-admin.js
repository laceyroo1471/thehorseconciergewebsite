'use strict';

const fs = require('fs');
const admin = require('firebase-admin');

let app;

function getAdmin() {
  if (app) return app;

  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    serviceAccount = JSON.parse(
      fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8')
    );
  } else {
    throw new Error(
      'Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH'
    );
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'thc-native',
  });

  return app;
}

function getFirestore() {
  return getAdmin().firestore();
}

module.exports = { getAdmin, getFirestore };
