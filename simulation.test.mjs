import assert from 'node:assert/strict';
import {createSeason,currentFixture,completeWeek,orientStats,prepareSeason,addPlayer,keeperLeaders} from './league.mjs';
import {EventMatch} from './simulation.mjs';
import {ABILITIES,ensureRatings,positionRating} from './ratings.mjs';
import {makeClubSlot,exportBackup,importBackup} from './save-slots.mjs';
import {CLEAR_WEATHER} from './weather.mjs';
import {simulateShootout} from './cup.mjs';
import {Match,FIELD} from './engine.mjs';

const season=createSeason('england','arsenal',17),pair=currentFixture(season);
const closeControl=new Match({playerAttributes:Array.from({length:12},()=>({dribbling:99}))});closeControl.state='playing';closeControl.ball.owner=5;closeControl.players[5].dx=1;closeControl.players[5].dy=0;closeControl.players.filter(p=>p.t===1).forEach(p=>{p.stationary=true;p.x=FIELD.right-20;p.y=FIELD.top+20});closeControl.step(.016);assert(Math.hypot(closeControl.ball.x-closeControl.players[5].x,closeControl.ball.y-closeControl.players[5].y)>11,'controlled ball keeps visible space from the player sprite');for(let i=0;i<40;i++)closeControl.step(.016,[{x:1,sprint:true},{}]);const carryDistances=[];for(let i=0;i<20;i++){closeControl.step(.016,[{x:1,sprint:true},{}]);carryDistances.push(Math.hypot(closeControl.ball.x-closeControl.players[5].x,closeControl.ball.y-closeControl.players[5].y))}assert(Math.max(...carryDistances)-Math.min(...carryDistances)<.001,'running animation must not make the ball pulse toward and away from the player');
assert.equal(ABILITIES.length,23);assert(Object.values(season.playerData).every(p=>ABILITIES.every(key=>Number.isInteger(p.attributes[key]))));
const old={shooting:78,passing:62,defense:49,goalkeeping:35};ensureRatings(old);assert.equal(old.shooting,78);assert.equal(old.longShots,78);assert.equal(old.reflexes,35);
const oldStats=createSeason('england','arsenal',1),oldId=oldStats.rosterIds.arsenal[5];addPlayer(oldStats,'arsenal',5,{playerId:oldId,goals:1});assert.equal(oldStats.players[oldId].xG,undefined,'legacy/live records without event metrics remain missing');
const striker={position:5,attributes:ensureRatings({shooting:85,passing:55,defense:35,speed:80})};assert(positionRating(striker,5)>positionRating(striker,1));

let totals={goals:0,shots:0,passes:0};
for(let seed=1;seed<=80;seed++){
  season.seed=seed;const match=new EventMatch({season,home:pair[0],away:pair[1],weather:CLEAR_WEATHER}),result=match.run();
  assert.deepEqual(result, new EventMatch({season,home:pair[0],away:pair[1],weather:CLEAR_WEATHER}).run());
  assert.equal(match.clock,5400);assert.equal(result.journal.at(-1).type,'fulltime');assert(result.journal.some(e=>e.type==='halftime'));
  assert.equal(result.goalEvents.length,result.score[0]+result.score[1]);
  for(let side=0;side<2;side++){
    const rows=result.playerStats.filter(row=>row.teamId===pair[side]);
    for(const [teamField,field] of [['shots','shots'],['passes','passes'],['passesCompleted','passesCompleted'],['saves','saves'],['tackles','tackles']])assert.equal(result.stats[teamField][side],rows.reduce((n,p)=>n+p[field],0));
    assert.equal(result.score[side],rows.reduce((n,p)=>n+p.goals,0));assert.equal(result.stats.onTarget[side],result.score[side]+result.stats.saves[1-side]);
    for(const row of rows){assert(row.passesCompleted<=row.passes);assert(row.goals<=row.shotsOnTarget&&row.shotsOnTarget<=row.shots);assert(row.tackles<=row.tackleAttempts);assert(row.minutesPlayed<=90);assert(row.xG>=0)}
  }
  assert.equal(result.journal.filter(e=>e.type==='goal').length,result.goalEvents.length);
  for(const goal of result.goalEvents)if(goal.assistId){assert.notEqual(goal.scorerId,goal.assistId);assert(result.journal.some(e=>e.type==='pass'&&e.playerId===goal.assistId&&e.targetId===goal.scorerId))}
  totals.goals+=result.score[0]+result.score[1];totals.shots+=result.stats.shots[0]+result.stats.shots[1];totals.passes+=result.stats.passes[0]+result.stats.passes[1];
}

const neutral=createSeason('england','arsenal',17);for(const id of [...neutral.rosterIds[pair[0]],...neutral.rosterIds[pair[1]]]){for(const key of ABILITIES)neutral.playerData[id].attributes[key]=60}
function conversion({shooting=60,keeper=60}={}){let goals=0;for(let seed=1;seed<=1000;seed++){neutral.seed=seed;const match=new EventMatch({season:neutral,home:pair[0],away:pair[1],weather:CLEAR_WEATHER,recordEvents:false}),player=match.players.get(match.active[0][5]),gk=match.players.get(match.active[1][0]);player.attributes.shooting=shooting;for(const key of ['reflexes','handling','keeperPositioning','oneOnOne'])gk.attributes[key]=keeper;match.zone=3;match.lane=1;match.holder=player.id;match.shoot(player,.35,match.players.get(match.active[1][1]));goals+=match.score[0]}return goals/1000}
const calibration={finishing45:conversion({shooting:45}),finishing85:conversion({shooting:85}),keeper45:conversion({keeper:45}),keeper85:conversion({keeper:85})};
assert(calibration.finishing85>calibration.finishing45+.07,'finishing must improve actual goal conversion');assert(calibration.keeper85<calibration.keeper45-.06,'goalkeepers must reduce actual goals conceded');
const source=createSeason('england','arsenal',17),engine=new EventMatch({season:source,home:pair[0],away:pair[1]}),snapshot=JSON.stringify(source);while(engine.clock<2700)engine.step();
const rotation=createSeason('england','arsenal',17);for(const team of pair){for(const id of rotation.rosterIds[team])rotation.playerData[id].attributes.endurance=1;for(const id of rotation.squadIds[team].filter(id=>!rotation.rosterIds[team].includes(id)))for(const key of ABILITIES)rotation.playerData[id].attributes[key]=95}
const rotationMatch=new EventMatch({season:rotation,home:pair[0],away:pair[1],managedSide:0});rotationMatch.run();assert.equal(rotationMatch.substitutions[0],0,'AI does not override the managed team');assert(rotationMatch.substitutions[1]>0,'AI replaces tired players with suitable fresh reserves');
const keeperChange=new EventMatch({season:source,home:pair[0],away:pair[1],managedSide:0});while(keeperChange.clock<2700)keeperChange.step();const oldKeeper=keeperChange.active[0][0],freshKeeper=keeperChange.bench[0].find(id=>keeperChange.players.get(id).position===0);assert(keeperChange.substitute(0,oldKeeper,freshKeeper));const keeperResult=keeperChange.run();const keeperSeason={...source,results:[keeperResult],players:{}};const keeperRecords=keeperLeaders(keeperSeason);for(const id of [oldKeeper,freshKeeper])assert.equal(keeperRecords.find(row=>row.id===id).conceded,keeperResult.playerStats.find(row=>row.playerId===id).goalsConceded,'each goalkeeper is charged only for goals while on the pitch');
const own=pair[0]===source.teamId?0:1,outId=engine.active[own][5],inId=engine.bench[own].find(id=>engine.players.get(id).position===5),firstHalf=JSON.stringify(engine.events);
assert(engine.setTactic(own,'counter'));assert(engine.substitute(own,outId,inId));assert(!engine.substitute(own,inId,outId),'a replaced player cannot return');assert.equal(JSON.stringify(source),snapshot,'simulation must not mutate the season before settlement');assert.equal(JSON.stringify(engine.events.slice(0,JSON.parse(firstHalf).length)),firstHalf,'adjustments do not rewrite earlier events');
const result=engine.run(),out=result.playerStats.find(p=>p.playerId===outId),incoming=result.playerStats.find(p=>p.playerId===inId);assert.equal(out.minuteOff,45);assert.equal(incoming.minuteOn,45);assert.equal(incoming.started,false);assert(result.playerStats.length>=13&&result.playerStats.length<=18);assert(incoming.minutesPlayed>0&&incoming.minutesPlayed<=45);
const penalties=simulateShootout(source,...pair,0,result);assert.notEqual(penalties.score[0],penalties.score[1]);assert(penalties.attempts.every(attempt=>attempt.playerId!==outId));assert.deepEqual(penalties,simulateShootout(source,...pair,0,result));assert.equal(JSON.stringify(source),snapshot);
const homeIsUser=pair[0]===source.teamId,score=homeIsUser?result.score:[...result.score].reverse();completeWeek(source,score,null,orientStats(result.stats,homeIsUser),null,{...result,source:'simulated'});
const restored=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(source),null,null]}));const saved=restored.slots[0].season.results.find(r=>r.home===pair[0]&&r.away===pair[1]);assert.equal(saved.playerStats.length,result.playerStats.length);assert.deepEqual(saved.journal,result.journal);assert.equal(saved.simulationVersion,4);assert.equal(source.players[inId].appearances,1);
const invalid=structuredClone(restored);
invalid.slots[0].season.playerData[inId].attributes.acceleration=100;assert.throws(()=>importBackup(exportBackup(invalid)));
const missing=structuredClone(source),legacyId=missing.rosterIds.arsenal[5],legacyScore=missing.playerData[legacyId].attributes.shooting;for(const key of ABILITIES)if(!['shooting','passing','defense','speed','shielding','firstTouch','endurance','aerial'].includes(key))delete missing.playerData[legacyId].attributes[key];prepareSeason(missing);assert.equal(missing.playerData[legacyId].attributes.shooting,legacyScore);assert(ABILITIES.every(key=>Number.isInteger(missing.playerData[legacyId].attributes[key])));
console.log('PASS: 23 ratings, reproducible event simulation, event/stat reconciliation, actual keeper and finishing effects, halftime adjustments, substitution minutes, legacy migration and journal backups.',{averages:Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value/80])),calibration});
