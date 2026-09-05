import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('store-menu-preview.js', 'utf8');
const readFunction = name => {
  const match = source.match(new RegExp(`  function ${name}\\([^]*?\\n  \\}`));
  assert.ok(match, `${name} owner function exists`);
  return match[0];
};
const guards = source.split('\n').filter(line => /const MENU_(?:PREFIX_PRICE_PATTERN|SUFFIX_PRICE_PATTERN|BARE_PRICE_PATTERN|HIDDEN_MEMBERSHIP_PATTERN) =/.test(line)).join('\n');
const context = vm.createContext({});
vm.runInContext(`${guards}\nconst escapeMenuHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));\n${readFunction('publicMenuDescription')}\n${readFunction('menuNotesMarkup')}\nthis.render = menuNotesMarkup;`, context);
assert.equal(context.render({}), '', 'ordinary stores have no extra UI');
assert.equal(context.render({__menuNotes: [{kind:'heading',text:'분류 제목'}]}), '', 'headings never become guidance');
const html = context.render({__menuNotes: [
  {kind:'delivery',text:'추가 배달비 2,000원'},
  {kind:'description',text:'만두피가 약간 매콤합니다'},
  {kind:'description',text:'만두피가 약간 매콤합니다'},
  {kind:'description',text:'<img src=x onerror=alert(1)>'},
  {kind:'description',text:'WOW 회원 전용'},
  {kind:'description',text:'13000'},
]});
assert.match(html, /배달 안내/);
assert.match(html, /메뉴 안내/);
assert.equal((html.match(/만두피가 약간 매콤합니다/g) || []).length, 1);
assert.match(html, /&lt;img/);
assert.doesNotMatch(html, /<img|2,000|13000|WOW|data-menu-card|<details|hidden/);
assert.match(source, /\$\{menuNotesMarkup\(menu\)\}/, 'notes are wired into actual preview');
console.log('PASS menu notes UI: separate guidance, source text, escaping, dedupe, no prices/membership, no folding');
