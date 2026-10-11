import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createSeason,completeWeek,currentFixture,simulateFixture,orientStats,seasonRounds,standings,prepareSeason} from './league.mjs';
import {startCup,completeCupMatch,cupNextMatch,cupStandings} from './cup.mjs';
import {createCareerPlayer,careerObjective,finishCareerMatch} from './career.mjs';
import {loadSaveData,makeCareerSlot,makeClubSlot,saveSaveData,exportBackup,importBackup,SAVE_KEY} from './save-slots.mjs';
import {nextCeremony,recordCeremonyHonors} from './awards.mjs';

function assertMatchGoals(match){
  assert.deepEqual(match.score,[0,1].map(side=>match.playerStats.filter(row=>row.teamId===(side===0?match.home:match.away)).reduce((sum,row)=>sum+(row.goals??0),0)),'player goals must equal the match score');
  assert.equal(match.goalEvents.length,match.score[0]+match.score[1],'goal events must equal the match score');
  assert.equal(typeof match.seasonId,'string','every new match should identify its season');
  assert.equal(typeof match.matchId,'string','every new match should have a stable ID');
  assert([120,180,300].includes(match.duration),'each match should preserve its duration');
  assert.equal(new Set(match.playerStats.map(row=>row.playerId)).size,12,'each match should preserve twelve stable player identities');
  assert.equal(match.lineups.length,2,'each match should save both lineups');
  for(const lineup of match.lineups){const players=match.playerStats.filter(row=>row.teamId===lineup.teamId).sort((a,b)=>a.index-b.index);assert.deepEqual(lineup.playerIds,players.map(row=>row.playerId));assert.equal(players.length,6);for(const player of players){assert.equal(player.started,true);assert.equal(player.minuteOn,0);assert(player.minuteOff>=player.minuteOn&&player.minuteOff<=90);assert(player.minutesPlayed>=0&&player.minutesPlayed<=90);if(player.playingSeconds>0)assert.equal(player.minutesPlayed,Math.round(player.playingSeconds/match.duration*90));if(player.reds>0)assert(player.minuteOff<90,'a dismissed simulated player should have an exit minute')}}
}

function simulateCareerRound(season,career){
  const pair=currentFixture(season),home=pair[0],away=pair[1],homeIsUser=home===season.teamId,result=simulateFixture(season,home,away,season.week,'league'),score=homeIsUser?result.score:[...result.score].reverse(),opponent=pair.find(id=>id!==season.teamId);
  const userLines=result.playerStats.filter(row=>row.teamId===season.teamId),opponentLines=result.playerStats.filter(row=>row.teamId===opponent),matchStats=[...userLines,...opponentLines].map(({playerId,teamId,index,...stat})=>stat),simulation={source:'simulated',weather:result.weather,goalEvents:result.goalEvents,playerStats:result.playerStats};
  completeWeek(season,score,matchStats,orientStats(result.stats,homeIsUser),null,simulation);
  const next=finishCareerMatch(career,userLines[career.index],score,180,{objective:careerObjective(career.position,season.week-1,180),source:'simulated',goalEvents:result.goalEvents,competition:'league',season:1,opponent,seasonState:season});
  prepareSeason(season,next);
  return {career:next,match:{...result,home,away}};
}

function careerSimulationRoundTrip(){
  const season=createSeason('england','arsenal',7319);let career=createCareerPlayer('Milo Test',10,'forward');
  prepareSeason(season,career);
  for(let round=0;round<seasonRounds(season);round++)career=simulateCareerRound(season,career).career;
  startCup(season);
  assert.equal(season.week,30,'MyCareer simulation should close a full league season');
  assert.equal(career.stats.appearances,30,'MyCareer should record one appearance per simulated league match');
  assert.equal(career.history.length,30,'each simulated league match should enter career history');
  assert.equal(career.lastMatch.source,'simulated');
  assert.equal(career.stats.goals,career.seasonLedger['1'].goals,'career ledger and career totals should reconcile');
  const store={value:null,getItem(key){return key===SAVE_KEY?this.value:null},setItem(key,value){this.value=value}};
  saveSaveData({version:2,active:0,slots:[makeCareerSlot(season,career),null,null]},store);
  const loaded=loadSaveData(store);
  assert.equal(loaded.active,0,'career save should reopen as active');
  assert.equal(loaded.slots[0].season.week,30,'completed MyCareer season should survive save round-trip');
  assert.equal(loaded.slots[0].player.stats.appearances,30,'simulated appearances should survive save round-trip');
  assert.equal(loaded.slots[0].player.stats.goals,career.stats.goals,'simulated career goals should survive save round-trip');
  assert.equal(loaded.slots[0].player.lastMatch.source,'simulated','simulation provenance should survive save round-trip');
  for(const row of season.results)assertMatchGoals(row);
}

export function buildFullSeason(){
  const season=createSeason('england','arsenal',20261008);
  for(let round=0;round<seasonRounds(season);round++)completeWeek(season,null,null,null);
  startCup(season);
  while(cupNextMatch(season))completeCupMatch(season,null,null,null);
  return season;
}

function fullSeason(){
  const season=buildFullSeason();
  assert.equal(season.week,30,'league should advance through all 30 rounds');
  assert.equal(season.results.length,240,'managed league should finish 240 fixtures');
  assert(season.awards?.champion&&season.records,'league close should produce awards and records');
  for(const state of Object.values(season.world))assert.equal(state.results.length,240,'each world league should complete 240 fixtures');

  assert.equal(season.cup.teams.length,20,'cup should qualify 20 teams');
  assert.equal(season.cup.groups.length,4,'cup should contain four groups');
  assert.equal(season.cup.phase,'complete','all cup rounds should finish');
  assert.equal(season.cup.results.length,53,'cup should record 40 group, 8 quarterfinal, 4 semifinal, and 1 final fixture');
  assert.equal(season.cup.results.filter(row=>row.phase==='league').length,40);
  assert.equal(season.cup.results.filter(row=>row.phase==='quarterfinal').length,8);
  assert.equal(season.cup.results.filter(row=>row.phase==='semi').length,4);
  assert.equal(season.cup.results.filter(row=>row.phase==='final').length,1);
  for(const match of [...season.results,...Object.values(season.world).flatMap(state=>state.results),...season.cup.results])assertMatchGoals(match);
  for(let group=0;group<4;group++)assert.equal(cupStandings(season,group).length,5,'cup group table should preserve its five clubs');
  assert.equal(standings(season).length,16,'the managed league should retain 16 clubs');

  assert.equal(nextCeremony(season),'league','league awards should be the first unseen ceremony');
  recordCeremonyHonors(season,'league');
  season.seenAwards=['league'];
  assert.equal(nextCeremony(season),'europe','completed cup should unlock European awards');
  recordCeremonyHonors(season,'europe');
  season.seenAwards.push('europe');
  assert.equal(nextCeremony(season),null,'both ceremonies should be marked seen');

  const appearances=new Map(),goals=new Map();
  for(const state of [season,...Object.values(season.world),season.cup])for(const match of state.results)for(const row of match.playerStats){
    appearances.set(row.playerId,(appearances.get(row.playerId)??0)+1);
    goals.set(row.playerId,(goals.get(row.playerId)??0)+(row.goals??0));
  }
  for(const [id,count] of appearances)assert.equal(season.playerData[id].careerStats.appearances,count,`career appearances must reconcile for ${id}`);
  for(const [id,count] of goals)assert.equal(season.playerData[id].careerStats.goals,count,`career goals must reconcile for ${id}`);

  const data={version:2,active:0,slots:[makeClubSlot(season),null,null]},raw=JSON.stringify(data),backup=exportBackup(data),storage={value:null,getItem(key){return key===SAVE_KEY?this.value:null},setItem(key,value){if(key===SAVE_KEY)this.value=value}};
  assert(Buffer.byteLength(backup)<Buffer.byteLength(raw)*.8,'full-season backups should omit enough duplicate identity data to reduce size by at least 20%');
  saveSaveData(data,storage);
  assert(storage.value.startsWith('lz:'),'local saves should be compressed');
  assert(storage.value.length<5*1024*1024,'full-season save should fit in browser local storage');
  const loaded=loadSaveData(storage);
  assert.equal(loaded.active,0,'finished club save should reopen as active');
  assert.equal(loaded.slots[0].season.cup.phase,'complete','completed cup should survive a save round-trip');
  assert.equal(loaded.slots[0].season.playerData[season.rosterIds[season.teamId][0]].awardHistory.length>0,true,'player honors should persist');
  const multiSlot=exportBackup({version:2,active:0,slots:[makeClubSlot(season),makeClubSlot(season),null]});
  assert(Buffer.byteLength(multiSlot)>8_000_000,'multi-slot backup should exceed the old size ceiling');
  assert.equal(importBackup(multiSlot).slots.filter(Boolean).length,2,'multi-slot season backup should remain restorable');
  return {leagueMatches:season.results.length,worldMatches:Object.values(season.world).reduce((sum,state)=>sum+state.results.length,0),cupMatches:season.cup.results.length,rawSaveBytes:Buffer.byteLength(raw),compactBackupBytes:Buffer.byteLength(backup),compressedCharacters:storage.value.length,multiSlotBackupBytes:Buffer.byteLength(multiSlot)};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  careerSimulationRoundTrip();
  const totals=fullSeason();
  console.log(`PASS: full season continuity, score-to-player-goal reconciliation, career saves and both ceremonies. ${JSON.stringify(totals)}`);
}
