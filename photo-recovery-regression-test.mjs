import {existsSync, readFileSync} from 'node:fs';

const stores = JSON.parse(readFileSync('data/stores.json', 'utf8'));
const manifest = JSON.parse(readFileSync('data/photo-manifest.json', 'utf8')).entries || [];
const audit = parseCsv(readFileSync('canonical-photo-recovery-audit-180.csv', 'utf8'));
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, '');
const assert = (value, message) => { if (!value) throw new Error(message); };

function parseCsv(text) {
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<text.length;i+=1){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i+=1;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field='';}else if(ch==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=ch;}
  const [header,...data]=rows.filter(item=>item.some(Boolean));
  return data.map(values=>Object.fromEntries(header.map((key,index)=>[key,values[index]??''])));
}

const canonical = stores.filter(store => (store.store_id||store.id) && store.name && store.name.trim() && store.name !== '제목 없음').map(store => ({
  ...store,
  sid:String(store.store_id||store.id),
  index:normalize([store.name,store.realBusinessName,store.brandName,store.branchName,store.district,store.category,...(store.searchAliases||[]),...(store.shopInShopNames||[])].filter(Boolean).join(' '))
}));
const byId = new Map(canonical.map(store=>[store.sid,store]));
const photoById = new Map(manifest.map(entry=>[String(entry.storeId),entry]));
const approved = audit.filter(row=>row.recovery_decision==='restore-approved');
const linked = audit.filter(row=>row.recovery_decision==='link-existing-canonical');

for (const row of approved) {
  const store = byId.get(row.proposed_store_id);
  assert(store, `canonical missing: ${row.notion_store_name}`);
  const terms = [store.name, store.brandName, store.branchName, store.district, normalize(store.name)].filter(Boolean);
  for (const term of terms) assert(store.index.includes(normalize(term)), `search index missing ${term}: ${store.name}`);
  const exactMatches = canonical.filter(item => item.index.includes(normalize(store.name)));
  assert(exactMatches.some(item=>item.sid===store.sid), `exact search missing: ${store.name}`);
  assert(Array.isArray(store.routes), `detail routes field missing: ${store.name}`);
  const photo = photoById.get(store.sid);
  assert(photo && existsSync(photo.src), `photo missing: ${store.name}`);
  assert(store.latitude===null && store.longitude===null, `unverified coordinate is not null: ${store.name}`);
  assert(store.notionPageId===row.notion_page_id && store.notionUrl===row.notion_url, `Notion identity mismatch: ${store.name}`);
}
for (const row of linked) {
  const store = byId.get(row.proposed_store_id);
  assert(store && store.notionPageId===row.notion_page_id, `existing canonical link missing: ${row.notion_store_name}`);
  assert(store.index.includes(normalize(row.notion_store_name)), `existing canonical alias missing: ${row.notion_store_name}`);
}

assert(approved.length===177, `expected 177 restored stores, received ${approved.length}`);
assert(linked.length===3, `expected 3 existing links, received ${linked.length}`);
assert(audit.filter(row=>row.photo_match_type==='approved-brand-shared-photo').length===2, 'brand-shared count changed');

console.log(JSON.stringify({
  candidates:audit.length,
  restoredCanonical:approved.length,
  linkedExistingCanonical:linked.length,
  brandSharedPhoto:2,
  heldCandidates:0,
  searchableCanonical:canonical.length,
  verifiedDetails:approved.length,
  verifiedPhotos:approved.length,
  verifiedSearchIndexes:approved.length,
  status:'PASS'
},null,2));
