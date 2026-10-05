import {PracticeMatch} from './practice.mjs';
await import('./news.test.mjs');
await import('./identity.test.mjs');
await import('./god-mode.test.mjs');
import {shotAdvice} from './experience.mjs';
await import('./experience-update.test.mjs');
await import('./career-story.test.mjs');
await import('./career-role.test.mjs');
await import('./tactics.test.mjs');
import assert from 'node:assert/strict';
import {Match, FIELD, keeperMistakeChance, shootoutWinner} from './engine.mjs';
import {keeperVisual} from './keeper-motion.mjs';
import {LEAGUES,LEGACY_LEAGUES,fixtures,createSeason,currentFixture,completeWeek,standings,leaders,seasonRounds,seasonSummary,leagueAwards,seasonRecords,simulate,simulateWeek} from './league.mjs';
import {startCup,cupNextMatch,cupStandings,completeCupMatch} from './cup.mjs';
import {SAVE_KEY,loadSaveData,makeClubSlot,saveSaveData,exportBackup,importBackup,makeCareerSlot} from './save-slots.mjs';
import {createCareerPlayer,finishCareerMatch,playerRating,careerObjective} from './career.mjs';

const match = (options={}) => { const m=new Match({duration:120,...options}); m.state='playing'; return m; };
let m=match();
assert.equal(m.players.length,12);
assert.equal(FIELD.right-FIELD.left,972);assert.equal(FIELD.bottom-FIELD.top,542);
m.step(.02,[{x:1},{}]);assert(m.time>0);
m.state='paused';const frozen=m.time;m.step(.02);assert.equal(m.time,frozen);

m=match();assert(m.kick(m.selected[0]));assert.equal(m.passes[0],1);
m=match();m.ball.owner=0;m.players[0].x=80;m.players[0].y=FIELD.center;m.players[1].x=210;m.players[1].y=200;m.players[2].x=210;m.players[2].y=390;m.players[6].x=190;m.players[6].y=200;assert(m.kick(0));assert(m.ball.vy>0,'keeper should pass toward the unmarked outlet');
m=match();m.ball.owner=0;for(let i=1;i<6;i++){m.players[i].x=210;m.players[i].y=FIELD.center}for(let i=6;i<12;i++){m.players[i].x=170;m.players[i].y=FIELD.center}assert(m.kick(0));assert(m.ball.vy<0,'keeper should clear wide if every outlet is marked');
assert(keeperMistakeChance(1,35,100,0,70)>keeperMistakeChance(.2,0,450,3,60));
assert(keeperMistakeChance(.5,20,200,1,60)>.2);
m=match();const keeper=m.players[6],edgeShot={x:keeper.x,y:keeper.y+25,z:0,kind:'shot',last:0};assert.equal(m.canCollect(keeper,edgeShot),false);edgeShot.y=keeper.y+9;assert.equal(m.canCollect(keeper,edgeShot),true);keeper.dive=.2;keeper.cool=0;edgeShot.y=keeper.y+22;assert.equal(m.canCollect(keeper,edgeShot),true);edgeShot.keeperDelay=.1;assert.equal(m.canCollect(keeper,edgeShot),false);
m=match();m.ball.owner=5;m.ball.x=840;m.ball.y=410;const guarded=m.keeperTarget(m.players[6],m.ball);assert(guarded[0]>875&&guarded[1]<m.ball.y,'keeper should guard the goal instead of shadowing the dribbler');
m=match();const trackingKeeper=m.players[6];trackingKeeper.dx=1;assert(keeperVisual(trackingKeeper,m.time,{x:FIELD.mid,kind:null},m.direction(1)).flip,'keeper must face the ball even while moving toward the net');m.ball={x:FIELD.right-150,y:FIELD.center+30,vx:520,vy:0,kind:'shot',last:0,keeperDelay:0};m.keeperTarget(trackingKeeper,m.ball);assert.equal(trackingKeeper.diveAt,m.time);assert.equal(trackingKeeper.diveSide,1);assert.equal(keeperVisual(trackingKeeper,m.time+.04,m.ball,m.direction(1)).pose,'load');assert.equal(keeperVisual(trackingKeeper,m.time+.2,m.ball,m.direction(1)).pose,'reach');assert.equal(keeperVisual(trackingKeeper,m.time+.35,m.ball,m.direction(1)).pose,'land');
m=match();const catchingKeeper=m.players[6];m.ball={x:catchingKeeper.x-5,y:FIELD.center,z:0,vx:500,vy:0,kind:'shot',last:0,source:5,owner:null};m.takeBall(6);assert.equal(catchingKeeper.saveKind,'catch');assert.equal(keeperVisual(catchingKeeper,m.time+.1,m.ball,m.direction(1)).pose,'catch','a caught shot must remain visible briefly');
const originalRandom=Math.random;
try{Math.random=()=>0;m=match();m.players[5].x=810;m.players[5].y=FIELD.center;m.ball.owner=5;m.selected[0]=5;assert(m.kick(5,true,1,{x:FIELD.right,y:FIELD.center+40}));assert.equal(m.ball.keeperError,true);for(let i=0;i<80&&m.score[0]===0;i++)m.step(.02);assert.equal(m.score[0],1,'delayed keeper should miss a well placed corner shot');
Math.random=()=>1;m=match();m.players[5].x=700;m.players[5].y=FIELD.center;m.ball.owner=5;m.selected[0]=5;assert(m.kick(5,true,1));assert.equal(m.ball.keeperError,false);for(let i=0;i<80&&m.saves[1]===0;i++)m.step(.02);assert.equal(m.saves[1],1,'keeper should still save when no error occurs')}finally{Math.random=originalRandom}
m=match();assert(m.cross(m.selected[0]));assert(m.ball.z>0&&m.ball.vz>0);assert.equal(m.crosses[0],1);
m.players[5].x=m.ball.x;m.players[5].y=m.ball.y;m.players[5].cool=0;m.ball.z=20;
assert(m.aerial(5,true,{x:FIELD.right,y:FIELD.center+30}));assert.equal(m.stats[5].bicycles,1);assert.equal(m.shots[0],1);assert(m.ball.vy>0);

m=match();m.ball={x:FIELD.right+1,y:FIELD.center,z:0,vx:100,vy:0,vz:0,owner:null,lock:1,last:0};m.step(.01);assert.deepEqual(m.score,[1,0]);
m=match();m.ball={x:500,y:FIELD.top-2,z:0,vx:0,vy:-100,vz:0,owner:null,lock:1,last:0};m.step(.01);assert.equal(m.event,'边线球');assert.equal(m.players[m.ball.owner].t,1);

m=match();m.players[5].x=100;m.players[5].y=FIELD.center;m.players[11].x=118;m.players[11].y=FIELD.center;m.players[11].dx=1;m.players[11].dy=0;m.ball.owner=11;m.selected[0]=5;m.tackle(0);assert.equal(m.fouls[0],1);assert.equal(m.stats[5].yellows,0);assert.equal(m.penalty.team,1);assert.match(m.event,/点球/);
m.wait=0;m.step(.02);assert.equal(m.penalty,null);assert.equal(m.ball.owner,null);
m.foul(5,11);assert.equal(m.stats[5].yellows,1);assert.equal(m.stats[5].reds,0);
m.foul(5,11);assert.equal(m.stats[5].yellows,1);m.foul(5,11);assert.equal(m.stats[5].reds,1);assert.notEqual(m.selected[0],5);

m=match();m.players[5].x=700;m.players[5].y=FIELD.center;m.ball.owner=5;m.ball.x=700;m.ball.y=FIELD.center;m.selected[0]=5;
for(let i=6;i<12;i++)m.players[i].x=100;for(let i=0;i<10;i++)m.step(.04,[{shoot:true,y:-1},{}]);
assert(m.players[5].y<FIELD.center,'WASD must still move while charging');assert(m.charge>0);
const target={x:FIELD.right,y:FIELD.center-35},shooter=m.players[5];
assert(m.kick(5,true,m.charge,target));assert(Math.abs(m.ball.vy/m.ball.vx-(target.y-shooter.y)/(target.x-shooter.x))<.001);assert.equal(m.charge,0);
m=match();m.half=2;m.reset(0);assert(m.kick(m.selected[0],true,.5,{x:FIELD.left,y:FIELD.center+20}));assert(m.ball.vx<0,'mouse aim must work after halftime');

m=match();m.players[6].x=FIELD.right-30;m.players[6].y=FIELD.center;m.foul(6,5);m.wait=0;
const taker=m.ball.owner;m.step(.04,[{shoot:true,y:1},{}]);assert(m.charge>0);assert(m.kick(taker,true,m.charge,{x:FIELD.right,y:FIELD.center+35}));assert.equal(m.penalty,null);assert(m.ball.vy>0);
m=match({careerIndex:1});m.players[6].x=FIELD.right-30;m.players[6].y=FIELD.center;m.foul(6,5);assert.notEqual(m.ball.owner,m.selected[0]);m.wait=0;m.step(.02);assert.equal(m.penalty,null);

m=match();m.time=59.99;m.step(.02);assert.equal(m.half,2);assert.equal(m.direction(0),-1);m.wait=0;m.time=119.99;m.step(.02);assert.equal(m.state,'ended');
try{for(let difficulty=0;difficulty<4;difficulty++){let aiSeed=123;Math.random=()=>((aiSeed=(Math.imul(aiSeed,1664525)+1013904223)>>>0)/4294967296);m=match({difficulty});for(let i=0;i<9000;i++)m.step(.02);assert.equal(m.state,'ended');assert(m.players.every((p,id)=>!m.active(id)||(Number.isFinite(p.x)&&p.x>=FIELD.left&&p.x<=FIELD.right)));assert(m.shots[1]>0,'opponent must attack when user is idle')}}finally{Math.random=originalRandom}
assert.equal(match({difficulty:0}).pressers(1),1);assert.equal(match({difficulty:2}).pressers(1),2);assert.equal(match({tactic:'press'}).pressers(0),3);assert.equal(match({tactic:'counter'}).pressers(0),1);

m=match({careerIndex:1,careerAttributes:{shooting:52,passing:58,defense:70}});assert.equal(m.selected[0],1);m.ball.owner=5;assert(m.requestPass());assert.equal(m.selected[0],1);assert.equal(m.stats[5].passes,1);m.reset(1);assert.equal(m.selected[0],1);
for(let i=0;i<9000;i++)m.step(.02);assert.equal(m.state,'ended');assert.equal(m.selected[0],1);
let player=createCareerPlayer('测试球员',4,'defender');player.xp=95;player=finishCareerMatch(player,{tackles:3,passes:4,passesCompleted:3,distance:80},[1,0],180);assert.equal(player.level,2);assert.equal(player.attributes.defense,72);assert.equal(player.stats.appearances,1);assert.equal(player.stats.tackles,3);

assert.equal(LEAGUES.length,5);
for(const league of LEAGUES){assert.equal(league.teams.length,8);assert.equal(fixtures(league).length,14);assert.equal(new Set(fixtures(league).flat().map(pair=>pair.join(':'))).size,56)}
assert.equal(fixtures(LEGACY_LEAGUES[0]).length,10);
const league=LEAGUES[0],season=createSeason(league.id,league.teams[0].id);
season.names[`${season.teamId}:5`]='测试球员';
for(let i=0;i<seasonRounds(season);i++){assert(currentFixture(season));completeWeek(season,[5,0],Array.from({length:12},(_,j)=>({goals:j===5?5:0,assists:j===4?1:0})),{shots:[7,2],onTarget:[5,1],passes:[40,28],passesCompleted:[31,19],crosses:[3,2],tackles:[5,4],fouls:[1,2],yellows:[0,1],reds:[0,0],saves:[1,0]})}
assert.equal(season.results.length,56);
assert(standings(season).every(row=>row.played===14));
assert.equal(currentFixture(season),undefined);
assert.equal(standings(season)[0].id,season.teamId);
assert.equal(leaders(season)[0].name,'测试球员');
assert.equal(seasonSummary(season).saves,14);
assert.equal(season.awards.champion,season.teamId);
assert.equal(leagueAwards(season).goldenBoot.name,'测试球员');
assert.equal(seasonRecords(season).winStreak,14);
for(const other of LEAGUES.slice(1))assert.equal(standings(season,other.id).reduce((n,r)=>n+r.played,0),112);
startCup(season);assert.equal(season.cup.teams.length,10);assert(season.cup.teams.includes(season.teamId));
assert.equal(cupStandings(season).length,10);
let played=0;while(cupNextMatch(season)){const shootout=season.cup.phase==='league'?null:{winner:season.teamId,score:[5,4]};completeCupMatch(season,season.cup.phase==='league'?[2,0]:[1,1],null,null,shootout);played++}
assert.equal(played,6);assert.equal(season.cup.phase,'complete');assert.equal(season.cup.champion,season.teamId);assert.equal(season.cup.results.length,23);
assert.equal(season.cup.names[`${season.teamId}:5`],'测试球员');
const storage={values:new Map(),getItem(k){return this.values.get(k)??null},setItem(k,v){this.values.set(k,v)}};
saveSaveData({version:2,active:0,slots:[makeClubSlot(season),null,null]},storage);assert.equal(loadSaveData(storage).slots[0].season.cup.champion,season.teamId);
const legacy={leagueId:LEGACY_LEAGUES[0].id,teamId:LEGACY_LEAGUES[0].teams[0].id,week:4,results:[],players:{}};
storage.setItem(SAVE_KEY,JSON.stringify({version:2,active:0,slots:[makeClubSlot(legacy),null,null]}));assert.equal(loadSaveData(storage).slots[0].season.week,4);
m=match({careerIndex:5,careerNumber:27,careerLook:{skin:'#805b48',hair:'#302b24'},styles:['press','counter']});assert.equal(m.careerNumber,27);assert.equal(m.careerLook.skin,'#805b48');assert.equal(m.styles[1],'counter');
console.log('PASS: match flow, AI, career identity, five leagues, stats, cup and local saves.');

// Rule regressions: mistakes change reactions, not physical collection; restarts preserve stamina.
m=match();m.players[5].stamina=.23;m.goal(1);assert.equal(m.players[5].stamina,.23);m.reset(0);assert.equal(m.players[5].stamina,.23);
m=match();const physicalKeeper=m.players[6];assert(m.canCollect(physicalKeeper,{x:physicalKeeper.x,y:physicalKeeper.y,z:0,kind:'shot',last:0,keeperError:true}));
assert.equal(match({difficulty:0}).aiLevel(0),match({difficulty:3}).aiLevel(0));assert.notEqual(match({difficulty:0}).aiLevel(1),match({difficulty:3}).aiLevel(1));
m=match({careerIndex:1});m.ball.owner=5;const receiving=m.players[1],passing=m.players[5];for(let i=6;i<12;i++){m.players[i].x=(receiving.x+passing.x)/2;m.players[i].y=(receiving.y+passing.y)/2}assert.equal(m.requestPass(),false);assert.equal(m.ball.owner,5);assert.equal(m.wait,0);assert.match(m.event,/线路受阻/);
m=match();m.tackles[1]=7;m.players[11].x=495;m.players[11].y=FIELD.center;m.players[11].cool=0;m.players[5].x=480;m.players[5].y=FIELD.center;m.players[5].dx=1;m.ball.owner=5;m.ball.x=491;m.ball.y=FIELD.center;m.kickoffGrace=0;m.step(.01);assert.equal(m.fouls[1],0,'the eighth legal tackle must not force a foul');
m=match();m.time=59.99;m.players[5].stamina=.1;m.step(.02);assert(m.players[5].stamina>.4&&m.players[5].stamina<.6);
// Shots and penalties share trajectories, saves and misses; a wide penalty is terminal, not a corner.
try{Math.random=()=>0;m=match();m.beginShootoutKick(0);assert(m.kick(5,true,1,{x:FIELD.right,y:FIELD.center+45}));for(let i=0;i<200&&m.state==='playing';i++)m.step(.02);assert.equal(m.shotOutcome,true);assert.equal(m.time,0);
m=match();m.beginShootoutKick(0);m.kick(5,true,1,{x:FIELD.right,y:FIELD.center+130});for(let i=0;i<200&&m.state==='playing';i++)m.step(.02);assert.equal(m.shotOutcome,false);
Math.random=()=>1;m=match();m.beginShootoutKick(1);for(let i=0;i<200&&m.state==='playing';i++)m.step(.02);assert.equal(m.state,'ended');assert.equal(typeof m.shotOutcome,'boolean')}finally{Math.random=originalRandom}
assert.equal(shootoutWinner(3,0,6),0);assert.equal(shootoutWinner(0,3,6),1);assert.equal(shootoutWinner(5,4,9),null);assert.equal(shootoutWinner(5,4,10),0);assert.equal(shootoutWinner(5,5,10),null);assert.equal(shootoutWinner(6,5,11),null);assert.equal(shootoutWinner(6,5,12),0);
assert(playerRating({tackles:3,interceptions:2},[0,0],'defender')>playerRating({tackles:3,interceptions:2},[0,0],'forward'));
assert.equal(playerRating({passesCompleted:1000},[0,0],'midfielder'),playerRating({passesCompleted:15},[0,0],'midfielder'));
player=createCareerPlayer('后防',8,'defender');player=finishCareerMatch(player,{tackles:2,playingSeconds:90},[0,0],180);assert(player.lastMatch.objective.complete);assert.equal(player.lastMatch.minutes,45);assert.equal(careerObjective('midfielder').field,'forwardPasses');
const one=simulate(league.teams[0].id,league.teams[1].id,0,undefined,111),two=simulate(league.teams[0].id,league.teams[1].id,0,undefined,999);assert.deepEqual(one,simulate(league.teams[0].id,league.teams[1].id,0,undefined,111));assert.notDeepEqual(one,two);
const backup={version:2,active:0,slots:[makeClubSlot(season),makeCareerSlot(createSeason(league.id,league.teams[0].id),player),makeClubSlot(legacy)]};assert.deepEqual(importBackup(exportBackup(backup)).slots[0].season.cup,backup.slots[0].season.cup);assert.equal(importBackup(exportBackup(backup)).slots[1].player.name,player.name);assert.equal(importBackup(exportBackup(backup)).slots[2].season.week,legacy.week);
assert.throws(()=>importBackup('{broken'));assert.throws(()=>importBackup(JSON.stringify({version:2,slots:[null]})));
let broken=structuredClone(backup);broken.slots[0].season.world.spain.results[0].score=[-1,0];assert.throws(()=>importBackup(exportBackup(broken)));
broken=structuredClone(backup);broken.slots[1].player.attributes.shooting=NaN;assert.throws(()=>importBackup(exportBackup(broken)));
console.log('PASS: fair keeper reactions, safe passing, stamina, position growth, shootouts and validated save backups.');

const oldPlayer=createCareerPlayer('旧球员',10,'midfielder');for(const field of ['forwardPasses','interceptions','tackleAttempts','playingSeconds'])delete oldPlayer.stats[field];const grown=finishCareerMatch(oldPlayer,{forwardPasses:4,tackleAttempts:2,interceptions:1},[0,0],120);assert.equal(grown.stats.forwardPasses,4);assert(Object.values(grown.stats).every(Number.isFinite));
m=match({careerIndex:1,careerNumber:27});m.beginShootoutKick(0);assert.equal(m.ball.owner,1);assert.equal(m.selected[0],1);

// Recorded outcomes, activity, history and new appearance survive validated backups.
m=match({careerIndex:5,careerNumber:27});m.lastPasser=3;m.kick(5,true,.7,{x:FIELD.right,y:FIELD.center});assert.equal(m.shotLog.length,1);assert.equal(m.stats[3].keyPasses,1);m.resolveShot('saved');m.resolveShot('goal');assert.equal(m.shotLog[0].outcome,'saved');m.takeBall(6);assert.equal(m.ball.shotId,undefined);
for(const result of ['goal','saved','wide','blocked']){m=match();m.kick(5,true,.6);m.resolveShot(result);assert.equal(m.report().shots[0].outcome,result)}
m=match();m.goal(0);assert.equal(m.shotLog.length,1);assert.equal(m.shotLog[0].outcome,'goal');assert.equal(m.stats[5].shots,1);
m=match();for(let i=0;i<25;i++)m.step(.016);assert(m.heat[5][0].some(n=>n>0));assert(m.heat[5][1].some(n=>n>0));const firstHeat=m.heat[5][0].reduce((a,b)=>a+b,0);m.half=2;for(let i=0;i<25;i++)m.step(.016);assert(m.heat[5][2].some(n=>n>0));assert.equal(m.heat[5][0].reduce((a,b)=>a+b,0),firstHeat);
assert.notEqual(careerObjective('forward',0).field,careerObjective('forward',1).field);assert(careerObjective('midfielder',0,300).target>careerObjective('midfielder',0,120).target);
const look={skin:'#ebbd89',hair:'#302b24',hairstyle:3,shoes:'#ffffff',sleeve:'long',celebration:1};let newPlayer=createCareerPlayer('复盘测试',27,'forward',look,'finisher');
m=match({careerIndex:5,careerNumber:27});m.kick(5,true,.8);m.goal(0);const recorded=m.report();newPlayer=finishCareerMatch(newPlayer,m.stats[5],m.score,120,{report:recorded,season:1,opponent:'测试队',objective:m.objective});assert.equal(newPlayer.history.length,1);assert(newPlayer.honors.includes('首次进球'));assert.equal(newPlayer.stats.goals,1);
const newBackup={version:2,active:0,slots:[makeCareerSlot(createSeason(league.id,league.teams[0].id),newPlayer),null,null]};assert.deepEqual(importBackup(exportBackup(newBackup)).slots[0].player,{...newPlayer,id:'p:arsenal:5'});
let invalid=structuredClone(newBackup);invalid.slots[0].player.history[0].report.shots[0].x=2;assert.throws(()=>importBackup(exportBackup(invalid)));invalid=structuredClone(newBackup);invalid.slots[0].player.appearance.hairstyle=20;assert.throws(()=>importBackup(exportBackup(invalid)));
for(let i=0;i<6;i++)newPlayer=finishCareerMatch(newPlayer,{},[0,0],120,{report:recorded});assert(newPlayer.history[0].report.heat,'career best performance retains its detailed report');assert(newPlayer.history.at(-1).report.heat);assert(recorded.heat,'history pruning must preserve the original report');
let archivePlayer=createCareerPlayer('年鉴',27,'forward');for(let i=0;i<45;i++)archivePlayer=finishCareerMatch(archivePlayer,{goals:1},[1,0],120,{season:i<30?1:2});assert.equal(archivePlayer.history.length,45);assert.equal(archivePlayer.seasonLedger[1].appearances,30);assert.equal(archivePlayer.seasonLedger[2].goals,15);assert.equal(archivePlayer.stats.goals,45);assert.equal(archivePlayer.history.at(-1).shooting,archivePlayer.attributes.shooting);
const archiveBackup={version:2,active:0,slots:[makeCareerSlot(createSeason(LEAGUES[0].id,LEAGUES[0].teams[0].id),archivePlayer),null,null]};assert.equal(importBackup(exportBackup(archiveBackup)).slots[0].player.history.length,45);const brokenLedger=structuredClone(archiveBackup);brokenLedger.slots[0].player.seasonLedger[1].goals=-1;assert.throws(()=>importBackup(exportBackup(brokenLedger)));
console.log('PASS: shot outcomes, heat sampling, rotating objectives, personal history, appearance and strict backup validation.');

// Style choices affect actual movement and tackling rather than just preview text.
const runner=match({careerIndex:5,careerStyle:'runner'}),balanced=match({careerIndex:5});runner.step(.016,[{x:1,sprint:true},{}]);balanced.step(.016,[{x:1,sprint:true},{}]);assert(runner.players[5].stamina>balanced.players[5].stamina);assert(runner.players[5].x>balanced.players[5].x);
try{Math.random=()=>0;for(const [style,success] of [['stopper',true],['ballplayer',false]]){m=match({careerIndex:1,careerStyle:style});m.players[1].x=400;m.players[1].y=FIELD.center;m.players[11].x=432;m.players[11].y=FIELD.center;m.players[11].dx=-1;m.ball.owner=11;m.kickoffGrace=0;m.tackle(0);assert.equal(m.stats[1].tackles,success?1:0)}}finally{Math.random=originalRandom}
// Reports attached to league matches are validated as strictly as personal history.
const playedSeason=createSeason(league.id,league.teams[0].id);m=match();completeWeek(playedSeason,[0,0],m.stats,undefined,m.report());const reportBackup={version:2,active:0,slots:[makeClubSlot(playedSeason),null,null]};assert(importBackup(exportBackup(reportBackup)).slots[0].season.results.some(r=>r.report));const badReport=structuredClone(reportBackup);badReport.slots[0].season.results.find(r=>r.report).report.heat[0][0][0]=-1;assert.throws(()=>importBackup(exportBackup(badReport)));
console.log('PASS: playable style differences and league report backup validation.');

// Simulation advances exactly one round, preserves home/away orientation and persists totals.
const simSeason=createSeason(league.id,league.teams[0].id,77);for(let week=0;week<2;week++){const fixture=currentFixture(simSeason),expected=simulate(...fixture,week,undefined,77);simulateWeek(simSeason);const own=simSeason.results.find(r=>r.week===week&&(r.home===simSeason.teamId||r.away===simSeason.teamId));assert.deepEqual(own.score,expected.score);assert.deepEqual(own.stats,expected.stats);assert.equal(own.source,'simulated');assert.equal(own.report,undefined);assert.equal(simSeason.week,week+1);assert.equal(simSeason.results.length,4*(week+1));assert.equal(simSeason.world.spain.results.length,4*(week+1))}
const simulatedTotals=Object.entries(simSeason.players).filter(([id])=>simSeason.rosterIds[simSeason.teamId].includes(id)).reduce((n,[,p])=>n+p.goals,0);assert.equal(simulatedTotals,seasonSummary(simSeason).goalsFor);assert.equal(importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(simSeason),null,null]})).slots[0].season.week,2);while(currentFixture(simSeason))simulateWeek(simSeason);assert(simSeason.awards);startCup(simSeason);assert(simSeason.cup);assert.throws(()=>simulateWeek(simSeason));
console.log('PASS: one-round simulation, home/away scores, standings, player totals, backups and cup qualification.');

// Player-initiated passes switch on reception; AI passes, interceptions and manual choices do not.
for(const crossing of [false,true]){m=match();const passer=m.selected[0];assert(crossing?m.cross(passer):m.kick(passer));assert.equal(m.selected[0],passer);assert.equal(m.ball.owner,null);m.takeBall(3);assert.equal(m.selected[0],3)}
m=match();m.ball.owner=3;assert(m.kick(3));m.takeBall(4);assert.equal(m.selected[0],5,'AI passing must preserve human selection');
m=match();assert(m.kick(5));m.takeBall(11);assert.equal(m.selected[0],5,'interceptions must not select opponents');
m=match();assert(m.kick(5));m.switch(0);const manuallySelected=m.selected[0];m.takeBall(manuallySelected===3?4:3);assert.equal(m.selected[0],manuallySelected);
m=match({careerIndex:3});m.ball.owner=3;assert(m.kick(3));m.takeBall(4);assert.equal(m.selected[0],3);
m=match({careerIndex:3});m.ball.owner=11;assert.equal(m.requestPass(),false);assert.match(m.event,/对方持球/);m.ball.owner=null;assert.equal(m.requestPass(),false);assert.match(m.event,/尚未被控制/);assert.match(m.actionHint(),/按 K/);
m=match();m.ball.owner=11;assert.match(m.actionHint(),/按 Q/);m.penalty={team:0};assert.match(m.actionHint('cross'),/不能传中/);
m=match({careerIndex:3});m.ball.owner=5;m.players[3].x=600;m.players[3].y=300;m.players[5].x=400;m.players[5].y=300;m.players[11].x=600;m.players[11].y=300;assert.equal(m.requestPass(),false);assert.match(m.event,/接球人被盯住/);
console.log('PASS: reception switching, manual override, career identity and contextual action feedback.');

// Attack timing, physical saves, rebounds and shared tackle rules.
m=match();m.step(.04,[{shoot:true},{}]);assert(Math.abs(m.charge-.04/.65)<.001);assert(m.shoot(.1,{x:FIELD.right,y:FIELD.center}));assert(Math.hypot(m.ball.vx,m.ball.vy)>550,'tap shooting has useful power');
m=match({careerIndex:3});m.players[3].x=600;m.players[3].y=FIELD.center;m.ball={x:578,y:FIELD.center,z:0,vx:360,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5};assert(m.shoot(.42,{x:FIELD.right,y:320}));assert(m.pendingShot);m.players.forEach((p,id)=>{if(id!==3){p.y=100;p.cool=10}});for(let i=0;i<7;i++)m.step(.016);assert.equal(m.pendingShot,null);assert.equal(m.shots[0],1,'buffer executes once on reception');
m=match({careerIndex:3});m.players[3].x=600;m.players[3].y=FIELD.center;m.ball={x:578,y:FIELD.center,z:0,vx:10,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5};assert(m.shoot());for(let i=0;i<10;i++)m.step(.016);assert.equal(m.pendingShot,null);assert.equal(m.shots[0],0,'expired input must never shoot later');
m=match();assert.equal(m.shotOpen(5),false);m.players[5].x=810;m.players[5].y=FIELD.center;m.players[11].x=860;m.players[11].y=FIELD.center;assert.equal(m.shotOpen(5),false);m.players[11].y=100;assert.equal(m.shotOpen(5),true);
m=match();const diveKeeper=m.players[6];diveKeeper.cool=0;diveKeeper.dive=.2;const delayedBall={x:diveKeeper.x,y:diveKeeper.y+18,z:0,kind:'shot',last:0,keeperDelay:.2};assert.equal(m.canCollect(diveKeeper,delayedBall),false);delayedBall.y=diveKeeper.y+5;assert.equal(m.canCollect(diveKeeper,delayedBall),true,'body remains solid during reaction');
m=match();m.kick(5,true,.8,{x:FIELD.right,y:320});m.ball.x=m.players[6].x;m.ball.y=m.players[6].y+16;assert(m.parry(6));assert.equal(m.saves[1],1);assert.equal(m.shotLog[0].outcome,'saved');assert.equal(m.ball.owner,null);assert.equal(m.ball.kind,'parry');assert(m.players[6].cool>0);assert.equal(m.stats[5].shotsOnTarget,1);
try{Math.random=()=>0;m=match();m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=1;m.players[11].x=420;m.players[11].y=FIELD.center;m.ball.owner=5;m.players[5].settle=.18;assert.equal(m.attemptTackle(11),false);assert.equal(m.ball.owner,5);assert(m.players[11].tackleRecovery>0);m.players[11].cool=0;m.players[5].settle=0;assert(m.attemptTackle(11));assert.equal(m.ball.owner,11);
m=match();m.players.forEach(p=>p.cool=10);m.players[11].cool=0;m.players[11].x=420;m.players[11].y=FIELD.center;m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=-1;m.ball.owner=5;m.ball.x=389;m.ball.y=FIELD.center;m.kickoffGrace=0;m.step(.016);assert.equal(m.ball.owner,5);assert(m.players[11].tackleWindup>0,'AI must prepare rather than instantly steal');
m=match();m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=1;m.players[11].x=395;m.players[11].y=FIELD.center;m.ball.owner=5;Math.random=()=>.6;assert.equal(m.attemptTackle(11),false,'shielded side reduces success');m.players[11].cool=0;m.players[11].x=405;assert.equal(m.attemptTackle(11),true,'exposed side rewards positioning');}finally{Math.random=originalRandom}
console.log('PASS: fast shots, bounded input buffering, delayed dives, rebound stats, shielding and tackle preparation.');

// A pre-positioned keeper can both save and concede the former near-post blind spot.
try{let shotSeed=999;Math.random=()=>((shotSeed=Math.imul(shotSeed,1664525)+1013904223>>>0)/4294967296);let scored=0;for(let n=0;n<80;n++){m=match();m.shootoutMode=true;m.players.forEach((p,id)=>{if(p.i!==0&&id!==5)p.y=-80});m.players[5].x=810;m.players[5].y=355;m.ball.owner=5;for(let i=0;i<16;i++)m.step(.016);m.kick(5,true,.42,{x:FIELD.right,y:332});for(let i=0;i<300&&m.state==='playing';i++)m.step(.016);scored+=!!m.shotOutcome}assert(scored>0&&scored<80,'near-post shots must allow both outcomes')}finally{Math.random=originalRandom}

try{Math.random=()=>.5;m=match();m.players[5].x=400;m.players[5].y=FIELD.center;m.players[5].dx=1;m.players[11].x=380;m.players[11].y=FIELD.center;m.ball.owner=5;assert.equal(m.attemptTackle(11,true),false);assert.equal(m.fouls[1],0,'AI should usually abandon a dangerous rear tackle')}finally{Math.random=originalRandom}

// Opening play works on both ends; human pressure is visible to AI and safe backward passes are legal.
for(const half of [1,2]){m=match();m.half=half;m.reset(1);m.stats.slice(1,5).forEach(p=>p.reds=1);m.step(.01);assert.equal(m.passes[1],1);assert.equal(m.kickoffGrace,0);assert.equal(m.kickoffId,null);for(let i=0;i<120;i++)m.step(.016);assert(m.stats.slice(6).some(p=>p.passesCompleted>0),'opening pass must be receivable')}
const pressured=match(),unpressured=match();for(const game of [pressured,unpressured]){game.reset(1);game.kickoffId=null;game.players[11].cool=10;for(let id=1;id<5;id++)game.stats[id].reds=1}pressured.players[5].x=FIELD.mid-30;pressured.players[5].y=FIELD.center;unpressured.players[5].x=800;unpressured.players[5].y=100;pressured.step(.016);unpressured.step(.016);assert(Math.abs(pressured.players[11].dy)>.5);assert.equal(unpressured.players[11].dy,0,'unblocked carrier should advance directly');
m=match();m.reset(1);m.kickoffId=null;for(const id of [1,2,3,4,7,8,9])m.stats[id].reds=1;m.players[5].x=FIELD.mid-30;m.players[5].y=FIELD.center;m.players[10].x=600;m.players[10].y=375;m.step(.01);assert.equal(m.passes[1],1,'human front pressure must trigger a safe backward outlet');
// New shot metadata round-trips; old reports remain usable and malformed additions are rejected.
m=match();m.kick(5,true,.7,{x:FIELD.right,y:320});m.resolveShot('blocked',7);const detailed=m.report().shots[0];assert.equal(detailed.power,.7);assert(detailed.speed>560);assert.equal(detailed.resolvedBy,7);assert(detailed.aim&&detailed.end);assert.match(shotAdvice(detailed),/封堵/);assert.match(shotAdvice({...detailed,outcome:'saved',power:.42,distance:30}),/增加力度/);
const detailSeason=createSeason(league.id,league.teams[0].id);completeWeek(detailSeason,[0,0],m.stats,undefined,m.report());const detailBackup={version:2,active:0,slots:[makeClubSlot(detailSeason),null,null]};assert.equal(importBackup(exportBackup(detailBackup)).slots[0].season.results.find(r=>r.report).report.shots[0].power,.7);
let malformed=structuredClone(detailBackup);malformed.slots[0].season.results.find(r=>r.report).report.shots[0].power=2;assert.throws(()=>importBackup(exportBackup(malformed)));malformed=structuredClone(detailBackup);const oldShot=malformed.slots[0].season.results.find(r=>r.report).report.shots[0];for(const k of ['power','speed','distance','aim','end','trajectory','keeper','resolvedBy'])delete oldShot[k];assert(importBackup(exportBackup(malformed)));
// Practice shares shooting and collection rules, auto feeds both kinds of ball and ends once per attempt.
for(const side of [-1,1])for(const scenario of ['solo','side','receive','cross']){
 const p=new PracticeMatch({scenario,side});const start={x:p.players[5].x,y:p.players[5].y};
 if(scenario==='receive'){for(let i=0;i<100&&p.ball.owner!==5&&p.state==='playing';i++)p.step(.016);assert.equal(p.ball.owner,5,'ground feed must reach a stationary trainee')}
 if(scenario==='cross'){let headed=false;for(let i=0;i<200&&p.state==='playing';i++){const q=p.players[5],b=p.ball,n=Math.hypot(b.x-q.x,b.y-q.y)||1;p.step(.016,[p.fed?{x:(b.x-q.x)/n,y:(b.y-q.y)/n}:{}]);if(p.ball.z>=9&&p.ball.z<=37&&Math.hypot(q.x-p.ball.x,q.y-p.ball.y)<25){headed=p.shoot(.7,{x:FIELD.right,y:320});if(headed)break}}assert(headed,'cross scene must allow a real aerial attempt')}
 else assert(p.shoot(.7,{x:FIELD.right,y:320}));
 for(let i=0;i<1000&&p.state==='playing';i++)p.step(.016);assert.equal(p.state,'ended');assert.equal(p.attempts.length,1);assert.equal(p.shotLog.length,1);assert(p.report().shots[0].power!=null);p.step(.04);assert.equal(p.attempts.length,1);p.resetAttempt();assert.deepEqual({x:p.players[5].x,y:p.players[5].y},start);assert.equal(p.attempts.length,1);
}
const practiceTimeout=new PracticeMatch();for(let i=0;i<800;i++)practiceTimeout.step(.016);assert.equal(practiceTimeout.attempts.length,1);assert.equal(practiceTimeout.shotLog.length,0);assert.equal(practiceTimeout.attempts[0].outcome,'whistle');
console.log('PASS: kickoff organization, human pressure, receive targets, shot diagnostics, old/new backups and four practice scenes.');

m=match();m.kick(5,true,.7);m.takeBall(3);assert.equal(m.shotLog[0].outcome,'whistle','a friendly recovery must not fabricate a defender block');
for(let i=1;i<10;i++){practiceTimeout.resetAttempt();practiceTimeout.completeAttempt('whistle')}assert.equal(practiceTimeout.attempts.length,10);assert.equal(practiceTimeout.resetAttempt(),false);assert.equal(practiceTimeout.state,'ended');

for(const difficulty of [0,1,2,3]){const p=new PracticeMatch({scenario:'receive',defender:true,difficulty});for(let i=0;i<35;i++)p.step(.016);assert.equal(p.state,'playing');assert.equal(p.ball.owner,3,'the optional defender must not steal before the feed');p.players[5].stamina=.2;p.resetAttempt();assert.equal(p.players[5].stamina,1);p.foul(11,5);assert.equal(p.attempts.at(-1).outcome,'foul');assert.equal(p.stats[11].reds,0)}
await import('./replay.test.mjs');
