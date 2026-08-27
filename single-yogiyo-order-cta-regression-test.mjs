import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('rc3-fixes.js', 'utf8');
const html = fs.readFileSync('final-experience.js', 'utf8');
const functionSource = source.match(/function rc3OrderMethodsMode\(channels\) \{[\s\S]*?\n\}/)?.[0];

assert.ok(functionSource, '가게별 주문앱 구성에 맞춰 버튼 문구를 정하는 함수를 유지해야 합니다.');
const rc3OrderMethodsMode = Function(`${functionSource}; return rc3OrderMethodsMode;`)();
const route = key => ({key, url: `https://example.test/${key}`});

assert.deepEqual(
  rc3OrderMethodsMode({primaryOrder: {phoneOrder: route('phone')}, externalOrder: {yogiyo: route('yogiyo')}}),
  {hasExternal: true, singleExternalKey: 'yogiyo', label: '요기요로 주문하기'}
);
for (const key of ['directOrder', 'mukkebi', 'ddangyo', 'ondongne']) {
  const mode = rc3OrderMethodsMode({primaryOrder: {[key]: route(key)}, externalOrder: {yogiyo: route('yogiyo')}});
  assert.equal(mode.label, '다른 주문방법 보기', `${key}가 생기면 다른 주문방법 보기로 돌아가야 합니다.`);
  assert.equal(mode.singleExternalKey, '');
}
assert.equal(
  rc3OrderMethodsMode({primaryOrder: {}, externalOrder: {yogiyo: route('yogiyo'), baemin: route('baemin')}}).label,
  '다른 주문방법 보기'
);
assert.equal(rc3OrderMethodsMode({primaryOrder: {}, externalOrder: {}}).hasExternal, false);
assert.match(source, /data-rc3-single-external/);
assert.match(source, /if \(singleExternalKey\) \{[\s\S]*?openCommunityChoice\(store, singleExternalKey\)/);
assert.match(html, /single-yogiyo-cta-1/);

console.log('single Yogiyo order CTA regression: PASS');

