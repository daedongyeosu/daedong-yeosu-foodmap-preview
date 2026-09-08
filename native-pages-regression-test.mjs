import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const pages=JSON.parse(fs.readFileSync('data/native-pages.json')).pages;
const assets=JSON.parse(fs.readFileSync('data/native-page-assets.json'));
const targets=JSON.parse(fs.readFileSync('data/banner-targets.json'));
assert.equal(pages.length,3);
for(const p of pages){
 const target=targets[p.bannerKey];
 assert.equal(target.notionUrl,`/info/${p.slug}/`);
 const html=fs.readFileSync(`info/${p.slug}/index.html`,'utf8');
 assert.ok(html.includes(`<h1>${p.title}</h1>`));
 assert.ok(html.includes(`href="tel:${p.phone}"`));
 if(p.mapUrl)assert.ok(html.includes(`href="${p.mapUrl}"`));
 assert.doesNotMatch(html,/bit\.ly|notion\.(?:so|site|com)|prod-files|X-Amz|<iframe/i);
 for(const m of p.media){const a=assets[p.slug+'/'+m.file];assert.ok(a);assert.ok(html.includes('/'+a.path));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(a.path)).digest('hex'),a.sha256);}
}
assert.equal(crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(targets).filter(([k])=>!['18','19','20'].includes(k))))).digest('hex'),'d93d3b40309eea01594927041d36ab3ee00bba43ae7b6f889b8157b6b8fb1d4d','All unrelated banner records remain unchanged');
assert.equal(pages.find(p=>p.slug==='umi').media.length,13);
assert.equal(pages.find(p=>p.slug==='healing-yacht').media.length,15);
assert.equal(pages.find(p=>p.slug==='small-business').media.length,1);
assert.match(fs.readFileSync('app.js','utf8'),/SMALL_BUSINESS_ASSOCIATION_URL = new URL\('\/info\/small-business\/'/);
console.log('PASS native pages: all 3 routes, 29 assets, existing banners, phone/map links; no external publishing dependency');
