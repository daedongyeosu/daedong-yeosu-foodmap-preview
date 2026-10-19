(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NeighborWorldArt=api;})(globalThis,function(){
  'use strict';
  // Original, local SVG artwork: no remote images or user-provided SVG markup.
  const rect=(x,y,w,h,c,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
  const circle=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const line=(x,y,a,b,c,w=1)=>`<path d="M${x} ${y}L${a} ${b}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
  const path=(d,c,stroke='none',w=1)=>`<path d="${d}" fill="${c}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const safe=(value,fallback)=>/^#[a-f\d]{6}$/i.test(value||'')?value:fallback;
  const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">${body}</svg>`;
  function background(id,s={}){
    const night=s.lighting==='night',sunset=s.lighting==='sunset',sky=night?'#293b5c':sunset?'#eec8a8':'#d8eaf0',green=s.season==='autumn'?'#bda26c':s.season==='winter'?'#c7d8d1':'#8ba987';
    let b='';
    const tree=(x,y,k=1)=>rect(x-1,y,2,19*k,'#826c55')+circle(x,y-4*k,8*k,green)+circle(x-4*k,y,5*k,green)+circle(x+5*k,y,6*k,green);
    if(id==='room'&&(!s.season||s.season==='none')&&(!s.lighting||s.lighting==='natural'))return '';
    b=id==='room'?rect(0,0,100,100,safe(s.wall,'#ece2cd')):rect(0,0,100,100,sky)+circle(81,17,6,night?'#f5e4b4':'#fff4d4');
    if(['beach','harbor'].includes(id)){b+=rect(0,40,100,60,'#7fb8bd')+path('M0 68Q28 60 50 70T100 67V100H0Z','#e9d7b2');for(let y=47;y<69;y+=8)b+=path(`M0 ${y}Q13 ${y-3} 27 ${y}T57 ${y}T100 ${y}`,'none','#e4f0e7',.7);if(id==='harbor'){b+=path('M58 44H94L87 51H66Z','#6e8290')+rect(72,28,1,17,'#697a7d')+path('M74 29L88 42H74Z','#f6ead1')+path('M0 75L100 65V100H0Z','#b99a74');for(let x=0;x<100;x+=15)b+=line(x,75,x+10,100,'#9a7d5d',.5);b+=line(0,71,100,62,'#826e56',2);for(let x=8;x<100;x+=23)b+=rect(x,60,2,20,'#826e56');}else{b+=path('M8 58Q2 30 15 18Q27 27 17 48Z','#537e68')+path('M13 25Q23 12 37 24Q26 30 13 25Z','#628c70')+path('M13 25Q5 12 0 23Q5 28 13 25Z','#628c70');}}
    else if(['forest','mountain','garden','greenhouse'].includes(id)){b+=path('M0 54L25 21L52 55L76 18L100 50V100H0Z','#9bb2a5')+path('M18 31L25 21L34 32L27 29Z','#ebeee3')+path('M0 66Q23 49 50 61T100 60V100H0Z',green);if(id==='mountain')b+=path('M14 64Q42 55 88 68L73 100H5Z','#92b9b8');else b+=path('M36 100L57 60H64L58 100Z','#d7c9a9');if(id==='forest'){for(const [x,y,k] of [[8,38,1.2],[27,49,.8],[91,42,1.3],[73,51,.7]])b+=tree(x,y,k);}if(id==='garden'||id==='greenhouse'){for(let x=7;x<100;x+=15)b+=tree(x,70,.35);for(let x=2;x<100;x+=9)b+=rect(x,74,1,17,'#f1ebd9')+path(`M${x} 74l.5-3 1 3Z`,'#f1ebd9');b+=rect(0,78,100,1,'#f1ebd9');}if(id==='greenhouse'){for(let x=0;x<=100;x+=20)b+=line(x,0,x,100,'#faf9e8',1.2);b+=line(0,35,100,35,'#faf9e8',1.2)+path('M0 20L50 0L100 20','none','#faf9e8',2);}}
    else if(id==='city'){b+=rect(0,43,100,57,'#b6b9b0');for(const [x,h,c] of [[0,30,'#ba9e8b'],[22,42,'#d1bd9e'],[47,33,'#90a2a0'],[76,45,'#aa9590']]){b+=rect(x,57-h,23,h,c);for(let y=64-h;y<53;y+=11)for(let a=x+4;a<x+20;a+=10)b+=rect(a,y,5,7,night?'#f4dda0':'#e6e7d9');}b+=path('M0 75L100 62V100H0Z','#c9c5b8')+line(0,90,100,74,'#b1ad9e');}
    else if(id==='studio'){b=rect(0,0,100,100,safe(s.wall,'#f2ede7'))+rect(0,72,100,28,'#d8d0c7');for(let x=6;x<100;x+=24)b+=line(x,0,x,72,'#ffffff',.4);b+=path('M50 0L100 0V77L58 70Z','#ffffff66')+rect(72,24,18,35,'#ffffff70',9);}
    else if(id==='playroom'){b=rect(0,0,100,100,'#f5e6c9')+rect(0,70,100,30,'#d8c9b0');for(let x=0;x<100;x+=20)b+=path(`M${x} 70V24a10 10 0 0120 0V70Z`,['#edb3b0','#b7cfc0','#e6c982','#a9c6db','#ccbad3'][x/20]);b+=circle(12,16,3,'#fff4d7')+circle(83,10,2,'#fff4d7');}
    else if(id==='stars'){b=rect(0,0,100,100,'#25364e')+circle(75,23,15,'#866c96')+path('M54 29Q74 14 94 18Q88 27 55 31Z','none','#cdb382',2);for(let i=0;i<35;i++)b+=circle((i*29+8)%100,(i*17+5)%90,i%3===0?.65:.3,'#f4e9c3');b+=path('M0 84Q38 70 100 83V100H0Z','#596680');}
    else if(id==='workshop'){b=rect(0,0,100,100,'#d6d0c0')+rect(0,72,100,28,'#bcae94');for(let y=4;y<71;y+=5)for(let x=3;x<100;x+=5)b+=circle(x,y,.35,'#9d998d');b+=rect(6,10,17,9,'#7e9187',1)+rect(75,11,19,8,'#d0ab70',1);}
    if(s.season==='spring')for(let i=0;i<19;i++)b+=path(`M${(i*23)%100} ${(i*17)%90}q-3-3 0-4q3 1 0 4Z`,'#f0b3bb');
    if(s.season==='summer'&&id!=='room')for(let i=0;i<10;i++)b+=path(`M${(i*31)%100} ${(i*19+7)%90}q4-4 5 0q-3 5-5 0Z`,'#8faa7180');
    if(s.season==='autumn')for(let i=0;i<17;i++)b+=path(`M${(i*31+4)%100} ${(i*19)%92}l2-3 2 3-2 2Z`,i%2?'#bc7954':'#d8ac66');
    if(s.season==='winter'){for(let i=0;i<40;i++)b+=circle((i*23+6)%100,(i*17+4)%97,i%2?.6:1,'#ffffff');b+=path('M0 97Q13 92 26 96T55 95T100 94V100H0Z','#f6f7f1');}
    if(s.lighting==='warm')b+=path('M0 0H100V35Q50 14 0 35Z','#f7d29333');
    if(sunset)b+=rect(0,0,100,100,'#dd9b7530');
    if(night&&id!=='stars')b+=rect(0,0,100,100,'#263b5d55');
    return svg(b);
  }
  function display(id,s={}){
    const wood=safe(s.wood,'#9b704b'),point=safe(s.accent,'#677d78');let b='';
    if(['classic','none'].includes(id))return '';
    const shelf=(y,c=wood)=>rect(3,y,94,2,c)+rect(4,y+2,92,1,'#00000018');
    if(id==='metal'){for(const x of [3,96])b+=rect(x,25,1,72,'#6a7d81');for(const y of [27,59,94])b+=shelf(y,'#a9b7b6');b+=line(4,28,96,94,'#879b9d',.5)+line(96,28,4,94,'#879b9d',.5);}
    if(id==='cubes'){b+=rect(2,26,96,70,wood,1)+rect(5,29,90,64,'#f2ead3');for(const x of [33,65])b+=rect(x,28,2,66,wood);b+=shelf(59);}
    if(id==='glass'){b+=rect(2,27,96,69,'#dcebec50',1);for(const x of [2,97])b+=rect(x,27,1,69,'#98afb0');for(const y of [29,59,94])b+=shelf(y,'#acc5c5');b+=line(50,29,50,94,'#b6c8c8',.5)+path('M5 30L20 30L5 47Z','#ffffff70');}
    if(id==='rail'){for(const x of [4,96])b+=rect(x,26,1,68,'#6e7575');for(const y of [29,64]){b+=rect(4,y,93,1.2,point);for(const x of [18,50,82])b+=path(`M${x} ${y}v3l-9 6h18l-9-6`,'none','#b1a08b',.7);}b+=shelf(94);}
    if(id==='table'){for(const y of [59,94]){b+=path(`M3 ${y}h94l-4-4H7Z`,wood)+rect(4,y,92,2,'#f3e5c7');for(const x of [7,90])b+=rect(x,y+2,2,7,wood);b+=path(`M6 ${y+2}h88v6q-6 4-12 0t-12 0t-12 0t-12 0t-12 0t-12 0t-12 0Z`,'#f1e7ce');}}
    if(id==='crates'){for(const y of [58,93])for(const x of [5,36,67]){b+=rect(x,y-8,28,10,wood,1);for(const dy of [2,5,8])b+=rect(x+1,y-8+dy,26,.5,'#ead4b1');b+=line(x+2,y-6,x+26,y, '#765d45',.7);}}
    if(id==='pegboard'){b+=rect(2,26,96,70,'#cfb996',1);for(let y=29;y<95;y+=4)for(let x=5;x<96;x+=5)b+=circle(x,y,.35,'#a18b6d');for(const y of [30,65])for(const x of [18,50,82])b+=path(`M${x} ${y}v5h3`,'none','#687d7d',1);}
    if(id==='stalls'){b+=rect(1,24,1.5,72,wood)+rect(97,24,1.5,72,wood);for(let x=2;x<98;x+=12)b+=path(`M${x} 23h12v5q-6 6-12 0Z`,x%24===2?point:'#f5ecd7');for(const y of [59,94])b+=shelf(y);}
    if(id==='platforms'){for(const y of [58,93])for(const x of [6,38,70]){b+=rect(x,y-5,24,7,'#f3f0e7',.8)+path(`M${x} ${y-5}l3-2h24l-3 2Z`,'#ffffff')+rect(x+23,y-5,1,7,'#bebdb4');}}
    return svg(b);
  }
  function decoration(id,s={}){
    const wood=safe(s.wood,'#9b704b'),point=safe(s.accent,'#677d78');let b='';
    const leg=(x,y,h)=>rect(x,y,3,h,wood,1);
    const shapes={
      pethouse:()=>path('M9 47L50 12L91 47Z',point)+rect(17,45,66,46,'#d9be93',2)+path('M36 91V64a14 14 0 0128 0v27Z','#65574b')+line(10,47,50,12,'#f0d6ae',3),
      petbed:()=>path('M10 62Q10 34 29 40L71 40Q91 34 91 62V83H10Z',point)+`<ellipse cx="50" cy="72" rx="35" ry="15" fill="#eddbbe"/>`+circle(42,67,3,'#cfb69d')+circle(59,73,2,'#cfb69d'),
      paw:()=>rect(10,12,80,69,wood,5)+path('M31 65Q25 51 40 44Q50 33 60 44Q76 51 69 65Z','#eee5cd')+circle(27,36,7,'#eee5cd')+circle(44,27,7,'#eee5cd')+circle(62,27,7,'#eee5cd')+circle(77,39,7,'#eee5cd')+leg(48,81,15),
      plant:()=>path('M32 65H71L65 96H38Z',wood)+line(50,68,50,20,'#67846b',3)+path('M50 47Q9 48 21 18Q46 14 50 47M52 37Q58 4 83 19Q86 44 52 49M47 65Q15 72 15 44Q33 32 47 65M53 65Q63 38 86 49Q85 76 53 65',point),
      blocks:()=>rect(10,52,37,38,'#d6b36b',2)+rect(50,55,38,35,'#8ba9af',2)+rect(30,16,38,36,'#cc8885',2)+rect(36,10,9,7,'#cc8885',1)+rect(53,10,9,7,'#cc8885',1)+path('M19 81L29 60L39 81Z','#f7e5bc')+circle(69,72,9,'#e5efe5'),
      teddy:()=>circle(26,24,13,wood)+circle(73,24,13,wood)+`<ellipse cx="50" cy="67" rx="29" ry="31" fill="${wood}"/>`+circle(50,36,28,wood)+circle(42,36,2,'#403b34')+circle(60,36,2,'#403b34')+circle(51,47,10,'#dfc9a2')+circle(51,44,3,'#403b34')+circle(25,84,13,wood)+circle(75,84,13,wood)+path('M35 58l15 6-15 7ZM65 58l-15 6 15 7Z',point),
      robot:()=>rect(26,18,48,35,'#a8bbba',6)+circle(38,34,5,'#f3e3b1')+circle(62,34,5,'#f3e3b1')+rect(41,45,18,2,'#647d7a')+rect(21,56,58,30,point,3)+circle(50,70,7,'#ddb16a')+rect(12,58,7,24,'#a8bbba')+rect(81,58,7,24,'#a8bbba')+leg(30,86,10)+leg(65,86,10)+line(50,18,50,8,'#738782',2)+circle(50,6,4,'#d39383'),
      ball:()=>circle(50,54,37,'#e6be70')+path('M50 17Q17 50 50 91Q34 50 50 17Z',point)+path('M50 17Q83 50 50 91Q68 50 50 17Z','#c97f7f')+path('M14 50Q50 32 86 50','none','#f5e3b3',2),
      mirror:()=>rect(23,5,54,85,wood,24)+rect(28,10,44,73,'#c8dddd',20)+path('M34 52L59 17M39 68L66 30','none','#eff6f0',3)+leg(30,85,12)+leg(66,85,12),
      hanger:()=>path('M44 24q-4-16 8-16q15 3 0 19v12L10 70q-8 8 2 8h76q10 0 2-8L52 39','none',wood,5),
      hatstand:()=>leg(48,30,58)+path('M20 90H80L68 95H32Z',wood)+path('M10 43Q50 30 90 43Q91 60 10 56Z',point)+path('M27 44L30 16Q50 7 70 16L73 44Z','#d4b68b')+rect(29,32,43,8,point),
      dressform:()=>leg(48,58,32)+path('M31 94l19-6 20 6','none',wood,3)+path('M42 9H58L62 22L73 28L64 46L76 72Q50 80 24 72L36 46L27 28L38 22Z','#ddccb3',wood,1)+path('M36 46H64','none',point,2),
      rod:()=>path('M12 93Q26 39 41 5M34 94Q46 48 61 15M55 94Q66 38 79 9','none',point,2)+rect(8,77,61,17,wood,2)+circle(30,62,6,'#899e99')+circle(52,70,5,'#899e99')+path('M41 5Q28 13 34 52','none','#9daaa1',.6),
      lifering:()=>`<circle cx="50" cy="50" r="31" fill="none" stroke="#eee9d8" stroke-width="17"/><path d="M22 22l12 12M66 66l12 12M22 78l12-12M66 34l12-12" stroke="${point}" stroke-width="17"/>`+`<circle cx="50" cy="50" r="42" fill="none" stroke="${wood}" stroke-width="2"/>`,
      shell:()=>path('M50 85Q-1 58 10 30Q24 13 35 26Q50 5 65 26Q81 13 91 32Q97 60 50 85Z','#e4c3ad',wood,1)+path('M50 85L20 32M50 85L35 26M50 85V23M50 85L65 26M50 85L81 33','none','#c3947c',1)+rect(40,85,20,5,'#e4c3ad',2),
      tent:()=>path('M5 88L49 12L95 88Z',point)+path('M49 12L67 88H95Z','#7a927a')+path('M20 88L49 37L68 88Z','#e4c999')+path('M49 37V88H68Z','#696859')+line(2,92,98,92,wood,2),
      lantern:()=>rect(31,30,38,52,'#e9d8aa',5)+path('M37 28V16q13-17 26 0v12','none',point,3)+rect(24,25,52,7,point,2)+rect(24,82,52,8,point,2)+line(31,32,31,82,point,3)+line(69,32,69,82,point,3)+path('M50 44Q65 62 51 73Q37 67 50 44Z','#d9ad5f'),
      surfboard:()=>path('M50 3Q84 23 73 82L50 97L27 82Q16 23 50 3Z','#c1d5ca',point,2)+path('M49 7L55 80L50 93L45 80Z',point)+path('M27 64L73 47V58L27 76Z','#eccb86'),
      toolbox:()=>rect(9,43,82,43,wood,4)+path('M34 42V23H65V42','none',point,6)+rect(9,54,82,12,point)+rect(45,54,12,21,'#d9bc78',2),
      gears:()=>path('M39 9H60L63 22L76 17L89 32L79 43L92 51L86 70L72 69L68 86L48 91L40 77L26 83L13 68L22 55L9 47L15 28L31 29Z',point)+circle(50,49,21,'#e4d7bb')+circle(50,49,9,wood),
      wateringcan:()=>rect(27,41,48,44,point,6)+path('M73 46Q104 32 84 72','none',point,7)+path('M28 55L7 38L2 43L29 77Z',point)+path('M28 42Q23 14 62 24','none',wood,4)+path('M1 37L10 32L14 41L4 47Z',wood),
      bookstack:()=>rect(12,66,76,19,wood,2)+rect(16,69,70,11,'#f3e9ce')+rect(8,44,75,19,point,2)+rect(11,47,69,10,'#f3e9ce')+path('M20 38L77 13L85 29L28 54Z','#b99087')+path('M27 39L77 18L80 26L30 47Z','#f0dfbe'),
      record:()=>rect(8,8,84,84,'#d9c4a5',2)+circle(50,50,37,'#42494c')+`<circle cx="50" cy="50" r="27" fill="none" stroke="#79817e" stroke-width=".7"/><circle cx="50" cy="50" r="31" fill="none" stroke="#79817e" stroke-width=".7"/>`+circle(50,50,12,point)+circle(50,50,2,'#eadab9'),
      clock:()=>path('M18 89H82L75 95H25Z',wood)+circle(50,48,36,point)+circle(50,48,29,'#f5e8cb')+line(50,48,50,27,wood,2)+line(50,48,69,56,wood,2)+circle(50,48,3,wood)
    };
    if(!Object.hasOwn(shapes,id))return '';b=shapes[id]();return svg(b);
  }
  function draw(document,kind,id,scene){const markup=kind==='background'?background(id,scene):kind==='display'?display(id,scene):decoration(id,scene);if(!markup)return null;const parser=new document.defaultView.DOMParser(),node=parser.parseFromString(markup,'image/svg+xml').documentElement;if(node.localName!=='svg')throw Error('Invalid local world artwork');return document.importNode(node,true);}
  return Object.freeze({background,display,decoration,draw});
});
