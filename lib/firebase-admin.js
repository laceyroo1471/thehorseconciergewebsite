'use strict';

const fs = require('fs');
const admin = require('firebase-admin');

let app;

function parseJsonEnv(raw, label) {
  if (!raw || !String(raw).trim()) return null;
  const text = String(raw).trim();
  try {
    return JSON.parse(text);
  } catch (firstErr) {
    try {
      return JSON.parse(JSON.parse(text));
    } catch (_) {
      throw new Error(label + ' is not valid JSON: ' + firstErr.message);
    }
  }
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseJsonEnv(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      'FIREBASE_SERVICE_ACCOUNT_JSON'
    );
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return parseJsonEnv(
      fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'),
      'FIREBASE_SERVICE_ACCOUNT_PATH'
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: String(privateKey).replace(/\\n/g, '\n'),
    };
  }

  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
  );
}

function getAdmin() {
  if (app) return app;

  const serviceAccount = loadServiceAccount();

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || 'thc-native',
  });

  return app;
}

function getFirestore() {
  return getAdmin().firestore();
}

module.exports = { getAdmin, getFirestore, loadServiceAccount };
