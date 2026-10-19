import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('./neighbor-market/model.js');
const html=fs.readFileSync('neighbor-market/index.html','utf8'),js=fs.readFileSync('neighbor-market/market.js','utf8'),css=fs.readFileSync('neighbor-market/market.css','utf8');
const summary=js.match(/function entrySummary\(items\)\{[^\n]+\}/)?.[0];assert.ok(summary,'Actual price progress helper must exist');
const entrySummary=vm.runInNewContext('('+summary+')',{M});
for(const [prices,total,complete]of [[[],0,0],[['','',''],3,0],[['12000','','0'],3,2],[['12000','9000','0'],3,3],[['1.5',null,'abc'],3,0]]){const result=entrySummary(prices.map(price=>({price})));assert.equal(result.total,total);assert.equal(result.complete,complete);}
const toolbar=html.match(/<div id="editToolbar"[\s\S]*?<\/div>/)?.[0],tools=html.match(/<aside id="customTools"[\s\S]*?<\/aside>/)?.[0];
assert.match(toolbar,/id="saveDecor"/,'Saving must stay beside the scene');assert.doesNotMatch(tools,/id="saveDecor"/,'No saving button hidden inside long tools');assert.equal((html.match(/id="saveDecor"/g)||[]).length,1);
for(const id of ['makerProgress','marketNameOption','browseMarket','leaveDecorDialog','saveAndFinish','keepDecorating','previewDecorating'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
assert.match(html,/<details id="marketNameOption"/,'Optional name must not precede required photo/price work');assert.ok(html.indexOf('id="entryList"')<html.indexOf('id="marketNameOption"'));
assert.match(js,/event\.key!=='Enter'\|\|event\.isComposing/);assert.match(js,/if\(next\)next.focus\(\);else\{event.target.blur\(\);\$\('buildMarket'\).focus\(\);\}/,'Last keyboard Done must not create/save automatically');
assert.match(js,/if\(!dirty\)\{setCustom\(false\);return;\}/);assert.match(js,/await save\(own\);\$\('leaveDecorDialog'\).close\(\);setCustom\(false\)/,'Save-and-close must await real storage completion');
assert.match(css,/grid-template-columns:44px 44px minmax\(72px,1fr\) auto/);assert.doesNotMatch(js,/[\u3040-\u30ff]/,'Korean UI must not contain accidental untranslated messages');
console.log('PASS neighbor first-user: price progress includes explicit free, optional name follows photos, saving beside scene, keyboard next/done and explicit unsaved close guards');
