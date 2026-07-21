import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.resolve(import.meta.dirname,'..');
const stores=JSON.parse(await readFile(path.join(ROOT,'data/stores.json'),'utf8'));
const coordinates=JSON.parse(await readFile(path.join(ROOT,'data/store-coordinates.json'),'utf8'));
const definitions=[
 ['여서동',['여서점','여수여서','여서동점','여서2로']],['문수동',['문수점','여수문수','문수동점','문수로']],
 ['학동',['학동점','여수학동']],['웅천동',['웅천점','여수웅천']],['국동',['국동점','여수국동','국동항점']],
 ['소호동',['소호점','여수소호']],['신기동',['신기점','신기동점','여수신기']],['돌산',['돌산점','여수돌산']],
 ['미평동',['미평점','여수미평']],['둔덕동',['둔덕점','여수둔덕']],['봉계동',['봉계점','여수봉계']],
 ['덕충동',['덕충점','여수덕충','엑스포점','엑스포광장점']],['죽림',['죽림점','여수죽림']],
 ['선원동',['선원점','선원동','무선점','여수무선']],['화장동',['화장점','화장동']],['안산동',['안산점','안산동']],
 ['봉산동',['봉산점','여수봉산']],['신월동',['신월점','여수신월']],['고소동',['고소동점','고소점']],
 ['교동',['교동점','여수교동']],['중앙동',['중앙점','여수중앙']],['충무동',['충무점','여수충무']],
 ['공화동',['공화점','공화동점']],['관문동',['관문점','여수관문']],['종화동',['종화동점','종화점']],
 ['수정동',['수정동점','수정점']],['오림동',['오림점','오림동점']],['광무동',['광무점','광무동점']],
 ['봉강동',['봉강점','봉강동점']],['서교동',['서교점','서교동점']],['연등동',['연등점','연등동점']],
 ['여천동',['여천점','여수여천']],['소라',['소라점','소라면']],['율촌',['율촌점','율촌면']]
];
const normalize=value=>String(value||'').replace(/[\s,\/·&()\-_.]/g,'');
function storeId(store){return String(store.store_id||store.id||'');}
function neighborhoods(value){const text=normalize(value);return definitions.filter(([name,aliases])=>text.includes(normalize(name))||aliases.some(alias=>text.includes(normalize(alias)))).map(([name])=>name);}
function median(values){const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;}
const points=new Map(definitions.map(([name])=>[name,[]]));
for(const store of stores){const row=coordinates[storeId(store)];if(row?.status!=='verified')continue;const latitude=Number(row.latitude),longitude=Number(row.longitude);if(!Number.isFinite(latitude)||!Number.isFinite(longitude))continue;for(const name of neighborhoods([store.district,store.address,store.name].filter(Boolean).join(' ')))points.get(name).push({latitude,longitude,store_id:storeId(store)});}
const output=definitions.map(([name,aliases])=>{const rows=points.get(name);return{name,aliases:[...new Set([`${name}점`,`여수${name}점`,...aliases])],latitude:rows.length?median(rows.map(row=>row.latitude)):null,longitude:rows.length?median(rows.map(row=>row.longitude)):null,type:'neighborhood-centroid',source:'median-of-existing-verified-store-coordinates',evidence_count:rows.length};});
await writeFile(path.join(ROOT,'data/yeosu-neighborhoods.json'),JSON.stringify({generated_from:'data/store-coordinates.json',verified_store_coordinate_count:Object.values(coordinates).filter(row=>row.status==='verified').length,usage:'relative-neighborhood-order-only-never-store-distance',neighborhoods:output},null,2)+'\n');
console.log(JSON.stringify({neighborhoods:output.length,withCentroid:output.filter(row=>row.latitude!==null).length,withoutCentroid:output.filter(row=>row.latitude===null).map(row=>row.name)}));
