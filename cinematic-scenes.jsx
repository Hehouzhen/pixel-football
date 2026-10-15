import React,{useEffect,useRef,useState} from 'react';
import {sceneSound} from './cinematic-sound.mjs';
import {drawSprite,onSpriteReady} from './player-sprite.mjs';
import {SCENE_LENGTH,sceneFrame,sceneKind} from './cinematic-timeline.mjs';

const EMPTY=[];
function drawScene(ctx,image,kind,time,player,team,cast,mobile){
 const f=sceneFrame(kind,time),look=player.appearance??{},kit=team?.color??'#85c9ed',width=640;
 ctx.save();ctx.imageSmoothingEnabled=false;if(mobile)ctx.translate(-80,0);
 const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)};
 const sprite=(x,y,size,options={})=>drawSprite(ctx,{x:Math.round(x),y:Math.round(y),size,row:0,col:0,kit,skin:look.skin,hair:look.hair,shoes:look.boots??'#f0b15c',hairstyle:look.hairstyle??0,look,...options});
 const cup=(x,y)=>{r(x-10,y,20,3,'#eed799');r(x-8,y+3,16,13,'#c39a4d');r(x-5,y+3,5,10,'#f4dc9b');r(x-14,y+3,4,10,'#c39a4d');r(x+10,y+3,4,10,'#c39a4d');r(x-12,y+12,8,3,'#c39a4d');r(x+4,y+12,8,3,'#c39a4d');r(x-3,y+16,6,10,'#dfbd6e');r(x-10,y+26,20,4,'#9c793f');r(x-12,y+30,24,5,'#233447')};
 r(0,0,width,360,'#233447');
 if(f.type==='academy'){
  r(0,54,640,48,'#52626a');r(0,99,640,24,'#b58970');r(0,120,640,12,'#d4ae80');r(501,62,16,16,'#ead6a0');
  for(let i=0;i<21;i++){const x=i*34,h=16+i*13%35;r(x,139-h,28,h,'#263844');if(i%3===0)r(x+4,145-h,3,4,'#ad9674')}
  r(0,140,640,20,'#122d32');for(let y=160;y<360;y+=14)r(0,y,640,14,y%28?'#315843':'#2b503e');
  for(let x=0;x<640;x+=24)r(x,144,1,22,'#5c7271');r(0,147,640,1,'#5c7271');r(0,164,640,1,'#708875');
  for(const x of [65,575]){r(x,43,3,120,'#203039');r(x-10,42,24,5,'#d8d6bc');r(x-8,47,20,2,'#9ba58c')}
  r(32,208,576,2,'#b2c4a2');r(83,264,474,2,'#b2c4a2');r(319,208,2,152,'#b2c4a2');
  sprite(200,230,42,{kit:'#b78970'});sprite(428,222,42);
  sprite(320,281,86,{back:true,backNumber:player.number??10,row:time<3?1:0,col:time<3?Math.floor(time*6)%4:0});
  r(348,292,8,7,'#efe9ce');r(350,294,3,3,'#465c4b');
 }else if(f.type==='tunnel'){
  r(0,0,640,360,'#111f2d');r(160,35,320,240,'#233447');r(182,59,276,173,'#52626a');
  for(let row=0;row<7;row++)for(let x=184;x<458;x+=10)r(x,79+row*8,6,3,(row+x)%3?'#6b7881':kit);
  r(182,140,276,95,'#244939');for(let y=145;y<231;y+=14)r(182,y,276,7,'#315843');r(184,197,272,2,'#b2c4a2');
  for(const x of [48,520]){r(x,0,72,280,'#243b3e');r(x+4,0,2,280,'#3b5151');r(x+10,51,50,5,kit);r(x+10,59,50,2,'#708875')}
  for(const x of [166,456]){r(x,27,16,211,'#152b2a');r(x+3,30,2,208,'#41654c')}
  r(0,276,640,84,'#243b3e');for(let y=284;y<360;y+=18)r(0,y,640,1,'#3b5151');r(164,237,312,39,'#3b5151');
  const moving=time<3||time>6,col=moving?Math.floor(time*7)%4:0,y=277-f.exit*60,size=96-Math.round(f.exit*24);
  sprite(238,265-f.exit*40,64,{back:true,backNumber:cast[0]?.number??6,row:moving?1:0,col,look:cast[0]?.appearance??{}});
  sprite(408,265-f.exit*40,64,{back:true,backNumber:cast[1]?.number??8,row:moving?1:0,col:(col+2)%4,look:cast[1]?.appearance??{}});
  sprite(320,y,size,{back:true,backNumber:player.number??10,row:moving?1:0,col});
 }else{
  r(0,0,640,256,'#111f2d');r(0,256,640,104,'#243b3e');for(let y=264;y<360;y+=16)r(0,y,640,1,'#3b5151');
  for(const x of [44,548]){r(x,24,48,230,kit);for(let i=0;i<5;i++)r(x+6+i*8,26,2,225,'#233447');r(x-4,20,56,4,'#708875')}
  r(160,37,320,74,'#243b3e');r(165,42,310,64,'#233447');r(185,59,270,3,'#708875');
  for(let i=0;i<8;i++)r(190+i*34,79,22,3,i%2?kit:'#52626a');
  if(f.type==='contract'){
   sprite(268,252,98,{row:0,col:0});
   sprite(393,252,98,{kit:'#263844',skin:'#d5a37b',hair:'#9ba58c',look:{},hairstyle:1});
   r(140,228,360,16,'#8f6b4e');r(146,244,348,43,'#604c3d');r(157,287,12,46,'#3d3b35');r(471,287,12,46,'#3d3b35');
   for(let x=154;x<486;x+=41)r(x,249,25,1,'#745941');
   r(282,226,69,23,'#d4ae80');r(284,225,65,21,'#efe9ce');r(290,230,47,1,'#9ba58c');r(290,234,35,1,'#9ba58c');
   for(let i=0;i<Math.floor(f.sign*32);i++)r(291+i,240+Math.round(Math.sin(i*.8)),1,1,'#233447');
   if(time>=1.5&&time<4){r(298+f.sign*27,233,2,8,'#233447');r(298+f.sign*27,241,2,2,'#d4ae80')}
   if(time>=4&&time<6){r(307,215,32,6,look.skin??'#d5a37b');r(336,214,13,8,'#d5a37b')}
   if(f.shirt>0){r(280,185,75,36,kit);r(270,188,12,13,kit);r(353,188,12,13,kit);r(310,185,15,5,'#efe9ce');ctx.fillStyle='#efe9ce';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.fillText(String(player.number??10),318,211)}
  }else{
   r(128,279,384,17,'#52626a');r(144,296,352,24,'#233447');r(167,320,306,9,'#708875');
   for(let i=0;i<(kind==='team'?4:2);i++)sprite([189,245,397,453][i],268,64,{row:time>5.7?3:0,col:Math.floor(time*4+i)%4,look:cast[i]?.appearance??{},kit});
   sprite(320,259,100,{row:3,col:f.lift<.25?0:f.lift<.65?1:3});
   cup(320,209-Math.round(f.lift*42));
   if(f.confetti>0)for(let i=0;i<48;i++)r(110+i*97%420,35+((time-5.8)*28+i*29)%240,2,3,[kit,'#ead6a0','#708875'][i%3]);
  }
 }
 ctx.restore();return f;
}

export function CinematicScene({player={},team,kind='contract',caption='',story=null,cast=EMPTY,controls=true,autoPlay=true,onComplete,cover=false,still=false,sound=false}){
 const type=sceneKind(kind),duration=SCENE_LENGTH[type],ref=useRef(null),stage=useRef(null),clock=useRef(0),paint=useRef(null),done=useRef(false),complete=useRef(onComplete),[playing,setPlaying]=useState(autoPlay),[time,setTime]=useState(0),[mobile,setMobile]=useState(false),[image,setImage]=useState(null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[reduced,setReduced]=useState(()=>still||matchMedia('(prefers-reduced-motion: reduce)').matches);
 complete.current=onComplete;
 useEffect(()=>{if(image&&playing&&!reduced&&sound)return sceneSound(type,clock.current)},[image,playing,reduced,sound,type]);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(still||query.matches);change();query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[still]);
 useEffect(()=>{const observer=new ResizeObserver(entries=>setMobile(entries[0].contentRect.width<500));if(stage.current)observer.observe(stage.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{let alive=true;clock.current=0;done.current=false;setTime(0);setPlaying(autoPlay);setImage(null);setError(false);const unsubscribe=onSpriteReady(()=>{if(alive)setImage(true)});return()=>{alive=false;unsubscribe?.()}},[type,retry]);
 useEffect(()=>{if(!image)return;let frame,last=performance.now(),lastUi=0;const ctx=ref.current?.getContext('2d');if(!ctx)return;
  paint.current=value=>drawScene(ctx,image,kind,value,player,team,cast,mobile);
  const tick=now=>{const dt=Math.min(.08,(now-last)/1000);last=now;if(playing&&!reduced)clock.current=Math.min(duration,clock.current+dt);const value=reduced?Math.min(duration,7):clock.current;paint.current(value);if(now-lastUi>100){lastUi=now;setTime(value)}if(clock.current>=duration&&!done.current){done.current=true;setPlaying(false);complete.current?.()}if(playing&&!reduced&&clock.current<duration)frame=requestAnimationFrame(tick)};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[image,kind,player,team,cast,mobile,playing,reduced,duration]);
 const seek=value=>{clock.current=value;done.current=false;setPlaying(false);setTime(value);paint.current?.(value)};
 const replay=()=>{clock.current=0;done.current=false;setTime(0);setPlaying(true)};
 return <figure className={`career-pixel-scene cinematic-scene${cover?' cinematic-cover':''}`} data-scene={type} data-ready={!!image} ref={stage}><div className="cinematic-stage" style={{aspectRatio:mobile?'4/3':'16/9'}}><canvas ref={ref} width={mobile?480:640} height="360" role="img" aria-label={caption||`${player.name??'球员'} · ${sceneFrame(kind,time).phase}`}/>{!image&&<div className="cinematic-loading" role="status">{error?<><span>场景画面暂未载入</span><button onClick={()=>setRetry(retry+1)}>重新载入</button></>:<span>正在打开这段足球记忆…</span>}</div>}<div className="cinematic-caption"><span>{team?.name??'PIXEL PITCH'}</span><strong>{story?.title??sceneFrame(kind,time).phase}</strong>{story&&<small>{story.detail}</small>}</div></div>{caption&&<figcaption>{caption}</figcaption>}{controls&&<div className="cinematic-controls"><button className="scene-playback" aria-label={playing?'暂停场景动画':'播放场景动画'} disabled={!image||reduced} onClick={()=>setPlaying(!playing)}>{playing?'暂停画面':'播放画面'}</button><button onClick={replay} disabled={!image||reduced}>从头重看</button><label>镜头进度<input type="range" aria-label="场景动画进度" min="0" max={duration} step="0.1" value={time} disabled={!image||reduced} onChange={event=>seek(+event.target.value)}/></label><small>{reduced?'已启用减少动态效果':`${time.toFixed(1)} / ${duration} 秒`}</small></div>}</figure>
}

export function ChronicleStudio({player,team,onBack}){const [kind,setKind]=useState('tunnel'),hero=player??{name:'林川',number:27,appearance:{skin:'#d3a179',hair:'#282c31',hairstyle:1}},club=team??{name:'PIXEL PITCH',color:'#c3444d',secondary:'#efe9d5'};return <section className="chronicle-studio"><div className="chronicle-title"><div><h2>镜头放映室</h2><p>从通道里的脚步，到属于你的那一刻。</p></div><button className="subtle" onClick={onBack}>返回游戏</button></div><nav aria-label="像素场景放映"><button aria-pressed={kind==='tunnel'} onClick={()=>setKind('tunnel')}>夜场入场</button><button aria-pressed={kind==='contract'} onClick={()=>setKind('contract')}>合同签约</button><button aria-pressed={kind==='team'} onClick={()=>setKind('team')}>冠军捧杯</button></nav><CinematicScene key={kind} kind={kind} player={hero} team={club} caption={`${hero.name} · ${hero.number}号 · 美术放映样片，非实际生涯荣誉记录`}/><p className="chronicle-note">人物外观与球衣跟随当前球员。可暂停、拖动进度检查关键帧，或重新播放。</p></section>}
