import assert from 'node:assert/strict';
import {createSeason,LEAGUES} from './league.mjs';
import {archiveSeason,attachOffseason} from './history.mjs';
import {advancePlayerWorld} from './world.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';

const season=createSeason('england','arsenal',1);
season.calendar.startYear=2030;
season.worldMarket={nextYear:2030,lastYear:null};
const retiringId=season.rosterIds.arsenal[5],retiring=season.playerData[retiringId];
retiring.age=45;retiring.lastAgedStartYear=2029;
season.players[retiringId]={appearances:12,goals:4,assists:2};
const archive=archiveSeason(season),summary=advancePlayerWorld(season);

assert.equal(summary.marketOpened,true);
assert.equal(summary.transfers.length,LEAGUES.length,'每个联赛的市场都应独立结算一笔符合条件的交易');
assert.equal(summary.retirements.some(row=>row.id===retiringId),true,'高龄球员必须退役并由青训球员补位');
assert.equal(season.playerData[retiringId].retired,true);
assert.notEqual(season.rosterIds.arsenal[5],retiringId);
assert.equal(season.playerData[season.rosterIds.arsenal[5]].origin,'academy');
for(const league of LEAGUES)for(const team of league.teams){
  assert.equal(season.rosterIds[team.id].length,6,`${team.id}仍应保持六人阵容`);
  assert.equal(new Set(season.rosterIds[team.id]).size,6,`${team.id}阵容 ID 不重复`);
  for(const id of season.rosterIds[team.id])assert.equal(season.playerData[id].teamId,team.id,`${id}身份所属球队与阵容一致`);
}
for(const event of summary.transfers){
  assert.equal(event.moves.length,2,'交易双方的身份履历都要记录');
  for(const move of event.moves)assert(season.playerData[move.playerId].transferHistory.some(row=>row.eventId===move.eventId));
}
attachOffseason(archive,summary);
assert(archive.retirements.some(row=>row.id===retiringId));
assert(archive.leagues.flatMap(league=>league.players).find(row=>row.id===retiringId)?.retired);
assert.equal(archive.careerTransfers.length,LEAGUES.length*2);

const snapshot=JSON.stringify({summary,rosterIds:season.rosterIds,playerData:season.playerData,worldFunds:season.worldFunds});
assert.equal(advancePlayerWorld(season),summary,'同一休赛期重复调用不应重复推进球龄或转会');
assert.equal(JSON.stringify({summary,rosterIds:season.rosterIds,playerData:season.playerData,worldFunds:season.worldFunds}),snapshot);

const restored=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(season),null,null]}));
assert.deepEqual(restored.slots[0].season.worldOffseason,summary,'新世界事件需要随存档完整往返');
assert.throws(()=>importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot({...season,worldOffseason:{...summary,nextMarketYear:summary.year+9}}),null,null]})));
const archiveProbe=createSeason('england','arsenal',5),probe=archiveProbe.playerData[archiveProbe.rosterIds.arsenal[5]];
probe.transferHistory=[{eventId:'season-one',playerId:probe.id,playerName:probe.name,season:1,year:2026,from:'mancity',to:'arsenal',fromName:'Manchester City',toName:'Arsenal'},{eventId:'season-two',playerId:probe.id,playerName:probe.name,season:2,year:2027,from:'mancity',to:'arsenal',fromName:'Manchester City',toName:'Arsenal'}];
assert.deepEqual(archiveSeason(archiveProbe).careerTransfers.map(row=>row.eventId),['season-one'],'赛季档案只写入本季转会，避免历史条目逐年重复膨胀');
console.log('PASS: 80-team world aging, retirement replacement, deterministic transfers, archives and save round-trip.');
