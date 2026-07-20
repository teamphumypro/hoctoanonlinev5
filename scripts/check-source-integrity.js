'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const ignored = new Set(['node_modules', '.git', 'public/uploads']);
const markers = [/^<<<<<<< /m, /^=======$/m, /^>>>>>>> /m];
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if ([...ignored].some(prefix => rel === prefix || rel.startsWith(prefix + '/'))) continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|ejs|json|css|md)$/.test(entry.name)) {
      const text = fs.readFileSync(full, 'utf8');
      if (markers.some(regex => regex.test(text))) failures.push(rel);
    }
  }
}
walk(root);
if (failures.length) {
  console.error('Phát hiện dấu merge conflict chưa xử lý:');
  failures.forEach(file => console.error(' - ' + file));
  process.exit(1);
}
console.log('Source integrity: OK');
