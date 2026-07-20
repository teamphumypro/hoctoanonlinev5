'use strict';

const { spawnSync } = require('child_process');

const REQUIRED = [
  'express', 'pg', 'ejs', 'multer', 'connect-pg-simple', 'express-session',
  'mammoth', 'jszip', 'fast-xml-parser', 'dotenv'
];

function allPresent() {
  return REQUIRED.every((name) => {
    try {
      require.resolve(name);
      return true;
    } catch (_) {
      return false;
    }
  });
}

if (allPresent()) {
  console.log('[bootstrap] Dependencies are ready.');
  process.exit(0);
}

console.warn('[bootstrap] Incomplete node_modules detected. Repairing dependencies...');

const attempts = [
  ['ci', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'],
  ['install', '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'],
  ['install', '--omit=dev', '--no-audit', '--no-fund', '--legacy-peer-deps']
];

for (const args of attempts) {
  console.log(`[bootstrap] Running: npm ${args.join(' ')}`);
  const result = spawnSync('npm', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      NPM_CONFIG_AUDIT: 'false',
      NPM_CONFIG_FUND: 'false',
      NPM_CONFIG_UPDATE_NOTIFIER: 'false'
    }
  });

  if (result.status === 0 && allPresent()) {
    console.log('[bootstrap] Dependency repair completed.');
    process.exit(0);
  }
}

console.error('[bootstrap] Could not install all required dependencies.');
process.exit(1);
