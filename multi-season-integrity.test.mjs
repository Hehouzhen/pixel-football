import assert from 'node:assert/strict';
import {LEAGUES,createSeason,fixtures,leagueAwards,seasonRecords,standings} from './league.mjs';
import {getTeam} from './clubs.mjs';
import {startCup,cupNextMatch,completeCupMatch,cupNeedsShootout,simulateShootout} from './cup.mjs';
import {initializeAcademy,carryAcademy} from './academy.mjs';
import {advancePlayerWorld} from './world.mjs';
import {carryIdentity} from './identity.mjs';
import {createClubChallenge,settleClubChallenge,carryClubChallenge} from './club-challenge.mjs';
import {archiveSeason,upsertSeasonHistory} from './history.mjs';
import {worldHistory} from './world-history.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';
import {createCareerPlayer,finishCareerMatch} from './career.mjs';
import {chooseCareerGoal,settleCareerGoal} from './career-goals.mjs';

const teamId='arsenal',leagueId='england',years=2;
let season=createSeason(leagueId,teamId,20261012),history=[],trackedIds=[...season.squadIds[teamId].slice(0,2)];
season.calendar={startYear:2026,dated:true};
season=initializeAcademy(season,teamId);
season.challenge=createClubChallenge(season,{targetPosition:16,requiredPromotions:0});

for(let index=0;index<years;index++){
  const year=2026+index;
  if(index)assert.equal(season.calendar.startYear,year);
  for(const league of LEAGUES){
    const rows=fixtures(league).flat().map(([home,away],week)=>({week,home,away,score:[0,0]}));
    const state=league.id===leagueId?season:season.world[league.id];
    state.results=rows;
    if(league.id!==leagueId)state.leagueTeamIds=league.teams.map(team=>team.id);
  }
  season.week=30;
  season.awards=leagueAwards(season);
  season.records=seasonRecords(season);
  assert.equal(season.results.length,240,`season ${year} must retain 240 managed-league fixtures`);
  assert.equal(standings(season).length,16);

  startCup(season);
  assert.equal(season.cup.teams.length,20);
  let safety=0;
  while(cupNextMatch(season)&&safety++<20){
    const pair=cupNextMatch(season),penalties=cupNeedsShootout(season,[0,0])?simulateShootout(season,pair[0],pair[1],season.cup.round+year):null;
    completeCupMatch(season,[0,0],null,null,penalties);
  }
  assert.equal(season.cup.phase,'complete');
  assert.equal(season.cup.results.length,53,`season ${year} must retain 53 Europe Cup fixtures`);

  for(const state of [season,...Object.values(season.world),season.cup])for(const match of state.results??[]){
    for(const [side,team] of [match.home,match.away].entries()){
      const goals=(match.playerStats??[]).filter(player=>player.teamId===team).reduce((sum,player)=>sum+(player.goals??0),0);
      assert.equal(goals,match.score[side],`player goals must reconcile for ${team} in ${year}`);
    }
  }
  for(const id of trackedIds)assert(season.playerData[id],`stable player identity ${id} must survive ${year}`);

  const challenge=settleClubChallenge(season);
  assert(challenge&&challenge.rank>=1&&challenge.rank<=16);
  assert.equal(settleClubChallenge(season),challenge,'challenge settlement must be idempotent');
  const archive=archiveSeason(season);
  history=upsertSeasonHistory(history,{archive,challengeResult:challenge});
  assert.equal(history.length,index+1,'one archive per season year');

  if(index+1===years)break;
  const nextYear=year+1,next=createSeason(leagueId,teamId,20261012+index+1);
  next.calendar={startYear:nextYear,dated:true};
  next.history=history;
  next.previousLeagueStandings=Object.fromEntries(LEAGUES.map(league=>[league.id,league.id===leagueId?standings(season,leagueId).map(row=>row.id):[...league.teams].sort((a,b)=>getTeam(b.id).strength-getTeam(a.id).strength||a.id.localeCompare(b.id)).map(team=>team.id)]));
  carryIdentity(season,next);
  carryAcademy(season,next,teamId);
  next.challenge=carryClubChallenge(season,next);
  const priorProspects=[...next.academy.prospects];
  const beforeAge=Object.fromEntries(trackedIds.map(id=>[id,next.playerData[id].age]));
  advancePlayerWorld(next,{managedTeamId:teamId});
  assert.equal(next.worldOffseason.year,nextYear);
  const afterFirstAdvance={ages:trackedIds.map(id=>next.playerData[id].age),prospects:[...next.academy.prospects],squads:JSON.stringify(next.squadIds)};
  advancePlayerWorld(next,{managedTeamId:teamId});
  assert.deepEqual({ages:trackedIds.map(id=>next.playerData[id].age),prospects:[...next.academy.prospects],squads:JSON.stringify(next.squadIds)},afterFirstAdvance,'offseason processing must not repeat on reload/re-entry');
  assert(trackedIds.every(id=>next.playerData[id]),'aging, retirement, and transfers must preserve player identities in the database');
  assert(trackedIds.every(id=>next.playerData[id].age>=beforeAge[id]),'player ages must not move backwards');
  assert(priorProspects.every(id=>next.playerData[id]),'academy prospects must keep their identities across seasons');
  assert.equal(next.challenge.results.length,index+1,'challenge history must carry into the next season');
  season=next;
}

const historyTable=worldHistory(history.map(row=>({archive:row.archive})));
assert(historyTable.every(row=>row.seasons===years),'world history must count each saved season exactly once');
assert(history.every(row=>row.archive.results.length===240&&row.archive.cup.results.length===53));
const restored=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(season),null,null]}));
const restoredSeason=restored.slots[0].season;
assert.equal(restoredSeason.challenge.results.length,years,'challenge results must survive backup round-trip');
assert.equal(restoredSeason.academy.teamId,teamId);
assert.deepEqual(restoredSeason.history.map(row=>row.archive?.seasonStartYear),season.history.map(row=>row.archive?.seasonStartYear));
assert.equal(restoredSeason.playerData[trackedIds[0]].id,trackedIds[0]);

let career=createCareerPlayer('跨季目标测试',9,'forward');
for(let number=1;number<=years;number++){
  career=chooseCareerGoal(career,number,'goal-contributions');
  for(let match=0;match<15;match++)career=finishCareerMatch(career,{goals:1,playingSeconds:180},[1,0],180,{season:number,source:'simulated'});
  career=settleCareerGoal(career,number);
  assert.equal(career.goalHistory.filter(row=>row.season===number).length,1,'each MyCareer season goal must settle once');
  assert.equal(career.goalHistory.at(-1).complete,true);
}
assert.equal(career.goalHistory.length,years,'MyCareer goal history must persist across seasons');

console.log('PASS: two-season archive/rollover continuity, career goals, score ledgers, offseason idempotence, academy/challenge carry, and backup round-trip');
