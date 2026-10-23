// scripts/gen-firebase-config.mjs
// Generates src/config/firebase.ts from src/config/firebase.sample.ts.
// The sample body is copied verbatim; only the `const firebaseConfig = { ... }`
// placeholder block is replaced with the public defaults from
// src/config/firebase.defaults.ts. Each field also honours a
// REACT_APP_FIREBASE_* override taken from the environment at generation
// time (the prestart/prebuild/pretest hooks run in the same shell), e.g.:
//   REACT_APP_FIREBASE_API_KEY=... npm run build
//
// The script is idempotent: it only writes when the output would change,
// so it is safe to run before every start/build/test.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');

const samplePath = resolve(rootDir, 'src/config/firebase.sample.ts');
const defaultsPath = resolve(rootDir, 'src/config/firebase.defaults.ts');
const outputPath = resolve(rootDir, 'src/config/firebase.ts');

const CONFIG_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
  'measurementId',
];

function readDefaults() {
  if (!existsSync(defaultsPath)) {
    throw new Error(`Missing ${defaultsPath}`);
  }
  const source = readFileSync(defaultsPath, 'utf8');
  const match = source.match(/export const firebaseDefaults = \{([\s\S]*?)\};/);
  if (!match) {
    throw new Error('Could not parse firebaseDefaults object in firebase.defaults.ts');
  }
  const defaults = {};
  for (const key of CONFIG_KEYS) {
    const entry = match[1].match(new RegExp(`${key}:\\s*'([^']*)'`));
    if (!entry) {
      throw new Error(`Missing key "${key}" in firebase.defaults.ts`);
    }
    defaults[key] = entry[1];
  }
  return defaults;
}

function singleQuote(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const ENV_KEYS = {
  apiKey: 'REACT_APP_FIREBASE_API_KEY',
  authDomain: 'REACT_APP_FIREBASE_AUTH_DOMAIN',
  projectId: 'REACT_APP_FIREBASE_PROJECT_ID',
  storageBucket: 'REACT_APP_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'REACT_APP_FIREBASE_APP_ID',
  measurementId: 'REACT_APP_FIREBASE_MEASUREMENT_ID',
};

function resolveConfig(defaults) {
  const config = {};
  for (const key of CONFIG_KEYS) {
    // Generation-time env wins; otherwise keep the default and let the
    // generated code fall back to the CRA-inlined REACT_APP_* variable.
    const value = process.env[ENV_KEYS[key]] || defaults[key];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(`Empty value for Firebase config key "${key}"`);
    }
    config[key] = value;
  }
  return config;
}

function buildOutput(sampleBody, config) {
  const configBlock = [
    'const firebaseConfig = {',
    ...CONFIG_KEYS.map((key) => `  ${key}: ${singleQuote(config[key])},`),
    '};',
  ].join('\n');

  const placeholderPattern = /const firebaseConfig = \{[\s\S]*?\};/;
  if (!placeholderPattern.test(sampleBody)) {
    throw new Error(
      'Could not locate the "const firebaseConfig = { ... }" block in firebase.sample.ts'
    );
  }

  // The sample starts with a "// src/config/firebase.ts" comment line; keep the
  // body exactly as-is apart from the config block replacement.
  return sampleBody.replace(placeholderPattern, () => configBlock);
}

function main() {
  if (!existsSync(samplePath)) {
    throw new Error(`Missing ${samplePath}`);
  }
  const sampleBody = readFileSync(samplePath, 'utf8');
  const defaults = readDefaults();
  const config = resolveConfig(defaults);
  const output = buildOutput(sampleBody, config);

  if (existsSync(outputPath) && readFileSync(outputPath, 'utf8') === output) {
    console.log('✅ src/config/firebase.ts is up to date');
    return;
  }

  writeFileSync(outputPath, output, 'utf8');
  console.log(`✅ Generated src/config/firebase.ts (project: ${config.projectId})`);
}

main();
