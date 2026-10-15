import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from './engine.mjs';
import {handlePassInput} from './match-input.mjs';
import {teamSetup} from './team-tactics.mjs';

function scene(careerIndex=3){
 const m=new Match({careerIndex,teamSetups:[teamSetup({formation:'1-2-2'})]});m.state='playing';m.kickoffId=null;m.time=1;
 m.players.forEach((p,id)=>{p.x=100+id*25;p.y=FIELD.top+15;p.stationary=true;p.cool=0;p.settle=0});
 m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=1;m.players[5].heldSince=0;
 m.players[3].x=600;m.players[3].y=FIELD.center+60;
 m.ball={...m.ball,owner:5,x:411,y:FIELD.center+7,last:0};return m;
}
const advance=(m,seconds)=>{for(let i=0;i<Math.ceil(seconds/.01);i++)m.step(.01)};

test('脚下与身前要球使用不同的真实落点，保持生涯控制身份',()=>{
 for(const intent of ['feet','through']){const m=scene();let sounds=0;handlePassInput(m,false,()=>sounds++,intent);assert.equal(sounds,1);assert.equal(m.passes[0],1);assert.equal(m.ball.receiver,3);assert.equal(m.selected[0],3);assert.equal(m.ball.passIntent,intent);if(intent==='through'){assert(m.ball.receivePoint.x>m.players[3].x+80);assert.match(m.requestFeedback.text,/直塞/)}else assert.equal(m.ball.receivePoint.x,m.players[3].x)}
});
test('身前空间被封时不强传；脚下仍可接应，等待超时不会补发',()=>{
 const m=scene(),aim=m.passAim(m.players[5],m.players[3],'through');m.players[11].x=aim.x;m.players[11].y=aim.y;
 assert(m.requestPass(0,'through'));assert.equal(m.passes[0],0);assert(m.passRequest);assert.match(m.requestFeedback.text,/身前线路受阻/);advance(m,1.3);assert.equal(m.passRequest,null);m.players[11].y=FIELD.top+15;advance(m,.1);assert.equal(m.passes[0],0);
 const feet=scene(),block=feet.passAim(feet.players[5],feet.players[3],'through');feet.players[11].x=block.x;feet.players[11].y=block.y;assert(feet.requestPass());assert.equal(feet.passes[0],1);
});
test('两个半场的直塞都朝本方进攻方向，点球时不可误触传球',()=>{
 for(const half of [1,2]){const m=scene(null);m.half=half;m.selected[0]=5;m.players[3].x=half===1?600:200;handlePassInput(m,false,()=>{},'through');assert.equal(m.passes[0],1);assert((m.ball.receivePoint.x-m.players[3].x)*m.direction(0)>60)}
 const m=scene();m.penalty={team:0};handlePassInput(m,false,()=>{},'through');assert.equal(m.passes[0],0);assert.equal(m.shots[0],0);
});
test('前插会等待封锁解除，打开通道后启动；短时间内不反复换跑动方向',()=>{
 const m=scene(),holder=m.players[5];holder.x=420;m.players[4].x=450;m.players[4].y=FIELD.center;
 for(let i=7;i<12;i++){m.players[i].x=470;m.players[i].y=FIELD.center+(i-9)*30}
 const blocked=m.offBallTarget(4,holder,'runner');assert.equal(blocked.go,false);assert(blocked.x<=holder.x+60);
 m.players.slice(6).forEach(p=>{p.x=FIELD.right-20;p.y=FIELD.top+15});m.time+=.5;const open=m.offBallTarget(4,holder,'runner');assert.equal(open.go,true);assert(open.x>blocked.x+70);
 m.players[4].y-=100;m.time+=.1;assert.equal(m.offBallTarget(4,holder,'runner').y,open.y);
});
test('安全保护球员传球后留在球后，不自动成为撞墙前插者',()=>{
 const m=scene(null);m.selected[0]=1;m.players[1].x=300;m.players[1].y=FIELD.center+50;m.ball={...m.ball,owner:1,x:311,y:FIELD.center+57};assert(m.kick(1,false,.4,5));assert.equal(m.giveGo,null);
});
test('AI 会把球送入已打开的前插通道，而不是只传到原地',()=>{
 const m=scene();m.players[4].x=600;m.players[4].y=FIELD.center-70;m.players[4].attackRun={holder:5,go:true};m.players[5].stationary=false;
 m.aiMove(5,m.players[5],[[],[]]);assert.equal(m.players[5].aiKick?.lead,'through');advance(m,.06);assert.equal(m.passes[0],1);assert.equal(m.ball.receiver,4);assert(m.ball.receivePoint.x>m.players[4].x+60);
});
test('回做后可以实际直塞前插队友，脚下接应和身前落点不混淆',()=>{
 const m=scene();m.players[3].x=430;m.players[3].y=FIELD.center+70;m.players[5].x=520;m.players[5].y=FIELD.center;m.players[4].x=650;m.players[4].y=FIELD.center-60;m.players[4].stationary=false;
 m.ball={...m.ball,owner:3,x:441,y:m.players[3].y+7};assert(m.kick(3,false,.4,5));for(let i=0;i<150&&m.ball.owner!==5;i++)m.step(.01);assert.equal(m.ball.owner,5);
 advance(m,.3);m.players[5].cool=0;assert(m.kick(5,false,.4,3));for(let i=0;i<150&&m.ball.owner!==3;i++)m.step(.01);assert.equal(m.ball.owner,3);
 handlePassInput(m,false,()=>{},'through');assert.equal(m.passes[0],3);assert.equal(m.ball.receiver,4);assert.equal(m.ball.passIntent,'through');assert(m.ball.receivePoint.x>m.players[4].x+60);for(let i=0;i<200&&m.ball.owner!==4;i++)m.step(.01);assert.equal(m.ball.owner,4);assert.equal(m.selected[0],3);
});
