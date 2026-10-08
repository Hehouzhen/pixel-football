import assert from 'node:assert/strict';
import {createSeason,prepareSeason,simulate,addPlayer,playerRows} from './league.mjs';
import {carryIdentity,rosterRating} from './identity.mjs';
import {Match} from './engine.mjs';
import {makeClubSlot,makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
import {archiveSeason} from './history.mjs';

const old=createSeason('england','arsenal',7);
const id=old.rosterIds.arsenal[5];
delete old.rosterIds;delete old.playerData;
old.players['arsenal:5']={goals:4};
old.names['arsenal:5']='老射手';
prepareSeason(old);
assert.ok(['firstTouch','endurance','aerial'].every(key=>old.playerData[id].attributes[key]>=1));
assert.equal(old.players[id].goals,4);
assert.equal(playerRows(old).find(row=>row.id===id).name,'老射手');
assert.equal(importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(old),null,null]})).slots[0].season.players[id].goals,4);

const moved=createSeason('england','chelsea',8),releasedId=moved.rosterIds.chelsea[5],career={id,name:'老射手',index:5,attributes:{shooting:90,passing:70,defense:40},transferOffer:{expectedRole:'核心主力',ambition:'争冠目标',rationale:'球队需要同位置球员。'}};
carryIdentity(old,moved,career);
assert.equal(moved.rosterIds.chelsea[5],id);
assert.notEqual(moved.rosterIds.arsenal[5],id);
assert.equal(moved.playerData[id].teamId,'chelsea');
const academyId=moved.rosterIds.arsenal[5];
assert.notEqual(academyId,id);assert.equal(moved.playerData[academyId].origin,'academy');assert(moved.playerData[academyId].name.length>=2);assert(moved.playerData[academyId].name!=='老射手');assert(moved.playerData[academyId].age>=17&&moved.playerData[academyId].age<=21);
assert(moved.freeAgents.includes(releasedId));assert.equal(moved.playerData[releasedId].freeAgent,true);
assert.equal(career.transferHistory.length,1);assert.equal(career.transferHistory[0].from,'arsenal');assert.equal(career.transferHistory[0].to,'chelsea');assert.equal(career.transferHistory[0].offerSummary,'球队需要同位置球员。');assert.equal(moved.playerData[id].transferHistory[0].eventId,career.transferHistory[0].eventId);
const transferArchive=archiveSeason(moved);assert.equal(transferArchive.careerTransfers[0].playerId,id);assert(transferArchive.freeAgents.some(player=>player.id===releasedId));
const savedCareer={...career,position:'forward',stats:{},number:10,level:1,xp:0,transferHistory:career.transferHistory};
const movedBackup=importBackup(exportBackup({version:2,active:0,slots:[makeCareerSlot(moved,savedCareer),null,null]}));assert.deepEqual(movedBackup.slots[0].season.freeAgents,moved.freeAgents);assert.equal(movedBackup.slots[0].player.transferHistory[0].eventId,career.transferHistory[0].eventId);

const base=createSeason('england','arsenal',5),strong=structuredClone(base);
strong.playerData[strong.rosterIds.arsenal[5]].attributes.shooting=99;
assert(rosterRating(strong,'arsenal')>rosterRating(base,'arsenal'));
const one=simulate('arsenal','chelsea',0,undefined,5,['balanced','balanced'],base);
const two=simulate('arsenal','chelsea',0,undefined,5,['balanced','balanced'],strong);
assert(two.score[0]>=one.score[0]);

const attrs=Array.from({length:12},()=>({shooting:60,passing:60,defense:60,goalkeeping:60}));
const low=new Match({playerAttributes:attrs});
const highAttrs=structuredClone(attrs);highAttrs[5].shooting=99;
const high=new Match({playerAttributes:highAttrs});
for(const game of [low,high]){game.ball.owner=5;game.players[5].x=600;game.players[5].y=320}
low.kick(5,true,.8,{x:940,y:320});high.kick(5,true,.8,{x:940,y:320});
assert(Math.hypot(high.ball.vx,high.ball.vy)>Math.hypot(low.ball.vx,low.ball.vy));
addPlayer(moved,'chelsea',5,{goals:1});
assert.equal(moved.players[id].goals,1);
console.log('PASS: old player migration, transfer identity, ability based simulation and live shots.');
