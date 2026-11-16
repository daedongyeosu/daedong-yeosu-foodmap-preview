import assert from 'node:assert/strict';
import fs from 'node:fs';

// Playwright 1.55's Linux dependency registry supports these Ubuntu images.
// A floating runner can move to an unsupported image without a code change.
const supportedUbuntu155 = new Set(['ubuntu-20.04', 'ubuntu-22.04', 'ubuntu-24.04']);

function checkCompatibility(source, filename) {
  if (!/playwright@1\.55\.0\b/.test(source)) return false;
  const runners = [...source.matchAll(/^\s+runs-on:\s*([^#\r\n]+)/gm)]
    .map(match => match[1].trim());
  assert.ok(runners.length, `${filename}: browser checks need an explicit runner`);
  for (const runner of runners) {
    assert.ok(supportedUbuntu155.has(runner),
      `${filename}: ${runner} is not a pinned Ubuntu image supported by Playwright 1.55`);
  }
  return true;
}

let checked = 0;
for (const file of fs.readdirSync('.github/workflows')) {
  if (!/\.ya?ml$/.test(file)) continue;
  const source = fs.readFileSync(`.github/workflows/${file}`, 'utf8');
  if (checkCompatibility(source, file)) checked++;
}
assert.ok(checked >= 2, 'Check both PR/scheduled and deployed-preview browser workflows');

const fixture = runner => `jobs:\n  browser:\n    runs-on: ${runner}\n    steps:\n      - run: npm install playwright@1.55.0\n`;
assert.throws(() => checkCompatibility(fixture('ubuntu-latest'), 'floating runner'),
  /not a pinned Ubuntu image/, 'Reproduce an automatic unsupported OS upgrade');
assert.throws(() => checkCompatibility(fixture('ubuntu-26.04'), 'unsupported runner'),
  /not a pinned Ubuntu image/, 'Reproduce the installation failure observed in GitHub');
assert.equal(checkCompatibility(fixture('ubuntu-24.04'), 'supported runner'), true);

console.log(`PASS Playwright 1.55 runner compatibility (${checked} workflows; floating/unsupported OS negative controls)`);
