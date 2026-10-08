import assert from 'node:assert/strict';
import {createSeason,LEAGUES,retireAgedPlayers} from './league.mjs';
import {advanceSeasonAges,playerAgeProfile,seasonLabel} from './aging.mjs';
import {archiveSeason,allTimePlayerLeaders} from './history.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';

const season=createSeason(LEAGUES[0].id,LEAGUES[0].teams[0].id,17),players=Object.values(season.playerData);
assert.equal(seasonLabel(season),'2026/27 赛季');
assert.deepEqual(playerAgeProfile('p:test:1',1),playerAgeProfile('p:test:1',1),'generated age profile must be stable');
assert(players.every(player=>player.age>=18&&player.age<=32&&player.potential>=60&&player.potential<=96));
const player=season.playerData[season.rosterIds[season.teamId][0]],startingAge=player.age;
season.calendar.startYear=2027;advanceSeasonAges(season);assert.equal(player.age,startingAge+1);const attrs={...player.attributes};
advanceSeasonAges(season);assert.equal(player.age,startingAge+1,'reloading or repeating the rollover must not age twice');assert.deepEqual(player.attributes,attrs);
season.players[player.id]={appearances:1,goals:0,assists:0};const archive=archiveSeason(season);assert.equal(archive.seasonStartYear,2027);const historic=allTimePlayerLeaders([{archive}]);assert(historic.some(row=>row.id===player.id&&row.age===player.age&&Number.isInteger(row.potential)));
const veteran={...player,age:35,lastAgedStartYear:2027,attributes:{...player.attributes,speed:70,endurance:70}};season.playerData[veteran.id]=veteran;season.calendar.startYear=2028;advanceSeasonAges(season);assert.equal(veteran.age,36);assert(veteran.attributes.speed<70||veteran.attributes.endurance<70);
const retireSeason=createSeason('england','arsenal',18),retireId=retireSeason.rosterIds.arsenal[5],retiree=retireSeason.playerData[retireId];retiree.age=41;retiree.lastAgedStartYear=2026;retiree.awardHistory=[{id:retireId,award:'年度金球奖 · 第 2 名',competition:'europe',season:1,year:2026}];retiree.honors=['2026/27 · 年度金球奖 · 第 2 名'];retireSeason.players[retireId]={appearances:12,goals:9,assists:2};const lastSeason=archiveSeason(retireSeason);retireSeason.history=[{archive:lastSeason}];retireSeason.players={};retireSeason.calendar.startYear=2027;advanceSeasonAges(retireSeason);retireAgedPlayers(retireSeason);assert(retiree.retired);assert.notEqual(retireSeason.rosterIds.arsenal[5],retireId);const retireArchive=archiveSeason(retireSeason),retiredLeader=allTimePlayerLeaders([{archive:lastSeason},{archive:retireArchive}]).find(row=>row.id===retireId);assert(retiredLeader.retired);assert.equal(retiredLeader.appearances,12);assert(retiredLeader.awards.some(award=>award.award==='年度金球奖 · 第 2 名'));assert(retireArchive.retirements.some(row=>row.id===retireId&&row.replacementId===retireSeason.rosterIds.arsenal[5]));const backup=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(retireSeason),null,null]}));assert(backup.slots[0].season.playerData[retireId].retired);
console.log('PASS: stable age profiles, one annual age tick, age related development and repeat-safe season rollover.');
