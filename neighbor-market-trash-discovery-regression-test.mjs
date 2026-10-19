import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('neighbor-market/index.html','utf8'),js=fs.readFileSync('neighbor-market/market.js','utf8'),css=fs.readFileSync('neighbor-market/market.css','utf8');
assert.match(html,/<div id="sceneActions"/,'Trash and recovery must sit beside the scene, not in the scrolling tools');
const viewport=html.indexOf('id="sceneViewport"'),tools=html.indexOf('id="customTools"');
for(const id of ['trashSelected','openTrash','undoTrash','trashDrop']){
  const at=html.indexOf('id="'+id+'"');assert.ok(at>viewport&&at<tools,id+' must be in the scene area');
  assert.equal(html.split('id="'+id+'"').length-1,1,'one shared '+id+' action, not duplicate buttons');
}
assert.match(html,/여기에 놓으면 휴지통으로/);
assert.match(js,/\$\('trashSelected'\)\.onclick=putInTrash/,'Tap and drag use the same recoverable model');
assert.match(js,/past\.at\(-1\)!==lastTrashBefore/,'The nearby undo must never undo a later, unrelated change');
assert.doesNotMatch(js.slice(js.indexOf('function dragTrash('),js.indexOf('function putInTrash(')),/customTools|style\.top|style\.left/,'Drop target stays in the scene dock');
assert.match(css,/\.scene-actions\{position:relative/);
assert.match(css,/\.trash-drop\{position:absolute;inset:0/);
const start=js.indexOf('function nearbyTrashPosition(');assert.ok(start>=0);
const end=js.indexOf('\n  }',start);assert.ok(end>start);
const context=vm.createContext({});vm.runInContext(js.slice(start,end+4),context);
for(const [width,height] of [[190,70],[304,160],[374,480],[720,600]]){
  for(const left of [0,width*.3,width*.8])for(const top of [0,height*.3,height*.8]){
    const result=context.nearbyTrashPosition({width,height},{left,top,width:width*.24,height:height*.24});
    assert.ok(result.left>=8&&result.left+112<=width-8,'tap target fits horizontally');
    assert.ok(result.top>=8&&result.top+44<=height-8,'tap target fits vertically');
  }
}
assert.equal(context.nearbyTrashPosition({width:304,height:160},{left:100,top:50,width:60,height:60},[{left:0,top:0,width:304,height:160}]),null,'Crowded scenes use the dock instead of covering photos');
const free=context.nearbyTrashPosition({width:304,height:160},{left:100,top:70,width:60,height:60},[{left:0,top:60,width:304,height:100}]);assert.ok(free&&free.top+44<=56,'Use real empty space before covering any photo, prop, price or resize handle');
assert.doesNotMatch(js,/setInterval|serviceWorker|fetch\(/);
console.log('PASS nearby single trash action, scene-bound drop/recovery, safe immediate undo and bounded touch target');
