import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadChromium = async () => {
  try { return (await import('playwright')).chromium; } catch {}
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!modules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(modules, 'playwright', 'index.mjs')).href)).chromium;
};

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const verifiedPhoto = 'assets/store-photos/0121fe7f8b97d8/01.webp';
const stores = [
  {store_id:'new-missing-photo',name:'사진 미확인 신규가게',district:'문수동',category:'치킨',categories:['치킨'],image:'',images:[],channelKeys:['coupang'],hasMenu:true,addedAt:'2026-09-01T10:00:00+09:00'},
  {store_id:'new-placeholder-photo',name:'공식앱 아이콘 신규가게',district:'문수동',category:'치킨',categories:['치킨'],image:'assets/app-icons/daedong-app-icon-512.png',images:[],channelKeys:['coupang'],hasMenu:true,addedAt:'2026-09-01T09:59:00+09:00'},
  ...Array.from({length:10},(_,index)=>({store_id:`new-verified-${index + 1}`,name:`정상사진 신규가게 ${index + 1}`,district:'문수동',category:'치킨',categories:['치킨'],image:verifiedPhoto,images:[verifiedPhoto],channelKeys:['coupang'],hasMenu:true,addedAt:`2026-09-01T09:${String(50-index).padStart(2,'0')}:00+09:00`}))
];
const report = {success:false,checks:[],errors:[],viewport:{width:390,height:844}};
const browser = await chromium.launch({headless:true,...(process.env.CODEX_BROWSER_EXECUTABLE_PATH?{executablePath:process.env.CODEX_BROWSER_EXECUTABLE_PATH}:{})});
const context = await browser.newContext({viewport:report.viewport,isMobile:true,hasTouch:true,locale:'ko-KR',userAgent:'Mozilla/5.0 (Linux; Android 15; SM-S938N) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.7.2'});
await context.addInitScript(()=>{sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2','1');});
await context.route('**/api/events',route=>route.fulfill({status:204,body:''}));
await context.route('**/*.woff2',route=>route.abort());
await context.route('**/api/catalog*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(stores)}));
await context.route('**/api/services*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({programs:[],stores:{}})}));
const page = await context.newPage();
page.on('pageerror',error=>report.errors.push(error.message));
try{
  await page.goto(`${baseURL}?new-store-photo-test=${Date.now()}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-rail="new"] [data-rail-card-store]',{timeout:20000});
  const result = await page.locator('[data-rail="new"]').evaluate(rail=>({
    names:[...rail.querySelectorAll('.rail-card h3')].map(node=>node.textContent.trim()),
    imageCount:rail.querySelectorAll('.rail-card img').length,
    placeholderCount:rail.querySelectorAll('.app-browser-photo-placeholder').length,
    documentWidth:document.documentElement.scrollWidth,
    viewportWidth:innerWidth
  }));
  const check=(ok,message)=>{report.checks.push({ok:Boolean(ok),message});if(!ok)throw new Error(message);};
  check(!result.names.includes('사진 미확인 신규가게'),'사진 없는 신규 가게가 추천 카드에서 제외됨');
  check(!result.names.includes('공식앱 아이콘 신규가게'),'공식 앱 아이콘 대체 가게가 추천 카드에서 제외됨');
  check(result.names.length>0&&result.names.every(name=>name.startsWith('정상사진 신규가게')),'검증 사진 신규 가게만 추천 카드에 표시됨');
  check(result.imageCount===result.names.length&&result.placeholderCount===0,'표시된 신규 가게 카드가 모두 실제 사진을 사용함');
  check(result.documentWidth<=result.viewportWidth,'390×844 화면에 가로 넘침이 없음');
  report.result=result;
  await page.screenshot({path:'browser-new-store-verified-photo.png',fullPage:false});
  report.success=report.errors.length===0;
}catch(error){report.failure=error.stack||String(error);}finally{
  fs.writeFileSync('browser-new-store-verified-photo-report.json',`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
if(!report.success)process.exit(1);
