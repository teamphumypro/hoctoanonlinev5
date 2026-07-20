'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const ensure = spawnSync(process.execPath, [path.join(__dirname, 'ensure-deps.js')], {
  stdio: 'inherit',
  env: process.env
});
if (ensure.status !== 0) process.exit(ensure.status || 1);

require('./migrate-core');
