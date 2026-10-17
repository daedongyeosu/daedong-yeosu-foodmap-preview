// Device-local product photos. Never sent with catalog/price/order payloads.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoProductPhotos=api;})(globalThis,function(){
  'use strict';
  const id=value=>typeof value==='string'&&/^[a-z0-9_-]{1,80}$/i.test(value)&&!['__proto__','constructor','prototype'].includes(value);
  const valid=value=>typeof value==='string'&&value.length<=1000000&&/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value);
  function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('matjido-product-photos-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('photos');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('사진 보관함을 열지 못했습니다.'));r.onblocked=()=>reject(Error('다른 창의 사진 작업을 마친 뒤 다시 시도해 주세요.'));});}
  async function list(storeId){
    if(!id(storeId))throw Error('사진을 보관할 상점을 확인해 주세요.');const db=await open();
    try{return await new Promise((resolve,reject)=>{const result={},r=db.transaction('photos').objectStore('photos').openCursor(IDBKeyRange.bound([storeId,''],[storeId,'\uffff']));r.onsuccess=()=>{const cursor=r.result;if(!cursor){resolve(result);return;}if(id(cursor.key[1])&&valid(cursor.value))result[cursor.key[1]]=cursor.value;cursor.continue();};r.onerror=()=>reject(Error('보관한 사진을 읽지 못했습니다.'));});}finally{db.close();}
  }
  async function put(storeId,productId,src){
    if(!id(storeId)||!id(productId)||!valid(src))throw Error('상품사진과 상점번호를 확인해 주세요.');const db=await open();
    try{await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(src,[storeId,productId]);tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(Error('사진을 보관하지 못했습니다. 저장 공간을 확인하고 다시 적용해 주세요.'));});}finally{db.close();}
  }
  async function fromFile(file){
    if(!file?.type.startsWith('image/')||file.size>15*1024*1024)throw Error('15MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.');
    let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('사진을 읽지 못했습니다. JPG·PNG·WebP로 저장한 사진을 선택해 주세요.');}
    try{const ratio=Math.min(1,640/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const src=canvas.toDataURL('image/webp',.85);if(!valid(src))throw Error('사진이 너무 큽니다. 더 작은 사진을 선택해 주세요.');return src;}finally{bitmap.close();}
  }
  return Object.freeze({valid,list,put,fromFile});
});
