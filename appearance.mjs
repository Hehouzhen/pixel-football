export {HAIRSTYLES} from './studio-head.mjs';
import {HAIRSTYLES,BEARDS,BROWS} from './studio-head.mjs';
export const LOOK_DEFAULTS={skin:'#ebbd89',hair:'#302b24',shoes:'#f47b28',hairstyle:0,sleeve:'short',celebration:0,highlight:'#d2ad63',highlights:false,beard:0,headband:false,accessoryColor:'#d5ff78',wrist:'none',sockLength:'normal',sockColor:'#eef3dc',bootAccent:'#252d3a',build:'standard'};
export function validPixelFace(face){return !!face&&Array.isArray(face.palette)&&face.palette.length===16&&face.palette.every(color=>/^#[0-9a-f]{6}$/i.test(color))&&Array.isArray(face.rows)&&face.rows.length===22&&face.rows.every(row=>typeof row==='string'&&/^[0-9a-f]{18}$/.test(row))}
export function validAppearance(look){return !!look&&typeof look==='object'&&!Array.isArray(look)&&Object.entries(look).every(([key,value])=>['skin','hair','shoes','highlight','accessoryColor','sockColor','bootAccent'].includes(key)?typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value):key==='face'?validPixelFace(value):key==='heightScale'?Number.isFinite(value)&&value>=.87&&value<=1.13:key==='studio'?value===1:key==='brows'?Number.isInteger(value)&&value>=0&&value<BROWS.length:key==='bandStyle'?Number.isInteger(value)&&value>=0&&value<3:key==='beardColor'?typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value):key==='hairstyle'?Number.isInteger(value)&&value>=0&&value<HAIRSTYLES.length:key==='celebration'?Number.isInteger(value)&&value>=0&&value<3:key==='beard'?Number.isInteger(value)&&value>=0&&value<(look.studio===1?BEARDS.length:4):['highlights','headband'].includes(key)?typeof value==='boolean':key==='sleeve'?['short','long','band'].includes(value):key==='wrist'?['none','left','right','both'].includes(value):key==='build'?['slim','standard','broad'].includes(value):key==='sockLength'?['short','normal','high'].includes(value):false)}
export function randomAppearance(random=Math.random){const pick=items=>items[Math.floor(random()*items.length)];return {...LOOK_DEFAULTS,skin:pick(['#ebbd89','#f1d4b2','#bd8a61','#805b48','#583f34','#d4a275']),hair:pick(['#302b24','#835637','#d2ad63','#252d3a','#9a573e','#b9b9b0']),hairstyle:Math.floor(random()*12),shoes:pick(['#ef806a','#7ebfff','#b08ce0','#e9c64a','#252d3a']),highlights:random()<.3,beard:Math.floor(random()*4),headband:random()<.3,wrist:pick(['none','left','right','both']),sockLength:pick(['short','normal','high']),accessoryColor:pick(['#d5ff78','#ef806a','#7ebfff','#e9c64a'])}}
// Hair and facial hair follow the source sprite's actual pixel masks, not a guessed rectangle.
export function drawHeadDetails(c,look,{x,y,w,h,back=false,hairPixels=[],facePixels=[]}){
  if(look?.face&&!back){
    const face=look.face,dh=h+2,dw=Math.min(w+2,dh*18/22),left=x+(w-dw)/2,top=y-1;
    for(const [px,py] of [...hairPixels,...facePixels])c.clearRect(px,py,1,1);
    // The keeper has a drawn head rather than a source-sheet mask.
    if(!hairPixels.length&&!facePixels.length)c.clearRect(x,y,w,h);
    for(let iy=0;iy<22;iy++)for(let ix=0;ix<18;ix++){const index=parseInt(face.rows[iy][ix],16);if(!index)continue;c.fillStyle=face.palette[index];const px=Math.round(left+ix*dw/18),py=Math.round(top+iy*dh/22);c.fillRect(px,py,Math.max(1,Math.round(left+(ix+1)*dw/18)-px),Math.max(1,Math.round(top+(iy+1)*dh/22)-py))}
    return;
  }
  const a={...LOOK_DEFAULTS,...look},hair=a.hair,box=(u,v,uw,vh,color=hair)=>{c.fillStyle=color;c.fillRect(Math.round(x+u*w),Math.round(y+v*h),Math.max(1,Math.round(uw*w)),Math.max(1,Math.round(vh*h)))};
  const faceLeft=Math.min(...facePixels.map(([px])=>px),64),faceRight=Math.max(...facePixels.map(([px])=>px),-1),faceTop=Math.min(...facePixels.map(([,py])=>py),64),faceBottom=Math.max(...facePixels.map(([,py])=>py),-1),hairBox=(u,v,uw,vh)=>{const left=Math.round(x+u*w),top=Math.round(y+v*h),right=left+Math.max(1,Math.round(uw*w)),bottom=top+Math.max(1,Math.round(vh*h));c.fillStyle=hair;for(let py=top;py<bottom;py++)for(let px=left;px<right;px++)if(px<faceLeft-1||px>faceRight+1||py<faceTop-1||py>faceBottom)c.fillRect(px,py,1,1)};
  switch(a.hairstyle){
    case 1: // side part, swept toward the forehead
      hairBox(.28,-.12,.5,.12);hairBox(.62,-.02,.25,.16);hairBox(.82,.08,.12,.18);break;
    case 2: // short curls with an uneven crown
      for(const [u,v] of [[.08,-.08],[.28,-.15],[.5,-.12],[.7,-.15],[.86,-.06]])hairBox(u,v,.2,.18);
      hairBox(.02,.04,.14,.18);break;
    case 3: // long hair falls behind the ear; a short fringe stays clear of the eye
      hairBox(.02,.04,.18,.72);hairBox(.08,.68,.2,.18);hairBox(.82,.08,.12,.2);break;
    case 6: // narrow mohawk follows the crown
      hairBox(.36,-.22,.2,.24);hairBox(.4,-.34,.2,.15);break;
    case 7: // compact, stepped afro silhouette
      hairBox(.14,-.13,.68,.14);hairBox(.04,-.06,.18,.18);hairBox(.78,-.06,.18,.18);hairBox(-.02,.08,.15,.32);hairBox(.87,.08,.15,.32);
      hairBox(.02,.36,.14,.14);hairBox(.84,.36,.14,.14);break;
    case 8: // ponytail tied behind the head
      box(.04,.14,.1,.12,hair);hairBox(.02,.3,.12,.5);hairBox(.02,.74,.2,.14);break;
    case 9: // small bun at the back crown
      hairBox(.08,-.14,.32,.2);hairBox(.06,-.25,.28,.13);break;
    case 10: // separated locks fall behind the face
      hairBox(.08,-.08,.68,.14);for(const [u,vh] of [[.03,.55],[.17,.72],[.31,.62],[.43,.58]])hairBox(u,.12,.09,vh);break;
    case 11: // combed-back crown, tapered at the forehead
      hairBox(.04,-.1,.86,.16);hairBox(.16,.02,.68,.13);hairBox(.62,.14,.22,.11);break;
  }
  if(a.highlights&&a.hairstyle!==4&&a.hairstyle!==5){
    const stripeX=x+Math.round(w*.42);
    for(const [px,py] of hairPixels)if(py<y+h*.42&&Math.abs(px-stripeX-(py-y)*.18)<=1){c.fillStyle=a.highlight;c.fillRect(px,py,1,1)}
  }
  if(!back&&a.beard){
    for(const [px,py] of facePixels){const u=(px-x)/w,v=(py-y)/h;
      const stubble=v>.78&&v<.96&&(px+py)%3===0;
      const goatee=(v>.82&&u>.48&&u<.9)||(v>.69&&v<.75&&u>.65&&(px+py)%2===0);
      const full=v>.78&&u>.34&&u<.96;
      if(a.beard===1&&stubble||a.beard===2&&goatee||a.beard===3&&full){c.fillStyle=hair;c.fillRect(px,py,1,1)}
    }
  }
  if(a.headband)box(.08,.3,.78,.08,a.accessoryColor);
}
