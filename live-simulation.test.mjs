import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match} from './engine.mjs';
import {PracticeMatch} from './practice.mjs';
import {enterLiveSimulation,takeOverSimulation,stepLiveSimulation,simulateMatchWithoutEntry} from './live-simulation.mjs';

test('simulation preserves career identity and stops at halftime and full time',()=>{
  const m=new Match({careerIndex:3,duration:8});m.interactiveHalftime=true;m.state='playing';
  enterLiveSimulation(m);
  for(let i=0;i<20&&m.state==='playing';i++)stepLiveSimulation(m,.016,{target:m.duration});
  assert.equal(m.state,'paused');assert.equal(m.halftimeBreak,true);assert.equal(m.careerIndex,3);assert.equal(m.selected[0],-1);
  const before=m.time;stepLiveSimulation(m,.04,{target:8});assert.equal(m.time,before);
  m.halftimeBreak=false;m.state='playing';
  for(let i=0;i<20&&m.state==='playing';i++)stepLiveSimulation(m,.016,{target:8});
  assert.equal(m.state,'ended');assert.ok(m.stats[3].playingSeconds>=7.9);takeOverSimulation(m);assert.equal(m.selected[0],3);
});
test('taking over restores club selection without changing result or time',()=>{
  const m=new Match();m.state='playing';const owner=m.ball.owner;
  m.pendingShot={id:owner};m.charge=1;enterLiveSimulation(m);
  assert.equal(m.pendingShot,null);assert.equal(m.charge,0);
  takeOverSimulation(m);assert.equal(m.selected[0],owner);assert.equal(m.time,0);assert.deepEqual(m.score,[0,0]);
});
test('practice simulation ends one attempt and retains the ten-attempt group',()=>{
  const m=new PracticeMatch();enterLiveSimulation(m);
  for(let i=0;i<30&&m.state==='playing';i++)stepLiveSimulation(m,.04,{target:m.duration});
  assert.equal(m.state,'ended');assert.equal(m.attempts.length,1);
  m.resetAttempt();assert.equal(m.state,'playing');assert.equal(m.attempts.length,1);
});

test('non-entry simulation reaches full time with AI control and preserves player identity',()=>{const m=new Match({careerIndex:4,duration:4});simulateMatchWithoutEntry(m);assert.equal(m.state,'ended');assert.equal(m.careerIndex,4);assert.equal(m.selected[0],4);assert.equal(m.journeySimulated,true);assert.ok(m.stats[4].playingSeconds>0)});
