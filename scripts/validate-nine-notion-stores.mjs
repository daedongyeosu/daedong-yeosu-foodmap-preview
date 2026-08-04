import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {NEW_NOTION_STORES} from './nine-notion-store-config.mjs';

const BASE_REF = process.env.EXPECTED_BASE_REF
  ? `origin/${process.env.EXPECTED_BASE_REF}`
  : (process.argv[2] || 'origin/main');
const TARGET_IDS = new Set(NEW_NOTION_STORES.map(store => store.id));
const TARGET_NAMES = new Set(NEW_NOTION_STORES.map(store => store.name));
const allowedData = new Set(['data/stores.json', 'data/photo-manifest.json']);

function fail(message) {
  console.error(`검증 실패: ${message}`);
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024
  });
}

function readBaseJson(file) {
  return JSON.parse(git(['show', `${BASE_REF}:${file}`]));
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every(value => right.has(value));
}

const baseStores = readBaseJson('data/stores.json');
const headStores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const baseManifest = readBaseJson('data/photo-manifest.json');
const headManifest = JSON.parse(fs.readFileSync('data/photo-manifest.json', 'utf8'));

if (headStores.length !== baseStores.length + NEW_NOTION_STORES.length) {
  fail(`가게 수가 ${baseStores.length} → ${baseStores.length + NEW_NOTION_STORES.length}가 아닙니다.`);
}
for (let index = 0; index < baseStores.length; index += 1) {
  if (!same(baseStores[index], headStores[index])) {
    fail(`기존 가게가 변경됐습니다: ${baseStores[index]?.name || index}`);
  }
}
const appendedStores = headStores.slice(baseStores.length);
if (!sameSet(new Set(appendedStores.map(store => store.id)), TARGET_IDS)) {
  fail('추가된 가게 ID가 승인된 9개와 다릅니다.');
}
if (!sameSet(new Set(appendedStores.map(store => store.name)), TARGET_NAMES)) {
  fail('추가된 가게 이름이 승인된 9개와 다릅니다.');
}

if (headManifest.entries.length !== baseManifest.entries.length + NEW_NOTION_STORES.length) {
  fail('사진 manifest에는 신규 가게 9개만 추가되어야 합니다.');
}
for (let index = 0; index < baseManifest.entries.length; index += 1) {
  if (!same(baseManifest.entries[index], headManifest.entries[index])) {
    fail(`기존 사진 manifest가 변경됐습니다: ${baseManifest.entries[index]?.storeId || index}`);
  }
}

const appendedManifest = headManifest.entries.slice(baseManifest.entries.length);
const manifestById = new Map(appendedManifest.map(entry => [entry.storeId, entry]));
if (!sameSet(new Set(manifestById.keys()), TARGET_IDS)) fail('추가된 사진 manifest 대상이 승인된 9개와 다릅니다.');

for (const definition of NEW_NOTION_STORES) {
  const matches = appendedStores.filter(store => store.id === definition.id && store.name === definition.name);
  if (matches.length !== 1) fail(`${definition.name}: 신규 가게가 정확히 한 번 추가되지 않았습니다.`);
  const store = matches[0];
  const gallery = (store.images || []).map(image => image.detail || image.card).filter(Boolean);
  if (gallery.length !== 3 || new Set(gallery).size !== 3) {
    fail(`${definition.name}: 가게 데이터 사진이 서로 다른 3장이 아닙니다.`);
  }
  const entry = manifestById.get(definition.id);
  if (!entry || !same(entry.gallery, gallery)) {
    fail(`${definition.name}: 가게 데이터와 사진 manifest 갤러리가 일치하지 않습니다.`);
  }
  if (entry.src !== gallery[0] || !same(entry.additionalSrcs, gallery.slice(1))) {
    fail(`${definition.name}: 대표·추가 사진 구성이 잘못됐습니다.`);
  }
  for (const imagePath of gallery) {
    if (!imagePath.startsWith(`assets/notion-store-photos/${definition.id.slice(0, 14)}/`)) {
      fail(`${definition.name}: 승인된 사진 폴더 밖을 참조합니다.`);
    }
    if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size < 1024) {
      fail(`${definition.name}: 사진 파일이 없거나 손상됐습니다: ${imagePath}`);
    }
  }
}

const changes = git(['diff', '--name-status', '--find-renames', `${BASE_REF}...HEAD`, '--', 'data', 'assets', 'images'])
  .trim().split(/\r?\n/).filter(Boolean).map(line => {
    const [status, ...paths] = line.split('\t');
    return {status, paths};
  });
const dataChanges = changes.filter(change => change.paths.some(file => file.startsWith('data/')));
const assetChanges = changes.filter(change => change.paths.some(file => file.startsWith('assets/')));
const imageChanges = changes.filter(change => change.paths.some(file => file.startsWith('images/')));

if (imageChanges.length) fail('기존 images 폴더가 변경됐습니다.');
if (dataChanges.some(change => change.status !== 'M' || change.paths.length !== 1 || !allowedData.has(change.paths[0]))) {
  fail('승인되지 않은 data 파일 변경이 있습니다.');
}
if (!sameSet(new Set(dataChanges.map(change => change.paths[0])), allowedData)) {
  fail('stores.json과 photo-manifest.json 이외의 데이터 변경은 허용되지 않습니다.');
}
if (assetChanges.length !== NEW_NOTION_STORES.length * 3) {
  fail(`신규 사진 파일은 27개여야 합니다. 현재 ${assetChanges.length}개`);
}
if (assetChanges.some(change => change.status !== 'A' || change.paths.length !== 1)) {
  fail('신규 사진 외의 assets 변경이 있습니다.');
}
const expectedPhotos = new Set(appendedManifest.flatMap(entry => entry.gallery));
if (!sameSet(new Set(assetChanges.map(change => change.paths[0])), expectedPhotos)) {
  fail('Git 변경 목록의 신규 사진과 manifest의 27장이 일치하지 않습니다.');
}

console.log(`안전 검증 통과: 기존 ${baseStores.length}개 가게 무변경, 신규 9개, 노션 사진 27장`);
