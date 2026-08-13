import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const page = fs.readFileSync(new URL('./collector-review.html', import.meta.url), 'utf8');
const script = fs.readFileSync(new URL('./collector-review.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./collector-review-entry.css', import.meta.url), 'utf8');

test('Preview home exposes a Yeosu-only collector review entry without changing store data', () => {
  assert.match(index, /href="\/collector-review\.html"/);
  assert.match(index, /data-yeosu-only/);
  assert.match(css, /data-region="goheung".*display:none/s);
  assert.doesNotMatch(index, /collector-review.*data-order-key/);
});

test('Collector review page is explicitly Preview-only and customer-hidden', () => {
  assert.match(page, /PREVIEW 전용 · 고객 미공개/);
  assert.match(page, /신규 가게도 승인 전에는 고객 목록에 들어가지 않습니다/);
  assert.match(page, /noindex,nofollow,noarchive/);
  assert.match(script, /payload\.regionCode !== 'yeosu'/);
  assert.match(script, /payload\.customerVisible !== false/);
});

test('Collector review client never renders internal identifiers or menu prices', () => {
  for (const forbidden of ['businessRegistrationNumber', 'businessNumberInternalOnly', 'shopInShop', 'sourcePhone', 'menu.price']) {
    assert.equal(script.includes(forbidden), false, `must not render ${forbidden}`);
  }
  assert.match(script, /요기요 원본 링크 열기/);
  assert.match(script, /사진 없음 메뉴 보존/);
});
