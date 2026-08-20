import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync('.github/workflows/preview-api-client-checks.yml', 'utf8');
const server = fs.readFileSync('scripts/serve-performance-budget.mjs', 'utf8');

assert.match(workflow, /node scripts\/serve-performance-budget\.mjs 4173/);
assert.doesNotMatch(
  workflow.match(/- name: Enforce customer mobile performance budget[\s\S]*?(?=\n      - name:)/)?.[0] || '',
  /python3 -m http\.server/
);
assert.match(server, /createBrotliCompress/);
assert.match(server, /content-encoding'\] = 'br'/);
assert.match(server, /cache-control': 'no-store'/);

console.log('performance fixture server regression: PASS');
