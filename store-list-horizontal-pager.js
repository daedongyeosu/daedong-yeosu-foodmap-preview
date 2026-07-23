'use strict';

const STORE_LIST_PAGER_NEXT_LABEL='다음 가게 보기 →';
const STORE_LIST_PAGER_PREV_LABEL='← 이전 가게';
let storeListPagerPage=0;
let storeListPagerContext='';
let storeListPagerFrame=0;
let storeListPagerScrollFrame=0;
let storeListPagerProgrammatic=false;
let storeListPagerObserver=null;

function storeListPagerElements(){
  return {
    controls:document.getElementById('storePagerControls'),
    grid:document.getElementById('storeGrid'),
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
  const {controls,grid,prev,next}=storeListPagerElements();
  if(!controls||!grid||!prev||!next)return;
  if(!storeListPagerEligible(grid)){
    storeListPagerPage=0;
    storeListPagerContext='';
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
  const {maxPage}=storeListPagerMetrics(grid);
  storeListPagerPage=Math.max(0,Math.min(storeListPagerPage,maxPage));
  prev.textContent=STORE_LIST_PAGER_PREV_LABEL;
  next.textContent=STORE_LIST_PAGER_NEXT_LABEL;
  prev.hidden=storeListPagerPage===0;
  next.hidden=storeListPagerPage>=maxPage;
  controls.hidden=maxPage===0;
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
function scrollStoreListPagerTo(page){
  const {grid}=storeListPagerElements();
  if(!storeListPagerEligible(grid))return;
  const {cards,pageSize,maxPage}=storeListPagerMetrics(grid);
  const nextPage=Math.max(0,Math.min(page,maxPage));
  const target=cards[Math.min(cards.length-1,nextPage*pageSize)];
  if(!target)return;
  const left=Math.max(0,target.offsetLeft-cards[0].offsetLeft);
  storeListPagerPage=nextPage;
  storeListPagerProgrammatic=true;
  applyStoreListPager();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  grid.scrollTo({left,behavior:reduced?'auto':'smooth'});
  window.setTimeout(()=>{storeListPagerProgrammatic=false;readStoreListPagerScroll()},460);
}
function moveStoreListPager(direction){
  const {grid}=storeListPagerElements();
  if(!storeListPagerEligible(grid))return false;
  const {cards,total,pageSize,maxPage}=storeListPagerMetrics(grid);
  const targetPage=Math.max(0,Math.min(storeListPagerPage+(direction==='prev'?-1:1),maxPage));
  if(targetPage===storeListPagerPage)return true;
  const targetIndex=targetPage*pageSize;
  if(targetIndex>=cards.length&&cards.length<total){
    state.visibleCount=Math.min(total,Math.max(Number(state.visibleCount||0)+40,targetIndex+pageSize));
    renderStores();
    requestAnimationFrame(()=>requestAnimationFrame(()=>scrollStoreListPagerTo(targetPage)));
  }else scrollStoreListPagerTo(targetPage);
  return true;
}
function initializeStoreListPager(){
  const {grid}=storeListPagerElements();
  if(!grid||grid.dataset.storePagerReady==='1'){scheduleStoreListPager();return}
  grid.dataset.storePagerReady='1';
  grid.addEventListener('scroll',scheduleStoreListPagerScrollRead,{passive:true});
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
