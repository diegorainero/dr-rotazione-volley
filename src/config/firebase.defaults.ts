// src/config/firebase.defaults.ts
// Public Firebase web config for the dr-rotazioni-volley project.
// These values are public by design (same as the ones shipped in the
// deployed bundle). Secrets never live in the client config.
// This file is the single source of truth used by scripts/gen-firebase-config.mjs
// to generate src/config/firebase.ts (git-ignored).

export const firebaseDefaults = {
  apiKey: 'AIzaSyDjr8wt1HSozTxUN8HVTTAqyPfn-8a6Axo',
  authDomain: 'dr-rotazioni-volley.firebaseapp.com',
  projectId: 'dr-rotazioni-volley',
  storageBucket: 'dr-rotazioni-volley.firebasestorage.app',
  messagingSenderId: '297241495629',
  appId: '1:297241495629:web:db135e474dca153d443404',
  measurementId: 'G-455701GZZ0',
};

export type FirebaseDefaults = typeof firebaseDefaults;
