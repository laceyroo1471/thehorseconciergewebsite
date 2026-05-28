/**
 * Firebase web app config (same project as thc-native).
 * These values are public client keys; restrict usage in Google Cloud / Firebase console.
 * Override by editing this file or replacing with your own deployment pipeline.
 */
/** Horse snapshot reads horseProfiles with where("userId","==",uid) only — no composite index. */
export const firebaseConfig = {
  apiKey: "AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY",
  authDomain: "thc-native.firebaseapp.com",
  projectId: "thc-native",
  storageBucket: "thc-native.firebasestorage.app",
  messagingSenderId: "542948479136",
  appId: "1:542948479136:web:80f6bb4ae1740a3a8439c5",
};
