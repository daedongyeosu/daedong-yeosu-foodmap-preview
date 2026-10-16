(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioFurnitureArt=api;})(globalThis,function(){
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  // Native vector parts: no stock images, AI calls, external fonts or network assets.
  function draw(doc,item,key){
    const make=(tag,attrs,parent)=>{const node=doc.createElementNS(NS,tag);for(const [name,value] of Object.entries(attrs))node.setAttribute(name,String(value));if(parent)parent.append(node);return node;};
    const svg=make('svg',{viewBox:'0 0 100 100',preserveAspectRatio:'none','aria-hidden':'true',focusable:'false',class:'furniture-art'}),defs=make('defs',{},svg),patternId='surface-'+key.replace(/[^a-z0-9-]/gi,'');
    const main=item.color,accent=item.accent||'#ead9ba',ink='#263c3c',glass='#dcf0ee',white='#fffcf1';
    const pattern=make('pattern',{id:patternId,width:12,height:12,patternUnits:'userSpaceOnUse'},defs);make('rect',{width:12,height:12,fill:main},pattern);
    const finish=item.finish||'plain';
    if(finish==='wood')make('path',{d:'M0 2 Q6 5 12 2 M0 9 Q6 6 12 9',stroke:'#2c2118','stroke-opacity':.25,'stroke-width':1,fill:'none'},pattern);
    if(finish==='metal')make('path',{d:'M-3 12L12-3M3 15L15 3',stroke:'#fff','stroke-opacity':.3,'stroke-width':2},pattern);
    if(finish==='fabric')make('path',{d:'M0 3H12M0 9H12M3 0V12M9 0V12',stroke:'#fff','stroke-opacity':.18,'stroke-width':1},pattern);
    const material='url(#'+patternId+')';
    const r=(x,y,w,h,fill=material,rx=2)=>make('rect',{x,y,width:w,height:h,rx,fill,stroke:ink,'stroke-width':1.4},svg);
    const e=(cx,cy,rx,ry,fill=material)=>make('ellipse',{cx,cy,rx,ry,fill,stroke:ink,'stroke-width':1.4},svg);
    const p=(d,fill=material)=>make('path',{d,fill,stroke:ink,'stroke-width':1.5,'stroke-linejoin':'round'},svg);
    const l=(x1,y1,x2,y2,stroke=ink,width=2)=>make('line',{x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-linecap':'round'},svg);
    const legs=(left=14,right=86,top=50,bottom=94)=>{r(left,top,5,bottom-top,accent);r(right-5,top,5,bottom-top,accent);};
    const caseBody=()=>{r(5,8,90,85);r(10,13,80,60,glass);r(7,76,86,15,accent);};
    const shelves=(count=3)=>{for(let i=1;i<=count;i++)r(9,12+i*65/(count+1),82,3,accent,0);};
    const wheels=()=>{e(22,91,6,5,ink);e(78,91,6,5,ink);};
    const drawers=(rows,columns)=>{for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const w=80/columns,h=69/rows;r(10+col*w,13+row*h,w-2,h-2,row%2?accent:material);l(13+col*w+w*.3,13+row*h+h*.45,13+col*w+w*.6,13+row*h+h*.45);}};
    if(item.cabinet){
      const c=item.cabinet,rows=Math.max(1,Math.min(6,Math.round(c.rows))),columns=Math.max(1,Math.min(6,Math.round(c.columns)));
      if(c.back)r(5,3,90,90);else{r(5,3,5,90);r(90,3,5,90);r(5,3,90,5);}
      r(4,91,92,5,accent);const w=80/columns,h=78/rows;
      for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
        const x=10+column*w,y=9+row*h;
        const cell=make('g',{'data-cabinet-cell':row+'-'+column},svg);
        if(c.doors!=='none'){const pane=r(x+1,y+1,w-2,h-2,c.doors==='glass'?glass:material);if(c.doors==='glass')pane.setAttribute('fill-opacity','.55');cell.append(pane);}
        l(x,y+h,x+w,y+h,accent,2);if(column)l(x,y,x,y+h,accent,2);
        if(c.doors!=='none'&&c.handle!=='none'){const handle=c.handle==='knob'?e(x+w-4,y+h/2,1.4,1.4,accent):r(x+w-5,y+h*.35,1.8,h*.3,accent,1);handle.setAttribute('data-cabinet-handle',c.handle);cell.append(handle);}
      }
      return svg;
    }
    switch(item.type){
      case 'table':r(44,40,12,45,accent);e(50,91,27,6,accent);e(50,30,46,22);e(50,27,43,18);break;
      case 'chair':r(15,5,70,45,material,12);legs(20,80,50);r(10,49,80,13,accent,5);l(22,14,22,40,accent,3);l(78,14,78,40,accent,3);break;
      case 'stool':legs(22,78,24);l(24,68,76,68,accent,5);e(50,22,43,17);break;
      case 'coffeebar':r(4,39,92,54);r(1,35,98,8,accent);r(10,8,27,26,'#657473');r(13,13,21,8,ink);r(18,29,10,5,white);r(51,13,18,18,accent);r(73,9,14,23,glass);l(51,48,51,89,accent);break;
      case 'pastrycase':p('M6 30L29 6H91V68H6Z',glass);p('M6 30H68L91 6', 'none');r(4,68,92,25);l(7,48,91,48,accent,3);break;
      case 'menuboard':p('M18 98L28 3H80L91 98H81L74 12H36L28 98Z',accent);r(26,12,51,69,main);for(const y of [26,38,50,62])l(35,y,67,y,white,2);break;
      case 'producecrate':p('M5 24L19 7H88L96 24V90H5Z');for(const y of [35,56,77])r(6,y,88,11,accent);l(19,8,19,88);l(84,8,84,88);break;
      case 'basket':p('M9 35H91L82 91H18Z');p('M24 34Q20 2 50 4Q80 2 77 34','none');for(const x of [30,50,70])l(x,42,x,85,accent,3);l(16,61,86,61,accent,3);break;
      case 'refrigerator':r(9,3,82,94);r(17,11,66,70,glass);shelves(3);l(74,32,74,56,accent,4);r(16,86,68,5,accent);break;
      case 'freezer':r(4,20,92,73);p('M4 20L17 5H90L96 20Z',glass);r(13,26,74,12,accent);r(22,8,53,8,glass);l(61,42,81,42,ink,3);break;
      case 'meatcase':p('M5 8H83L96 44V65H5Z',glass);r(4,65,92,30);r(8,47,82,6,accent);l(32,8,32,62,accent);l(61,8,61,62,accent);break;
      case 'breadbasket':p('M15 45H85L78 94H22Z');p('M15 45L22 28H78L85 45Z',accent);for(const x of [29,46,63]){r(x,6+(x%3)*4,11,56,accent,6);l(x+3,20,x+8,25,white);l(x+3,32,x+8,37,white);}l(21,65,81,65,accent,3);break;
      case 'wallrail':l(8,12,92,12,accent,6);l(8,12,8,92,accent,4);l(92,12,92,92,accent,4);for(const x of [23,47,71]){p(`M${x} 23q0-8 6-8q6 0 2 8l-13 12h26Z`,'none');r(x-8,37,26,38,material,3);}break;
      case 'foldedtable':legs(10,90,38);r(3,30,94,10,accent);for(const [x,y] of [[10,9],[39,14],[68,5]]){r(x,y,22,16);l(x+3,y+6,x+19,y+6,white);}break;
      case 'shoerack':r(5,4,90,92);for(const y of [27,53,79]){r(10,y,80,4,accent);for(const x of [16,54])p(`M${x} ${y-7}h25v-7h-8l-4-6h-9Z`,accent);}break;
      case 'jewelrycase':caseBody();r(14,22,72,45,white);for(const x of [28,51,74]){e(x,40,7,9,accent);e(x,40,4,6,white);}break;
      case 'fittingroom':r(3,3,94,94,accent);r(10,12,80,83);for(const x of [16,30,44,58,72,86])l(x,13,x,92,white,2);r(0,3,100,8,accent);break;
      case 'hatstand':r(46,10,8,79,accent);e(50,92,31,5,accent);for(const [x,y] of [[25,30],[73,49],[24,66]]){l(50,y+6,x,y,accent,4);e(x,y,20,5);r(x-9,y-14,18,13,material,6);}break;
      case 'salonchair':r(16,5,68,43,material,10);r(45,60,10,25,accent);e(50,91,35,6,accent);r(10,48,80,18,material,7);l(8,38,8,56,accent,5);l(92,38,92,56,accent,5);break;
      case 'vanity':r(15,2,70,60,accent,12);r(24,9,52,44,glass,8);for(const y of [13,28,43]){e(19,y,2,2,white);e(81,y,2,2,white);}legs(13,87,68);r(7,63,86,13);r(37,78,26,17,accent);break;
      case 'washbasin':r(21,40,58,54);e(50,29,46,23,accent);e(50,28,33,15,ink);p('M55 14V3H73V13','none');e(50,31,9,4,glass);break;
      case 'naildesk':legs(7,93,39);r(2,30,96,13,accent);r(69,46,23,40);r(21,13,30,16,white,9);l(78,29,78,5,ink,3);p('M66 10Q78-3 90 10Z',accent);break;
      case 'cosmeticrack':caseBody();shelves(3);for(const y of [26,43,59])for(const x of [20,39,58,77]){r(x,y-11,9,12,accent);r(x+2,y-15,5,4,ink);}break;
      case 'towelrack':r(6,4,88,92);for(const y of [20,44,68]){r(12,y+13,76,4,accent);for(const x of [22,49,75]){e(x,y,11,9,white);e(x,y,5,4,accent);}}break;
      case 'workbench':legs(8,92,41);r(2,31,96,12,accent);r(12,50,42,32);l(22,65,44,65,accent,3);r(62,12,27,18,ink);r(68,3,8,16,accent);l(62,21,49,21,accent,3);break;
      case 'toolbox':r(8,7,84,78);drawers(4,1);wheels();break;
      case 'partsdrawer':r(5,6,90,88);drawers(4,4);break;
      case 'ladder':p('M7 96L30 3H39L17 96Z');p('M61 3H70L93 96H83Z');for(const y of [26,47,68,89])r(32-y*.19,y,36+y*.38,5,accent);break;
      case 'gridwall':r(4,4,92,92,accent);for(let x=12;x<93;x+=10)l(x,6,x,94,main,1.6);for(let y=12;y<93;y+=10)l(6,y,94,y,main,1.6);for(const x of [28,68])p(`M${x} 27v10h9v9`,'none');break;
      case 'utilitycart':r(10,34,80,9,accent);r(10,70,80,9);l(12,20,12,84,main,5);l(88,6,88,84,main,5);l(88,6,65,6,main,5);wheels();break;
      case 'pendant':l(50,0,50,28,ink,3);p('M42 28H58L93 69H7Z');e(50,70,43,9,accent);e(50,73,9,5,white);break;
      case 'walllamp':r(5,17,15,47,accent);l(18,39,50,39,accent,6);p('M46 9H69L94 62H25Z');e(60,64,34,7,accent);break;
      case 'frame':r(4,3,92,94);r(13,12,74,76,white);p('M16 74L38 40L58 62L71 43L85 74Z',accent);e(67,29,8,7,material);break;
      case 'rug':r(3,9,94,81,material,12);r(11,19,78,61,accent,9);r(19,28,62,43,material,6);for(const x of [10,25,40,55,70,85]){l(x,1,x,9,accent);l(x,90,x,99,accent);}break;
      case 'partition':for(const x of [3,35,67]){r(x,3,29,94);r(x+4,10,21,76,accent);for(const y of [25,45,65])l(x+5,y,x+24,y,main,3);}break;
      case 'flowers':p('M34 54H66L75 90Q50 99 25 90Z');for(const [x,y] of [[22,23],[50,10],[78,28],[40,36]]){l(50,67,x,y,main,3);for(const [dx,dy] of [[-7,0],[7,0],[0,-7],[0,7]])e(x+dx,y+dy,7,7,accent);e(x,y,4,4,white);}break;
      default:return null;
    }
    return svg;
  }
  return Object.freeze({draw});
});
