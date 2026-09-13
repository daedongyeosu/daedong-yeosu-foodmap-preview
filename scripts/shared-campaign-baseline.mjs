import fs from 'node:fs';
import {beforeGyegunsangHero} from './gyegunsang-campaign-baseline.mjs';
const fixture=JSON.parse(fs.readFileSync('scripts/fixtures/shared-store-campaigns-102.json','utf8'));
const added=new Set(fixture.stores.filter(x=>x.added).map(x=>x.storeId));
const production=fs.readFileSync('data-api.js','utf8').includes("const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api.sisakim.workers.dev'");
// Historical tests retain their original hashes. Only this explicitly approved
// batch is projected back to its pre-release state; the current batch is checked
// separately against pinned campaign/image/link hashes by its regression test.
export function beforeSharedHero(hero){
 hero=beforeGyegunsangHero(hero);
 return {...hero,campaigns:Object.fromEntries(Object.entries(hero.campaigns)
  .filter(([id])=>!added.has(id)).map(([id,c])=>[id,!production&&id==='068b2ae8fe32874a'?fixture.previewOriginalPizza:fixture.originalCampaigns[id]
   ? {...fixture.originalCampaigns[id],...(!production?{layout:'food14-plus3'}:{})}:c]))};
}
export function beforeSharedLinks(links){
 return {...links,campaigns:links.campaigns.filter(x=>!added.has(x.storeId))};
}
