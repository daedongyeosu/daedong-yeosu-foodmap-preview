'use strict';

const STORE_LIST_PAGER_NEXT_LABEL='다음 가게 보기 →';
const STORE_LIST_PAGER_PREV_LABEL='← 이전 가게';
let storeListPagerPage=0;
let storeListPagerContext='';
let storeListPagerFrame=0;
let storeListPagerScrollFrame=0;
let storeListPagerProgrammatic=false;
let storeListPagerObserver=null;
let storeListPagerCustomerInteracted=false;

function markStoreListPagerCustomerInteraction(){
  storeListPagerCustomerInteracted=true;
}
function hasStoreListPagerCustomerInteraction(){
  return storeListPagerCustomerInteracted||globalThis.daedongEarlyHomeInteraction===true;
}
window.daedongHasHomeInteraction=hasStoreListPagerCustomerInteraction;

function storeListPagerElements(){
  return {
    controls:document.getElementById('storePagerControls'),
    grid:document.getElementById('storeGrid'),
    status:document.getElementById('storePagerStatus'),
    prev:document.getElementById('storePrevBtn'),
    next:document.getElementById('loadMoreBtn')
  };
}
function storeListPagerEligible(grid){
  return Boolean(grid&&grid.classList.contains('store-grid')&&state.category==='전체'&&!state.query&&!state.brandId);
}
function storeListPagerContextKey(){
  return [state.category,state.query,state.brandId,state.location,state.sortByDistance?'distance':'area'].join('\u0000');
}
function storeListPagerMetrics(grid){
  const cards=Array.from(grid?.children||[]).filter(node=>node.classList?.contains('store-card'));
  const total=storeListPagerEligible(grid)?filteredStores().length:cards.length;
  if(!cards.length)return{cards,total,pageSize:1,maxPage:0};
  const firstLeft=cards[0].offsetLeft;
  const viewportEnd=firstLeft+Math.max(1,grid.clientWidth)-1;
  const pageSize=Math.max(1,cards.filter(card=>card.offsetLeft<viewportEnd).length);
  return{cards,total,pageSize,maxPage:Math.max(0,Math.ceil(total/pageSize)-1)};
}
function applyStoreListPager(){
  const {controls,grid,status,prev,next}=storeListPagerElements();
  if(!controls||!grid||!status||!prev||!next)return;
  if(!storeListPagerEligible(grid)){
    storeListPagerPage=0;
    storeListPagerContext='';
    status.textContent='';
    grid.classList.remove('store-pager-swipe-enabled');
    prev.hidden=true;
    controls.classList.remove('both-directions');
    controls.hidden=next.hidden;
    return;
  }
  const context=storeListPagerContextKey();
  if(context!==storeListPagerContext){
    storeListPagerContext=context;
    storeListPagerPage=0;
    grid.scrollLeft=0;
  }
  const {total,pageSize,maxPage}=storeListPagerMetrics(grid);
  storeListPagerPage=Math.max(0,Math.min(storeListPagerPage,maxPage));
  const rangeStart=storeListPagerPage*pageSize+1;
  const rangeEnd=Math.min(total,rangeStart+pageSize-1);
  status.textContent=`가게 ${rangeStart}–${rangeEnd} / 전체 ${total}곳`;
  prev.textContent=STORE_LIST_PAGER_PREV_LABEL;
  next.textContent=STORE_LIST_PAGER_NEXT_LABEL;
  prev.hidden=storeListPagerPage===0;
  next.hidden=storeListPagerPage>=maxPage;
  grid.classList.add('store-pager-swipe-enabled');
  controls.hidden=true;
  controls.classList.toggle('both-directions',!prev.hidden&&!next.hidden);
}
function scheduleStoreListPager(){
  if(storeListPagerFrame)cancelAnimationFrame(storeListPagerFrame);
  storeListPagerFrame=requestAnimationFrame(()=>{storeListPagerFrame=0;applyStoreListPager()});
}
function readStoreListPagerScroll(){
  if(storeListPagerProgrammatic)return;
  const {grid}=storeListPagerElements();
  if(!storeListPagerEligible(grid))return;
  const {cards,pageSize,maxPage}=storeListPagerMetrics(grid);
  if(!cards.length)return;
  const firstLeft=cards[0].offsetLeft;
  const targetLeft=grid.scrollLeft+firstLeft;
  let nearestIndex=0;
  let nearestDistance=Infinity;
  cards.forEach((card,index)=>{
    const distance=Math.abs(card.offsetLeft-targetLeft);
    if(distance<nearestDistance){nearestDistance=distance;nearestIndex=index}
  });
  storeListPagerPage=Math.max(0,Math.min(Math.round(nearestIndex/pageSize),maxPage));
  applyStoreListPager();
}
function scheduleStoreListPagerScrollRead(){
  if(storeListPagerScrollFrame)cancelAnimationFrame(storeListPagerScrollFrame);
  storeListPagerScrollFrame=requestAnimationFrame(()=>{storeListPagerScrollFrame=0;readStoreListPagerScroll()});
}
function revealStoreListPagerResults(grid){
  const top=Math.max(0,window.scrollY+grid.getBoundingClientRect().top-12);
  if(typeof scrollWindowInstant==='function')scrollWindowInstant(top);
  else window.scrollTo(0,top);
}
function scrollStoreListPagerTo(page,{reveal=false}={}){
  const {grid}=storeListPagerElements();
  if(!storeListPagerEligible(grid))return;
  const {cards,pageSize,maxPage}=storeListPagerMetrics(grid);
  const nextPage=Math.max(0,Math.min(page,maxPage));
  const target=cards[Math.min(cards.length-1,nextPage*pageSize)];
  if(!target)return;
  const left=Math.max(0,target.offsetLeft-cards[0].offsetLeft);
  storeListPagerPage=nextPage;
  storeListPagerProgrammatic=true;
  grid.scrollLeft=left;
  applyStoreListPager();
  if(reveal)revealStoreListPagerResults(grid);
  requestAnimationFrame(()=>{
    storeListPagerProgrammatic=false;
    readStoreListPagerScroll();
  });
}
function captureStoreListPagerState(){
  const {grid}=storeListPagerElements();
  return {
    page:storeListPagerPage,
    context:storeListPagerContext,
    scrollLeft:grid?.scrollLeft||0,
    visibleCount:Number(state.visibleCount||0)
  };
}
function restoreStoreListPagerState(snapshot){
  const {grid}=storeListPagerElements();
  if(!grid||!snapshot||!storeListPagerEligible(grid))return false;
  state.visibleCount=Math.max(Number(state.visibleCount||0),Number(snapshot.visibleCount||0));
  storeListPagerContext=storeListPagerContextKey();
  const {maxPage}=storeListPagerMetrics(grid);
  storeListPagerPage=Math.max(0,Math.min(Number(snapshot.page||0),maxPage));
  grid.scrollLeft=Math.max(0,Number(snapshot.scrollLeft||0));
  applyStoreListPager();
  return true;
}
window.daedongCaptureStorePagerState=captureStoreListPagerState;
window.daedongRestoreStorePagerState=restoreStoreListPagerState;
function moveStoreListPager(direction,{reveal=true,fromPage=storeListPagerPage}={}){
  const {grid}=storeListPagerElements();
  if(!storeListPagerEligible(grid))return false;
  const {cards,total,pageSize,maxPage}=storeListPagerMetrics(grid);
  const originPage=Math.max(0,Math.min(Number(fromPage||0),maxPage));
  const targetPage=Math.max(0,Math.min(originPage+(direction==='prev'?-1:1),maxPage));
  if(targetPage===originPage){
    scrollStoreListPagerTo(originPage,{reveal});
    return true;
  }
  const targetIndex=targetPage*pageSize;
  if(targetIndex>=cards.length&&cards.length<total){
    const previousVisibility=grid.style.visibility;
    grid.style.visibility='hidden';
    state.visibleCount=Math.min(total,Math.max(Number(state.visibleCount||0)+Math.max(4,pageSize*2),targetIndex+pageSize));
    renderStores();
    scrollStoreListPagerTo(targetPage,{reveal});
    grid.style.visibility=previousVisibility;
  }else scrollStoreListPagerTo(targetPage,{reveal});
  return true;
}
function handleStoreListPagerKeydown(event){
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  if(!storeListPagerEligible(storeListPagerElements().grid))return;
  event.preventDefault();
  moveStoreListPager(event.key==='ArrowLeft'?'prev':'next',{reveal:false});
}
function initializeStoreListPager(){
  const {grid}=storeListPagerElements();
  if(!grid||grid.dataset.storePagerReady==='1'){scheduleStoreListPager();return}
  grid.dataset.storePagerReady='1';
  grid.tabIndex=0;
  grid.setAttribute('aria-label','가게 목록. 좌우로 자유롭게 밀어 가게를 볼 수 있습니다.');
  document.addEventListener('pointerdown',markStoreListPagerCustomerInteraction,{capture:true,passive:true});
  document.addEventListener('touchstart',markStoreListPagerCustomerInteraction,{capture:true,passive:true});
  document.addEventListener('wheel',markStoreListPagerCustomerInteraction,{capture:true,passive:true});
  document.addEventListener('keydown',markStoreListPagerCustomerInteraction,true);
  grid.addEventListener('scroll',scheduleStoreListPagerScrollRead,{passive:true});
  grid.addEventListener('keydown',handleStoreListPagerKeydown);
  storeListPagerObserver=new MutationObserver(scheduleStoreListPager);
  storeListPagerObserver.observe(grid,{childList:true});
  window.addEventListener('resize',scheduleStoreListPager,{passive:true});
  document.addEventListener('click',event=>{
    const control=event.target.closest('[data-store-page-direction]');
    if(control&&moveStoreListPager(control.dataset.storePageDirection)){
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  },true);
  scheduleStoreListPager();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeStoreListPager,{once:true});
else initializeStoreListPager();
