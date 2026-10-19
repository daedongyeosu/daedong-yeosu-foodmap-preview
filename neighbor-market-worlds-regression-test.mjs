import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('./neighbor-market/model.js');
assert.ok(M.backdrops&&Object.keys(M.backdrops).length>=10,'Independent landscapes, not four recolored shelves');
assert.ok(Object.keys(M.displays).length>=10);assert.ok(M.decorTypes.length>=24);assert.ok(Object.keys(M.worlds).length>=10);
const before=M.example(),bytes=JSON.stringify(before),scene=M.clean({...before,backdrop:'harbor',season:'winter',display:'rail',lighting:'sunset',items:before.items.map((item,i)=>({...item,locked:i===0}))});
assert.equal(JSON.stringify(before),bytes);assert.equal(scene.backdrop,'harbor');assert.equal(scene.season,'winter');assert.equal(scene.display,'rail');
for(const key of Object.keys(M.worlds)){const result=M.applyWorld(scene,key);assert.deepEqual(result.items,scene.items);assert.deepEqual(result.decor,scene.decor);assert.equal(result.name,scene.name);assert.deepEqual(M.clean(result),result);}
const legacy={...before};for(const key of ['backdrop','season','display','lighting'])delete legacy[key];const migrated=M.clean(legacy);assert.equal(migrated.display,'classic');assert.equal(migrated.backdrop,'room');assert.deepEqual(migrated.items,before.items);
assert.equal(M.clean({...scene,backdrop:'https://invalid.example',display:'<script>'}).backdrop,'room');
const html=fs.readFileSync('neighbor-market/index.html','utf8');for(const id of ['backdrop','season','displayStyle','lighting','worldChoices','decorFilter','decorSearch','photoDialog','photoStage','photoImage','closePhoto','resetPhoto'])assert.match(html,new RegExp('id="'+id+'"'));
console.log('PASS world axes, presets preserve all products/locks/props, legacy migration, safe enum choices and photo-only viewer contract');
