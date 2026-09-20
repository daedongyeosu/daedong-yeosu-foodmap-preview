import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('./', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const storeId = '34817ff59a6bc66d';
const menu = JSON.parse(read('data/wehalmae-yeoseo-menu.json'));
const registry = JSON.parse(read('data/reviewed-menu-photo-links.json'));
const shard = JSON.parse(read('data/reviewed-menu-photo-links/3.json'));
const source = read('data-api.js');

const expectedNames = [
  '가래떡떡볶이', '밀떡볶이', '짜장떡볶이', '로제떡볶이', '마라떡볶이', '마라로제떡볶이',
  '가래떡떡볶이 세트', '밀떡볶이 세트', '짜장떡볶이 세트', '로제떡볶이 세트',
  '무침만두', '물떡', '가래떡떡꼬치', '곰돌이돈까스', '국물비빔밥', '매운어묵',
  '통오징어튀김', '순대', '순대볶음'
];

function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let i = source.indexOf('{', source.indexOf(')', start)); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(name);
}

const context = vm.createContext({});
for (const name of ['menuPhotoNameHash', 'applyReviewedMenuPhotos']) {
  vm.runInContext(functionSource(name), context);
}

assert.equal(menu.storeId, storeId);
assert.deepEqual(menu.items.map(item => item.name), expectedNames, 'the reviewed brand menu stays in exact order');
assert.ok(menu.items.every(item => item.image === ''), 'the source menu remains text-only and immutable');

const reviewed = registry.stores[storeId];
assert.ok(reviewed, 'the store has a reviewed photo registry');
assert.deepEqual(shard.stores[storeId], reviewed, 'the small runtime shard matches the published registry');
assert.equal(Object.keys(reviewed.items).length, expectedNames.length);

const photos = new Set();
for (const [index, item] of menu.items.entries()) {
  const photo = reviewed.items[item.id];
  assert.ok(photo, `${item.name} has an exact reviewed photo`);
  assert.equal(photo.nameHash, context.menuPhotoNameHash(item.name), `${item.name} name guard`);
  assert.equal(photo.descriptionHash, context.menuPhotoNameHash(item.description), `${item.name} description guard`);
  assert.match(photo.source, /^https:\/\/wehalmae\.co\.kr\/data\/file\/main_menu\//, `${item.name} uses the official brand source`);
  assert.equal(photo.image, `assets/reviewed-menu-photos/${storeId}/${String(index + 1).padStart(2, '0')}${[10, 11, 12, 19].includes(index + 1) && index + 1 !== 10 ? '.png' : '.jpg'}`);
  assert.ok(!photos.has(photo.image), `${item.name} does not reuse another menu photo`);
  photos.add(photo.image);
  const bytes = fs.readFileSync(new URL(photo.image, root));
  if (photo.image.endsWith('.png')) assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  else assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8]);
}

const applied = context.applyReviewedMenuPhotos(storeId, menu, registry);
assert.equal(applied.items.filter(item => item.image).length, expectedNames.length, 'all 19 menus render with photos');
assert.equal(applied.mainImage, menu.mainImage, 'the existing store hero is not replaced');
assert.deepEqual(applied.items.map(item => ({id:item.id,name:item.name,description:item.description,category:item.category})),
  menu.items.map(item => ({id:item.id,name:item.name,description:item.description,category:item.category})),
  'adding photos changes no menu identity, copy, or category');

const staticBranch = source.slice(source.indexOf('if (staticUrl)'), source.indexOf('const yogiyoWebRoute', source.indexOf('if (staticUrl)')));
assert.match(staticBranch, /applyReviewedMenuPhotos\(id, restoreCuratedMenuImages\(id, payload\), await reviewedPhotos\)/,
  'static brand menus also pass through the reviewed photo registry');

console.log('wehalmae exact menu photo regression passed');
