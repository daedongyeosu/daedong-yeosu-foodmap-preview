import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY = process.env.KAKAO_REST_API_KEY;
if (!KEY) throw new Error('KAKAO_REST_API_KEY secret is not available');

const normalize = value => String(value || '').toLowerCase().replace(/[\s&·()\-_/.,]/g, '');
const clean = value => String(value || '').trim();
const csvEscape = value => /[",\n]/.test(String(value ?? '')) ? `"${String(value ?? '').replaceAll('"', '""')}"` : String(value ?? '');
function parseCsv(text) {
  const rows=[]; let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(cell);cell='';}else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=ch;}
  if(cell||row.length){row.push(cell);rows.push(row);}const header=rows.shift()||[];
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((key,index)=>[key,r[index]||''])));
}
async function json(file){return JSON.parse(await readFile(path.join(ROOT,file),'utf8'));}
async function kakao(endpoint, query) {
  const url=new URL(`https://dapi.kakao.com${endpoint}`);url.searchParams.set('query',query);url.searchParams.set('size','15');
  const response=await fetch(url,{headers:{Authorization:`KakaoAK ${KEY}`}});
  if(!response.ok)throw new Error(`Kakao API request failed (${response.status})`);
  return response.json();
}
function storeId(store){return String(store.store_id||store.id||'');}
function branchTokens(store){return [store.branchName,store.district].map(normalize).filter(token=>token.length>=2);}
function nameMatches(store, placeName){const place=normalize(placeName), names=[store.name,store.realBusinessName,store.brandName].map(normalize).filter(token=>token.length>=2);return names.some(name=>place.includes(name)||name.includes(place))&&branchTokens(store).every(token=>place.includes(token)||normalize(store.name).includes(token));}
function yeosuCandidate(doc){const address=clean(doc.road_address_name||doc.address_name||doc.road_address?.address_name||doc.address?.address_name);return /(?:전라남도|전남).*여수시/.test(address)||doc.address?.region_2depth_name==='여수시';}

const [stores,coordinates,auditText]=await Promise.all([json('data/stores.json'),json('data/store-coordinates.json'),readFile(path.join(ROOT,'new-store-coordinate-audit-179.csv'),'utf8')]);
const audit=parseCsv(auditText),storeById=new Map(stores.map(store=>[storeId(store),store]));
const proposed={},report=[];
for(const candidate of audit){
  const id=clean(candidate.store_id),store=storeById.get(id),existing=coordinates[id];
  const base={store_id:id,store_name:clean(candidate.store_name),input_address:clean(candidate.address),status:'',reason:'',matched_place_name:'',matched_address:'',latitude:'',longitude:''};
  if(!store){report.push({...base,status:'review',reason:'canonical-store-missing'});continue;}
  if(existing?.status==='verified'&&Number.isFinite(Number(existing.latitude))&&Number.isFinite(Number(existing.longitude))){report.push({...base,status:'preserved',reason:'existing-verified-coordinate'});continue;}
  if(!base.input_address||!/여수시/.test(base.input_address)){report.push({...base,status:'review',reason:'missing-or-non-yeosu-address'});continue;}
  try{
    const keyword=await kakao('/v2/local/search/keyword.json',`${store.name} ${base.input_address}`);
    const matches=(keyword.documents||[]).filter(doc=>yeosuCandidate(doc)&&nameMatches(store,doc.place_name));
    if(matches.length!==1){report.push({...base,status:'review',reason:matches.length?'multiple-validated-candidates':'no-single-name-branch-match'});continue;}
    const match=matches[0],lat=Number(match.y),lng=Number(match.x),matchedAddress=clean(match.road_address_name||match.address_name);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||!yeosuCandidate(match)){report.push({...base,status:'review',reason:'invalid-coordinate-or-region'});continue;}
    proposed[id]={latitude:lat,longitude:lng,source:'kakao-new-recovery-keyword-geocoding',inputAddress:base.input_address,matchedAddress,status:'verified',confidence:'keyword-name-branch-exact'};
    report.push({...base,status:'proposed',reason:'single-validated-candidate',matched_place_name:match.place_name,matched_address:matchedAddress,latitude:lat,longitude:lng});
  }catch(error){report.push({...base,status:'review',reason:`api-error:${error.message}`});}
}

const out=path.join(ROOT,'artifacts');await mkdir(out,{recursive:true});
await writeFile(path.join(out,'store-coordinates-new-verified.json'),JSON.stringify(proposed,null,2)+'\n');
const columns=['store_id','store_name','input_address','status','reason','matched_place_name','matched_address','latitude','longitude'];
await writeFile(path.join(out,'store-coordinate-build-review.csv'),[columns.join(','),...report.map(row=>columns.map(key=>csvEscape(row[key])).join(','))].join('\n')+'\n');
await writeFile(path.join(out,'store-coordinate-build-summary.json'),JSON.stringify({candidateCount:audit.length,existingVerifiedPreserved:report.filter(row=>row.status==='preserved').length,proposedCount:Object.keys(proposed).length,reviewCount:report.filter(row=>row.status==='review').length,baseVerifiedCount:Object.values(coordinates).filter(row=>row.status==='verified').length,baseFileModified:false},null,2)+'\n');
console.log(JSON.stringify({candidateCount:audit.length,proposedCount:Object.keys(proposed).length,reviewCount:report.filter(row=>row.status==='review').length,baseFileModified:false}));
