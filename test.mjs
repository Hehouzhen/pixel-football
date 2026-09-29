import assert from 'node:assert/strict';
import {Match, FIELD} from './engine.mjs';
import {LEAGUES, fixtures, createSeason, currentFixture, completeWeek, standings, leaders} from './league.mjs';

const match = (options={}) => { const m=new Match({duration:120,...options}); m.state='playing'; return m; };
let m=match();
assert.equal(m.players.length,12);
assert.equal(FIELD.right-FIELD.left,880);
m.step(.02,[{x:1},{}]);assert(m.time>0);
m.state='paused';const frozen=m.time;m.step(.02);assert.equal(m.time,frozen);

m=match();assert(m.kick(m.selected[0]));assert.equal(m.passes[0],1);
m=match();assert(m.cross(m.selected[0]));assert(m.ball.z>0&&m.ball.vz>0);assert.equal(m.crosses[0],1);
m.players[5].x=m.ball.x;m.players[5].y=m.ball.y;m.ball.z=20;
assert(m.aerial(5,true));assert.equal(m.stats[5].bicycles,1);assert.equal(m.shots[0],1);

m=match();m.ball={x:FIELD.right+1,y:FIELD.center,z:0,vx:100,vy:0,vz:0,owner:null,lock:1,last:0};m.step(.01);assert.deepEqual(m.score,[1,0]);
m=match();m.ball={x:500,y:FIELD.top-2,z:0,vx:0,vy:-100,vz:0,owner:null,lock:1,last:0};m.step(.01);assert.equal(m.event,'边线球');assert.equal(m.players[m.ball.owner].t,1);

m=match();m.players[5].x=100;m.players[5].y=FIELD.center;m.players[11].x=118;m.players[11].y=FIELD.center;m.players[11].dx=1;m.players[11].dy=0;m.ball.owner=11;m.selected[0]=5;m.tackle(0);assert.equal(m.fouls[0],1);assert.equal(m.stats[5].yellows,1);assert.equal(m.penalty.team,1);assert.match(m.event,/点球/);
m.wait=0;m.step(.02);assert.equal(m.penalty,null);assert.equal(m.ball.owner,null);
m.players[5].cool=0;m.players[5].x=100;m.players[11].x=118;m.ball.owner=11;m.tackle(0);assert.equal(m.stats[5].reds,1);assert.notEqual(m.selected[0],5);

m=match();m.time=59.99;m.step(.02);assert.equal(m.half,2);assert.equal(m.direction(0),-1);m.wait=0;m.time=119.99;m.step(.02);assert.equal(m.state,'ended');
for(let difficulty=0;difficulty<3;difficulty++){m=match({difficulty});for(let i=0;i<9000;i++)m.step(.02);assert.equal(m.state,'ended');assert(m.players.every((p,id)=>!m.active(id)||(Number.isFinite(p.x)&&p.x>=FIELD.left&&p.x<=FIELD.right)));assert(m.shots[1]>0,'opponent must attack when user is idle')}
assert.equal(match({difficulty:0}).pressers(1),1);assert.equal(match({difficulty:2}).pressers(1),3);assert.equal(match({tactic:'press'}).pressers(0),3);assert.equal(match({tactic:'counter'}).pressers(0),1);

const league=LEAGUES[0],rounds=fixtures(league);assert.equal(rounds.length,10);assert.equal(new Set(rounds.flat().map(pair=>pair.join(':'))).size,30);
const season=createSeason(league.id,league.teams[0].id);for(let i=0;i<10;i++){assert(currentFixture(season));completeWeek(season,[2,1],Array.from({length:12},(_,j)=>({goals:j===5?2:0,assists:j===4?1:0})))}assert.equal(season.results.length,30);assert(standings(season).every(row=>row.played===10));assert.equal(currentFixture(season),undefined);assert(leaders(season)[0].goals>=20);
console.log('PASS: match flow, active AI, crosses, aerial shots, penalty, cards, boundaries, full season and leaderboards.');
