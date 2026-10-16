import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

let playwright;
try { playwright=await import('playwright'); }
catch { playwright=await import(pathToFileURL(path.join(process.env.NODE_MODULES_ROOT,'playwright/index.mjs')).href); }
const root=process.cwd();
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await playwright.chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/store-partner/index.html`);
  await page.locator('#storeName').fill('의견 테스트 상점');
  await page.getByRole('button',{name:'필요한 도구 제안하기'}).click();
  await page.locator('#suggestionDetails').fill('진열대를 두 구역으로 나누고 싶어요.');
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  assert.equal(await page.locator('#storeName').inputValue(),'의견 테스트 상점');
  await page.reload();
  await page.getByRole('button',{name:'필요한 도구 제안하기'}).click();
  assert.equal(await page.locator('#suggestionDetails').inputValue(),'진열대를 두 구역으로 나누고 싶어요.');
  const bounds=await page.locator('#suggestionDialog').boundingBox();
  assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.height<=812,'대화상자는 모바일 화면 안에 있어야 합니다.');
  await page.screenshot({path:process.env.SCREENSHOT_PATH||'../tmp/merchant-suggestions-mobile.png'});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#suggestionDialog').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log('PASS merchant suggestion draft restoration, shop isolation, mobile dialog and Escape');
}finally{await browser.close();server.close();}
