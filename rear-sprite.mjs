import {headCanvas} from './studio-head.mjs';

const steps=[-1,-.5,.5,1,.5,-.5];
const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
const shade=(hex,amount)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*amount))).toString(16).padStart(2,'0')).join('');

export function rearPose(row,col){
 const phase=steps[((col%6)+6)%6],moving=row===1||row===4,walk=row===4;
 return {phase:moving?phase:0,lean:moving?Math.round(phase):0,bob:moving&&Math.abs(phase)===.5?-1:0,lift:moving?Math.round(Math.max(0,phase)*(walk?2:4)):0,otherLift:moving?Math.round(Math.max(0,-phase)*(walk?2:4)):0,arm:moving?Math.round(phase*(walk?2:4)):0,raised:row===3?Math.min(9,col*3):0,kick:row===2&&col>=2?col===3?3:6:0};
}

export function drawRearFrame(ctx,{row,col,kit='#327fdf',skin='#ebbd89',hair='#302b24',shoes='#f47b28',hairstyle=0,sleeve='short',gloves=null,look={},turn=0}){
 const p=rearPose(row,col),edge='#171b1c',sock=look.sockColor??'#182d49',boot=shoes,shirt=shade(kit,.78),skinShade=shade(skin,.82),lean=p.lean+turn;
 ctx.imageSmoothingEnabled=false;
 const box=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 const limb=(ax,ay,bx,by,w,color)=>{const n=Math.max(Math.abs(bx-ax),Math.abs(by-ay),1);for(const [width,c] of [[w+2,edge],[w,color]])for(let i=0;i<=n;i++)box(ax+(bx-ax)*i/n-width/2,ay+(by-ay)*i/n-width/2,width,width,c)};
 const leg=(x,lift,side)=>{
  const knee=x+side*Math.round(p.phase*2),foot=x+side*(p.kick?3:1),heel=59-lift-(side===1?p.kick:0);
  limb(x,47,knee,52-lift,5,skin);limb(knee,52-lift,foot,heel,5,sock);
  box(foot-4,heel-1,8,4,edge);box(foot-3,heel,6,2,boot);box(foot-2,heel,4,1,shade(boot,.75));
  if(look.bootAccent)box(foot+1,heel,2,1,look.bootAccent);
  if(look.sockLength==='high')box(knee-2,49-lift,4,3,sock);
 };
 leg(27,p.lift,-1);leg(37,p.otherLift,1);
 const arm=(side)=>{
  const shoulder=32+lean+side*10,handY=43+p.bob+side*p.arm-p.raised,handX=shoulder+side*(p.raised?6:2),long=sleeve==='long';
  const elbowX=shoulder+side*(p.raised?4:3),elbowY=39+p.bob+Math.round(side*p.arm*.4)-p.raised*.55;
  limb(shoulder,35+p.bob,elbowX,elbowY,4,long?kit:skinShade);limb(elbowX,elbowY,handX,handY,4,long?kit:skinShade);
  if(sleeve==='band')box(elbowX-2,elbowY-2,4,2,'#f2f2ea');
  box(handX-2,handY-1,4,4,gloves??skin);
  if(look.wrist==='both'||look.wrist===(side<0?'left':'right'))box(handX-2,handY-2,4,1,look.accessoryColor??'#d5ff78');
 };
 arm(-1);arm(1);
 box(22+lean,32+p.bob,20,13,edge);box(24+lean,31+p.bob,16,15,edge);
 box(23+lean,33+p.bob,18,11,kit);box(25+lean,32+p.bob,14,13,kit);
 box(23+lean,35+p.bob,2,8,shirt);box(39+lean,35+p.bob,2,8,shirt);
 box(26+lean,33+p.bob,12,1,shade(kit,1.16));box(25+lean,42+p.bob,3,1,shirt);box(37+lean,41+p.bob,2,2,shirt);
 box(23,45,18,5,edge);box(24,45,7,4,'#efece0');box(33,45,7,4,'#d8d8cb');box(24,45,16,1,'#bfc5bc');
 box(29+lean,30+p.bob,6,5,edge);box(30+lean,30+p.bob,4,4,skinShade);
 ctx.drawImage(headCanvas({...look,skin,hair,hairstyle},true),15+lean,0+p.bob,34,34);
 return {anchorX:32,footY:62,numberX:32+lean,numberY:37+p.bob};
}

export function drawRearNumber(ctx,number,x,y,unit=1,color='#f5f4e6'){
 const text=String(number),width=text.length*4-1;ctx.fillStyle=color;
 for(let n=0;n<text.length;n++){const glyph=digits[Number(text[n])];if(!glyph)continue;for(let i=0;i<15;i++)if(glyph[i]==='1')ctx.fillRect(Math.round(x-width*unit/2+(n*4+i%3)*unit),Math.round(y+Math.floor(i/3)*unit),unit,unit)}
}

export function rearFacing(player){
 if(player.dy<-.65)player.renderBack=true;else if(player.dy>-.35)player.renderBack=false;
 return player.renderBack??false;
}
