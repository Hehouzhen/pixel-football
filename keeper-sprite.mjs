const frames=new Map();

function frame(pose,side,kit,skin,hair,gloves){
  const key=[pose,side,kit,skin,hair,gloves].join('|');
  if(frames.has(key))return frames.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const ink='#1a2025',shorts='#202b3b',boot='#f18339';
  const box=(x,y,w,h,color,outline=true)=>{if(outline){c.fillStyle=ink;c.fillRect(x-2,y-2,w+4,h+4)}c.fillStyle=color;c.fillRect(x,y,w,h)};
  const limb=(x,y,w,h,color)=>box(x,y,w,h,color);
  const head=(x,y,w,h)=>{c.fillStyle=ink;c.fillRect(x+3,y-2,w-6,3);c.fillRect(x,y+1,w,h-5);c.fillRect(x+2,y+h-4,w-4,3);c.fillStyle=skin;c.fillRect(x+2,y+4,w-4,h-9);c.fillRect(x+4,y+h-5,w-8,3);c.fillStyle=hair;c.fillRect(x+2,y+1,w-4,7);c.fillRect(x,y+5,7,6);c.fillRect(x+w-9,y+4,7,5);c.fillStyle=ink;c.fillRect(x+w-13,y+12,2,3);c.fillRect(x+w-6,y+12,2,3)};
  if(pose==='reach'||pose==='land'){
    const down=side>0,shift=down?8:-8;
    limb(12,42,11,6,boot);limb(17,35,13,8,shorts);
    limb(23,39,10,6,boot);limb(25,33,12,8,shorts);
    box(28,27+shift*.35,17,15,kit);
    head(35,14+Math.round(shift*.4),19,18);
    box(51,24+shift,8,6,gloves);
    limb(43,25+shift*.7,9,6,kit);
    limb(24,30+shift*.5,7,7,kit);box(19,30+shift*.5,6,6,gloves);
    if(pose==='land'){box(31,43,21,7,kit);box(49,42,8,6,gloves)}
  }else{
    const crouch=pose==='load',raised=pose==='catch',moving=pose==='shuffle';
    const base=crouch?3:0;
    limb(moving?24:25,45+base,8,10-base,shorts);limb(moving?38:37,45+base,8,10-base,shorts);
    box(moving?21:23,54,12,5,boot);box(moving?39:37,54,12,5,boot);
    limb(24,33+base,8,13,kit);limb(42,33+base,8,13,kit);
    box(27,29+base,20,18,kit);
    if(raised){limb(21,22,6,14,kit);limb(47,22,6,14,kit);box(18,17,9,8,gloves);box(48,17,9,8,gloves)}
    else if(crouch){limb(18,31,9,7,kit);limb(47,31,9,7,kit);box(13,29,9,9,gloves);box(52,29,9,9,gloves)}
    else{limb(19,36,8,8,kit);limb(47,36,8,8,kit);box(15,41,8,7,gloves);box(51,41,8,7,gloves)}
    head(25,11+base,24,22);
  }
  frames.set(key,canvas);if(frames.size>96)frames.delete(frames.keys().next().value);
  return canvas;
}

export function drawKeeper(ctx,{x,y,pose='idle',side=1,flip=false,kit,skin,hair,gloves='#eefaf2',size=46}){
  const sprite=frame(pose,side,kit,skin,hair,gloves);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale(flip?-1:1,1);
  ctx.drawImage(sprite,-size/2,-size+10,size,size);ctx.restore();
}
