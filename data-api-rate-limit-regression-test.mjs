import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

let fetchCount = 0;
const context = {
  window: {
    setTimeout,
    clearTimeout,
    DAEDONG_REGION: {code: 'yeosu'}
  },
  fetch: async () => {
    fetchCount += 1;
    return {
      ok: false,
      status: 429,
      headers: {get: name => name.toLowerCase() === 'retry-after' ? '55' : null},
      json: async () => ({error: 'too_many_requests'})
    };
  },
  URL,
  console,
  Promise,
  Object,
  Map,
  Set,
  String,
  Error,
  Date,
  AbortController
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data-api.js', 'utf8'), context);

const api = context.window.daedongDataApi;
let firstError;
try {
  await api.detail('0123456789abcdef');
} catch (error) {
  firstError = error;
}
assert.equal(firstError?.status, 429);
assert.equal(firstError?.retryAfter, 55);
await assert.rejects(api.detail('0123456789abcdef'), error => error?.status === 429);
assert.equal(fetchCount, 1, '같은 429를 받은 직후 재터치가 API를 연속 호출하면 안 됩니다.');

console.log('data API rate-limit regression: PASS');
