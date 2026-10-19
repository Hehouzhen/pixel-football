import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from './engine.mjs';
import {createSeason,prepareSeason,createMatchRecord} from './league.mjs';
import {getLeague} from './clubs.mjs';
import {createCareerPlayer,finishCareerMatch} from './career.mjs';
import {chooseNation} from './national-team.mjs';
import {openNationalWindow,respondNationalCallup,nextNationalFixture,createNationalMatch,nationalMatchResult,settleNationalFixture} from './international-career.mjs';
import {simulateMatchWithoutEntry} from './live-simulation.mjs';
import {makeClubSlot,makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
import {auditWorldIdentity} from './identity-audit.mjs';
import {matchGoalEvents,resultGoalEvents} from './result-info.mjs';
import {makeMatchNews} from './news.mjs';

function xorshift(seed){let n=seed|0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;n>>>=0;return n/4294967296}}
const errors=report=>report.issues.filter(issue=>issue.severity==='error');

function clubMatch(){const season=createSeason('england','arsenal',31);prepareSeason(season);const league=getLeague(season.leagueId),home=league.teams[0].id,away=league.teams[1].id,ids=[...season.rosterIds[home],...season.rosterIds[away]];const m=new Match({duration:120,teams:[home,away],teamIds:[home,away],playerIds:ids,playerNames:ids.map(id=>season.playerData[id]?.name??id),playerNumbers:ids.map(id=>season.playerData[id]?.number??1),playerLooks:ids.map(()=>({})),playerAttributes:ids.map(id=>season.playerData[id]?.attributes??{})});m.practice=true;m.time=60;return {season,m,home,away,ids}}

test('a normal goal credits the beneficiary team, the actor and personal statistics',()=>{const {season,m,home}=clubMatch();m.lastStriker=5;m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:m.playerIds[5]};m.goal(0);const event=m.matchEvents.filter(e=>e.type==='goal').at(-1);assert.deepEqual(m.score,[1,0]);assert.equal(event.team,0);assert.equal(event.ownGoal,undefined);assert.equal(event.playerId,m.playerIds[5]);assert.equal(m.stats[5].goals,1);const info=matchGoalEvents(m,season)[0];assert.equal(info.teamId,home);assert.equal(info.ownGoal,undefined);assert.equal(matchGoalEvents(m,season).length,1)});

test('an own goal records the beneficiary team, keeps the actor identity and never credits a personal goal',()=>{const {season,m,home,away}=clubMatch();m.half=2;m.lastStriker=5;m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:m.playerIds[5]};m.goal(1);const event=m.matchEvents.filter(e=>e.type==='goal').at(-1);assert.deepEqual(m.score,[0,1]);assert.equal(event.team,1);assert.equal(event.ownGoal,true);assert.equal(event.playerId,m.playerIds[5]);assert.equal(m.stats[5].goals,0);assert.equal(m.goalCelebrant,null);const [info]=matchGoalEvents(m,season);assert.equal(info.teamId,away);assert.equal(info.ownGoal,true);assert.equal(info.side,1);assert.equal(resultGoalEvents({...m.report(),home,away,report:m.report()},season)[0].ownGoal,true);const article=makeMatchNews({before:season,after:structuredClone(season),mode:'club',score:[0,1],opponent:'对手',goalEvents:[{minute:45,teamId:away,scorerName:'乌龙球员',ownGoal:true}]});assert.match(article.body,/乌龙球/)});

test('fixed seeds 17 and 36 national matches reproduce ID-02 as own goals that stay consistent through settlement, audit and backup',()=>{
 for(const seed of [17,36]){
  let p=chooseNation(createCareerPlayer('国字号测试',10,'midfielder'),'chn');p.attributes=Object.fromEntries(Object.keys(p.attributes).map(k=>[k,85]));
  const sample=finishCareerMatch(p,{playingSeconds:180,goals:1,passesCompleted:8},[2,0],180,{competition:'league',opponent:'固定考察样本',season:1}).history[0];
  p.history=Array.from({length:8},(_,i)=>({...sample,matchId:i+1,rating:7.5}));
  const s=createSeason('england','arsenal',31);s.calendar={startYear:2026,dated:true};prepareSeason(s,p);s.week=5;
  p=openNationalWindow(p,s);p=respondNationalCallup(p,s,true);
  const fixture=nextNationalFixture(p,s),m=createNationalMatch(p,fixture,{duration:180,season:s});
  const original=Math.random;Math.random=xorshift(seed);
  try{simulateMatchWithoutEntry(m)}finally{Math.random=original}
  const goals=m.matchEvents.filter(e=>e.type==='goal'),own=goals.find(e=>e.ownGoal===true);
  assert(own,`seed ${seed} must keep producing the ID-02 own goal`);
  assert.equal(own.team,1);assert.equal(m.players[own.player].t,0);assert.equal(m.stats[own.player].goals,0);
  assert(Array.isArray(own.score)&&own.score[1]>=1);
  if(seed===17)assert.equal(m.playerIds[own.player],'p:osasuna:2');
  const byTeam=[0,0];for(const goal of goals)byTeam[goal.team]++;assert.deepEqual(byTeam,m.score);
  const result=nationalMatchResult(m,p);p=settleNationalFixture(p,s,fixture,result);
  const saved=importBackup(exportBackup({version:2,active:0,slots:[makeCareerSlot(s,p,1,180,1),null,null]})).slots[0];
  const restored=auditWorldIdentity(saved.season,saved.player);
  assert.deepEqual(errors(auditWorldIdentity(s,p)),[]);
  assert.deepEqual(errors(restored),[]);
  assert.equal(saved.player.nationalCareer.history.at(-1).report.events.find(e=>e.ownGoal===true).team,1);
  assert.deepEqual(saved.player.nationalCareer.history.at(-1).score,result.score);
 }
});

test('a played club result with an own goal passes save validation and round trips without losing the flag',()=>{
 const {season,m,home,away}=clubMatch();m.half=2;m.lastStriker=5;m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:m.playerIds[5]};m.goal(1);
 const report=m.report(),record=createMatchRecord(season,{home,away,score:m.score,matchStats:m.stats,report,userTeamId:home}),stats={shots:m.shots,onTarget:m.onTarget,passes:m.passes,passesCompleted:[0,0],crosses:m.crosses,tackles:m.tackles,fouls:m.fouls,yellows:m.yellows,reds:m.reds,saves:m.saves};
 season.results=[{week:0,home,away,score:[...m.score],stats,source:'played',...record,report}];
 assert.equal(record.playerStats.reduce((n,row)=>n+(row.goals??0),0),0);
 assert.deepEqual(errors(auditWorldIdentity(season,null)),[]);
 const saved=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(season,1,120,1),null,null]})).slots[0];
 assert.deepEqual(errors(auditWorldIdentity(saved.season,null)),[]);
 const restoredGoal=saved.season.results[0].report.events.find(e=>e.type==='goal');
 assert.equal(restoredGoal.ownGoal,true);assert.equal(restoredGoal.team,1);assert.equal(restoredGoal.playerId,m.playerIds[5]);
});

function crossSetup(){
 const {season,m,home,away,ids}=clubMatch();
 for(let i=1;i<6;i++){if(i===3)continue;m.players[i].x=250;m.players[i].y=FIELD.center+80}
 m.players[3].x=300;m.players[3].y=FIELD.center;m.players[5].x=500;m.players[5].y=FIELD.center;
 m.ball={x:300,y:FIELD.center,z:0,vx:0,vy:0,vz:0,owner:3,lock:0,last:0,kind:null,source:null};
 m.cross(3);
 m.ball.z=20;m.ball.x=m.players[5].x;m.ball.y=m.players[5].y;
 return {season,m,home,away,ids};
}
function finishIntoGoal(m,team=0){m.ball.owner=null;m.ball.x=FIELD.right-1;m.ball.y=FIELD.center;m.ball.z=0;m.ball.vx=200;m.ball.vy=0;m.goal(team)}
function goalEvent(m){return m.matchEvents.filter(e=>e.type==='goal').at(-1)}

test('a headed goal records the headerer, not the crosser, in the event identity and statistics',()=>{
 const {m,ids}=crossSetup();m.aerial(5);finishIntoGoal(m);
 const event=goalEvent(m);
 assert.equal(event.playerId,ids[5]);assert.equal(event.playerName,m.playerNames[5]);assert.equal(event.shirtNumber,m.playerNumbers[5]);
 assert.equal(m.stats[5].goals,1);assert.equal(m.stats[5].headerGoals,1);assert.equal(m.stats[3].assists,1);
});

test('a bicycle-kick goal follows the same aerial identity path',()=>{
 const {m,ids}=crossSetup();m.aerial(5,true);finishIntoGoal(m);
 const event=goalEvent(m);
 assert.equal(event.playerId,ids[5]);assert.equal(event.playerName,m.playerNames[5]);
 assert.equal(m.stats[5].goals,1);assert.equal(m.stats[5].bicycleGoals,1);assert.equal(m.stats[3].assists,1);
});

test('an aerial finish from an opponent ball records the finisher and never assists the opponent',()=>{
 const {m,ids}=clubMatch();m.lastPasser=11;m.lastPasserPlayerId=ids[11];
 m.ball={x:m.players[5].x,y:m.players[5].y,z:20,vx:0,vy:0,vz:0,owner:null,lock:0,last:1,kind:'cross',source:11,sourcePlayerId:ids[11]};
 m.aerial(5);finishIntoGoal(m);
 const event=goalEvent(m);
 assert.equal(event.playerId,ids[5]);assert.equal(event.playerName,m.playerNames[5]);
 assert.equal(m.stats[5].goals,1);assert.equal(m.stats[11].assists,0);
});

test('a crosser substituted before the header keeps the old person as the assist source',()=>{
 const {m,ids}=crossSetup(),oldId=ids[3],oldName=m.playerNames[3];
 m.substitutedOut={index:3,playerId:oldId,playerName:oldName,stats:{...m.stats[3],assists:0,passesCompleted:0,crossesCompleted:0,forwardPasses:0}};
 m.playerIds[3]='sub:3';m.playerNames[3]='Substitute';
 m.ball.z=20;m.ball.x=m.players[5].x;m.ball.y=m.players[5].y;
 m.aerial(5);finishIntoGoal(m);
 const event=goalEvent(m);
 assert.equal(event.playerId,ids[5]);assert.equal(event.playerName,m.playerNames[5]);
 assert.equal(m.substitutedOut.stats.assists,1);assert.equal(m.stats[3].assists,0);
});

test('a substituted crosser keeps every completion and key-pass credit while the substitute stays at zero',()=>{
 const {m,ids}=crossSetup(),oldId=ids[3],oldName=m.playerNames[3],oldStats=structuredClone(m.stats[3]);
 m.substitutedOut={index:3,playerId:oldId,playerName:oldName,stats:oldStats,minuteOff:60,shirtNumber:m.playerNumbers[3]};
 m.stats[3]=Object.fromEntries(Object.keys(m.stats[3]).map(key=>[key,0]));
 m.playerIds[3]='sub:3';m.playerNames[3]='Substitute';m.playerNumbers[3]=14;
 m.ball.z=20;m.ball.x=m.players[5].x;m.ball.y=m.players[5].y;
 m.aerial(5);finishIntoGoal(m);
 const event=goalEvent(m),old=m.substitutedOut.stats,fresh=m.stats[3];
 assert.equal(event.playerId,ids[5]);assert.equal(event.playerName,m.playerNames[5]);
 for(const key of ['passes','crosses'])assert.equal(old[key],1,key);
 for(const key of ['passesCompleted','crossesCompleted','forwardPasses','keyPasses','assists'])assert.equal(old[key],1,key);
 for(const key of ['passes','crosses','passesCompleted','crossesCompleted','forwardPasses','keyPasses','assists'])assert.equal(fresh[key],0,key);
 assert.equal(m.stats[5].goals,1);assert.equal(m.stats[5].headerGoals,1);
});

test('legacy reports without teamIds resolve an own goal by the recorded match labels',()=>{
 const result={home:'arsenal',away:'chelsea',score:[0,1],playerStats:[{playerId:'a5',playerName:'Defender',teamId:'arsenal'}],report:{teams:['Arsenal','Chelsea'],playerIds:['a5'],events:[{type:'goal',player:0,playerId:'a5',playerName:'Defender',minute:30,team:1,ownGoal:true}]}};
 const [goal]=resultGoalEvents(result,{});
 assert.equal(goal.teamId,'chelsea');assert.equal(goal.ownGoal,true);assert.equal(goal.scorerName,'Defender');
});

test('own-goal fallback stays correct for an away player and after a rename or transfer',()=>{
 const away={home:'chelsea',away:'arsenal',score:[1,0],playerStats:[{playerId:'a5',playerName:'Defender',teamId:'arsenal'}],report:{teams:['Arsenal','Chelsea'],playerIds:['a5'],events:[{type:'goal',player:0,playerId:'a5',playerName:'Defender',minute:30,team:1,ownGoal:true}]}};
 assert.equal(resultGoalEvents(away,{})[0].teamId,'chelsea');
 const renamed=structuredClone(away);renamed.homeName='Chelsea Blue';renamed.awayName='London Reds';renamed.report.teams=['London Reds','Chelsea Blue'];
 assert.equal(resultGoalEvents(renamed,{})[0].teamId,'chelsea');
 assert.equal(resultGoalEvents(renamed,{teamNames:{arsenal:'London Reds',chelsea:'Chelsea Blue'}})[0].teamId,'chelsea');
});

test('own-goal fallback keeps the beneficiary unknown instead of using the actor club',()=>{
 const missing={home:'arsenal',away:'chelsea',score:[0,1],playerStats:[{playerId:'a5',playerName:'Defender',teamId:'arsenal'}],report:{playerIds:['a5'],events:[{type:'goal',player:0,playerId:'a5',playerName:'Defender',minute:30,team:1,ownGoal:true}]}};
 assert.equal(resultGoalEvents(missing,{})[0].teamId,undefined);
 const stale={home:'arsenal',away:'chelsea',score:[0,1],playerStats:[{playerId:'a5',playerName:'Defender',teamId:'arsenal'}],report:{teams:['Old Home','Old Away'],playerIds:['a5'],events:[{type:'goal',player:0,playerId:'a5',playerName:'Defender',minute:30,team:1,ownGoal:true}]}};
 assert.equal(resultGoalEvents(stale,{})[0].teamId,undefined);
});

function clubOwnGoalSlot(){
 const {season,m,home,away,ids}=clubMatch();m.half=2;m.lastStriker=5;m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:ids[5]};m.goal(1);
 const report=m.report(),record=createMatchRecord(season,{home,away,score:m.score,matchStats:m.stats,report,userTeamId:home}),stats={shots:m.shots,onTarget:m.onTarget,passes:m.passes,passesCompleted:[0,0],crosses:m.crosses,tackles:m.tackles,fouls:m.fouls,yellows:m.yellows,reds:m.reds,saves:m.saves};
 season.results=[{week:0,home,away,score:[...m.score],stats,source:'played',...record,report}];
 return {season,m,home,away,ids,record};
}
const importSlot=season=>importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(season,1,120,1),null,null]}));

test('ownGoal import requires a boolean even when score accounting otherwise matches',()=>{
 const {season,ids}=clubOwnGoalSlot(),result=season.results[0],event=result.report.events[0];
 event.team=0;event.player=5;event.playerId=ids[5];event.playerName='Actor';event.ownGoal='yes';
 result.score=[1,0];result.report.score=[1,0];result.playerStats.find(row=>row.playerId===ids[5]).goals=1;
 assert.throws(()=>importSlot(season),/存档/);
});

test('ownGoal import rejects an actor who belongs to the beneficiary team',()=>{
 const {season,ids}=clubOwnGoalSlot(),result=season.results[0],event=result.report.events[0];
 event.team=0;event.player=5;event.playerId=ids[5];event.ownGoal=true;
 result.score=[1,0];result.report.score=[1,0];
 assert.throws(()=>importSlot(season),/存档/);
});

test('an own goal cannot also be stored as a normal personal goal in player statistics',()=>{
 const {season,ids}=clubOwnGoalSlot(),actor=season.results[0].playerStats.find(row=>row.playerId===ids[5]);
 actor.goals=1;
 assert.throws(()=>importSlot(season),/存档/);
});

test('result goalEvents reject a non-boolean ownGoal even when counts match',()=>{
 const {season,ids,away}=clubOwnGoalSlot(),result=season.results[0];
 result.goalEvents=[{minute:45,teamId:away,scorerId:ids[5],scorerName:'乌龙球员',ownGoal:'yes'}];
 result.playerStats.find(row=>row.teamId===away).goals=1;
 assert.throws(()=>importSlot(season),/存档/);
});

test('result goalEvents reject an own goal whose actor is on the beneficiary team',()=>{
 const {season,ids,home}=clubOwnGoalSlot(),result=season.results[0];
 result.goalEvents=[{minute:45,teamId:home,scorerId:ids[5],scorerName:'乌龙球员',ownGoal:true}];
 result.score=[1,0];result.report.score=[1,0];
 assert.throws(()=>importSlot(season),/存档/);
});

test('result goalEvents reject an assist recorded on an own goal',()=>{
 const {season,ids,away}=clubOwnGoalSlot(),result=season.results[0];
 result.goalEvents=[{minute:45,teamId:away,scorerId:ids[5],scorerName:'乌龙球员',ownGoal:true,assistId:ids[6],assistName:'队友'}];
 assert.throws(()=>importSlot(season),/存档/);
});

test('shootout kicks stay outside goal events, score and normal personal statistics',()=>{
 const {m}=clubMatch();m.shootoutMode=true;m.state='playing';m.ball={x:FIELD.right,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:5,lock:0,last:0,kind:null,source:null};
 m.goal(0);
 assert.equal(m.shotOutcome,true);assert.equal(m.state,'ended');assert.deepEqual(m.score,[0,0]);
 assert.equal(m.matchEvents.filter(e=>e.type==='goal').length,0);assert.equal(m.stats.some(row=>row.goals>0),false);
});

test('own-goal replay metadata keeps the actor visible without a normal scorer celebration',()=>{
 const {m,ids}=clubMatch();m.practice=false;m.half=2;m.lastStriker=5;
 m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:ids[5]};
 m.goal(1);
 assert.equal(m.goalReplay.ownGoal,true);assert.equal(m.goalReplay.scorer,null);
 assert.equal(m.goalReplay.actorId,ids[5]);assert.equal(m.goalReplay.actorNumber,m.playerNumbers[5]);
});

function nationalOwnGoal(seed=17){
 let p=chooseNation(createCareerPlayer('国字号测试',10,'midfielder'),'chn');p.attributes=Object.fromEntries(Object.keys(p.attributes).map(k=>[k,85]));
 const sample=finishCareerMatch(p,{playingSeconds:180,goals:1,passesCompleted:8},[2,0],180,{competition:'league',opponent:'固定考察样本',season:1}).history[0];
 p.history=Array.from({length:8},(_,i)=>({...sample,matchId:i+1,rating:7.5}));
 const s=createSeason('england','arsenal',31);s.calendar={startYear:2026,dated:true};prepareSeason(s,p);s.week=5;
 p=openNationalWindow(p,s);p=respondNationalCallup(p,s,true);
 const fixture=nextNationalFixture(p,s),m=createNationalMatch(p,fixture,{duration:180,season:s});
 const original=Math.random;Math.random=xorshift(seed);
 try{simulateMatchWithoutEntry(m)}finally{Math.random=original}
 return {s,p,fixture,m,result:nationalMatchResult(m,p)};
}

test('national history reports use the same ownGoal import rules and keep legacy missing reports',()=>{
 const {s,p,fixture,result}=nationalOwnGoal(17),settled=settleNationalFixture(p,s,fixture,result);
 const data=()=>({version:2,active:0,slots:[makeCareerSlot(s,settled,1,180,1),null,null]}),lineOf=d=>d.slots[0].player.nationalCareer.history.at(-1);
 assert(lineOf(data()).report.events.some(e=>e.ownGoal===true),'national sample must contain the own goal');
 assert.doesNotThrow(()=>importBackup(exportBackup(data())));
 const cases=[
  ['non-boolean',d=>{lineOf(d).report.events.find(e=>e.ownGoal===true).ownGoal='yes'}],
  ['same team',d=>{lineOf(d).report.events.find(e=>e.ownGoal===true).team=0}],
  ['wrong beneficiary',d=>{const event=lineOf(d).report.events.find(e=>e.type==='goal'&&!e.ownGoal);event.team=1-event.team}],
  ['wrong score',d=>{lineOf(d).report.score[1]+=1}],
  ['illegal player',d=>{lineOf(d).report.events.find(e=>e.ownGoal===true).playerId='missing-player'}],
  ['illegal event type',d=>{lineOf(d).report.events.find(e=>e.ownGoal===true).type='penalty'}]
 ];
 for(const [name,mutate] of cases){const copy=structuredClone(data());mutate(copy);assert.throws(()=>importBackup(exportBackup(copy)),/国家队|存档/,name)}
 const legacy=structuredClone(data());lineOf(legacy).report=null;
 assert.doesNotThrow(()=>importBackup(exportBackup(legacy)));
 const partial=structuredClone(data()),partialLine=lineOf(partial);
 partialLine.report={version:1,teams:partialLine.report.teams,score:partialLine.report.score,duration:partialLine.report.duration,numbers:partialLine.report.numbers,shots:[],events:[{type:'goal',player:5,team:0,minute:20}]};
 assert.doesNotThrow(()=>importBackup(exportBackup(partial)));
});
