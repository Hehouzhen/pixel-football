import assert from 'node:assert/strict';
import {Match,FIELD} from './engine.mjs';
import {recordFrame,replaySample,replayLength} from './replay.mjs';
import {celebrationPose} from './celebration.mjs';
import {createCareerPlayer,finishCareerMatch} from './career.mjs';
import {createSeason,LEAGUES} from './league.mjs';
import {makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
const m=new Match({careerIndex:5,careerNumber:29});m.state='playing';
for(let i=0;i<1000;i++){m.time=93.333+i/60;m.players[5].x=600+i/10;recordFrame(m)}
assert(m.replayFrames.length<=182);assert(m.replayFrames.at(-1).time-m.replayFrames[0].time<=6);const recorded=m.replayFrames.at(-1).players[5].x;m.players[5].x=800;assert.equal(m.replayFrames.at(-1).players[5].x,recorded);
m.score=[0,1];m.time=110;m.duration=120;m.ball.owner=5;m.ball.x=FIELD.right+2;m.ball.y=FIELD.center;m.goal(0);
const clip=m.goalReplay;assert.equal(clip.scorer,5);assert.deepEqual(clip.score,[1,1]);assert(clip.labels.includes('扳平比分'));assert(clip.labels.includes('最后阶段进球'));assert.equal(clip.frames.at(-1).players[5].x,800);assert.notEqual(m.players[5].x,800,'capture before kickoff reset');
const chosen=new Match({careerIndex:5,careerLook:{celebration:2}});chosen.state='playing';chosen.lastStriker=5;chosen.goal(0);assert.equal(chosen.goalReplay.celebration,2,'MyCareer choice controls the replay celebration');
const live=JSON.stringify({players:m.players,ball:m.ball,stats:m.stats,score:m.score,time:m.time});for(const angle of [null,'wide','follow','goal'])for(let t=0;t<replayLength(clip);t+=.1){const r=replaySample(clip,t,angle);assert(Number.isFinite(r.x));assert(r.x>=FIELD.mid/r.zoom&&r.x<=FIELD.canvasWidth-FIELD.mid/r.zoom)}assert.equal(JSON.stringify({players:m.players,ball:m.ball,stats:m.stats,score:m.score,time:m.time}),live,'all camera samples preserve live game');
assert(replayLength(clip)<5,'one action replay and celebration should remain concise');let previous=-Infinity;for(let t=.45;t<replayLength(clip)-1.55;t+=.1){const r=replaySample(clip,t);assert(r.frame.time>=previous,'action replay must never rewind the shot');previous=r.frame.time}
assert.equal(replaySample(clip,1).camera,'wide');assert.equal(replaySample(clip,replayLength(clip)-.5).camera,'celebrate');
assert(celebrationPose(1,.8).dx>45&&celebrationPose(1,.8).scaleY<1&&celebrationPose(1,.8).dust,'slide celebration travels low across the turf');
assert(celebrationPose(2,.5).dy<-15&&celebrationPose(2,.5).scaleX===1&&celebrationPose(2,.5).back,'jump celebration turns without flattening');assert(celebrationPose(2,.7).flip,'airborne turn changes facing');assert.equal(celebrationPose(2,.9).row,0,'jump celebration lands in a crouch');assert.equal(celebrationPose(2,1.3).col,3,'jump celebration finishes grounded with both arms raised');
m.time+=1;m.ball.owner=11;m.goal(1);assert.notEqual(m.goalReplay,clip);assert.equal(m.goalReplay.scorer,11);assert.equal(clip.frames.at(-1).players[5].x,800);
const n=new Match();n.time=1;recordFrame(n);n.half=2;n.time=2;recordFrame(n);assert.equal(n.replayFrames.length,1,'do not replay across halftime teleport');n.shootoutMode=true;n.goal(0);assert.equal(n.goalReplay,undefined);
const p=finishCareerMatch(createCareerPlayer('回放测试',29,'forward'),m.stats[5],m.score,120,{report:m.report()});assert(p.memories[0].reasons.includes('关键进球'));const league=LEAGUES[0],season=createSeason(league.id,league.teams[0].id),backup=exportBackup({active:0,slots:[makeCareerSlot(season,p),null,null]});assert(importBackup(backup).slots[0].player.history[0].report.events.some(e=>e.labels?.includes('扳平比分')));assert(!backup.includes('replayFrames'));assert(!backup.includes('goalReplay'));
const bad=JSON.parse(backup);bad.slots[0].player.history[0].report.events.find(e=>e.type==='goal').labels=['虚构绝杀'];assert.throws(()=>importBackup(JSON.stringify(bad)));
console.log('PASS: bounded immutable recordings, actual pre-reset goal frame, all cameras, celebration, halftime, consecutive goals, shootouts and summary backup validation.');
