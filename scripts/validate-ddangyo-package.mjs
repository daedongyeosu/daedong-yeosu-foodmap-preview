import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('ddangyo-package-output');
const read = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const finalClassification = JSON.parse(await fs.readFile('ddangyo-final-classification-output/summary.json', 'utf8'));
const service = await read('store-service-info.json');
const serviceSummary = await read('service-summary.json');
const enrichment = await read('data/ddangyo-store-enrichment.json');
const enrichmentSummary = await read('enrichment-summary.json');
const menuSummary = await read('menu-summary.json');

if (finalClassification.inputStores !== 444) throw new Error(`classification input ${finalClassification.inputStores}`);
if (finalClassification.existing !== 444) throw new Error(`existing ${finalClassification.existing}`);
if (finalClassification.newStores !== 0) throw new Error(`new ${finalClassification.newStores}`);
if (finalClassification.review !== 0) throw new Error(`review ${finalClassification.review}`);
if (finalClassification.failures !== 0) throw new Error(`failures ${finalClassification.failures}`);
if (finalClassification.duplicateTargetStoreIds !== 0) throw new Error(`duplicate targets ${finalClassification.duplicateTargetStoreIds}`);
if (serviceSummary.hoursCreated + serviceSummary.hoursSupplemented !== 444) throw new Error('hours coverage is not 444');
if (menuSummary.menuFiles !== 444) throw new Error(`menu files ${menuSummary.menuFiles}`);
if (enrichmentSummary.createdRecords + enrichmentSummary.updatedRecords !== 444) throw new Error('enrichment coverage is not 444');

const programMap = new Map((service.programs || []).map(program => [program.key, program]));
for (const [key, app] of [['ddangyo-coupon', 'ddangyo'], ['ddangyo-timesale', 'ddangyo']]) {
  const program = programMap.get(key);
  if (!program || !(program.appKeys || []).includes(app)) throw new Error(`missing app-scoped program ${key}`);
}

const menuRoot = path.join(root, 'store-menu-content');
const dirs = await fs.readdir(menuRoot, {withFileTypes: true});
let checkedMenus = 0;
for (const dir of dirs) {
  if (!dir.isDirectory()) continue;
  const menu = JSON.parse(await fs.readFile(path.join(menuRoot, dir.name, 'menu.json'), 'utf8'));
  for (const item of menu.items || []) {
    for (const forbidden of ['price', 'prices', 'amount', 'salePrice', 'originalPrice']) {
      if (Object.prototype.hasOwnProperty.call(item, forbidden)) throw new Error(`forbidden menu price field ${dir.name}/${item.name}/${forbidden}`);
    }
  }
  checkedMenus += 1;
}
if (checkedMenus !== 444) throw new Error(`checked menu files ${checkedMenus}`);

const summary = {
  generatedAt: new Date().toISOString(),
  classification: finalClassification,
  service: serviceSummary,
  enrichment: enrichmentSummary,
  menus: menuSummary,
  checkedMenuFiles: checkedMenus,
  totalEnrichmentRecords: enrichment.stores.length,
  totalServiceRecords: Object.keys(service.stores || {}).length,
  mode: 'add-missing-only',
  pricesVisible: false
};
await fs.writeFile(path.join(root, 'package-validation-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
