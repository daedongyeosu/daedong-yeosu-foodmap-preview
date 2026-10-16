(() => {
  'use strict';
  const $=id=>document.getElementById(id),HOST='https://daedong-yeosu-admin.sisakim.chatgpt.site';
  const local=['127.0.0.1','localhost'].includes(location.hostname),sameHost=location.origin===HOST||local;
  let hooks,etag,publicId='',published=false,busy=false;
  function status(message){$('cloudStatus').textContent=message;}
  function buttons(){for(const id of ['cloudConnect','cloudLoad','cloudSave','cloudPublish','cloudUnpublish'])$(id).disabled=busy||hooks?.blocked()||(!sameHost)||(['cloudLoad','cloudSave','cloudPublish','cloudUnpublish'].includes(id)&&etag===undefined)||(['cloudPublish','cloudUnpublish'].includes(id)&&!publicId);}
  async function request(path,options={}){
    let response;try{response=await fetch('/api/store-studio/'+path,{...options,credentials:'same-origin',cache:'no-store',headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...options.headers},signal:AbortSignal.timeout(20000)});}catch{throw Error('연결 결과를 확인하지 못했습니다. 자동으로 다시 저장하지 않습니다. 서버 상태 확인을 눌러 확인해 주세요.');}
    if(response.status===401){$('cloudSignIn').hidden=false;throw Error('먼저 로그인해 주세요. 로그인한 계정의 상점만 저장·수정할 수 있습니다.');}
    let result;try{result=await response.json();}catch{throw Error('서버 저장 기능이 아직 배포되지 않았거나 연결되지 않았습니다. 기기 시안은 유지합니다.');}
    if(!response.ok)throw Error(result.error||'서버 저장 기능을 아직 사용할 수 없습니다.');return result;
  }
  function accept(result){etag=result.etag;publicId=result.publicId;published=!!result.published;$('cloudPublicLink').href='index.html?published='+encodeURIComponent(publicId);$('cloudPublicLink').hidden=!published;$('cloudPublicationStatus').textContent=published?'고객 공개 중 · 비공개 저장만으로 공개 화면은 바뀌지 않습니다.':'비공개 · 고객에게 노출되지 않습니다.';}
  async function run(action){if(busy||hooks.blocked())return;busy=true;buttons();try{await action();}catch(error){status(error.message);}finally{busy=false;buttons();}}
  window.ShopStudioCloud={
    bind(value){hooks=value;$('cloudSettings').hidden=hooks.sample;
      $('cloudSignIn').href='/signin-with-chatgpt?returnTo='+encodeURIComponent('/store-studio/index.html');
      $('cloudHostedEditor').href=HOST+'/store-studio/index.html';$('cloudHostedEditor').hidden=sameHost;
      if(!sameHost)status('계정별 서버 저장은 로그인 가능한 상점 편집 화면에서 사용합니다. 이 기기의 시안은 파일로 보관해 가져갈 수 있습니다. 현재 서버 연결은 배포 전입니다.');
      $('cloudConnect').onclick=()=>run(async()=>{const value=await request('draft');accept(value);status(value.draft?'서버 저장 상태를 확인했습니다. 서버 시안 불러오기를 눌러 가져오거나, 현재 기기 시안을 따로 저장할 수 있습니다.':'아직 서버 시안이 없습니다. 현재 시안을 비공개 저장할 수 있습니다.');});
      $('cloudLoad').onclick=()=>run(async()=>{const value=await request('draft');if(!value.draft){accept(value);status('서버에 저장한 시안이 없습니다.');return;}if(!confirm('이 기기의 현재 시안을 서버 시안으로 바꿀까요? 필요하면 먼저 시안 파일로 보관하세요. 불러온 뒤 되돌리기도 가능합니다.'))return;hooks.restore(value.draft);accept(value);status('로그인한 계정의 서버 시안을 불러왔습니다.');});
      $('cloudSave').onclick=()=>run(async()=>{if(!confirm('현재 시안을 계정의 비공개 작업본으로 저장할까요? 고객 공개 화면은 바뀌지 않습니다.'))return;const scene=hooks.snapshot();const body=JSON.stringify({etag,scene});if(new TextEncoder().encode(body).length>4*1024*1024)throw Error('시안과 사진 합계를 4MB 이하로 줄여 주세요. 기기 시안은 그대로 유지합니다.');accept(await request('draft',{method:'PUT',body}));status('계정에 비공개 저장했습니다. 고객에게 보여주려면 공개를 따로 선택하세요.');});
      $('cloudPublish').onclick=()=>publication('publish');$('cloudUnpublish').onclick=()=>publication('unpublish');buttons();
    },
    refresh(){if(hooks)buttons();},
    async publicScene(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('공개 상점 주소를 확인해 주세요.');const base=sameHost?'':HOST;const response=await fetch(base+'/api/store-studio/public/'+id,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('아직 공개되지 않았거나 공개를 중단한 상점입니다.');return (await response.json()).scene;}
  };
  function publication(action){return run(async()=>{const message=action==='publish'?'마지막으로 서버에 저장한 시안을 누구나 볼 수 있게 공개할까요? 숨기지 않은 사진·주소·전화·주문 링크도 공개됩니다. 현재 기기에서만 수정한 내용은 포함되지 않습니다.':'고객 공개를 중단할까요? 비공개 작업본은 보관됩니다.';if(!confirm(message))return;accept(await request('publication',{method:'POST',body:JSON.stringify({etag,action})}));status(action==='publish'?'저장한 시안을 공개했습니다. 고객 화면 보기로 확인하세요.':'공개를 중단했습니다. 비공개 작업본은 남아 있습니다.');});}
})();
