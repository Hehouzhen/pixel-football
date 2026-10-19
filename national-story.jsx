import React,{useEffect,useRef,useState} from 'react';
import {drawSprite,onSpriteReady} from './player-sprite.mjs';
import {nationById} from './national-team.mjs';
import {getTeam} from './clubs.mjs';
import {nationalClubReturn} from './national-progression.mjs';

const styles=`.national-story{margin:20px 0 24px;max-width:720px}.national-story-frame{border:1px solid #657b73;background:#14242f;overflow:hidden}.national-story canvas{display:block;width:100%;height:auto;image-rendering:pixelated}.national-story h3{margin:16px 0 8px}.national-story p{margin:8px 0;line-height:1.8;color:#cbd9d2}.national-story-controls{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.national-story small{color:#c4cdbb}.national-return{margin:16px 0 22px;padding:18px 22px;background:#243730;border:1px solid #647c68;color:#d6e3d7}.national-return h3{margin:0 0 10px;color:#f0dfb6}.national-return p{line-height:1.8;font-size:13px;max-width:70ch}.national-return button{margin-top:6px}.national-moment-list{display:grid;gap:0;margin-top:22px}.national-moment-list button{padding:16px 0;text-align:left;border:0;border-bottom:1px solid #41575c;background:none;color:#d3dfd7;display:grid;gap:7px}.national-moment-list button:hover,.national-moment-list button:focus-visible{background:#243730}.national-moment-list strong{color:#efe2c3}.national-moment-list small{line-height:1.7;color:#bdcec4}.national-role-path{display:flex;gap:8px;flex-wrap:wrap;list-style:none;padding:0;margin:12px 0 22px}.national-role-path li{font-size:12px;padding:6px 0;color:#aebfb6}.national-role-path li[aria-current=step]{color:#d5ff78;font-weight:700;border-bottom:2px solid #d5ff78}@media(max-width:600px){.national-return{padding:14px}.national-story-controls button{flex:1 1 130px}.national-role-path{gap:12px}}`;
function drawMoment(ctx,event,player,team,t){
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)},kind=event.kind,look=player.appearance??{},kit=team?.color??'#bd3d41',celebrate=['goal','qualified'].includes(kind),outside=celebrate||kind==='debut';
 ctx.imageSmoothingEnabled=false;r(0,0,360,200,'#132530');
 if(outside){
  r(0,0,360,30,'#101e2a');r(0,30,360,43,'#233e4d');r(0,73,360,29,'#355161');
  for(let row=0;row<5;row++)for(let x=8;x<360;x+=12)r(x+row%2*4,34+row*12,3,3,['#6e7e83','#b79c71','#547276'][(x+row)%3]);
  r(0,100,360,6,'#c5b484');for(let x=0;x<360;x+=45)r(x,106,45,94,x%90?'#315a40':'#294e39');r(0,160,360,2,'#a3bca0');
  r(279,104,4,56,'#b5c8bb');r(279,104,63,3,'#d0d7c2');r(340,104,3,56,'#aabbb0');for(let x=285;x<340;x+=8)r(x,108,1,49,'#57716d');for(let y=112;y<160;y+=8)r(283,y,57,1,'#57716d');
  if(kind==='qualified'){r(130,28,100,31,'#0e1d26');r(140,36,31,14,kit);r(187,36,33,14,'#bdad76')}
  if(celebrate)for(let i=0;i<25;i++){const y=(i*17+Math.floor(t*17))%110;r((i*37)%350,y,2,4,i%2?'#d8bf77':'#d8e2d2')}
 }else if(kind==='eliminated'){
  r(0,0,360,200,'#12202a');r(105,13,150,155,'#233843');r(120,17,120,145,'#324951');r(138,18,84,132,'#101d27');r(138,18,84,4,'#b5b297');r(0,165,360,35,'#3b4344');for(let x=0;x<360;x+=24)r(x,180,18,1,'#65716a');
 }else{
  r(0,0,360,119,'#2a3d47');r(0,119,360,81,'#334c48');r(0,120,360,3,'#718174');
  for(let x=12;x<350;x+=58){r(x,18,48,102,'#1c303a');r(x+3,21,42,96,'#35505a');r(x+8,29,31,3,'#8a9b93');r(x+34,62,3,9,'#aab2a0')}
  r(20,147,112,8,'#9e825d');r(24,155,5,26,'#4d5145');r(122,155,5,26,'#4d5145');
  if(kind==='starter'){r(209,29,132,86,'#152c2c');r(215,35,120,74,'#35604b');r(218,70,114,1,'#9caf8e');r(275,39,1,66,'#9caf8e');for(const [x,y] of [[239,53],[239,89],[275,56],[306,73],[280,95]]){r(x,y,5,5,'#d8e6c7')}r(273,54,9,9,'#e2c370')}
  if(kind==='callup'){r(222,49,88,65,'#12252e');r(231,58,71,47,'#e9e1bf');r(242,69,47,3,'#687b6b');r(242,79,36,2,'#8c987f');r(242,87,42,2,'#8c987f');r(285,92,8,6,kit)}
  if(kind==='return'){r(229,58,65,45,team?.color??'#486580');r(240,52,42,7,'#a8b3a0');r(231,52,61,2,'#778a7e');r(235,75,51,3,'#233b45')}
 }
 const back=kind==='eliminated'||kind==='return',x=kind==='eliminated'?180:outside?173:155,y=outside?170:175,walk=kind==='eliminated'||kind==='return',row=celebrate?3:walk?1:0,col=celebrate?Math.floor(t*2)%6:walk?Math.min(5,Math.floor(t*3)):1;
 drawSprite(ctx,{x:x+(walk?Math.min(9,Math.floor(t*3)):0),y,row,col,kit,look,skin:look.skin,hair:look.hair,shoes:look.boots,hairstyle:look.hairstyle,size:86,back,backNumber:player.number});
 if(kind==='goal'){r(225,173,10,8,'#e8ead8');r(229,174,3,3,'#233039');r(225,179,3,2,'#233039')}
}
export function NationalMoment({event,player,clubTeam,onSeen,replay=false}){
 const ref=useRef(null),[run,setRun]=useState(0),[done,setDone]=useState(false),nation=nationById(player.international?.nationId),team=event.kind==='return'?getTeam(event.teamId)??clubTeam??nation:nation;
 useEffect(()=>{let alive=true,frame,last=performance.now(),elapsed=0;const canvas=ref.current,ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const paint=now=>{if(!alive)return;elapsed=Math.min(3.2,elapsed+Math.min(.08,(now-last)/1000));last=now;drawMoment(ctx,event,player,team,reduced?3.2:elapsed);if(!reduced&&elapsed<3.2)frame=requestAnimationFrame(paint);else setDone(true)};
 const off=onSpriteReady(()=>{if(alive){last=performance.now();frame=requestAnimationFrame(paint)}});return()=>{alive=false;off();cancelAnimationFrame(frame)};
 },[event.id,run,player,team]);
 return <section className="national-story" aria-label="国家队故事画面"><style>{styles}</style><div className="national-story-frame"><canvas ref={ref} width="360" height="200" role="img" aria-label={event.title}/></div><h3>{event.title}</h3><p>{event.text}</p><small>{event.date??event.year} · {done?'这一刻已留下，可以继续比赛。':'像素故事 · 约3秒'}</small><div className="national-story-controls">{!replay&&onSeen&&<button className="subtle" onClick={()=>onSeen(event.id)}>跳过画面并继续</button>}<button className="subtle" onClick={()=>{setDone(false);setRun(v=>v+1)}}>重看这段画面</button></div></section>
}
export function NationalReturnBanner({player,season,onOpen}){const item=nationalClubReturn(player,season);if(!item?.active)return null;return <section className="national-return" aria-label="国家队归队安排"><style>{styles}</style><h3>国家队归来 · 俱乐部教练的安排</h3><p>{item.text}</p><p>{item.message}{item.restDays!==null?` 距最近一战${item.restDays}天，当前恢复状态${Math.round(item.readiness*100)}%。`:''}</p><button className="subtle" onClick={onOpen}>查看国家队经历</button></section>}
export {styles as nationalStoryStyles};
