(()=>{'use strict';const root=document.getElementById('shopFronts');
  for(const store of window.ShopStudioExamples.all){
    const article=document.createElement('article');article.id=`shop-${store.id}`;article.className=`shop shop-${store.id}`;article.style.setProperty('--accent',store.accent);
    const door=document.createElement('a');door.className='shop-door';door.href=`../store-studio/index.html?example=${store.id}&view=customer`;door.setAttribute('aria-label',`${store.name} 시범매장 구경하기`);
    const label=document.createElement('small');label.className='sample-label';label.textContent=`${store.category} · 견본`;
    const name=document.createElement('h3');name.textContent=store.name;const awning=document.createElement('div');awning.className='awning';awning.setAttribute('aria-hidden','true');
    const window=document.createElement('div');window.className='shop-window';for(const product of store.products.slice(0,2)){const img=document.createElement('img');img.src=store.id==='bakery'?`../assets/studio-bakery/${product.sku}.webp`:`../assets/studio-alley/${product.sku}.webp`;img.alt='';img.loading='lazy';window.append(img);}
    const invitation=document.createElement('strong');invitation.className='enter';invitation.textContent='가게 안 구경하기 →';door.append(label,name,awning,window,invitation);
    const tagline=document.createElement('p');tagline.textContent=store.tagline;const start=document.createElement('a');start.className='start';start.href=`../store-studio/index.html?template=${store.id}`;start.textContent='이 분위기로 내 상점 시작하기';start.setAttribute('aria-label',`${store.name} 분위기로 내 상점 시작하기`);article.append(door,tagline,start);root.append(article);
  }
  const anchor=window.ShopStudioExamples.all.find(store=>location.hash===`#shop-${store.id}`);if(anchor)document.getElementById(`shop-${anchor.id}`).scrollIntoView({block:'center'});
})();
