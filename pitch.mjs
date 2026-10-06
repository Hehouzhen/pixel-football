import {FIELD} from './engine.mjs';
import {drawSprite,spritePose} from './player-sprite.mjs';
import {celebrationPose} from './celebration.mjs';
import {keeperVisual} from './keeper-motion.mjs';
import {drawKeeper} from './keeper-sprite.mjs';
const SKINS=['#ebbd89','#bd8a61','#805b48'],HAIRS=['#302b24','#835637','#d2ad63','#252d3a'];
export function draw(ctx,g){const f=FIELD;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#1d3228';ctx.fillRect(0,0,f.canvasWidth,f.canvasHeight);
  for(let row=0;row<3;row++)for(let col=0;col<Math.ceil(f.canvasWidth/9);col++){const seed=(col*17+row*13)%19;ctx.fillStyle=['#728268','#a9b486','#293f34','#506949','#c3b98e'][seed%5];ctx.fillRect(12+col*9,2+row*6,5,3);ctx.fillRect(12+col*9,f.canvasHeight-20+row*6,5,3)}
  ctx.fillStyle='#14221a';ctx.fillRect(0,f.top-15,f.canvasWidth,10);ctx.fillRect(0,f.bottom+5,f.canvasWidth,10);ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillStyle='#a8c97c';for(let x=100;x<f.canvasWidth;x+=190){ctx.fillText(Math.abs(x-f.mid)<50?'THE BEAUTIFUL GAME':'P I X E L  P I T C H',x,f.top-2);ctx.fillText('PLAY YOUR OWN GAME',x,f.bottom+8)}
  ctx.fillStyle='#46734a';ctx.fillRect(f.left-5,f.top-5,f.right-f.left+10,f.bottom-f.top+10);for(let x=f.left;x<f.right;x+=73){ctx.fillStyle=Math.floor((x-f.left)/73)%2?'#46794a':'#4d8050';ctx.fillRect(x,f.top,Math.min(73,f.right-x),f.bottom-f.top)}
  ctx.strokeStyle='#c8dda7d5';ctx.lineWidth=2;ctx.strokeRect(f.left,f.top,f.right-f.left,f.bottom-f.top);ctx.beginPath();ctx.moveTo(f.mid,f.top);ctx.lineTo(f.mid,f.bottom);ctx.stroke();ctx.beginPath();ctx.arc(f.mid,f.center,69,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#c8dda7';ctx.fillRect(f.mid-2,f.center-2,4,4);
  ctx.strokeRect(f.left,f.center-125,135,250);ctx.strokeRect(f.right-135,f.center-125,135,250);ctx.strokeRect(f.left,f.center-67,48,134);ctx.strokeRect(f.right-48,f.center-67,48,134);ctx.fillRect(f.left+115,f.center-2,4,4);ctx.fillRect(f.right-119,f.center-2,4,4);
  for(const x of [f.left-24,f.right]){const top=f.center-f.goalHalf,bottom=f.center+f.goalHalf;ctx.fillStyle='#b5c6b41a';ctx.fillRect(x,top,24,bottom-top);ctx.strokeStyle='#d6ddd0';ctx.strokeRect(x,top,24,bottom-top);ctx.strokeStyle='#d6ddd04d';ctx.lineWidth=1;for(let i=6;i<24;i+=6){ctx.beginPath();ctx.moveTo(x+i,top);ctx.lineTo(x+i,bottom);ctx.stroke()}for(let y=top+8;y<bottom;y+=8){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+24,y);ctx.stroke()}}
  const shooter=g.selected[0],player=g.players[shooter];if(!g.replayView){if(g.ball.owner===shooter&&g.active(shooter)){const aim=g.aim(shooter,g.pointer),dx=aim.x-player.x,dy=aim.y-player.y,n=Math.hypot(dx,dy)||1;ctx.strokeStyle='#d5ff78';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(player.x+dx/n*150,player.y+dy/n*150);ctx.stroke();ctx.setLineDash([]);ctx.strokeRect(aim.x-4,aim.y-4,8,8)}
  const outlet=g.ball.owner===shooter?g.passOption(shooter):null;if(outlet){ctx.strokeStyle='#8fdbff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(outlet.q.x,outlet.q.y+6,17,9,0,0,7);ctx.stroke();ctx.font='bold 11px monospace';ctx.fillStyle='#e5f5ff';ctx.fillText('K',outlet.q.x,outlet.q.y-29)}if(g.ball.owner===null&&g.ball.z>=9&&g.ball.z<=37&&Math.hypot(player.x-g.ball.x,player.y-g.ball.y)<25){ctx.fillStyle='#d5ff78';ctx.font='bold 13px monospace';ctx.fillText('左键：头球 / Shift：倒钩',player.x,player.y-40)}
  }
  for(const p of [...g.players].filter((_,id)=>g.active(id)).sort((a,b)=>a.y-b.y)){
    const id=g.players.indexOf(p),celebrating=id===g.goalCelebrant&&g.wait>0&&g.event.includes('进球'),phase=g.replayCelebration?g.celebrationPhase:2.4-g.wait;
    const pose=celebrating?celebrationPose(g.replayCelebrationType??g.goalCelebration??0,phase,p.dx??g.direction(p.t)):null;
    const keeperPose=p.i===0&&!pose?keeperVisual(p,g.time,g.ball,g.direction(p.t)):null;
    const x=Math.round(p.x+(pose?.dx??0)),y=Math.round(p.y+(pose?.dy??keeperPose?.dy??0));
    const selected=!g.replayView&&id===g.selected[0],baseNumber=p.i===0?1:p.i+5,number=g.playerNumbers?.[id]??(id===g.careerIndex?g.careerNumber:baseNumber);
    const look=id===g.careerIndex?g.careerLook:null,skin=look?.skin??SKINS[id%SKINS.length],hair=look?.hair??HAIRS[id%HAIRS.length],kit=p.i===0?(g.keeper?.[p.t]??'#f9d26c'):(g.colors?.[p.t]??(p.t===0?'#77bafd':'#fa8c76'));
    ctx.fillStyle='#122d2660';ctx.fillRect(x-10,y+8,20,5);
    if(pose?.dust){ctx.fillStyle='#b6d29e';const dir=Math.sign(pose.dx||p.dx||1);for(let n=0;n<3;n++)ctx.fillRect(x-dir*(13+n*9),y+7-(n%2)*4,4+n*2,3)}
    if(p.tackleWindup>0){ctx.strokeStyle='#f2bb70';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y+3,17,0,Math.PI*2);ctx.stroke()}
    if(selected){ctx.strokeStyle='#d5ff78';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+6,14,6,0,0,7);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.moveTo(x-5,y-35);ctx.lineTo(x+5,y-35);ctx.lineTo(x,y-29);ctx.fill()}
    const [row,col]=pose?[pose.row,pose.col]:spritePose(p,g.time,false,phase,selected&&g.ball.owner===id?g.charge:0),kickAge=g.time-(p.kickAt??-10),recentKick=kickAge>=0&&kickAge<.36;
    const rotation=pose?.rotation??(recentKick&&p.kickType==='bicycle'?-.95:0);
    if(keeperPose)drawKeeper(ctx,{x,y,pose:keeperPose.pose,side:keeperPose.side,flip:keeperPose.flip,kit,skin,hair});
    else drawSprite(ctx,{x,y,row,col,kit,skin,hair,shoes:look?.shoes??'#f47b28',hairstyle:look?.hairstyle??0,sleeve:look?.sleeve??'short',flip:pose?.flip??((p.dx??g.direction(p.t))<0),rotation,scaleX:pose?.scaleX??1,scaleY:pose?.scaleY??1,back:pose?.back??false,backNumber:number,gloves:p.i===0?'#eefaf2':null,size:p.i===0?46:44});
    if(!rotation&&(!pose||pose.scaleX>.7&&pose.scaleY>.8)){ctx.font='900 10px Impact, Arial Narrow, sans-serif';ctx.textAlign='center';ctx.fillStyle=g.numberInk?.[p.t]??'#fafbec';ctx.fillText(String(number),x,y-3)}
    if(selected){ctx.fillStyle='#ecffd5';ctx.font='900 13px Impact, Arial Narrow, sans-serif';ctx.fillText(`${number}号`,x,y-41);ctx.fillStyle='#17341d';ctx.fillRect(x-12,y+15,24,3);ctx.fillStyle='#caff70';ctx.fillRect(x-12,y+15,24*p.stamina,3)}
    if(g.stats[id].yellows){ctx.fillStyle='#ffe273';ctx.fillRect(x+11,y-25,5,8)}
  }
  if(!g.replayView&&g.charge>0){ctx.fillStyle='#14251c';ctx.fillRect(player.x-18,player.y+23,36,5);ctx.fillStyle='#d5ff78';ctx.fillRect(player.x-18,player.y+23,36*g.charge,5)}
  if(g.practice){const shot=g.shotLog.length>g.startShot?g.shotLog.at(-1):null;if(shot){ctx.strokeStyle='#ffe29c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(FIELD.left+shot.x*FIELD.width,FIELD.top+shot.y*FIELD.height);ctx.lineTo(shot.end?FIELD.left+shot.end.x*FIELD.width:g.ball.x,shot.end?FIELD.top+shot.end.y*FIELD.height:g.ball.y);ctx.stroke();if(shot.aim){ctx.strokeStyle='#caff70';ctx.strokeRect(FIELD.left+shot.aim.x*FIELD.width-5,FIELD.top+shot.aim.y*FIELD.height-5,10,10)}}if(g.options.assist&&g.ball.kind==='cross'&&g.ball.z>0){const b=g.ball,t=(b.vz+Math.sqrt(b.vz*b.vz+630*b.z))/315,travel=(1-Math.exp(-.58*t))/.58,x=Math.max(FIELD.left,Math.min(FIELD.right,b.x+b.vx*travel)),y=Math.max(FIELD.top,Math.min(FIELD.bottom,b.y+b.vy*travel));ctx.strokeStyle='#8fdbff';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(x,y,18,10,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}}
  const b=g.ball,x=Math.round(b.x),y=Math.round(b.y);ctx.fillStyle='#16372a77';ctx.fillRect(x-4,y+4,10,4);ctx.fillStyle='#f9f8df';ctx.fillRect(x-5,y-5-Math.round(b.z),10,10);ctx.fillStyle='#324135';ctx.fillRect(x-1,y-2-Math.round(b.z),3,3);ctx.fillRect(x-4,y+1-Math.round(b.z),2,2);
  ctx.fillStyle='#c4dca9';ctx.font='10px monospace';ctx.fillText(g.direction(0)===1?`${g.teams[0]} →     ← ${g.teams[1]}`:`← ${g.teams[0]}     ${g.teams[1]} →`,f.mid,f.canvasHeight-10);
}
