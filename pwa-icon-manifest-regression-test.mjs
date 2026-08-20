import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const serviceWorker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const expected = [
  ['any', '192x192', '/assets/app-icons/daedong-app-icon-192.png'],
  ['any', '512x512', '/assets/app-icons/daedong-app-icon-512.png'],
  ['maskable', '192x192', '/assets/app-icons/daedong-app-icon-maskable-192.png'],
  ['maskable', '512x512', '/assets/app-icons/daedong-app-icon-maskable-512.png']
];

assert.equal(manifest.icons.length, expected.length, '공식 앱 아이콘 4개만 manifest에 등록해야 합니다.');

for (const [purpose, sizes, src] of expected) {
  const icon = manifest.icons.find(item => item.purpose === purpose && item.sizes === sizes);
  assert.ok(icon, `${purpose} ${sizes} 아이콘이 필요합니다.`);
  assert.equal(icon.src, src);
  assert.equal(icon.type, 'image/png');
  assert.ok(!icon.purpose.includes(' '), 'any와 maskable은 별도 아이콘으로 등록해야 합니다.');

  const image = fs.readFileSync(path.join(root, src.slice(1)));
  assert.equal(image.toString('ascii', 1, 4), 'PNG', `${src}는 PNG여야 합니다.`);
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  const expectedSize = Number(sizes.split('x')[0]);
  assert.deepEqual([width, height], [expectedSize, expectedSize], `${src} 크기가 manifest와 일치해야 합니다.`);
  assert.ok(serviceWorker.includes(`'${src}'`), `${src}는 앱 셸 캐시에 포함해야 합니다.`);
}

assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v15-mobile-performance-followup'/);
console.log('PWA official app icon manifest regression: PASS');
