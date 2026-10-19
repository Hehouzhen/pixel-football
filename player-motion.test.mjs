import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceBodyFacing,bodyPose,strikePose,angleDelta} from './player-motion.mjs';
import {Match} from './engine.mjs';
import {captureFrame,replaySample} from './replay.mjs';

test('turning follows the shorter arc and converges without changing movement input',()=>{
 const run=dt=>{const p={dx:-1,dy:0,bodyAngle:0};advanceBodyFacing(p,dt,1);assert(Math.abs(p.bodyAngle)<Math.PI);for(let t=dt;t<.2-1e-8;t+=dt)advanceBodyFacing(p,dt,1+t);assert.equal(p.dx,-1);assert.equal(p.dy,0);return p.bodyAngle};
 assert(Math.abs(angleDelta(run(.01),run(.02)))<1e-8);assert(Math.abs(angleDelta(run(.01),Math.PI))<1e-8);assert(Math.abs(angleDelta(Math.PI-.01,-Math.PI+.01)-.02)<1e-8);
});

test('a kick records the real ball position and direction without delaying release',()=>{
 for(const half of [1,2]){const m=new Match(),p=m.players[5];m.half=half;m.ball.owner=5;m.ball.x=p.x+15;m.ball.y=p.y+7;
  const before={x:m.ball.x,y:m.ball.y};m.release(5,m.direction(0)*500,60);assert.equal(m.ball.owner,null);assert.equal(m.ball.x,before.x);assert.equal(m.ball.y,before.y);
  const strike=strikePose(p,m.time);assert(strike);assert(Math.abs(strike.x+p.kickDx*5-before.x)<1e-8);assert(Math.abs(strike.y+p.kickDy*5-before.y)<1e-8);
  p.dx=-p.kickDx;p.dy=-p.kickDy;const facing=bodyPose(p,m.time+.04);assert.equal(facing.flip,p.kickDx<0);assert.equal(strikePose(p,m.time+.3),null);
 }
});

test('headers and bicycles never draw ground-contact legs',()=>{
 const p={x:10,y:20,kickAt:1,kickType:'header',kickDx:1,kickDy:0,kickOriginX:20,kickOriginY:27,kickPlayerX:10,kickPlayerY:20};assert.equal(strikePose(p,1.01),null);p.kickType='bicycle';assert.equal(strikePose(p,1.01),null);
});

test('replay preserves kick contacts and interpolates facing across the angle boundary',()=>{
 const m=new Match();m.time=1;m.players[5].bodyAngle=Math.PI-.1;const a=captureFrame(m);m.time=2;m.players[5].bodyAngle=-Math.PI+.1;const b=captureFrame(m);
 const clip={frames:[a,b],scorer:5,team:0};const result=replaySample(clip,.95);assert(Math.abs(Math.abs(result.frame.players[5].bodyAngle)-Math.PI)<1e-8);
});
