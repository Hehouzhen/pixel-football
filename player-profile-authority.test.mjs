import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classicFixture,professionalFixture} from './test-fixtures/identity-worlds.mjs';
import {prepareSeason,createSeason} from './league.mjs';
import {createCareerPlayer} from './career.mjs';
import {trainJourney,finishJourneyMatch} from './career-journey.mjs';
import {editPlayer} from './god-mode.mjs';
import {updatePlayerProfile,updateCareerProfile,commitCareerGrowth,carryIdentity} from './identity.mjs';

const look={skin:'#805b48',hair:'#302b24',hairstyle:1};

test('prepareSeason must not overwrite a newer canonical profile with a stale MyCareer copy',()=>{
 const {season,player}=classicFixture(),id=player.id,canonical=season.playerData[id];
 canonical.name='主档新名';canonical.appearance={...look};canonical.attributes.shooting=91;
 const stale=structuredClone(player);stale.name='旧副本名';stale.attributes.shooting=70;
 prepareSeason(season,stale);
 assert.equal(canonical.name,'主档新名');
 assert.equal(canonical.attributes.shooting,91);
 assert.deepEqual(canonical.appearance,look);
 assert.equal(stale.name,'主档新名');
 assert.equal(stale.attributes.shooting,91);
});

test('the profile entry writes canonical and career by stable ID, respects namesakes and leaves no partial edit',()=>{
 const {season,player}=classicFixture(),id=player.id,other=season.rosterIds.chelsea[5],shared=player.name;
 season.playerData[other].name=shared;
 updatePlayerProfile(season,id,{name:'新名',appearance:{...look},attributes:{shooting:88}},{career:player});
 assert.equal(season.playerData[id].name,'新名');assert.equal(player.name,'新名');
 assert.equal(season.playerData[id].attributes.shooting,88);assert.equal(player.attributes.shooting,88);
 assert.deepEqual(season.playerData[id].appearance,look);assert.deepEqual(player.appearance,look);
 assert.equal(season.playerData[other].name,shared);
 const before=structuredClone({season,player});
 assert.throws(()=>updatePlayerProfile(season,id,{name:'',attributes:{shooting:100}}));
 assert.deepEqual({season,player},before);
 for(const patch of [{attributes:{shooting:100}},{appearance:{skin:'bad'}},{number:1},{age:14}]){const snapshot=structuredClone({season,player});assert.throws(()=>updatePlayerProfile(season,id,patch,{career:player}));assert.deepEqual({season,player},snapshot)}
 assert.throws(()=>updatePlayerProfile(season,'missing-player',{name:'x'}));
});

test('God Mode uses the same profile entry and keeps canonical and career aligned',()=>{
 const {season,player}=classicFixture();season.godMode=true;
 const result=editPlayer(season,player,player.id,{name:'神模式',attributes:{shooting:93},age:25,potential:90});
 assert.equal(result.season.playerData[player.id].name,'神模式');
 assert.equal(result.career.name,'神模式');
 assert.equal(result.season.playerData[player.id].attributes.shooting,93);
 assert.equal(result.career.attributes.shooting,93);
 assert.equal(result.season.playerData[player.id].age,25);
 assert.equal(result.career.age,25);
});

test('journey training growth is explicitly committed and survives repeated prepare',()=>{
 let {season,player}=professionalFixture();prepareSeason(season,player);
 player=structuredClone(player);player.attributes.shooting=70;
 const trained=trainJourney(player,'shooting');
 assert.equal(trained.attributes.shooting,71);
 commitCareerGrowth(season,trained,player);prepareSeason(season,trained);
 assert.equal(season.playerData[player.id].attributes.shooting,71);
 assert.equal(trained.attributes.shooting,71);
 const again=structuredClone(trained);prepareSeason(season,again);
 assert.equal(again.attributes.shooting,71);
});

test('match growth is committed once and repeated prepare does not add or revert it',()=>{
 let {season,player}=professionalFixture();prepareSeason(season,player);
 const active=structuredClone(player);active.journey.clubGames=2;active.journey.focus='passing';active.attributes.passing=70;active.potential=86;
 const next=finishJourneyMatch(active,season,{playingSeconds:180,passesCompleted:4,keyPasses:2},[1,0],{});
 assert.equal(next.attributes.passing,71);
 commitCareerGrowth(season,next,active);prepareSeason(season,next);
 assert.equal(season.playerData[player.id].attributes.passing,71);
 assert.equal(next.attributes.passing,71);
 const again=structuredClone(next);prepareSeason(season,again);
 assert.equal(again.attributes.passing,71);
});

test('growth commit preserves a newer canonical ability outside the changed field',()=>{
 let {season,player}=professionalFixture();prepareSeason(season,player);
 player=structuredClone(player);player.attributes.passing=70;
 season.playerData[player.id].attributes.shooting=90;
 const previous=structuredClone(player),trained=trainJourney(player,'passing');
 commitCareerGrowth(season,trained,previous);prepareSeason(season,trained);
 assert.equal(season.playerData[player.id].attributes.shooting,90);
 assert.equal(season.playerData[player.id].attributes.passing,71);
 assert.equal(trained.attributes.shooting,90);
 assert.equal(trained.attributes.passing,71);
});

test('a new career initializes the canonical profile once and later prepares keep newer edits',()=>{
 const career=createCareerPlayer('新人',23,'forward',{...look}),season=createSeason('england','arsenal',31);
 prepareSeason(season,career);
 const canonical=season.playerData[career.id];
 assert.equal(canonical.name,'新人');assert.equal(canonical.number,23);assert.equal(canonical.age,18);
 assert.deepEqual(canonical.appearance,look);
 updatePlayerProfile(season,career.id,{name:'改名'},{career});
 const stale=structuredClone(career);stale.name='旧人';
 prepareSeason(season,stale);
 assert.equal(canonical.name,'改名');assert.equal(stale.name,'改名');
});

test('carryIdentity keeps the canonical profile and mirrors it to a stale career copy',()=>{
 const {season,player}=classicFixture(),id=player.id;
 season.playerData[id].name='跨季主档';player.name='旧副本';
 const next=createSeason('england','arsenal',32);next.calendar={startYear:2027};
 carryIdentity(season,next,player);
 assert.equal(next.playerData[id].name,'跨季主档');assert.equal(player.name,'跨季主档');
});

test('career customization resolves an occupied starter number and keeps both identities intact',()=>{
 const {season,player}=classicFixture(),id=player.id;
 const teammateId=season.rosterIds.arsenal.find(other=>other!==id&&season.playerData[other].number===6);
 const teammateName=season.playerData[teammateId].name,teammateBefore=structuredClone(season.playerData[teammateId]),careerBefore=structuredClone(player);
 const result=updateCareerProfile(season,player,{name:'新号码',number:6,appearance:{...look}});
 assert.equal(season.playerData[id].number,6);
 assert.equal(player.number,6);
 assert.equal(player.name,'新号码');
 assert.equal(season.playerData[teammateId].number,2);
 assert.deepEqual(result.reassigned,[{id:teammateId,name:teammateName,from:6,to:2}]);
 const numbers=season.squadIds.arsenal.map(other=>season.playerData[other].number);
 assert.equal(new Set(numbers).size,numbers.length);
 assert.equal(season.playerData[teammateId].name,teammateBefore.name);
 assert.deepEqual(season.playerData[teammateId].careerStats,teammateBefore.careerStats);
 assert.equal(season.playerData[teammateId].teamId,teammateBefore.teamId);
 assert.deepEqual(player.stats,careerBefore.stats);
});

test('career customization resolves bench numbers and never assumes 11 is free',()=>{
 const {season,player}=classicFixture(),id=player.id;
 const benchId=season.squadIds.arsenal.find(other=>!season.rosterIds.arsenal.includes(other));
 const squadPlayer=season.playerData[benchId];squadPlayer.number=12;
 const occupantId=season.rosterIds.arsenal.find(other=>other!==id&&season.playerData[other].number!==1);
 season.playerData[occupantId].number=11;
 const bench=updateCareerProfile(season,player,{number:12});
 assert.equal(season.playerData[id].number,12);
 assert.equal(squadPlayer.number,2);
 assert.deepEqual(bench.reassigned,[{id:benchId,name:squadPlayer.name,from:12,to:2}]);
 assert.equal(season.playerData[occupantId].number,11);
});

test('career customization reports exhaustion atomically instead of leaving a duplicate',()=>{
 const {season,player}=classicFixture();season.squadIds.arsenal=[...season.rosterIds.arsenal];
 for(let number=1;number<=99;number++){const id=`p:arsenal:filler:${number}`;season.playerData[id]={id,teamId:'arsenal',name:`填充${number}`,number,position:1};season.squadIds.arsenal.push(id)}
 season.playerData[player.id].number=99;
 const before=structuredClone({season,player});
 assert.throws(()=>updateCareerProfile(season,player,{number:50}),/号码|号/);
 assert.deepEqual({season,player},before);
});

test('profile entry normalizes keeper ratings before validating the final values',()=>{
 const {season,player}=classicFixture(),id=player.id;
 for(const value of [0,100,1.5,NaN]){
  const before=structuredClone({season,player});
  assert.throws(()=>updatePlayerProfile(season,id,{attributes:{goalkeeping:value}},{career:player}),/能力值/);
  assert.deepEqual({season,player},before);
 }
 updatePlayerProfile(season,id,{attributes:{goalkeeping:88}},{career:player});
 for(const key of ['reflexes','handling','keeperPositioning','oneOnOne','goalkeeping'])assert.equal(season.playerData[id].attributes[key],88);
 updatePlayerProfile(season,id,{attributes:{goalkeeping:99,reflexes:70,handling:70,keeperPositioning:70,oneOnOne:70}},{career:player});
 for(const key of ['reflexes','handling','keeperPositioning','oneOnOne'])assert.equal(season.playerData[id].attributes[key],70);
 assert.equal(season.playerData[id].attributes.goalkeeping,70);
 updatePlayerProfile(season,id,{attributes:{goalkeeping:90,reflexes:50}},{career:player});
 const attributes=season.playerData[id].attributes;
 assert.equal(attributes.reflexes,50);
 const mean=Math.round(['reflexes','handling','keeperPositioning','oneOnOne'].reduce((sum,key)=>sum+attributes[key],0)/4);
 assert.equal(attributes.goalkeeping,mean);
});

test('legacy missing canonical fields are filled from the career while a stale name cannot win',()=>{
 const {season,player}=classicFixture(),id=player.id;
 delete season.playerData[id].appearance;delete season.playerData[id].trainingFocus;
 player.appearance={...look};player.trainingFocus='passing';player.name='旧副本名';
 prepareSeason(season,player);
 assert.deepEqual(season.playerData[id].appearance,look);
 assert.equal(season.playerData[id].trainingFocus,'passing');
 assert.notEqual(season.playerData[id].name,'旧副本名');
});
