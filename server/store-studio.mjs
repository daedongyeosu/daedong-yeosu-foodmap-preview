// Invoke behind Sites dispatch. Identity must come from the trusted gateway,
// never a browser-supplied owner/store ID. No order/catalog writes occur here.
const PREFIX='shop-studio/v1/',LIMIT=4*1024*1024;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text=(value,max)=>typeof value==='string'?value.slice(0,max):'';
const number=(value,min,max,fallback=min)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const color=(value,fallback)=>/^#[a-f0-9]{6}$/i.test(value)?value:fallback;
const id=value=>typeof value==='string'&&/^[a-z0-9_-]{1,80}$/i.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
const choices=(value,list,fallback)=>list.includes(value)?value:fallback;
const image=value=>{
  if(!value)return '';
  if(typeof value!=='string'||value.length>2000000||!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value))throw Error('직접 올린 PNG·JPG·WebP 사진만 저장할 수 있습니다.');
  // Reject mislabeled active content rather than trusting a data URL MIME label.
  let bytes;try{bytes=Uint8Array.from(atob(value.split(',')[1]),c=>c.charCodeAt(0));}catch{throw Error('사진을 읽을 수 없습니다.');}
  const type=value.slice(5,value.indexOf(';'));
  const valid=type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
  if(!valid)throw Error('사진 형식이 실제 파일과 다릅니다. 다시 올려 주세요.');
  let width=0,height=0;const view=new DataView(bytes.buffer);
  if(type==='image/png'&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20);}
  if(type==='image/webp'&&bytes.length>=30){const chunk=new TextDecoder().decode(bytes.slice(12,16));
    if(chunk==='VP8 '){width=view.getUint16(26,true)&0x3fff;height=view.getUint16(28,true)&0x3fff;}
    if(chunk==='VP8L'){width=1+((bytes[21]|bytes[22]<<8)&0x3fff);height=1+((bytes[22]>>6|bytes[23]<<2|bytes[24]<<10)&0x3fff);}
    if(chunk==='VP8X'&&!(bytes[20]&2)){width=1+(bytes[24]|bytes[25]<<8|bytes[26]<<16);height=1+(bytes[27]|bytes[28]<<8|bytes[29]<<16);}
  }
  if(type==='image/jpeg')for(let offset=2;offset+8<bytes.length;){if(bytes[offset]!==255)break;const marker=bytes[offset+1],length=view.getUint16(offset+2);if([192,193,194].includes(marker)){height=view.getUint16(offset+5);width=view.getUint16(offset+7);break;}if(length<2)break;offset+=length+2;}
  if(!width||!height||width>2048||height>2048)throw Error('가로·세로 2048픽셀 이하의 정지 사진만 저장할 수 있습니다. 편집기에서 사진을 다시 올려 주세요.');
  return value;
};
const https=value=>{if(!value)return '';try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password&&value.length<=2048)return url.href;}catch{}throw Error('주문·지도 링크는 https 주소를 확인해 주세요.');};
const TYPES=['rack','glass','ledge','counter','board','window','plant','clothesrack','mannequin','mirror','pegboard','bin','table','chair','stool','coffeebar','pastrycase','menuboard','producecrate','basket','refrigerator','freezer','meatcase','breadbasket','wallrail','foldedtable','shoerack','jewelrycase','fittingroom','hatstand','salonchair','vanity','washbasin','naildesk','cosmeticrack','towelrack','workbench','toolbox','partsdrawer','ladder','gridwall','utilitycart','pendant','walllamp','frame','rug','partition','flowers'];
export function cleanScene(input){
  if(!input||typeof input!=='object'||input.sampleOnly===true||!Array.isArray(input.items)||input.items.length>40||!Array.isArray(input.decor)||input.decor.length>60)throw Error('내 상점 시안 형식을 확인해 주세요. 사진 40개·가구 60개까지 저장합니다.');
  const ids=new Set(),unique=value=>{const result=id(value);if(!result||ids.has(result))throw Error('상품·가구 번호가 중복되거나 올바르지 않습니다.');ids.add(result);return result;};
  const appearance=input.appearance||{},business=input.business||{};
  const decor=input.decor.map(d=>{if(!d||typeof d!=='object')throw Error('가구 형식을 확인해 주세요.');const width=number(d.width,10,90),height=number(d.height,5,65);return{id:unique(d.id),type:choices(d.type,TYPES,'rack'),text:text(d.text,80),color:color(d.color,'#87613e'),accent:color(d.accent,'#ead9ba'),finish:choices(d.finish,['plain','wood','metal','fabric'],'plain'),showLabel:d.showLabel!==false,width,height,x:number(d.x,0,100-width),y:number(d.y,18,98-height),locked:d.locked===true,hidden:d.hidden===true};});
  const items=input.items.map(i=>{if(!i||typeof i!=='object')throw Error('상품 형식을 확인해 주세요.');return{id:unique(i.id),name:text(i.name,50),description:text(i.description,300),src:image(i.src),x:number(i.x,0,100),y:number(i.y,20,98),size:number(i.size,8,45,18),rotation:number(i.rotation,-45,45,0),shadow:i.shadow===true,locked:i.locked===true,hidden:i.hidden===true,section:text(i.section,24),decorId:decor.some(d=>d.id===i.decorId)?i.decorId:'',catalogProductId:id(i.catalogProductId),productUrl:https(i.productUrl)};});
  const shopTitle=text(input.shopTitle,40).trim();if(!shopTitle)throw Error('간판 이름을 입력해 주세요.');
  return{shopTitle,preset:choices(input.preset,['cafe','modern','market','boutique','hardware','playful'],'cafe'),zones:number(input.zones,1,3,1),shelves:number(input.shelves,2,4,3),light:number(input.light,75,125,100),wall:color(input.wall,'#eadfce'),shelfColor:color(input.shelfColor,'#805735'),material:choices(input.material,['plain','wood','brick','tile'],'plain'),catalogStoreId:id(input.catalogStoreId),sampleOnly:false,items,decor,
    appearance:{signColor:color(appearance.signColor,'#f5ead6'),signBackground:color(appearance.signBackground,'#193d42'),floor:color(appearance.floor,'#c5ac88'),font:choices(appearance.font,['serif','sans','rounded'],'serif'),awning:appearance.awning===true,showShelves:appearance.showShelves!==false,showTags:appearance.showTags===true,zoneNames:[0,1,2].map(i=>text(appearance.zoneNames?.[i],24))},
    business:{intro:text(business.intro,300),address:text(business.address,200),hours:text(business.hours,200),phone:text(business.phone,40),mapUrl:https(business.mapUrl),orderUrl:https(business.orderUrl),delivery:text(business.delivery,300),realPhoto:image(business.realPhoto)}};
}
async function body(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw Error('JSON 형식으로 저장해 주세요.');
  if(Number(request.headers.get('content-length'))>LIMIT)throw Error('사진과 시안 합계는 4MB 이하로 줄여 주세요.');
  const reader=request.body?.getReader();if(!reader)throw Error('저장할 내용이 없습니다.');const chunks=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>LIMIT){await reader.cancel();throw Error('사진과 시안 합계는 4MB 이하로 줄여 주세요.');}chunks.push(part.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
async function ownerId(identity){const bytes=new TextEncoder().encode('matjido-studio-owner-v1:'+identity);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
function publicScene(scene){return{...scene,items:scene.items.filter(i=>!i.hidden).map(({locked,hidden,...item})=>item),decor:scene.decor.filter(d=>!d.hidden).map(({locked,hidden,...item})=>item)};}
export async function handleStoreStudio(request,bucket,identity){
  const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/store-studio/'))return null;
  const publicMatch=/^\/api\/store-studio\/public\/([a-f0-9]{64})$/.exec(path);
  if(publicMatch){
    if(request.method!=='GET')return json({error:'조회만 가능합니다.'},405);
    if(!bucket)return json({error:'저장소 연결을 확인해 주세요.'},503);
    const record=await bucket.get(PREFIX+publicMatch[1]+'.json'),value=record?await record.json():null;
    const response=value?.published?json({scene:publicScene(value.published),publishedAt:value.publishedAt}):json({error:'아직 공개되지 않았거나 공개를 중단한 상점입니다.'},404);
    response.headers.set('Access-Control-Allow-Origin','*');return response;
  }
  if(!['/api/store-studio/draft','/api/store-studio/publication'].includes(path))return json({error:'주소를 확인해 주세요.'},404);
  if(!identity||typeof identity!=='string'||identity.length>300)return json({error:'로그인한 사장님만 저장·공개할 수 있습니다.'},401);
  if(!bucket)return json({error:'저장소 연결을 확인해 주세요.'},503);
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return json({error:'로그인한 상점 편집 화면에서만 저장할 수 있습니다.'},403);
  const publicId=await ownerId(identity),key=PREFIX+publicId+'.json';
  try{
    const record=await bucket.get(key),value=record?await record.json():{draft:null,published:null};
    if(path.endsWith('/draft')&&request.method==='GET')return json({draft:value.draft,etag:record?.etag||null,publicId,published:!!value.published,savedAt:value.savedAt||null,publishedAt:value.publishedAt||null});
    if(!(path.endsWith('/draft')&&request.method==='PUT')&&!(path.endsWith('/publication')&&request.method==='POST'))return json({error:'허용되지 않은 요청입니다.'},405);
    const input=await body(request),expected=input.etag;
    if(expected!==null&&(typeof expected!=='string'||!expected||expected.length>100))return json({error:'저장 버전을 먼저 확인해 주세요.'},428);
    if(expected!==(record?.etag||null))return json({error:'다른 기기에서 변경했거나 이전 저장 결과를 확인해야 합니다. 서버 내용을 불러와 확인해 주세요.'},409);
    const now=new Date().toISOString();let next;
    if(path.endsWith('/draft'))next={...value,draft:cleanScene(input.scene),savedAt:now};
    else{
      if(!['publish','unpublish'].includes(input.action))throw Error('공개 또는 공개 중단을 선택해 주세요.');
      if(!value.draft)throw Error('먼저 서버에 비공개 저장해 주세요.');
      next={...value,published:input.action==='publish'?cleanScene(value.draft):null,publishedAt:input.action==='publish'?now:null};
    }
    const saved=await bucket.put(key,JSON.stringify(next),{onlyIf:expected===null?{etagDoesNotMatch:'*'}:{etagMatches:expected},httpMetadata:{contentType:'application/json'}});
    if(!saved)return json({error:'다른 저장이 먼저 처리되었습니다. 서버 내용을 다시 확인해 주세요.'},409);
    return json({etag:saved.etag,publicId,published:!!next.published,savedAt:next.savedAt,publishedAt:next.publishedAt});
  }catch(error){return json({error:error instanceof SyntaxError?'저장 형식을 확인해 주세요.':error.message||'저장하지 못했습니다.'},400);}
}
