'use strict';

/**
 * Shared Firebase Admin bootstrap for the What's It Weigh Wednesday scripts.
 *
 * Credentials (first match wins):
 *   FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_SERVICE_ACCOUNT_PATH
 *   FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   GOOGLE_APPLICATION_CREDENTIALS
 *   Firebase CLI user ADC in %APPDATA%\firebase\*_application_default_credentials.json
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'thc-native';

function findFirebaseAdc() {
  var dir = path.join(process.env.APPDATA || '', 'firebase');
  if (!dir || !fs.existsSync(dir)) return '';
  var files = fs.readdirSync(dir).filter(function (f) {
    return f.endsWith('_application_default_credentials.json');
  });
  return files.length ? path.join(dir, files[0]) : '';
}

function hasServiceAccountEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    return true;
  }
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function loadAdmin() {
  var functionsAdmin = path.join(__dirname, '../firebase/functions/node_modules/firebase-admin');
  if (fs.existsSync(functionsAdmin)) return require(functionsAdmin);
  return require('firebase-admin');
}

function initAdmin() {
  var admin = loadAdmin();
  if (admin.apps.length) return admin.app();

  var adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!adc || !fs.existsSync(adc)) {
    adc = findFirebaseAdc();
    if (adc) process.env.GOOGLE_APPLICATION_CREDENTIALS = adc;
  }

  if (hasServiceAccountEnv()) {
    var fromLib = require('../lib/firebase-admin');
    return fromLib.getAdmin();
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID,
  });
  return admin.app();
}

module.exports = {
  PROJECT_ID: PROJECT_ID,
  initAdmin: initAdmin,
  loadAdmin: loadAdmin,
};
