import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const brace = app.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < app.length; index += 1) {
    if (app[index] === '{') depth += 1;
    if (app[index] === '}') depth -= 1;
    if (depth === 0) return app.slice(start, index + 1);
  }
  throw new Error(`${name} closing brace not found`);
}

const keyMatch = app.match(/const ANALYTICS_OWNER_EXCLUSION_KEY = '([^']+)'/);
const paramMatch = app.match(/const ANALYTICS_OWNER_MODE_PARAM = '([^']+)'/);
assert.ok(keyMatch && paramMatch, 'owner analytics constants must exist');

const storage = new Map();
const location = {
  search: '?owner_stats=exclude&hero=67a9e4f14c8c7ea4',
  pathname: '/',
  hash: '#app',
};
let replacedUrl = '';
const context = vm.createContext({
  URLSearchParams,
  location,
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  },
  history: {
    state: null,
    replaceState: (_state, _title, url) => { replacedUrl = url; },
  },
});

vm.runInContext(`
  const ANALYTICS_OWNER_EXCLUSION_KEY = ${JSON.stringify(keyMatch[1])};
  const ANALYTICS_OWNER_MODE_PARAM = ${JSON.stringify(paramMatch[1])};
  ${extractFunction('analyticsOwnerExcluded')}
  ${extractFunction('applyAnalyticsOwnerMode')}
`, context);

vm.runInContext('applyAnalyticsOwnerMode()', context);
assert.equal(storage.get(keyMatch[1]), '1', 'exclude link must register this browser as owner');
assert.equal(vm.runInContext('analyticsOwnerExcluded()', context), true);
assert.equal(replacedUrl, '/?hero=67a9e4f14c8c7ea4#app', 'mode parameter must be removed without damaging store or hash links');

location.search = '?owner_stats=include';
vm.runInContext('applyAnalyticsOwnerMode()', context);
assert.equal(storage.has(keyMatch[1]), false, 'include link must restore normal analytics');
assert.equal(vm.runInContext('analyticsOwnerExcluded()', context), false);

const senderStart = app.indexOf('function sendAnalyticsEvent');
const senderEnd = app.indexOf('function analyticsStoreForElement');
const sender = app.slice(senderStart, senderEnd);
assert.match(sender, /if \(analyticsOwnerExcluded\(\)\) return;/, 'all event delivery must stop for a registered owner browser');
assert.match(html, /owner-exclusion-1/, 'browser cache version must include the owner exclusion release');

console.log('analytics owner exclusion regression: PASS');
