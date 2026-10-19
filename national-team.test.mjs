import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NATIONAL_TEAMS,chooseNation,nationalAssessment,validInternational} from './national-team.mjs';
import {createCareerPlayer,finishCareerMatch} from './career.mjs';
import {createSeason,prepareSeason} from './league.mjs';
import {makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
import {initializeJourney} from './career-journey.mjs';

const player=()=>createCareerPlayer('双线测试',27,'midfielder');
function professional(){const p=player();p.attributes=Object.fromEntries(Object.keys(p.attributes).map(k=>[k,78]));p.history=Array.from({length:5},()=>({competition:'league',minutes:60,rating:7.1}));p.stats.appearances=5;return p}

test('six choices cover five confederations without changing player potential or club data',()=>{
 assert.equal(NATIONAL_TEAMS.length,6);assert.equal(new Set(NATIONAL_TEAMS.map(n=>n.confederation)).size,5);
 const p=player(),before=structuredClone(p);for(const n of NATIONAL_TEAMS){const next=chooseNation(p,n.id);assert.deepEqual(next.attributes,p.attributes);assert.equal(next.potential,p.potential);assert(validInternational(next.international))}assert.deepEqual(p,before);assert.throws(()=>chooseNation(p,'unknown'));assert.throws(()=>chooseNation(chooseNation(p,'chn'),'arg'));
});

test('same professional evidence leads to different competition assessments',()=>{
 const p=professional(),china=nationalAssessment(chooseNation(p,'chn')),argentina=nationalAssessment(chooseNation(p,'arg'));
 assert.equal(china.sample,5);assert.equal(china.minutes,300);assert.equal(china.average,7.1);assert.equal(china.status,'具备主力竞争条件');assert.notEqual(china.status,argentina.status);
 p.history=[];assert.equal(nationalAssessment(chooseNation(p,'arg')).status,'积累职业表现');
});

test('academy and tiny samples never claim a senior team place',()=>{
 const {player:p}=initializeJourney(player(),createSeason('england','arsenal',31));p.attributes=professional().attributes;p.history=professional().history;
 assert.equal(nationalAssessment(chooseNation(p,'chn')).status,'积累职业表现');
 const short=professional();short.history=short.history.slice(0,1);assert.equal(nationalAssessment(chooseNation(short,'chn')).status,'职业样本较少');
});

test('nation survives backup round trips, legacy saves stay unset, malformed data is rejected',()=>{
 const s=createSeason('england','arsenal',31),p=player();prepareSeason(s,p);const data={version:2,active:0,slots:[makeCareerSlot(s,p),null,null]};
 assert.equal(importBackup(exportBackup(data)).slots[0].player.international,undefined);
 data.slots[0].player=chooseNation(data.slots[0].player,'arg');const restored=importBackup(exportBackup(data));assert.equal(restored.slots[0].player.international.nationId,'arg');assert.equal(restored.slots[0].season.teamId,s.teamId);
 for(const invalid of [null,{version:1,nationId:'fake'},{version:2,nationId:'chn'},{version:1,nationId:'chn',caps:999}]){const bad=structuredClone(data);bad.slots[0].player.international=invalid;assert.equal(validInternational(invalid),false);assert.throws(()=>importBackup(JSON.stringify(bad)))}
});


test('club match settlement keeps the nation and updates the evidence',()=>{
 const p=chooseNation(player(),'jpn'),next=finishCareerMatch(p,{playingSeconds:120,passesCompleted:8,forwardPasses:4},[1,0],120,{competition:'league',opponent:'测试队',season:1});
 assert.deepEqual(next.international,p.international);assert.equal(nationalAssessment(p).sample,0);assert.equal(nationalAssessment(next).sample,1);assert.equal(nationalAssessment(next).appearances,1);
});
