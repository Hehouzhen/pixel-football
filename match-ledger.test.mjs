import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSeason,prepareSeason,currentFixture,completeWeek,orientStats,simulateFixture} from './league.mjs';
import {startCup,cupNextMatch,completeCupMatch,cupNeedsShootout,simulateShootout} from './cup.mjs';
import {matchIdentity,normalizeMatchResult,findSettlement,recordSettlement,resultDigest,assertSettlementRetry,legacyV1Fingerprint,legacyV1PlayerDigest} from './match-ledger.mjs';
import {archiveSeason} from './history.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';

function leagueFixture(seed=77){
 const s=createSeason('england','arsenal',seed);prepareSeason(s);
 const [home,away]=currentFixture(s),week=s.week,sim=simulateFixture(s,home,away,week),homeIsUser=home===s.teamId;
 return {s,home,away,week,homeIsUser,score:homeIsUser?sim.score:[...sim.score].reverse(),stats:orientStats(sim.stats,homeIsUser),sim,matchId:matchIdentity(s,{competition:'league',week,home,away})};
}

test('match identity is fixed per fixture and distinguishes week, leg and opponent',()=>{
 const {s,home,away,week,matchId}=leagueFixture();
 assert.equal(matchId,matchIdentity(s,{competition:'league',week,home,away}));
 assert.notEqual(matchId,matchIdentity(s,{competition:'league',week:week+1,home,away}));
 assert.notEqual(matchId,matchIdentity(s,{competition:'cup',phase:'quarterfinal',round:0,home,away}));
 assert.notEqual(matchId,matchIdentity(s,{competition:'cup',phase:'quarterfinal',round:1,home,away}));
});

test('result contract separates score, shootout, participants and completeness',()=>{
 const contract=normalizeMatchResult({matchId:'m1',home:'a',away:'b',score:[1,1],penalties:[4,3],winner:'a',competition:'cup',phase:'final',round:0,source:'played',playerStats:[{playerId:'p1',teamId:'a',playerName:'A',shirtNumber:9,started:true,minuteOn:0,minuteOff:90,minutesPlayed:90}],goalEvents:[{minute:12,teamId:'a',scorerId:'p1',ownGoal:false}]},{leagueId:'england'});
 assert.deepEqual(contract.result,{home:'a',away:'b',score:[1,1],shootout:{score:[4,3],winner:'a'}});
 assert.equal(contract.participants[0].number,9);
 assert.equal(contract.participants[0].played,true);
 assert.equal(contract.completeness.participants,'full');
 assert.equal(contract.completeness.events,'full');
 const aggregate=normalizeMatchResult({home:'a',away:'b',score:[0,1],competition:'cup'});
 assert.equal(aggregate.completeness.participants,'missing');
 assert.equal(aggregate.completeness.events,'missing');
});

test('settling the same generated league result twice returns the recorded state unchanged',()=>{
 const {s,home,away,week,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 assert.ok(findSettlement(s,matchId));
 const settled=structuredClone(s),receipt=findSettlement(s,matchId);
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 assert.deepEqual(s,settled);
 assert.equal(findSettlement(s,matchId).digest,receipt.digest);
 assert.equal(s.matchSettlements.filter(row=>row.matchId===matchId).length,1);
});

test('the same match id with a different score is rejected and state stays intact',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 const settled=structuredClone(s);
 assert.throws(()=>completeWeek(s,[score[0]+1,score[1]],sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId}),/不一致/);
 assert.deepEqual(s,settled);
});

test('a cup result is recorded once including penalty scores',()=>{
 const s=createSeason('england','arsenal',91);prepareSeason(s);startCup(s);
 const pair=cupNextMatch(s),home=pair[0],away=pair[1],homeIsUser=home===s.teamId,phase=s.cup.phase,round=s.cup.round,sim=simulateFixture(s,home,away,40,'cup'),score=homeIsUser?sim.score:[...sim.score].reverse(),stats=orientStats(sim.stats,homeIsUser);
 const matchId=matchIdentity(s,{competition:'cup',phase,round,home,away});
 const shootout=cupNeedsShootout(s,score)?simulateShootout(s,home,away,40,sim):null;
 completeCupMatch(s,score,sim.playerStats,stats,shootout,null,{...sim,source:'simulated'},{matchId});
 const settled=structuredClone(s),receipt=findSettlement(s,matchId);
 assert.ok(receipt);assert.equal(receipt.competition,'cup');
 completeCupMatch(s,score,sim.playerStats,stats,shootout,null,{...sim,source:'simulated'},{matchId});
 assert.deepEqual(s,settled);
 assert.equal(findSettlement(s,matchId).digest,receipt.digest);
});

test('settlement receipts survive archiving, season carry-over and backup round-trip',async()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 const archive=archiveSeason(s);
 assert.ok(archive.matchSettlements.some(row=>row.matchId===matchId));
 const backup={version:2,active:0,slots:[makeClubSlot(s),null,null]},restored=importBackup(exportBackup(backup));
 assert.ok(restored.slots[0].season.matchSettlements.some(row=>row.matchId===matchId));
 const {carryIdentity}=await import('./identity.mjs');
 const next=createSeason('england','arsenal',s.seed+1);next.calendar={startYear:2027};
 carryIdentity(s,next);
 assert.ok(next.matchSettlements.some(row=>row.matchId===matchId));
});

test('the first submission is checked against the current fixture, not only against a receipt',()=>{
 const {s,home,away,score,stats,sim}=leagueFixture();
 const wrong=matchIdentity(s,{competition:'league',week:s.week+1,home,away});
 const before=structuredClone(s);
 assert.throws(()=>completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId:wrong}),/赛程不一致/);
 assert.deepEqual(s,before);
});

test('every settlement statistic participates in the retry conflict check',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 const settled=structuredClone(s),own=sim.playerStats.find(row=>row.teamId===s.teamId);
 for(const [field,value] of [['passesCompleted',(own.passesCompleted??0)+100],['tackles',(own.tackles??0)+3],['saves',(own.saves??0)+2],['playingSeconds',(own.playingSeconds??0)+30],['minuteOff',(own.minuteOff??90)-10],['shots',(own.shots??0)+2]]){
  const rows=structuredClone(sim.playerStats),row=rows.find(item=>item.playerId===own.playerId);row[field]=value;
  assert.throws(()=>completeWeek(s,score,rows,stats,null,{...sim,playerStats:rows,source:'simulated'},{matchId}),/不一致|已结算/,`${field} change must be rejected`);
  assert.deepEqual(s,settled);
 }
});

test('a failure in a later league leaves the round untouched (commit boundary)',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 s.world.spain.results=null;
 const before=structuredClone(s);
 assert.throws(()=>completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId}));
 assert.deepEqual(s,before);
 assert.equal(s.week,0);
 assert.equal(s.results.length,0);
 assert.equal((s.matchSettlements??[]).length,0);
});

test('receipts are not pruned and archived receipts still block replays',()=>{
 const s=createSeason('england','arsenal',5150);prepareSeason(s);
 let first=null;
 for(let i=0;i<4001;i++){const receipt=recordSettlement(s,{matchId:`threshold:${i}`,home:'arsenal',away:'chelsea',score:[0,0],playerStats:[]},{userTeamId:'arsenal'}).receipt;if(i===0)first=receipt}
 assert.equal(s.matchSettlements.length,4001);
 assert.equal(findSettlement(s,'threshold:0').matchId,'threshold:0');
 s.history=[{archive:{matchSettlements:[first]}}];s.matchSettlements=[];
 assert.ok(findSettlement(s,'threshold:0'));
 assert.equal(recordSettlement(s,{matchId:'threshold:0',home:'arsenal',away:'chelsea',score:[0,0],playerStats:[]},{userTeamId:'arsenal'}).status,'already');
 assert.throws(()=>recordSettlement(s,{matchId:'threshold:0',home:'arsenal',away:'chelsea',score:[1,0],playerStats:[]},{userTeamId:'arsenal'}),/不一致/);
});

test('corrupt settlement arrays and archives are rejected on import',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 const slot=makeClubSlot(s);
 const broken=structuredClone(slot);broken.season.matchSettlements='broken';
 assert.throws(()=>importBackup(exportBackup({version:2,active:0,slots:[broken,null,null]})),/存档|无效|格式|校验/);
 const duplicate=structuredClone(slot);duplicate.season.matchSettlements.push(structuredClone(duplicate.season.matchSettlements[0]));
 assert.throws(()=>importBackup(exportBackup({version:2,active:0,slots:[duplicate,null,null]})),/存档|无效|格式|校验/);
 const badArchive=structuredClone(slot);badArchive.season.history=[{archive:{matchSettlements:[{matchId:'x'}]}}];
 assert.throws(()=>importBackup(exportBackup({version:2,active:0,slots:[badArchive,null,null]})),/存档|无效|格式|校验/);
 const legacy=structuredClone(slot);delete legacy.season.matchSettlements;
 assert.ok(importBackup(exportBackup({version:2,active:0,slots:[legacy,null,null]})));
});

test('goal events and bicycle counts participate in retry conflicts',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture();
 completeWeek(s,score,sim.playerStats,stats,null,{...sim,source:'simulated'},{matchId});
 const settled=structuredClone(s),events=structuredClone(sim.goalEvents??[]);
 if(events.length){events[0]={...events[0],ownGoal:events[0].ownGoal!==true,scorerId:'p:other:0'};}
 assert.throws(()=>completeWeek(s,score,sim.playerStats,stats,null,{...sim,goalEvents:events,source:'simulated'},{matchId}),/不一致/);
 assert.deepEqual(s,settled);
 const rows=structuredClone(sim.playerStats),own=rows.find(row=>row.teamId===s.teamId);own.bicycles=(own.bicycles??0)+7;
 assert.throws(()=>completeWeek(s,score,rows,stats,null,{...sim,playerStats:rows,source:'simulated'},{matchId}),/不一致/);
 assert.deepEqual(s,settled);
});

test('a legacy 8-character receipt stays usable without being misread as a conflict',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture(),stable=value=>{if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;return JSON.stringify(value)},fnv=value=>{let hash=2166136261;for(const char of stable(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16).padStart(8,'0')},summary=sim.playerStats.map(row=>[row.playerId??null,row.teamId??null,row.goals??0,row.assists??0,row.started!==false?1:0,row.sentOffMinute??row.minuteOff??null]).sort((a,b)=>stable(a).localeCompare(stable(b)));
 const home=s.results.length?null:null,receipt={version:1,matchId,seasonId:'england:2026:77',competition:'league',home:matchId.split(':').at(-2),away:matchId.split(':').at(-1),score:[...score],homeIsUser:true,penalties:null,playerDigest:fnv(summary),digest:fnv({home:matchId.split(':').at(-2),away:matchId.split(':').at(-1),score,penalties:null,playerStats:summary})};
 s.matchSettlements=[receipt];
 assert.equal(recordSettlement(s,{matchId,home:receipt.home,away:receipt.away,score,playerStats:sim.playerStats},{userTeamId:s.teamId}).status,'already');
 assert.ok(assertSettlementRetry(s,matchId,{score,playerStats:sim.playerStats,userTeamId:s.teamId}));
 assert.throws(()=>assertSettlementRetry(s,matchId,{score:[score[0]+1,score[1]],userTeamId:s.teamId}),/不一致/);
 const slot=makeClubSlot(s);assert.ok(importBackup(exportBackup({version:2,active:0,slots:[slot,null,null]})));
});

test('a version-1 receipt with the previous 32-bit format remains usable',()=>{
 const {s,score,stats,sim,matchId}=leagueFixture(),home=matchId.split(':').at(-2),away=matchId.split(':').at(-1);
 const result={matchId,home,away,score,playerStats:sim.playerStats,stats};
 s.matchSettlements=[{version:1,matchId,seasonId:'england:2026:77',competition:'league',home,away,score:[...score],homeIsUser:true,penalties:null,winner:null,playerDigest:legacyV1PlayerDigest(sim.playerStats),digest:legacyV1Fingerprint(result)}];
 assert.equal(recordSettlement(s,result,{userTeamId:s.teamId}).status,'already');
 assert.ok(assertSettlementRetry(s,matchId,{score,playerStats:sim.playerStats,userTeamId:s.teamId}));
 const rows=structuredClone(sim.playerStats);rows.find(row=>row.teamId===s.teamId).passesCompleted+=5;
 assert.throws(()=>assertSettlementRetry(s,matchId,{score,playerStats:rows,userTeamId:s.teamId}),/不一致/);
});

test('two producers with the same final result record the same digest regardless of row order',()=>{
 const base={home:'a',away:'b',score:[2,1],playerStats:[{playerId:'p1',teamId:'a',goals:1,assists:0,started:true},{playerId:'p2',teamId:'b',goals:0,assists:0,started:true}]};
 const reversed={...base,playerStats:[...base.playerStats].reverse()};
 assert.equal(resultDigest(base),resultDigest(reversed));
 const changed={...base,playerStats:[{playerId:'p1',teamId:'a',goals:0,assists:0,started:true},base.playerStats[1]]};
 assert.notEqual(resultDigest(base),resultDigest(changed));
});
