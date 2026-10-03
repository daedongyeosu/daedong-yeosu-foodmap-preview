import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const expectedMatjidoIcons = new Map([
  ['assets/app-icons/daedong-app-icon-192.png', '7a761ca7131bc2568527ba169db8eb789d1c8c45a2967cfd76f8c7cc06d1e426'],
  ['assets/app-icons/daedong-app-icon-512.png', '15619dce9d046fa8918a39704b3f4a548b70c34d7d705e54861ccedc59119807'],
  ['assets/app-icons/daedong-app-icon-maskable-192.png', 'c089dc94cfac9e2b09e38c444f92d6469dc6a7b96ce524e1ab42096dccc8eecc'],
  ['assets/app-icons/daedong-app-icon-maskable-512.png', 'ff613e0d099fa02ff8b26b5cf18e47ed5522b9483ece0b98c0ae58d0a1b908c5']
]);

for (const [file, expectedHash] of expectedMatjidoIcons) {
  assert.ok(fs.existsSync(file), `맛지도 앱 아이콘이 필요합니다: ${file}`);
  assert.equal(sha256(file), expectedHash, `승인된 맛지도 C안과 다른 아이콘입니다: ${file}`);
}

const yeosuGageIcon = 'assets/brand/yeosugage-app-icon.png';
assert.ok(fs.existsSync(yeosuGageIcon), '별도 서비스인 여수가게 아이콘을 보존해야 합니다.');
assert.equal(
  sha256(yeosuGageIcon),
  'ce4730bbbf6c5206c5846c0ebeb8eba760b228f9bc1c21c4a315c30acbe08c7c',
  '여수가게 아이콘은 맛지도 아이콘 작업에서 변경하면 안 됩니다.'
);
assert.notEqual(
  sha256(yeosuGageIcon),
  sha256('assets/app-icons/daedong-app-icon-512.png'),
  '여수가게와 맛지도 앱 아이콘은 서로 다른 브랜드 자산이어야 합니다.'
);

const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /assets\/brand\/yeosugage-app-icon\.png/, '여수가게 진입부는 여수가게 전용 아이콘을 계속 사용해야 합니다.');
assert.match(html, /daedong-app-icon-192\.png\?v=matjido-master-20261003-preview-1/, '여수맛지도 설치 아이콘은 승인된 맛지도 버전을 사용해야 합니다.');

console.log('Matjido / YeosuGage brand separation regression: PASS');
