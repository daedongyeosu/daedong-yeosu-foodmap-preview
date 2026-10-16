import assert from 'node:assert/strict';
import fs from 'node:fs';
const onboarding=fs.readFileSync('store-partner/index.html','utf8');
const studio=fs.readFileSync('store-studio/index.html','utf8');
function input(html,id){const tag=html.match(new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*>`))?.[0];assert.ok(tag,`${id} photo input must exist`);return tag;}
for(const id of ['exteriorPhoto','interiorPhoto','productPhoto','priceBoardPhoto']){
  const tag=input(onboarding,id);assert.match(tag,/type="file"/);assert.match(tag,/accept="image\/\*"/);assert.doesNotMatch(tag,/\bcapture\b/,'Saved photos must not be forced into camera capture');
}
assert.doesNotMatch(input(studio,'photos'),/\bcapture\b/);
assert.match(input(studio,'photos'),/\bmultiple\b/);
assert.match(input(studio,'camera'),/capture="environment"/);
const link=onboarding.match(/<a\b[^>]*href="\.\.\/store-studio\/"[^>]*>/)?.[0];
assert.ok(link);assert.match(link,/target="_blank"/,'Opening the studio must preserve the onboarding form');
console.log('PASS photo sources: four onboarding pickers allow saved files; studio gallery and camera are separate; editor preserves onboarding');
