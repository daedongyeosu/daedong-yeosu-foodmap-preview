import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const copy=value=>JSON.parse(JSON.stringify(value)),c={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('neighbor-market/model.js','utf8'),c);const M=c.module.exports;
assert.equal(typeof M.deleteTrash,'function','Trash needs an explicit, confirmed removal operation');
let original=M.example();original.decor=[{id:'prop',type:'flowers',x:40,y:70,size:18,locked:false}];original=M.addFace(original,'second');original=M.trashItem(original,'main','sample-0');original=M.trashItem(original,'main','prop');const before=copy(original);
const one=M.deleteTrash(original,['sample-0']);assert.deepEqual(copy(original),before);assert.equal(one.trash.length,1);assert.equal(one.trash[0].item.id,'prop');assert.deepEqual(copy(one.items),before.items);assert.deepEqual(copy(one.surfaces),before.surfaces);assert.deepEqual(copy(one.decor),before.decor);
const empty=M.deleteTrash(original,['sample-0','prop']);assert.equal(empty.trash.length,0);assert.equal(empty.version,2);assert.deepEqual(copy(M.clean(empty)),copy(empty));assert.deepEqual(copy(empty.items),before.items);assert.deepEqual(copy(empty.surfaces),before.surfaces);
assert.equal(M.deleteTrash(M.trashItem(M.example(),'main','sample-0'),['sample-0']).version,1);
for(const ids of [[],['missing'],['sample-1'],['sample-0','sample-0'],['sample-0','missing'],null,'sample-0'])assert.throws(()=>M.deleteTrash(original,ids));assert.deepEqual(copy(original),before);
const html=fs.readFileSync('neighbor-market/index.html','utf8'),js=fs.readFileSync('neighbor-market/market.js','utf8');
for(const id of ['workspaceDivider','workspaceResize','resetWorkspace','trashDeleteDialog','confirmTrashDelete','cancelTrashDelete','clearTrash','saveTrashChanges'])assert.equal(html.split('id="'+id+'"').length-1,1,id);
assert.match(html,/id="facePrev"[^>]*>‹ 이전 면/);assert.match(html,/id="faceNext"[^>]*>다음 면 ›/);
assert.match(js,/deletePending\.snapshot!==JSON\.stringify\(own\)/,'Reject changed confirmation snapshots');
assert.match(js,/\$\('cancelTrashDelete'\)\.focus/,'The initial focus must be on cancel, not deletion');
const w={module:{exports:{}}};vm.runInNewContext(fs.readFileSync('neighbor-market/workspace-layout.js','utf8'),w);const W=w.module.exports;
assert.deepEqual(copy(W.rows(744,8,44,40)),{display:273.6,tools:410.4,available:684,share:40});
for(const height of [250,450,744])for(const value of [-100,25,40,75,100]){const rows=W.rows(height,8,44,value);assert.equal(rows.display+rows.tools,rows.available);assert.ok(rows.share>=25&&rows.share<=75);}
console.log('PASS exact selected/all trash deletion with active photos/faces unchanged, confirmation guards, labeled navigation and pure 40/60 layout bounds');
