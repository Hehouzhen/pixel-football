import assert from 'node:assert/strict';
import {createSeason,LEAGUES,fixtures,seasonRounds} from './league.mjs';
import {initializeAcademy,setAcademyFocus,upgradeAcademy,academyState,academyBenchReleases,academyPromotionCost,promoteAcademyPlayer,carryAcademy,advanceAcademySeason} from './academy.mjs';
import {squadPlayers} from './football-life.mjs';
import {finances} from './transfers.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';

let season=createSeason('england','arsenal',77),league=LEAGUES[0],originalRosters=Object.fromEntries(league.teams.map(team=>[team.id,[...season.rosterIds[team.id]]]));
season=initializeAcademy(season);assert.equal(academyState(season).prospects.length,2);assert(season.academy.prospects.every(id=>season.playerData[id].academy&&season.playerData[id].age>=16&&season.playerData[id].age<=18));
season=setAcademyFocus(season,5);const before=season.academy.prospects.map(id=>season.playerData[id].attributes.shooting);season=upgradeAcademy(season);assert.equal(season.academy.level,2);assert.equal(finances(season).balance,28.3);assert.equal(season.academy.focus,5);assert.deepEqual(season.academy.prospects.map(id=>season.playerData[id].attributes.shooting),before,'facility upgrades do not rewrite current player ability');
const initialCount=squadPlayers(season,season.teamId).length;for(const id of [...season.academy.prospects])season=promoteAcademyPlayer(season,id);assert.equal(squadPlayers(season,season.teamId).length,initialCount+2);assert.equal(season.academy.prospects.length,0);assert.equal(season.academy.graduates.length,2);assert(season.academy.graduates.every(row=>season.playerData[row.id].teamId===season.teamId));
const protectedLineup=[...season.rosterIds[season.teamId]],intake=advanceAcademySeason(season,season.teamId,2027);assert.equal(intake.length,2);assert.equal(season.academy.prospects.length,2);assert.deepEqual(season.rosterIds[season.teamId],protectedLineup,'academy recruitment never changes the starting lineup');
const replacement=academyBenchReleases(season)[0];assert(replacement);const fee=academyPromotionCost(season,replacement.id),prospectId=season.academy.prospects[0];season=promoteAcademyPlayer(season,prospectId,replacement.id);assert.equal(squadPlayers(season,season.teamId).length,12);assert.equal(season.playerData[replacement.id].freeAgent,true);assert.equal(season.playerData[prospectId].squadRole,'prospect');assert(season.balance<=36.3-fee);assert.equal(season.rosterIds[season.teamId].length,6);
const next=createSeason('england','liverpool',78);carryAcademy(season,next,'liverpool');assert.equal(next.academy.teamId,'liverpool');assert.equal(next.academy.prospects.length,0);
const restored=importBackup(exportBackup({active:0,slots:[makeClubSlot(season),null,null]}));assert.deepEqual(restored.slots[0].season.academy,season.academy,'academy identity and progress survive backup round-trip');
const malformed=structuredClone(season);malformed.academy.prospects.push(malformed.academy.prospects[0]);assert.throws(()=>importBackup(exportBackup({active:0,slots:[makeClubSlot(malformed),null,null]})));
for(const team of league.teams)assert.equal(season.rosterIds[team.id].length,6);assert.equal(league.teams.length,16);assert.equal(seasonRounds(season),30);assert.equal(fixtures(league).length,30);
console.log('PASS: academy scouting focus, facility spend, prospect development, promotion/replacement, stable identities, saves and unchanged league format.');
