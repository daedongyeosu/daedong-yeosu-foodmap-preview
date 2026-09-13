import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
// The 2026-09-13 requested replacement has its own pinned integrity check.
// Project ONLY that store back for historical whole-catalog preservation tests.
const previous = {
  "storeId": "e57c51a4f6294349",
  "slug": "collected-e57c51a4f6294349",
  "label": "계근상 여수본점(문수동) 전용 대동여수음식지도",
  "title": "계근상 여수본점(문수동)",
  "meta": "가게 정보와 주문방법",
  "slides": [
    {
      "storeId": "e57c51a4f6294349",
      "image": "assets/notion-recovery-180/e57c51a4f6294349/01.png",
      "title": "계근상 여수본점(문수동)",
      "meta": "가게 정보와 주문방법"
    }
  ],
  "layout": "food14-plus3"
};
export function beforeGyegunsangHero(hero) {
  const current=hero.campaigns[previous.storeId];
  assert.equal(createHash('sha256').update(JSON.stringify(current)).digest('hex'),'cd15deaffec2d42611772f27fc5d99b6b49bf71e4833091c5cc41e457c36f75f','Reviewed Gyegunsang campaign must not drift');
  const restored={...previous};
  if(fs.readFileSync('data-api.js','utf8').includes("const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api.sisakim.workers.dev'")) delete restored.layout;
  return {...hero,campaigns:{...hero.campaigns,[previous.storeId]:restored}};
}
