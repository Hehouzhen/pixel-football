import spriteUrl from './player-motion-demo/player-chunky-adult-frames.png';

const source=new Image(),frames=new Map(),listeners=new Set();
source.src=spriteUrl;
source.onload=()=>{for(const listener of listeners)listener();listeners.clear()};

function rgb(hex,fallback){const value=/^#[0-9a-f]{6}$/i.test(hex??'')?hex:fallback;return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16))}
function tint(data,index,color,shade){for(let c=0;c<3;c++)data[index+c]=Math.max(0,Math.min(255,Math.round(color[c]*shade)))}
function frame(row,col,kit,skin,hair,shoes,hairstyle,sleeve,back=false,gloves=null){
  if(!source.complete||!source.naturalWidth)return null;
  const key=[row,col,kit,skin,hair,shoes,hairstyle,sleeve,back,gloves].join('|');
  if(frames.has(key))return frames.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  ctx.drawImage(source,col*256,row*256,256,256,0,0,64,64);
  const pixels=ctx.getImageData(0,0,64,64),data=pixels.data,colors={kit:rgb(kit,'#327fdf'),skin:rgb(skin,'#ebbd89'),hair:rgb(hair,'#302b24'),shoes:rgb(shoes,'#f47b28'),gloves:rgb(gloves,'#f2f7ec')};
  let torsoSum=0,torsoCount=0,footY=0;
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const i=(y*64+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]<110){data[i+3]=0;continue}
    footY=Math.max(footY,y);
    if(y>=30&&y<=39&&b>120&&b>g*1.25&&g>r*1.5){torsoSum+=x;torsoCount++}
    if(y>=29&&y<51&&b>120&&b>g*1.25&&g>r*1.5){tint(data,i,colors.kit,(r+g+b)/416);continue}
    if(y<34&&r>48&&r<175&&r>g*1.3&&g>b*1.15){tint(data,i,hairstyle===5||hairstyle===4&&y>17?colors.skin:colors.hair,(r+g+b)/171);continue}
    if(back&&y>=20&&y<32&&x>=34&&x<51&&r<70&&g<70&&b<70){tint(data,i,colors.hair,.92);continue}
    if(y<52&&r>160&&g>85&&r>g*1.18&&g>b*1.18){tint(data,i,back&&y<34?colors.hair:gloves&&(y>=33||x<29&&y>=26||x>=52&&y>=20)?colors.gloves:colors.skin,(r+g+b)/544);continue}
    if(y>=50&&r>160&&r>g*1.5&&g>b*1.3)tint(data,i,colors.shoes,(r+g+b)/342);
  }
  ctx.putImageData(pixels,0,0);
  if(back){ctx.fillStyle=hair;ctx.fillRect(35,21,3,4);ctx.fillRect(43,21,3,4)}
  if(hairstyle===1){ctx.fillStyle=skin;ctx.fillRect(35,11,2,5)}
  if(hairstyle===2){ctx.fillStyle=hair;for(const [x,y] of [[27,9],[33,8],[40,8],[47,9]])ctx.fillRect(x,y,4,3)}
  if(hairstyle===3){ctx.fillStyle=hair;ctx.fillRect(24,23,3,11);ctx.fillRect(50,23,3,11)}
  if(sleeve==='long'){ctx.fillStyle=kit;ctx.fillRect(24,39,5,6);ctx.fillRect(45,39,5,6)}
  if(sleeve==='band'){ctx.fillStyle='#f2f2ea';ctx.fillRect(23,43,6,2);ctx.fillRect(45,43,5,2)}
  canvas.anchorX=torsoCount?torsoSum/torsoCount:32;canvas.footY=footY;
  frames.set(key,canvas);
  if(frames.size>384)frames.delete(frames.keys().next().value);
  return canvas;
}

export function onSpriteReady(listener){if(source.complete&&source.naturalWidth)listener();else listeners.add(listener);return()=>listeners.delete(listener)}

export function spritePose(player,time,celebrating=false,phase=0,charge=0){
  if(celebrating)return [3,Math.floor(Math.max(0,phase)*2)%6];
  if(player.dive>0)return [2,4];
  if(player.tackleWindup>0)return [2,1];
  if(Number.isFinite(player.tackleAt)&&time-player.tackleAt>=0&&time-player.tackleAt<.3)return [2,3];
  if(Number.isFinite(player.kickAt)&&time-player.kickAt>=0&&time-player.kickAt<.36){const age=time-player.kickAt;return player.kickType==='header'?[2,2]:player.kickType==='shot'?(age<.1?[2,2]:age<.22?[2,4]:[2,5]):[2,Math.min(5,4+Math.floor(age*6))]}
  if(player.aiKick)return [2,Math.min(3,Math.floor((time-player.aiKick.started)/.025))];
  if(charge>0)return [2,charge<.45?0:1];
  if(Math.hypot(player.vx??0,player.vy??0)>15)return [1,Math.floor(Math.abs(player.anim??0)*.45)%6];
  return [0,Math.floor(time*3)%6];
}

export function drawSprite(ctx,{x,y,row,col,kit,skin,hair,shoes,hairstyle=0,sleeve='short',flip=false,rotation=0,scaleX=1,scaleY=1,back=false,backNumber=null,gloves=null,size=42}){
  const sprite=frame(row,col,kit,skin,hair,shoes,hairstyle,sleeve,back,gloves);if(!sprite)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y));ctx.scale((flip?-1:1)*scaleX,scaleY);if(rotation)ctx.rotate(rotation);
  const left=-sprite.anchorX/64*size,top=9-(row===3?62:sprite.footY)/64*size;
  ctx.drawImage(sprite,left,top,size,size);if(back&&backNumber!==null){ctx.font=`bold ${Math.round(size*.11)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#f5f4e6';ctx.fillText(String(backNumber),left+size*.56,top+size*.68)}ctx.restore();return true;
}

export function drawPortrait(canvas,{kit,skin,hair,shoes,hairstyle=0,sleeve='short',number,ink='#f2f2ea'}){
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,120,180);
  const sprite=frame(0,1,kit,skin,hair,shoes,hairstyle,sleeve);if(!sprite)return;
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#080f1788';ctx.beginPath();ctx.ellipse(60,165,37,7,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(sprite,60-sprite.anchorX/64*172,166-sprite.footY/64*172,172,172);
  ctx.font='900 14px monospace';ctx.textAlign='center';ctx.fillStyle=ink;ctx.fillText(String(number),60,111);
}
