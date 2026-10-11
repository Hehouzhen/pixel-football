import assert from 'node:assert/strict';
import LZString from 'lz-string';
import {createSeason,prepareSeason} from './league.mjs';
import {startCup} from './cup.mjs';
import {allTimePlayerLeaders,archiveSeason,attachOffseason,playerCareerDossier} from './history.mjs';
import {SAVE_KEY,loadSaveData,loadSaveDataAsync,makeClubSlot,saveSaveData,saveSaveDataAsync,exportBackup,importBackup} from './save-slots.mjs';

const season=createSeason('england','arsenal',73);
startCup(season);
prepareSeason(season);
const versionedSeason={...season,calendar:{startYear:2026}},firstArchive=archiveSeason(versionedSeason),secondArchive=archiveSeason({...versionedSeason,history:[{archive:firstArchive}]});
assert.equal(firstArchive.revision,1);assert.equal(secondArchive.revision,2);attachOffseason(secondArchive,{retirements:[],transfers:[]});assert.equal(secondArchive.revision,3,'archive revisions should advance when the offseason edits historical data');
const archivedPlayerId=season.rosterIds[season.teamId][5],archivedAward={id:archivedPlayerId,award:'联赛金靴',competition:'league',season:1,year:2026},archivedTransfer={eventId:'archive-move',playerId:archivedPlayerId,playerName:'Ari',season:1,year:2026,from:'arsenal',to:'chelsea',fromName:'Arsenal',toName:'Chelsea'},legacyAward={id:archivedPlayerId,award:'旧版荣誉',competition:'league',season:0,year:2025},legacyTransfer={...archivedTransfer,eventId:'legacy-move',season:0,year:2025};
season.history=[
  {archive:{number:1,seasonStartYear:2026,awardHistory:[archivedAward],careerTransfers:[archivedTransfer],leagues:[{leagueId:'england',players:[{id:archivedPlayerId,name:'Ari',teamId:season.teamId,index:5,seasonTeamId:season.teamId,goals:3,honors:['2026/27 · 联赛金靴','首次进球','2025/26 · 未收录奖项'],awardHistory:[archivedAward],transferHistory:[archivedTransfer]}]}],cup:{players:[{id:archivedPlayerId,name:'Ari',teamId:season.teamId,index:5,goals:1,awardHistory:[archivedAward],transferHistory:[archivedTransfer]}]}}},
  {archive:{number:0,leagues:[{leagueId:'england',players:[{id:archivedPlayerId,name:'Ari',teamId:season.teamId,index:5,honors:['2025/26 · 旧版荣誉','队长里程碑'],awardHistory:[legacyAward],transferHistory:[legacyTransfer]}]}]}}
];
const data={version:2,active:0,slots:[makeClubSlot(season),null,null]},storage={value:null,getItem(key){return key===SAVE_KEY?this.value:null},setItem(key,value){if(key===SAVE_KEY)this.value=value}};
for(const state of [...Object.values(season.world),season.cup]){
  assert.equal(state.rosterIds,season.rosterIds,'live league and cup states should share the season roster IDs');
  assert.equal(state.playerData,season.playerData,'live league and cup states should share the season player table');
}

const fullBackup=JSON.stringify(data),backup=exportBackup(data),compact=JSON.parse(backup);
assert(!Object.values(compact.slots[0].season.world).some(state=>'playerData'in state||'rosterIds'in state),'export should omit duplicated league identity tables');
assert(!('playerData'in compact.slots[0].season.cup)&&!('rosterIds'in compact.slots[0].season.cup),'export should omit duplicated cup identity tables');
const compactArchive=compact.slots[0].season.history[0].archive,compactArchiveRow=compactArchive.leagues[0].players[0],incompleteLegacyRow=compact.slots[0].season.history[1].archive.leagues[0].players[0];
assert(!('awardHistory'in compactArchiveRow)&&!('transferHistory'in compactArchiveRow),'archive should use its season event tables rather than repeating cumulative player histories');
assert.deepEqual(compactArchiveRow.honors,['首次进球','2025/26 · 未收录奖项'],'only award labels backed by this player’s event records should be compacted');
assert.deepEqual(incompleteLegacyRow.honors,['队长里程碑'],'legacy award labels can be reconstructed from their retained player event rows');
assert(!('awardHistory'in compactArchive.cup.players[0])&&!('transferHistory'in compactArchive.cup.players[0]),'cup archives should not repeat event histories');
assert.deepEqual(compactArchive.awardHistory,[archivedAward]);assert.deepEqual(compactArchive.careerTransfers,[archivedTransfer]);
assert.deepEqual(incompleteLegacyRow.awardHistory,[legacyAward],'events without an archive-level copy must be retained');assert.deepEqual(incompleteLegacyRow.transferHistory,[legacyTransfer],'legacy transfers without an archive-level copy must be retained');
assert(Buffer.byteLength(backup)<Buffer.byteLength(fullBackup)*.6,'compact export should materially reduce serialized save size');

const restored=importBackup(backup).slots[0].season;
assert.deepEqual(restored.playerData,season.playerData);
assert.deepEqual(restored.rosterIds,season.rosterIds);
const restoredLeader=allTimePlayerLeaders(restored.history).find(row=>row.id===archivedPlayerId);
assert.deepEqual(restoredLeader.awards.map(row=>row.award),['联赛金靴','旧版荣誉']);assert.deepEqual(restoredLeader.transfers.map(row=>row.eventId),['archive-move','legacy-move']);
const restoredDossier=playerCareerDossier(restored.history,archivedPlayerId);
assert.deepEqual(restoredDossier.awards.map(row=>row.award),['旧版荣誉','联赛金靴']);assert.deepEqual(restoredDossier.transfers.map(row=>row.eventId),['legacy-move','archive-move']);
for(const state of [...Object.values(restored.world),restored.cup]){
  assert.equal(state.rosterIds,restored.rosterIds,'import should restore shared roster ID references');
  assert.equal(state.playerData,restored.playerData,'import should restore shared player table references');
}

const legacyRestored=importBackup(fullBackup).slots[0].season;
assert.deepEqual(legacyRestored.playerData,season.playerData,'previous full-format backups should remain importable');
assert.equal(legacyRestored.world.spain.playerData,legacyRestored.playerData,'previous backups should be normalized to shared player data');
storage.value=fullBackup;
const legacyLocal=loadSaveData(storage).slots[0].season;
assert.equal(legacyLocal.world.spain.playerData,legacyLocal.playerData,'previous full-format local saves should still load');

saveSaveData(data,storage);
assert(storage.value.startsWith('lz:'));
const savedJson=JSON.parse(LZString.decompressFromBase64(storage.value.slice(3)));
assert(!('playerData'in savedJson.slots[0].season.world.spain),'local saves should omit duplicated world player data');
const loaded=loadSaveData(storage).slots[0].season;
assert.equal(loaded.world.spain.playerData,loaded.playerData,'local load should restore world identity references');
assert.equal(loaded.cup.playerData,loaded.playerData,'local load should restore cup identity references');
const fallbackStorage={value:null,getItem(key){return key===SAVE_KEY?this.value:null},setItem(key,value){if(key===SAVE_KEY)this.value=value}};
await saveSaveDataAsync(data,{indexedDB:null,storage:fallbackStorage});
assert(fallbackStorage.value.startsWith('lz:'),'async persistence should retain compressed localStorage fallback when IndexedDB is unavailable');
assert.equal((await loadSaveDataAsync(fallbackStorage,null)).slots[0].season.teamId,season.teamId,'async loader should restore legacy localStorage saves without IndexedDB');

const careerFields=['appearances','goals','assists','shots','shotsOnTarget','passes','passesCompleted','tackles','interceptions','saves','keyPasses','playingSeconds'],careerRow=(id,appearances,goals,careerStats)=>({id,name:id,appearances,goals,...Object.fromEntries(careerFields.filter(field=>!['appearances','goals'].includes(field)).map(field=>[field,0])),careerStats}),cumulativeRows=[
  {archive:{number:1,seasonStartYear:2025,leagues:[{players:[careerRow('covered-player',1,2,{appearances:1,goals:2,...Object.fromEntries(careerFields.filter(field=>!['appearances','goals'].includes(field)).map(field=>[field,0]))}),careerRow('partial-player',1,1,{appearances:8,goals:9,...Object.fromEntries(careerFields.filter(field=>!['appearances','goals'].includes(field)).map(field=>[field,0]))})]}]}},
  {archive:{number:2,seasonStartYear:2026,leagues:[{players:[careerRow('covered-player',1,1,{appearances:2,goals:3,...Object.fromEntries(careerFields.filter(field=>!['appearances','goals'].includes(field)).map(field=>[field,0]))}),careerRow('partial-player',1,1,{appearances:8,goals:9,...Object.fromEntries(careerFields.filter(field=>!['appearances','goals'].includes(field)).map(field=>[field,0]))})]}]}}
],careerData={...data,slots:[{...data.slots[0],season:{...season,history:cumulativeRows}},null,null]},careerCompact=JSON.parse(exportBackup(careerData)).slots[0].season.history;
assert(!('careerStats'in careerCompact[0].archive.leagues[0].players[0])&&!('careerStats'in careerCompact[1].archive.leagues[0].players[0]),'cumulative career data should be removed only when archived season rows exactly rebuild it');
assert.equal(careerCompact[1].archive.leagues[0].players[1].careerStats.appearances,8,'incomplete archive coverage must retain its cumulative career data');
assert.deepEqual(JSON.parse(exportBackup(careerData)).slots[0].season.playerData[archivedPlayerId].careerStats,season.playerData[archivedPlayerId].careerStats,'compaction must preserve current player career totals');

console.log(`PASS: compact local and exported saves; ${(100*(1-Buffer.byteLength(backup)/Buffer.byteLength(fullBackup))).toFixed(1)}% smaller JSON; legacy backups retained.`);
