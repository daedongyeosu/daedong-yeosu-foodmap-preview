import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('local-service-ads.js','utf8');
const css=fs.readFileSync('local-service-ads.css','utf8');
const context={window:{},location:{hostname:'preview.daedongmap.com'},ACTIVE_REGION:{code:'yeosu'},document:{readyState:'loading',addEventListener(){}}};
vm.runInNewContext(source,context);
const api=context.window.daedongLocalServices;
for(let i=0;i<2;i++){
 const card=api.card(i), ad=api.advertisers[i], detail=api.detail(ad.id);
 assert.doesNotMatch(card,/local-service-ad-description|local-service-ad-cta|링크 복사/);
 assert.match(card,/local-service-disclosure">광고/);
 assert.ok(card.includes(ad.person)&&card.includes(ad.image));
 assert.equal((card.match(/data-local-service-share=/g)||[]).length,1);
 assert.equal((detail.match(/data-local-service-share=/g)||[]).length,2);
 assert.ok(detail.includes('tel:'+ad.phone.replace(/-/g,'')));
}
assert.match(css,/grid-template-columns:52px minmax\(0,1fr\)/);
assert.match(css,/#storeGrid>\.local-service-ad\{[^}]*align-self:flex-start/);
assert.match(css,/#storeGrid>\.local-service-ad>\.local-service-ad-main\{flex:none\}/);
assert.doesNotMatch(css,/min-height:218px|font-size:30px/);
assert.match(css,/\.local-service-ad-copy>strong\{font-size:15px/);
assert.match(api.detail('hyundai-sinwansu'),/data-insurance-font/);
for(const file of ['index.html','services/index.html']) assert.match(fs.readFileSync(file,'utf8'),/compact-20260915/);
console.log('Compact ads: short cards, preserved advertiser data, sharing and full detail PASS');
