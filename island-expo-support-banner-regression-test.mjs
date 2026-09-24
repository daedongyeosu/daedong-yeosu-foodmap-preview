import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, css] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.css', import.meta.url), 'utf8'),
]);

assert.match(html, /class="island-expo-support-banner"/);
assert.match(html, /href="https:\/\/yeosu2026\.or\.kr\/"/);
assert.match(html, /target="_blank" rel="noopener noreferrer"/);
assert.match(html, /우리의 삶터 여수/);
assert.match(html, /섬박람회의 성공을 함께 응원합니다/);
assert.match(html, /공식 홈페이지/);
assert.match(html, /island-expo-support-1/);

assert.match(css, /\.island-expo-support-banner\s*\{/);
assert.match(css, /\.island-expo-support-action\s*\{/);
assert.match(css, /@media\(max-width:520px\)[\s\S]*\.island-expo-support-banner/);

assert.doesNotMatch(html, /kogl\.or\.kr|island-expo[^"']*\.(?:png|webp|svg)/i);

console.log('Island Expo support banner regression checks passed.');
