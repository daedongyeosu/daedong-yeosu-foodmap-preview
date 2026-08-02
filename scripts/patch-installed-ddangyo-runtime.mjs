import fs from 'node:fs/promises';

const runtimePath = 'ddangyo-preview-runtime.js';
let runtime = await fs.readFile(runtimePath, 'utf8');
runtime = runtime.replace(
  /const DATA_URL = 'data\/ddangyo-store-enrichment\.json\?v=[^']+';/,
  "const DATA_URL = 'data/ddangyo-store-enrichment.json?v=20260802-4';"
);

const replacement = `  function addDdangyoRoute(store, row, report) {
    const href = safeUrl(row?.ddangyoUrl);
    if (!href) return;
    if (!Array.isArray(store.routes)) store.routes = [];
    const verifiedUrls = unique([...(row?.sourceUrls || []), row?.ddangyoUrl])
      .map(safeUrl)
      .filter(Boolean);
    const existing = store.routes.find(route => {
      const routeKey = String(route?.key || '').toLowerCase();
      const routeName = String(route?.name || '').replace(/\\s/g, '');
      return routeKey === 'ddangyo' || routeName.includes('땡겨요');
    });
    if (existing) {
      const current = safeUrl(existing.url);
      if (current && verifiedUrls.includes(current)) {
        report.preservedDdangyoRoutes += 1;
        return;
      }
      existing.name = '땡겨요';
      existing.key = 'ddangyo';
      existing.url = href;
      existing.enabled = true;
      existing.source = 'ddangyo-fingerprint-corrected';
      report.correctedDdangyoRoutes += 1;
      return;
    }
    store.routes.push({name: '땡겨요', key: 'ddangyo', url: href, enabled: true, source: 'ddangyo-fingerprint'});
    report.addedDdangyoRoutes += 1;
  }

  function addChakRoute`;

const functionPattern = /  function addDdangyoRoute\([\s\S]*?\n  }\n\n  function addChakRoute/;
if (!functionPattern.test(runtime)) {
  throw new Error('addDdangyoRoute function boundary not found');
}
runtime = runtime.replace(functionPattern, replacement);
runtime = runtime.replace(/addDdangyoRoute\(store,\s*row\.ddangyoUrl,\s*report\);/g, 'addDdangyoRoute(store, row, report);');
if (!runtime.includes('correctedDdangyoRoutes: 0')) {
  runtime = runtime.replace(
    /([ \t]*preservedDdangyoRoutes:\s*0,)/,
    '$1\n      correctedDdangyoRoutes: 0,'
  );
}
if (!runtime.includes('correctedDdangyoRoutes: 0')) {
  throw new Error('correctedDdangyoRoutes report field was not inserted');
}
await fs.writeFile(runtimePath, runtime);

const servicePath = 'store-service-info.js';
let service = await fs.readFile(servicePath, 'utf8');
service = service.replace(
  /store-service-info\.json\?v=store-service-\d+/g,
  'store-service-info.json?v=store-service-7'
);
await fs.writeFile(servicePath, service);

const indexPath = 'index.html';
let index = await fs.readFile(indexPath, 'utf8');
index = index
  .replace(/store-service-info\.css\?v=store-service-\d+/g, 'store-service-info.css?v=store-service-7')
  .replace(/store-service-info\.js\?v=store-service-\d+/g, 'store-service-info.js?v=store-service-7')
  .replace(/store-menu-content\/ddangyo-menu-map\.js\?v=[^\"']+/g, 'store-menu-content/ddangyo-menu-map.js?v=20260802-4')
  .replace(/ddangyo-preview-runtime\.js\?v=[^\"']+/g, 'ddangyo-preview-runtime.js?v=20260802-4');
await fs.writeFile(indexPath, index);

console.log(JSON.stringify({
  runtimeDataVersion: '20260802-4',
  serviceVersion: 'store-service-7',
  correctedRouteSupport: true
}, null, 2));
