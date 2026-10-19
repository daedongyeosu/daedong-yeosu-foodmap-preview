import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for (const [file, prefix] of [['index.html', ''], ['store-alley/index.html', '../']]) {
  const html = fs.readFileSync(file, 'utf8');
  const section = html.match(/<section class="matjido-neighbor-entry[^\"]*"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, `${file}: visible neighbor-market entry must exist`);
  for (const [label, suffix] of [
    ['이웃 중고장터 구경하기', '?view=example#experience'],
    ['내 장터 만들기', '?action=create']
  ]) {const link=section.match(new RegExp('<a[^>]*href="'+(prefix+'neighbor-market/index.html'+suffix).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'"[^>]*>[\\s\\S]*?</a>'))?.[0];assert.ok(link,`${file}: ${label} destination`);assert.ok(link.includes(label)||link.includes(`aria-label="${label}"`),`${file}: ${label} accessible name`);}
  assert.match(section, /실제 판매·결제·배송은 발생하지 않습니다/);
  assert.match(html, new RegExp(`href="${prefix.replaceAll('.', '\\.')}neighbor-market/entry\\.css\\?v=20261020-entry-1"`));
  assert.doesNotMatch(section, /target=|onclick=|<script|<img|<form/i, 'Entry is same-tab navigation, not an order or heavy editor import');
}

const home = fs.readFileSync('index.html', 'utf8');
for (const value of ['href="store-partner/"', 'href="store-alley/index.html"', 'id="usedMarketBtn"', '당근·번개장터·중고나라']) assert.ok(home.includes(value), `Preserve existing path: ${value}`);
const js = fs.readFileSync('neighbor-market/market.js', 'utf8');
const source = js.match(/function entryMode\(search\)\{[^\n]+\}/)?.[0];
assert.ok(source, 'One explicit entry-mode parser');
const entryMode = vm.runInNewContext('(' + source + ')', {URLSearchParams});
for (const [search, mode] of [
  ['', ''], ['?action=create', 'create'], ['?release=check&action=create', 'create'],
  ['?view=example', 'example'], ['?view=example&action=create', 'create'],
  ['?action=delete', ''], ['?action=CREATE', ''], ['?view=constructor', '']
]) assert.equal(entryMode(search), mode, search);
const init = js.slice(js.indexOf('async function initialize()'));
assert.match(init, /loading=false;const mode=entryMode\(location.search\);if\(mode==='example'\)view='example';render\(\);if\(mode==='create'\)showMaker\(\);/, 'Open registration only after storage restoration and readiness');
assert.doesNotMatch(init, /await save\(|void build\(|\.delete\(|\.clear\(|indexedDB.deleteDatabase/, 'Entry must never save, replace or clear a draft');
console.log('PASS neighbor entries: home and alley browse/create paths, scope disclosure, preserved old links, exact entry actions after restoration without writes');
