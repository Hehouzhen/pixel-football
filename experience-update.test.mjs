import assert from 'node:assert/strict';
import {Match} from './engine.mjs';
import {createCareerPlayer,finishCareerMatch,playerRating,ratingBreakdown,levelProgress,toggleMatchMemory} from './career.mjs';
import {LEAGUES,createSeason,currentFixture,simulate,simulateFixture,simulateWeek} from './league.mjs';
import {makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
import {matchTip,shotAdvice} from './experience.mjs';

assert.match(matchTip({hasBall:true,shotOpen:true}),/射门范围/);
assert.match(matchTip({hasBall:true,pressure:true}),/横向摆脱/);
assert.match(matchTip({hasBall:true,stamina:.19,pressure:true}),/体能偏低/);
assert.match(matchTip({opponentHasBall:true}),/正面/);
assert.equal(matchTip({}), '');
assert.match(shotAdvice({outcome:'blocked',pressured:true}),/有人贴近/);
assert.match(shotAdvice({outcome:'wide'}),/瞄准点/);
assert.match(shotAdvice({outcome:'woodwork'}),/门框/);

const neutral=createCareerPlayer('回归样本',29,'forward'),idle=finishCareerMatch(neutral,{},[0,0],180),active=finishCareerMatch(neutral,{goals:1,shots:2,shotsOnTarget:1},[1,0],180);
assert.equal(idle.lastMatch.xpGain,15);assert(active.lastMatch.xpGain>idle.lastMatch.xpGain);
const simulated=finishCareerMatch(neutral,{goals:1,shots:2,shotsOnTarget:1},[1,0],180,{source:'simulated',goalEvents:[{minute:22,teamId:LEAGUES[0].teams[0].id,scorerId:'sample-player',scorerName:'回归样本'}],competition:'league',season:1,opponent:'测试队'});
assert(simulated.lastMatch.xpGain<active.lastMatch.xpGain);assert.equal(simulated.history[0].source,'simulated');assert.equal(simulated.history[0].goalEvents[0].scorerName,'回归样本');
assert.equal(neutral.stats.appearances,0,'settlement must not mutate existing saves');
for(const position of ['forward','midfielder','defender']){
 const good={passesCompleted:6,keyPasses:2,tackles:2,blocks:1},bad={...good,turnovers:4};
 assert(playerRating(good,[0,0],position)>playerRating(bad,[0,0],position));
 const notes=ratingBreakdown(bad,[0,0],position);assert.equal(notes.rating,playerRating(bad,[0,0],position));assert(notes.entries.some(([label,n])=>label==='丢失球权'&&n<0));
}
assert(playerRating({keyPasses:3},[0,0],'midfielder')>playerRating({keyPasses:3},[0,0],'defender'));
const veteran={...neutral,level:10,xp:950,attributes:{shooting:88,passing:70,defense:62}},later=finishCareerMatch(veteran,{},[0,0],180);
assert.equal(later.level,10);assert.deepEqual(later.attributes,{...veteran.attributes,shielding:66});assert.equal(later.trainingPoints,0);assert.equal(levelProgress(later).target,175);assert.equal(later.progressXp,65);
const close={...neutral,xp:99},leveled=finishCareerMatch(close,{goals:1},[1,0],180);assert.equal(leveled.level,2);assert.equal(leveled.attributes.shooting,70);assert.equal(leveled.trainingPoints,0);

const report=new Match({careerIndex:5,careerNumber:29}).report();
let player=finishCareerMatch(neutral,{passesCompleted:1},[0,0],180,{report,opponent:'Aston Villa'});
assert.equal(player.memories[0].reasons[0],'首秀');assert.equal(player.memories[0].report.heat,undefined);assert(report.heat,'compact memory must not remove original heat');
player=finishCareerMatch(player,{passesCompleted:2},[0,0],180,{report,opponent:'Newcastle United'});
player=toggleMatchMemory(player,2);assert(player.memories.some(r=>r.matchId===2));
for(let i=0;i<10;i++)player=finishCareerMatch(player,{goals:1},[1,0],180,{report,opponent:'Tottenham Hotspur'});
assert.equal(player.history.find(r=>r.matchId===2).report,null,'old unranked full reports are pruned');
assert(player.memories.find(r=>r.matchId===2).report,'a saved snapshot must survive report pruning');
const restored=toggleMatchMemory(player,2);assert(restored.history.find(r=>r.matchId===2).report);assert(!restored.memories.some(r=>r.matchId===2));
const old=structuredClone(player);delete old.progressXp;delete old.memories;old.history.forEach(r=>{delete r.matchId;delete r.ratingVersion});
const season=createSeason(LEAGUES[0].id,LEAGUES[0].teams[0].id);
const backup=p=>({version:2,active:0,slots:[makeCareerSlot(season,p),null,null]});
assert.equal(importBackup(exportBackup(backup(simulated))).slots[0].player.history[0].goalEvents[0].scorerName,'回归样本');
assert(importBackup(exportBackup(backup(old))));assert.equal(importBackup(exportBackup(backup(player))).slots[0].player.memories.length,player.memories.length);
const corrupt=backup(structuredClone(player));corrupt.slots[0].player.memories[0].report.shots=[{id:0,power:2}];assert.throws(()=>importBackup(exportBackup(corrupt)));
const forged=backup(structuredClone(player));forged.slots[0].player.memories[0].matchId=-1;assert.throws(()=>importBackup(exportBackup(forged)));

const [home,away]=currentFixture(season),total={balanced:[0,0,0],press:[0,0,0],counter:[0,0,0]};
for(let seed=0;seed<100;seed++)for(const tactic of Object.keys(total)){
 const r=simulate(home,away,0,undefined,seed,[tactic,'balanced']);total[tactic][0]+=r.score[0];total[tactic][1]+=r.score[1];total[tactic][2]+=r.stats.shots[0];
 assert(r.stats.onTarget.every((n,i)=>n<=r.stats.shots[i]));
}
assert(total.press[2]>total.balanced[2]);assert(total.press[1]>=total.balanced[1]);assert(total.counter[1]<=total.balanced[1]);assert(total.counter[2]<total.balanced[2]);
for(const teamId of [home,away]){const s=createSeason(season.leagueId,teamId,42);s.tactic='press';const pair=currentFixture(s),expected=simulateFixture(s,...pair,0);simulateWeek(s);assert.deepEqual(s.results.find(r=>r.home===pair[0]&&r.away===pair[1]).stats,expected.stats)}
console.log('PASS: contribution grading, XP migration, collectible report retention, strict old/new backups and 100-seed tactical tradeoffs.');
console.log(JSON.stringify({tacticalTotals:total}));
