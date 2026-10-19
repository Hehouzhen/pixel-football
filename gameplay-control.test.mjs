import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Match,FIELD} from './engine.mjs';
import {handlePassInput} from './match-input.mjs';

function scene(careerIndex=3){
  const m=new Match({careerIndex});m.state='playing';m.kickoffId=null;
  m.players.forEach((p,id)=>{p.x=100+id*50;p.y=FIELD.top+20;p.stationary=true;p.cool=10});
  return m;
}
function requestScene(){
  const m=scene();m.players[3].x=600;m.players[3].y=FIELD.center;
  m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].cool=0;
  m.players[11].x=500;m.players[11].y=FIELD.center;
  m.ball={...m.ball,owner:5,x:411,y:FIELD.center,kind:null};return m;
}
function advance(m,seconds){for(let i=0;i<Math.ceil(seconds/.01);i++)m.step(.01)}

test('shielding stays continuous when a defender crosses the carrier centre line',()=>{
  for(const [dx,dy] of [[1,0],[0,1]]){const m=scene(null),p=m.players[5],r=m.players[11];p.x=500;p.y=FIELD.center;p.dx=dx;p.dy=dy;m.playerAttributes={5:{shielding:99}};m.ball={...m.ball,owner:5,last:0};
    const offsets=[];for(const side of [-.1,.1]){r.x=p.x+dx*30-dy*side;r.y=p.y+dy*30+dx*side;m.step(.01);offsets.push({x:m.ball.x-p.x,y:m.ball.y-p.y})}
    assert(Math.hypot(offsets[0].x-offsets[1].x,offsets[0].y-offsets[1].y)<.2,'a tiny defender movement must not flip the ball to the opposite foot');
  }
});
test('AI finishes the first touch before preparing a shot',()=>{
  const m=scene(),p=m.players[5];p.stationary=false;p.x=FIELD.right-150;p.y=FIELD.center;p.cool=0;p.settle=.2;m.ball={...m.ball,owner:5,last:0};m.players.slice(6).forEach(q=>{q.x=FIELD.left+10;q.y=FIELD.top+10});
  m.aiMove(5,p,[[],[]]);assert(!p.aiKick);p.settle=0;m.aiMove(5,p,[[],[]]);assert.equal(p.aiKick?.shoot,true);
});
test('AI squares a wide shooting opportunity to an unmarked teammate near goal in either half',()=>{
  for(const half of [1,2]){const m=scene(),p=m.players[5],q=m.players[4];m.half=half;const d=m.direction(0),goal=d===1?FIELD.right:FIELD.left;p.stationary=false;p.x=goal-d*220;p.y=FIELD.center+105;p.cool=0;q.x=goal-d*90;q.y=FIELD.center;m.ball={...m.ball,owner:5,last:0};m.players.filter(player=>player!==p&&player!==q).forEach(player=>{player.x=goal-d*600;player.y=FIELD.top+10});
    assert(m.shotTarget(5));m.aiMove(5,p,[[],[]]);assert.equal(p.aiKick?.shoot,false);assert.equal(p.aiKick?.target,4);
    p.aiKick=null;p.decisionCool=0;m.players[11].x=q.x;m.players[11].y=q.y-10;assert(m.shotTarget(5));m.aiMove(5,p,[[],[]]);assert.equal(p.aiKick?.shoot,true,'a marked teammate must not receive the automatic square pass');
  }
});

test('club Q can take over possession and cycles defenders instead of selecting itself',()=>{
  const m=scene(null);m.ball.owner=3;m.selected[0]=5;m.switch(0);assert.equal(m.selected[0],3);
  m.ball.owner=11;m.ball.x=500;m.ball.y=FIELD.center;
  for(const [id,x] of [[5,500],[4,480],[3,460],[2,100],[1,50]]){m.players[id].x=x;m.players[id].y=FIELD.center}
  m.selected[0]=5;m.switch(0);assert.equal(m.selected[0],4);m.switch(0);assert.equal(m.selected[0],3);m.switch(0);assert.equal(m.selected[0],5);
});
test('club takes over AI receptions and recovered possession; Career keeps its identity',()=>{
  for(const careerIndex of [null,3]){const m=scene(careerIndex);m.selected[0]=careerIndex??5;m.ball.owner=11;m.takeBall(4);assert.equal(m.selected[0],careerIndex??4)}
  const m=scene(null);m.selected[0]=5;m.ball={...m.ball,owner:null,kind:'pass',source:3,last:0};m.takeBall(4);assert.equal(m.selected[0],4);
});
test('club pass input cannot remotely make a different player pass',()=>{
  const m=scene(null);m.selected[0]=5;m.ball.owner=3;let kicks=0;m.kick=()=>{kicks++;return true};handlePassInput(m);assert.equal(kicks,0);assert.match(m.event,/接管/);
});
test('Career request survives a blocked lane and sends exactly once when it opens',()=>{
  const m=requestScene();assert(m.requestPass());assert.equal(m.passes[0],0);assert(m.passRequest);
  advance(m,.2);m.players[11].y=FIELD.top+20;advance(m,.05);assert.equal(m.passes[0],1);assert.equal(m.passRequest,null);assert.equal(m.ball.receiver,3);advance(m,.1);assert.equal(m.passes[0],1);m.takeBall(3);assert.match(m.requestFeedback.text,/已接到传球/);
});
test('requests expire or cancel on turnover, never firing later',()=>{
  const m=requestScene();assert(m.requestPass());advance(m,1.3);assert.equal(m.passRequest,null);m.players[11].y=FIELD.top+20;advance(m,.1);assert.equal(m.passes[0],0);
  const lost=requestScene();assert(lost.requestPass());lost.takeBall(11);assert.equal(lost.passRequest,null);assert.match(lost.requestFeedback.text,/球权/);
});
test('a quick-pass teammate prioritizes the pending human request over an unrelated outlet',()=>{
  const m=requestScene();m.players[5].stationary=false;m.playerTraits={5:['quickPass']};m.players[4].x=450;m.players[4].y=420;
  assert(m.requestPass());advance(m,.2);assert.equal(m.passes[0],0);m.players[11].y=FIELD.top+20;advance(m,.1);assert.equal(m.passes[0],1);assert.equal(m.ball.receiver,3);
});
test('a safe requested pass can reach a closely marked player',()=>{
  const m=requestScene();m.players[11].x=600;m.players[11].y=FIELD.center+15;
  assert.equal(m.passOption(5,3),null);assert(m.requestPass());assert.equal(m.passes[0],1);assert.equal(m.ball.receiver,3);
});
test('hold-up striker still makes a decision under sustained pressure',()=>{
  const m=scene();m.players[11].x=750;m.players[11].y=FIELD.center;m.players[11].cool=0;m.players[11].stationary=false;m.players[11].heldSince=0;
  m.players[10].x=690;m.players[10].y=450;m.players[5].x=730;m.players[5].y=FIELD.center;
  m.playerTraits={11:['holdUp']};m.ball={...m.ball,owner:11,x:739,y:FIELD.center,last:1};
  advance(m,1);assert(m.passes[1]>0||m.shots[1]>0,'pressure must not reset the decision timer forever');
});
test('quick-pass preparation completes instead of restarting on every frame',()=>{
  const m=scene();m.players[11].x=750;m.players[11].y=FIELD.center;m.players[11].cool=0;m.players[11].stationary=false;
  m.players[10].x=690;m.players[10].y=450;m.players[5].x=730;m.players[5].y=FIELD.center;
  m.playerTraits={11:['quickPass']};m.ball={...m.ball,owner:11,x:739,y:FIELD.center,last:1};advance(m,.2);assert.equal(m.passes[1],1);
});
test('an open shot takes priority over an automatic give-and-go return',()=>{
  const m=scene();m.players[11].x=200;m.players[11].y=FIELD.center;m.players[11].cool=0;m.players[11].stationary=false;
  m.players[10].x=150;m.players[10].y=FIELD.center+60;
  m.ball={...m.ball,owner:11,x:189,y:FIELD.center,last:1};m.giveGo={id:10,receiver:11,until:2.4};advance(m,.12);assert.equal(m.shots[1],1);
});
test('all-AI match does not acquire a human controller on reception',()=>{
  const m=scene(null);m.selected[0]=-1;m.takeBall(4);assert.equal(m.selected[0],-1);
});
test('AI-only play survives kickoffs, halftime resets and dead-ball restarts',()=>{
  const m=scene(null);m.selected[0]=-1;m.reset(0);assert.equal(m.selected[0],-1);
  m.reset(1);assert.equal(m.selected[0],-1);m.restart(0,400,FIELD.center,'任意球',0);assert.equal(m.selected[0],-1);
  m.penalty={team:0};m.state='playing';m.step(.01);assert.equal(m.shots[0],1);
});
test('pass and request buttons cannot turn a penalty into an unintended shot',()=>{
  const m=requestScene();m.penalty={team:0};assert.equal(m.requestPass(),false);handlePassInput(m);assert.equal(m.shots[0],0);assert.equal(m.passes[0],0);assert.equal(m.passRequest,null);
});
test('club off-ball pass feedback distinguishes opposition possession from a loose ball',()=>{
  const m=scene(null);m.ball.owner=11;handlePassInput(m);assert.match(m.event,/对方持球/);m.ball.owner=null;handlePassInput(m);assert.match(m.event,/尚未被控制/);assert.equal(m.passes[0],0);m.ball.owner=0;handlePassInput(m);assert.match(m.event,/门将正在准备出球/);
});
test('one simulation step cannot execute a chain of opposing steals',()=>{
  const original=Math.random;try{Math.random=()=>0;const m=scene();m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=1;m.players[5].cool=0;m.players[5].tackleTarget=11;m.players[5].tackleWindup=0;
    m.players[11].x=420;m.players[11].y=FIELD.center;m.players[11].dx=-1;
    m.players[9].x=430;m.players[9].y=FIELD.center;m.players[9].cool=0;m.players[9].tackleTarget=5;m.players[9].tackleWindup=0;
    m.ball={...m.ball,owner:11,x:409,y:FIELD.center,last:1};m.step(.01);
    assert.equal(m.stats.reduce((sum,s)=>sum+s.tackles,0),1);assert.equal(m.ball.owner,5);assert(m.players[11].tackleRecovery>0);
  }finally{Math.random=original}
});
test('loose-ball collection chooses the closer player instead of blue array order',()=>{
  const m=scene();m.players[5].x=492;m.players[5].y=FIELD.center;m.players[5].cool=0;
  m.players[9].x=503;m.players[9].y=FIELD.center;m.players[9].cool=0;
  m.ball={x:500,y:FIELD.center,z:0,vx:0,vy:0,vz:0,owner:null,lock:0,last:1,kind:'pass',source:null};m.step(.001);assert.equal(m.ball.owner,9);
});
test('a restart resets outward facing so a corner does not immediately go out again',()=>{
  const m=scene(null);m.players.forEach(p=>{p.dx=0;p.dy=-1});m.restart(0,FIELD.right-8,FIELD.top+8,'角球',0);
  m.step(.01);assert(m.ball.y>=FIELD.top);assert.equal(m.events.filter(e=>e.text==='角球').length,1);
});
test('pressured carrier has an escape when every teammate is tightly covered',()=>{
  const m=scene();m.players[11].cool=0;m.players[11].stationary=false;m.players[11].heldSince=0;
  for(let i=0;i<150;i++){m.players[11].x=500;m.players[11].y=FIELD.center;m.players[5].x=530;m.players[5].y=FIELD.center;
    for(const [a,b,x,y] of [[7,1,400,200],[8,2,420,420],[9,3,450,150],[10,4,480,450]]){m.players[a].x=m.players[b].x=x;m.players[a].y=m.players[b].y=y}
    if(!m.passes[1])m.ball={...m.ball,owner:11,x:489,y:FIELD.center,last:1};m.step(.01);
  }assert(m.passes[1]>0,'the carrier must eventually play away from a blocked cluster');
});


test('carried ball turns continuously and converges without oscillation',()=>{
  const m=scene(null),p=m.players[5];m.selected[0]=5;p.x=500;p.y=FIELD.center;p.dx=1;p.dy=0;m.ball={...m.ball,owner:5,last:0};
  m.step(.01);const start=m.ball.x;p.dx=-1;
  m.step(.01);assert(Math.abs(m.ball.x-start)<8,'turn must not teleport the ball across the player');
  let previous=m.ball.x;
  for(let i=0;i<35;i++){m.step(.01);assert(m.ball.x<=previous+1e-8);previous=m.ball.x}
  assert(m.ball.x<p.x-8);assert(m.ball.x>p.x-18);
});

test('carry smoothing is consistent across frame rates and stable at rest',()=>{
  const run=dt=>{const m=scene(null),p=m.players[5];m.selected[0]=5;p.x=500;p.y=FIELD.center;p.dx=1;p.dy=0;m.ball={...m.ball,owner:5,last:0};m.step(.01);p.dx=0;p.dy=1;for(let i=0;i<Math.round(.4/dt);i++)m.step(dt);return [m.ball.x,m.ball.y]};
  const a=run(.01),b=run(.025);assert(Math.hypot(a[0]-b[0],a[1]-b[1])<.01);
});


test('wide support keeps its side when the carrier crosses the centre line',()=>{
  for(const half of [1,2]){const m=scene(null),holder=m.players[5];m.selected[0]=5;m.half=half;holder.y=FIELD.center-.1;holder.heldSince=m.time;m.ball.owner=5;
    const roles=m.attackRoles(0,holder),id=Number(Object.keys(roles).find(id=>roles[id]==='width'));
    const before=m.offBallTarget(id,holder,'width');holder.y=FIELD.center+.1;
    m.attackRoles(0,holder);const after=m.offBallTarget(id,holder,'width');assert(Math.abs(after.y-before.y)<1,'tiny carrier movement must not send the winger to the opposite touchline');
  }
});

test('successful slide retains recovery and cannot immediately tackle again',()=>{
  const original=Math.random;try{Math.random=()=>0;const m=scene(),p=m.players[5],q=m.players[11];p.x=420;p.y=FIELD.center;p.cool=0;q.x=400;q.y=FIELD.center;q.dx=1;m.ball.owner=11;
    assert(m.attemptTackle(5,false,true,true));assert.equal(m.ball.owner,5);assert(p.tackleRecovery>=.3);m.ball.owner=11;p.cool=0;assert.equal(m.canTackle(5),false);
    p.tackleRecovery=0;assert(m.canTackle(5));
  }finally{Math.random=original}
});

test('requested pass waits for the receiving touch and then sends once',()=>{
  const m=requestScene();m.players[11].y=FIELD.top+20;m.players[5].settle=.18;
  assert(m.requestPass());assert.equal(m.passes[0],0);advance(m,.1);assert.equal(m.passes[0],0);
  advance(m,.12);assert.equal(m.passes[0],1);assert.equal(m.passRequest,null);
});


function incomingPass(careerIndex=null){
  const m=scene(careerIndex),id=careerIndex??3;m.selected[0]=id;
  m.players[id].x=600;m.players[id].y=FIELD.center;m.players[id].cool=0;
  m.players[4].x=730;m.players[4].y=FIELD.center+65;
  m.ball={x:578,y:FIELD.center,z:0,vx:360,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,receiver:id};return m;
}

test('pass input before reception executes once in club and career',()=>{
  for(const mode of [null,3]){const m=incomingPass(mode);let accepted=0;handlePassInput(m,false,()=>accepted++);
    assert(m.pendingPass);assert.equal(accepted,1);assert.equal(m.passes[0],0);
    advance(m,.09);assert.equal(m.pendingPass,null);assert.equal(m.passes[0],1);assert.equal(m.ball.source,3);
    advance(m,.15);assert.equal(m.passes[0],1);
  }
});

test('one-touch pass preserves pointer aim and through intent',()=>{
  const m=incomingPass();m.pointer={x:650,y:FIELD.center+160};handlePassInput(m,true,()=>{},'through');
  m.pointer.y=FIELD.top;advance(m,.09);assert.equal(m.passes[0],1);assert(m.ball.vy>Math.abs(m.ball.vx));const through=incomingPass();handlePassInput(through,false,()=>{},'through');advance(through,.09);assert.equal(through.ball.passIntent,'through');
});

test('one-touch pass expires and never fires after an interception or manual switch',()=>{
  const slow=incomingPass();slow.ball.vx=10;handlePassInput(slow);advance(slow,.15);assert.equal(slow.pendingPass,null);slow.takeBall(3);advance(slow,.02);assert.equal(slow.passes[0],0);
  const lost=incomingPass();handlePassInput(lost);lost.takeBall(11);assert.equal(lost.pendingPass,null);lost.takeBall(3);advance(lost,.02);assert.equal(lost.passes[0],0);
  const switched=incomingPass();handlePassInput(switched);switched.switch(0);assert.equal(switched.pendingPass,null);
});

test('distant, outgoing and opposition balls do not queue a pass',()=>{
  for(const change of [m=>m.ball.x=500,m=>m.ball.vx=-360,m=>m.ball.last=1,m=>m.ball.z=12]){const m=incomingPass();change(m);handlePassInput(m);assert(!m.pendingPass);assert.equal(m.passes[0],0)}
});

test('club passer can prepare the intended receiver without remotely controlling other teammates',()=>{
  const m=incomingPass();m.selected[0]=5;m.ball.controlSource=5;handlePassInput(m);assert.equal(m.pendingPass?.id,3);advance(m,.09);assert.equal(m.passes[0],1);assert.equal(m.selected[0],3);
});

test('new possession re-evaluates the flank even when the same player regains the ball',()=>{
  const m=scene(null),p=m.players[5];m.selected[0]=5;p.y=FIELD.center-10;m.ball.owner=5;m.attackRoles(0,p);const side=m.rolePlanCache[0].wingSide;
  m.takeBall(11);p.y=FIELD.center+10;m.takeBall(5);m.attackRoles(0,p);assert.notEqual(m.rolePlanCache[0].wingSide,side);
});


test('a newer shot replaces the prepared pass; resets cancel it',()=>{
  const m=incomingPass();handlePassInput(m);assert(m.shoot(.5,{x:FIELD.right,y:FIELD.center}));assert.equal(m.pendingPass,null);advance(m,.09);assert.equal(m.shots[0],1);assert.equal(m.passes[0],0);
  for(const reset of [m=>m.reset(0),m=>m.restart(0,500,FIELD.top+7,'边线球',0)]){const m=incomingPass();handlePassInput(m);reset(m);assert.equal(m.pendingPass,null)}
  const unknown=incomingPass();unknown.selected[0]=5;unknown.ball.controlSource=5;delete unknown.ball.receiver;assert.doesNotThrow(()=>handlePassInput(unknown));assert(!unknown.pendingPass);
});
