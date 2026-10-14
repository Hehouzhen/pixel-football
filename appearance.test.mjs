import assert from 'node:assert/strict';
import {HAIRSTYLES,LOOK_DEFAULTS,validAppearance,randomAppearance,drawHeadDetails} from './appearance.mjs';
assert.equal(HAIRSTYLES.length,24);assert(validAppearance({skin:'#ebbd89',hairstyle:5,sleeve:'band'}));assert(validAppearance({...LOOK_DEFAULTS,studio:1,hairstyle:23,beard:7,brows:5,bandStyle:2}));assert(validAppearance(LOOK_DEFAULTS));
for(let i=0;i<100;i++)assert(validAppearance(randomAppearance()));
for(const bad of [{hairstyle:24},{headband:'yes'},{beard:4},{studio:1,beard:8},{studio:1,brows:6},{wrist:'bad'},{sockColor:'red'},{unknown:1}])assert.equal(validAppearance(bad),false);
const draws=[];const ctx={fillStyle:'',fillRect(...rect){draws.push([...rect,this.fillStyle])}};
for(let hairstyle=0;hairstyle<12;hairstyle++){draws.length=0;drawHeadDetails(ctx,{...LOOK_DEFAULTS,hairstyle,headband:true,highlights:true,beard:3},{x:20,y:10,w:24,h:22});assert(draws.length>0);assert(draws.every(row=>row.slice(0,4).every(Number.isFinite)))}
console.log('Appearance choices, old look compatibility, validation and head overlays passed');

const {LEAGUES,createSeason,prepareSeason}=await import('./league.mjs');
const {createCareerPlayer}=await import('./career.mjs');
const {makeCareerSlot,exportBackup,importBackup}=await import('./save-slots.mjs');
const season=createSeason(LEAGUES[0].id,LEAGUES[0].teams[0].id),player=createCareerPlayer('外观测试',10,'forward',{...LOOK_DEFAULTS,hairstyle:11,build:'broad',beard:3,headband:true});
prepareSeason(season,player);const data={version:2,active:0,slots:[makeCareerSlot(season,player),null,null]},restored=importBackup(exportBackup(data));
assert.deepEqual(restored.slots[0].player.appearance,player.appearance);assert.deepEqual(restored.slots[0].season.playerData[player.id].appearance,player.appearance);
console.log('Customized appearance survives export/import and stable player identity');
