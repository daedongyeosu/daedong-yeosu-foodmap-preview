import fs from 'node:fs/promises';

const jsPath = 'store-service-info.js';
const indexPath = 'index.html';

let js = await fs.readFile(jsPath, 'utf8');
const oldData = "const DATA_URL = 'store-service-info.json';";
const newData = "const DATA_URL = 'store-service-info.json?v=store-service-6';";
if (!js.includes(oldData) && !js.includes(newData)) throw new Error('service data URL target missing');
js = js.replace(oldData, newData);
await fs.writeFile(jsPath, js);

let html = await fs.readFile(indexPath, 'utf8');
for (const [before, after] of [
  ['store-service-info.css?v=store-service-5', 'store-service-info.css?v=store-service-6'],
  ['store-service-info.js?v=store-service-5', 'store-service-info.js?v=store-service-6']
]) {
  if (!html.includes(before) && !html.includes(after)) throw new Error(`index cache target missing: ${before}`);
  html = html.replace(before, after);
}
await fs.writeFile(indexPath, html);
console.log('store service cache bumped to 6');
