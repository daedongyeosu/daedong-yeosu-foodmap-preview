import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const loaderUrl = 'https://js.sentry-cdn.com/9b3322133b3df1341f937d5efe673e65.min.js';

assert.equal(
  (html.match(new RegExp(loaderUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length,
  1,
  'Sentry 로더는 한 번만 등록해야 합니다.'
);
assert.ok(
  html.indexOf('window.sentryOnLoad') < html.indexOf(loaderUrl),
  'Preview 설정은 Sentry 로더보다 먼저 선언해야 합니다.'
);
assert.match(html, /environment:\s*'preview'/, 'Preview 오류는 운영 오류와 분리해야 합니다.');
assert.match(html, /tracesSampleRate:\s*0\.1/, 'Preview 성능 추적은 10%로 제한해야 합니다.');
assert.match(html, /replaysSessionSampleRate:\s*0/, '일반 사용자 세션 재생은 수집하면 안 됩니다.');
assert.match(html, /replaysOnErrorSampleRate:\s*0/, '오류 발생 세션 재생도 수집하면 안 됩니다.');
assert.match(html, /crossorigin="anonymous"/, 'Sentry 로더는 익명 CORS로 불러와야 합니다.');
assert.doesNotMatch(html, /SENTRY_AUTH_TOKEN/, '클라이언트 HTML에 Sentry 인증 토큰을 넣으면 안 됩니다.');

console.log('Sentry preview monitoring regression: PASS');
