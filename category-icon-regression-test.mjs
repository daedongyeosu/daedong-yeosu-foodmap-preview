import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const rc3 = read('./rc3-fixes.js');
const rc4 = read('./rc4-fixes.js');
const rc5 = read('./rc5-fixes.js');
const index = read('./index.html');
const sprite = read('./assets/ui/category-icons-color.svg');
const stores = JSON.parse(read('./data/stores.json'));

assert(app.includes("const CATEGORY_ICON_SPRITE = 'assets/ui/category-icons-color.svg?v=category-first-paint-1'"), '최초 카테고리 아이콘 스프라이트가 고정되지 않았습니다.');
assert(app.includes('function renderCategoryGrid()'), '공통 카테고리 렌더러가 없습니다.');
assert(app.includes('grid.dataset.categorySignature === signature'), '중복 카테고리 렌더링 방지가 없습니다.');
assert(finalExperience.includes('renderCategories=renderCategoryGrid'), '체험 레이어가 공통 카테고리 렌더러를 사용하지 않습니다.');
assert(rc3.includes('renderCategories = renderCategoryGrid'), 'RC3가 공통 카테고리 렌더러를 사용하지 않습니다.');
assert(rc4.includes('renderCategories=renderCategoryGrid'), 'RC4가 공통 카테고리 렌더러를 사용하지 않습니다.');
assert(rc5.includes('renderCategories=renderCategoryGrid'), 'RC5가 공통 카테고리 렌더러를 사용하지 않습니다.');
assert(!finalExperience.includes("fxSvg('food','category-local-icon')}<span>${escapeHtml(name)}"), '초기 공통 음식 아이콘 덮어쓰기가 남아 있습니다.');
assert(index.includes('rel="preload" as="image" href="assets/ui/category-icons-color.svg?v=category-first-paint-1"'), '카테고리 아이콘 선로딩이 없습니다.');

const referencedIds = [...app.matchAll(/\[\/[^]*?\/,\s*'([^']+)'\]/g)].map(match => match[1]);
for (const id of [...new Set(['all', 'other', ...referencedIds])]) {
  assert(sprite.includes(`id="${id}"`), `스프라이트에 ${id} 아이콘이 없습니다.`);
}

const chicken = sprite.match(/<symbol id="chicken"[^]*?<\/symbol>/)?.[0] || '';
assert(chicken.includes('stroke="#174A6C"'), '치킨 아이콘의 외곽선이 없습니다.');
assert((chicken.match(/<circle /g) || []).length >= 3, '치킨 아이콘의 뼈 끝 구분이 부족합니다.');
assert(chicken.includes('stroke-width="7"'), '치킨 아이콘의 뼈가 충분히 선명하지 않습니다.');

const routes = stores.flatMap(store => store.routes || []).filter(route => route?.enabled !== false && typeof route?.url === 'string' && route.url.trim());
assert(stores.length === 650, `가게 수가 ${stores.length}개로 바뀌었습니다.`);
assert(stores.filter(store => store.name && store.name !== '제목 없음').length === 649, '검색 가능 가게 수가 바뀌었습니다.');
assert(routes.length === 4558, `주문경로 수가 ${routes.length}개로 바뀌었습니다.`);

console.log(JSON.stringify({
  status: 'PASS',
  categoryRenderer: 'single-shared-renderer',
  sprite: 'preloaded-versioned-color-icons',
  chickenIcon: 'outlined-drumstick-with-visible-bone',
  stores: stores.length,
  routes: routes.length
}, null, 2));
