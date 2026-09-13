import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./store-service-info.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const scope=source.slice(source.indexOf('  function benefitScope('),source.indexOf('  function hasVerifiedBenefitStatus('));
const detail=source.slice(source.indexOf('  function detailBenefitItems('),source.indexOf('  function detailBenefitMarkup('));
const serviceData={programs:[
  {key:'yeosu-seomseom-pay',label:'여수섬섬페이',appKeys:['ddangyo'],appLabel:'땡겨요'},
  {key:'high-oil-support',label:'고유가 피해지원금',appKeys:['ddangyo'],appLabel:'땡겨요'},
  {key:'ddangyo-coupon',label:'쿠폰',appKeys:['ddangyo'],appLabel:'땡겨요'},
],deliveryBenefits:[{key:'free-delivery',label:'무료배달 가능',appKeys:['ddangyo'],appLabel:'땡겨요'}]};
const context=vm.createContext({serviceData,normalize:v=>String(v||'').normalize('NFKC').replace(/\s+/g,'').toLowerCase()});
vm.runInContext(`${scope}\n${detail}\nglobalThis.qa={benefitLabels,scopedBenefitLabel,detailBenefitItems};`,context);
const plain=x=>JSON.parse(JSON.stringify(x));
const {qa}=context;
const dd={key:'yeosu-seomseom-pay',status:'accepted',appKeys:['ddangyo'],appLabel:'땡겨요'};
const both={...dd,appKeys:['mukkebi','ddangyo'],appLabel:'먹깨비·땡겨요'};
const oil={key:'high-oil-support',status:'accepted',appKeys:['ddangyo'],appLabel:'땡겨요'};
const free={key:'free-delivery',status:'available',appKeys:['ddangyo'],appLabel:'땡겨요'};
const cases=[
  {name:'틈 돈까스',info:{payments:[dd,both]},expected:1},
  {name:'수원왕갈비통닭',info:{payments:[dd,oil,both]},expected:2},
  {name:'촌닭두마리치킨',info:{payments:[dd,both],delivery:[free]},expected:2},
  {name:'no benefits',info:{payments:[{...dd,status:'unavailable'}]},expected:0},
  {name:'identical delivery rows',info:{delivery:[free,{...free}]},expected:1},
  {name:'distinct delivery apps',info:{delivery:[free,{...free,appKeys:['mukkebi'],appLabel:'먹깨비'}]},expected:2},
];
for(const test of cases){
  const before=JSON.stringify(test.info);
  const items=qa.benefitLabels(test.info);
  assert.equal(items.length,test.expected,`${test.name}: duplicate customer benefit label`);
  assert.equal(new Set(items.map(qa.scopedBenefitLabel)).size,items.length);
  assert.equal(JSON.stringify(test.info),before,'Source provenance and acceptance data must not be mutated');
}
const merged=plain(qa.benefitLabels({payments:[dd,both]}));
assert.deepEqual([...merged[0].appKeys].sort(),['ddangyo','mukkebi']);
assert.equal(qa.scopedBenefitLabel(merged[0]),'먹깨비·땡겨요 여수섬섬페이 가맹점');
assert.deepEqual(plain(qa.benefitLabels({payments:[dd,oil,both]})).map(qa.scopedBenefitLabel),[
  '먹깨비·땡겨요 여수섬섬페이 가맹점','땡겨요 고유가 피해지원금'
]);
serviceData.programs.push({...serviceData.programs[0]});
const details=plain(qa.detailBenefitItems({payments:[dd,both,oil]}).filter(x=>x.state==='available'));
assert.equal(details.length,2,'Duplicate program definitions must not duplicate detail badges');
assert.match(source,/return uniqueDisplayBenefits\(\[\.\.\.paymentLabels\(info\), \.\.\.deliveryLabels\(info\)\]\)/);
assert.match(html,/store-service-info\.js\?v=[^"\s]*benefit-dedupe-20260913/);
console.log('PASS: duplicate customer benefits collapsed, app scope and unrelated benefits preserved');
