import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const checks = [];
const missing = [];
const remote = /^(?:https?:|data:|blob:)/i;
const addPath = (value, storeName) => {
  const path = typeof value === 'string' ? value : value?.detail || value?.card || value?.src;
  if (!path || remote.test(path)) return;
  if (!fs.existsSync(path) || fs.statSync(path).size === 0) missing.push({storeName, path});
};

for (const store of stores) {
  addPath(store.image || store.img, store.name);
  for (const image of store.images || []) addPath(image, store.name);
}

checks.push({
  name: '가게 사진 참조 파일 존재',
  ok: missing.length === 0,
  detail: missing.length ? JSON.stringify(missing.slice(0, 20)) : 'all referenced files exist'
});

const failed = checks.filter(item => !item.ok);
const report = {success: failed.length === 0, pass: checks.length - failed.length, fail: failed.length, checks};
fs.writeFileSync('photo-batch2-integrity-result.json', `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log(item.ok ? 'PASS' : 'FAIL', item.name, item.detail);
if (failed.length) process.exit(1);
