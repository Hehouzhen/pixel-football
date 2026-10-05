import {FIELD} from './field.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function captureFrame(m){return {time:m.time,half:m.half,players:m.players.map(p=>({...p})),ball:{...m.ball}}}
export function recordFrame(m,force=false){
 if(m.practice||m.shootoutMode)return;
 m.replayFrames??=[];if(m.replayFrames.at(-1)?.half!==m.half)m.replayFrames=[];
 if(!force&&m.time-(m.replayFrames.at(-1)?.time??-1)<1/30)return;
 m.replayFrames.push(captureFrame(m));while(m.replayFrames.length>182||m.time-m.replayFrames[0].time>6)m.replayFrames.shift();
}
export function freezeGoal(m,team){
 recordFrame(m,true);const scorer=m.goalCelebrant,shot=m.shotLog[m.ball.shotId],labels=[];
 if(m.score[team]===m.score[1-team])labels.push('扳平比分');else if(m.score[team]===m.score[1-team]+1&&m.score[1-team]>0)labels.push('反超比分');
 if(m.time/m.duration>=.88)labels.push('最后阶段进球');if(shot?.distance>=23)labels.push('远射破门');
 if(shot?.type==='header')labels.push('头球破门');if(shot?.type==='bicycle')labels.push('倒钩破门');if(shot?.type==='penalty')labels.push('点球破门');
 m.goalReplay={id:m.matchEvents.length,team,scorer,celebration:m.goalCelebration,minute:Math.min(90,Math.floor(m.time/m.duration*90)),score:[...m.score],labels,frames:m.replayFrames.map(f=>f)};
 const event=m.matchEvents.at(-1);if(event?.type==='goal'){event.score=[...m.score];event.labels=[...labels]}
 m.replayFrames=[];
}
export function replayLength(clip){return .45+Math.min(2.6,clip.frames.at(-1).time-clip.frames[0].time)+1.55}
export function replaySample(clip,elapsed,angle=null){
 const frames=clip.frames,start=frames[0].time,end=frames.at(-1).time,action=Math.min(2.6,end-start),celebrateAt=.45+action;
 let camera='goal',time=end,celebration=false;
 if(elapsed>=.45&&elapsed<celebrateAt){const progress=(elapsed-.45)/(action||1);camera=progress<.4?'wide':'follow';time=end-action+Math.min(action,elapsed-.45)}
 else if(elapsed>=celebrateAt){camera='celebrate';celebration=true}
 if(angle&&!celebration)camera=angle;
 let index=frames.findIndex(f=>f.time>=time);if(index<0)index=frames.length-1;
 const b=frames[index],a=frames[Math.max(0,index-1)],mix=clamp((time-a.time)/(b.time-a.time||1),0,1),lerp=(x,y)=>x+(y-x)*mix;
 const frame={...b,players:b.players.map((p,i)=>({...p,x:lerp(a.players[i].x,p.x),y:lerp(a.players[i].y,p.y),anim:lerp(a.players[i].anim,p.anim)})),ball:{...b.ball,x:lerp(a.ball.x,b.ball.x),y:lerp(a.ball.y,b.ball.y),z:lerp(a.ball.z,b.ball.z)}};
 if(celebration&&clip.scorer!==null){const p=frame.players[clip.scorer],phase=elapsed-celebrateAt;for(const q of frame.players){if(q.t===clip.team&&q!==p&&q.i!==0){const d=Math.hypot(q.x-p.x,q.y-p.y)||1,travel=Math.min(Math.max(0,d-25),phase*70);q.x+=(p.x-q.x)/d*travel;q.y+=(p.y-q.y)/d*travel;q.anim+=phase*8}}}
 const target=camera==='celebrate'?frame.players[clip.scorer]??frame.ball:camera==='goal'?{x:frame.ball.x<FIELD.mid?FIELD.left:FIELD.right,y:FIELD.center}:camera==='follow'?{x:frame.ball.x,y:frame.ball.y-frame.ball.z}: {x:FIELD.mid,y:FIELD.center},zoom=camera==='wide'?1:camera==='follow'?1.8:camera==='goal'?2.1:2.6;
 return {frame,camera,celebration,phase:Math.max(0,elapsed-celebrateAt),zoom,x:clamp(target.x,FIELD.mid/zoom,FIELD.canvasWidth-FIELD.mid/zoom),y:clamp(target.y,FIELD.center/zoom,FIELD.canvasHeight-FIELD.center/zoom)};
}
