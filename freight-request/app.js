const form=document.querySelector('#freightForm');
form.addEventListener('submit',event=>{
  event.preventDefault();const data=new FormData(form);const pickup=String(data.get('pickup')).trim();const dropoff=String(data.get('dropoff')).trim();
  const areaOf=value=>{const matches=value.match(/[가-힣0-9]+(?:동|읍|면|리)(?=\s|$)/g);return matches?.at(-1)||value.slice(0,12);};
  const pickupArea=areaOf(pickup);const dropoffArea=areaOf(dropoff);
  const feature=String(data.get('feature')||'');
  const order=window.MatjidoFreightStore.createRequest({route:`${pickupArea} → ${dropoffArea}`,pickupArea,dropoffArea,pickup,dropoff,item:String(data.get('item')).trim(),weight:Number(data.get('weight')),required:feature?[feature]:[],contact:String(data.get('contact')).trim(),requestedAt:String(data.get('requestedAt')||''),note:String(data.get('note')||'').trim()});
  document.querySelector('#requestId').textContent=`요청번호 ${order.id}`;document.querySelector('#result').hidden=false;document.querySelector('#result').scrollIntoView({behavior:'smooth',block:'center'});form.querySelector('button[type="submit"]').disabled=true;
});
