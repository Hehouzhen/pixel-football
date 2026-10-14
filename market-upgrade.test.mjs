import assert from 'node:assert/strict';
import {createSeason,prepareSeason} from './league.mjs';
import {abilityRange,observePlayer,publicRating,squadNeeds} from './market-intelligence.mjs';
import {chemistryBonus,chemistryScore,initialTraits,pairKey,recordChemistry,validTraits} from './player-context.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';
import {cashOffers,counterNegotiation,finances,startCashNegotiation,value,windowState} from './transfers.mjs';
import {Match} from './engine.mjs';
import {EventMatch} from './simulation.mjs';
import {recordLifeMatch} from './football-life.mjs';

const season=createSeason('england','arsenal',71);prepareSeason(season);
assert.equal(season.formatVersion,2);
assert.equal(windowState(season).kind,'summer');
season.week=2;assert.equal(windowState(season).kind,'summer');
season.week=3;assert.equal(windowState(season).kind,null);
season.week=15;assert.equal(windowState(season).kind,'winter');
season.week=17;assert.equal(windowState(season).kind,'winter');
season.week=18;assert.equal(windowState(season).kind,null);
season.week=0;
assert.equal(squadNeeds(season).length,4);

const own=season.playerData[season.rosterIds.arsenal[1]],candidate=cashOffers(season).find(item=>item.allowed&&item.fee<=finances(season).balance&&finances(season).wages+item.wageExpectation<=finances(season).wageCap);
assert(candidate,'需要有可支付的现金引援目标');
const player=season.playerData[candidate.id],exact=player.attributes.shooting,initial=abilityRange(season,player,'shooting');
assert(validTraits(own.traits));assert.deepEqual(initialTraits(own),own.traits);
assert(initial.low<=exact&&initial.high>=exact);
assert(publicRating(season,player).low<publicRating(season,player).high);
let observed=observePlayer(season,player.id);
assert.equal(observed.scoutingReports[player.id].level,1);
assert.equal(observed.playerData[player.id].attributes.shooting,exact);
assert.throws(()=>observePlayer(observed,player.id),/本轮已观察/);
const first=abilityRange(observed,player,'shooting');
observed.week=1;observed=observePlayer(observed,player.id);
const second=abilityRange(observed,player,'shooting');
assert(second.high-second.low<first.high-first.low);
observed.shortlist=[player.id];
const restored=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(observed),null,null]})).slots[0].season;
assert.deepEqual(restored.scoutingReports[player.id],observed.scoutingReports[player.id]);
assert.deepEqual(restored.shortlist,[player.id]);

const team=season.rosterIds.arsenal.slice(1,3),other=season.rosterIds.liverpool[1];
recordChemistry(season,{home:'arsenal',away:'liverpool',playerStats:[...team.map(playerId=>({playerId,teamId:'arsenal',minutesPlayed:90,minuteOn:0,minuteOff:90})),{playerId:other,teamId:'liverpool',minutesPlayed:90,minuteOn:0,minuteOff:90}]});
assert.equal(chemistryScore(season.pairChemistry,...team),54);
assert(chemistryBonus(season.pairChemistry,...team)>0);
assert.equal(season.pairChemistry[pairKey(team[0],other)],undefined);
const ids=[...season.rosterIds.arsenal,...season.rosterIds.liverpool];
function reception(pairs){const match=new Match({playerIds:ids});match.pairChemistry=pairs;match.ball.owner=null;match.ball.kind='pass';match.ball.source=5;match.ball.last=0;match.takeBall(3);return match.players[3].settle}
assert(reception({[pairKey(ids[3],ids[5])]:90})<reception({}),'默契应缩短可玩比赛的接球调整时间');
const styled=new Match({playerIds:ids});styled.playerTraits={3:['holdUp','composed']};
const plain=new Match({playerIds:ids});
assert(styled.skill(3,'shielding')>plain.skill(3,'shielding'));
assert(styled.skill(3,'composure')>plain.skill(3,'composure'));

let baselinePasses=0,enhancedPasses=0;
for(let seed=1;seed<=50;seed++){
  const baseline=createSeason('england','arsenal',seed);prepareSeason(baseline);
  const enhanced=structuredClone(baseline);enhanced.pairChemistry={};
  for(const id of enhanced.rosterIds.arsenal)enhanced.playerData[id].traits=['quickPass','forwardRun'];
  for(const a of enhanced.rosterIds.arsenal)for(const b of enhanced.rosterIds.arsenal)if(a<b)enhanced.pairChemistry[pairKey(a,b)]=90;
  const first=new EventMatch({season:baseline,home:'arsenal',away:'liverpool',week:0,recordEvents:false}).run();
  const second=new EventMatch({season:enhanced,home:'arsenal',away:'liverpool',week:0,recordEvents:false}).run();
  baselinePasses+=first.stats.passesCompleted[0]/first.stats.passes[0];enhancedPasses+=second.stats.passesCompleted[0]/second.stats.passes[0];
}
assert(enhancedPasses>baselinePasses+.5,'特质和默契应在多场事件模拟中提升传球表现');

const fresh=createSeason('england','arsenal',71);prepareSeason(fresh);
const target=cashOffers(fresh).find(item=>item.allowed&&item.fee<=finances(fresh).balance&&finances(fresh).wages+item.wageExpectation+.2<=finances(fresh).wageCap);
let signed=startCashNegotiation(fresh,target.id,{fee:target.askingFee,salary:target.wageExpectation,years:2,role:'starter'});
assert.equal(signed.talk.status,'player-counter','两年短约需要额外年薪才可成交');
signed=counterNegotiation(signed.season,signed.talk.id,{});
assert.equal(signed.talk.status,'accepted');
assert.equal(signed.season.playerData[target.id].contractEndYear,2028);
assert.equal(signed.season.playerRequests.find(row=>row.playerId===target.id&&row.kind==='signing')?.status,'promised');
assert.equal(value(signed.season.playerData[target.id])>0,true);
assert.equal(importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(signed.season),null,null]})).slots[0].season.playerRequests.find(row=>row.playerId===target.id&&row.kind==='signing').horizon,6);
for(let week=0;week<3;week++)recordLifeMatch(signed.season,{matchId:`signing-test:${week}`,competition:'league',home:'arsenal',away:'liverpool',week,date:`2026-08-${String(week+1).padStart(2,'0')}`,playerStats:[{playerId:target.id,teamId:'arsenal',started:true,minutesPlayed:90,minuteOn:0,minuteOff:90,playingSeconds:180}]},30);
assert.equal(signed.season.playerRequests.find(row=>row.playerId===target.id&&row.kind==='signing').status,'fulfilled');

const legacy=createSeason('england','arsenal',72);prepareSeason(legacy);
for(const p of Object.values(legacy.playerData))delete p.traits;
const migrated=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(legacy),null,null]})).slots[0].season;
prepareSeason(migrated);
assert(validTraits(migrated.playerData[own.id].traits));
assert.equal(migrated.playerData[own.id].id,own.id);
console.log('PASS: scouting uncertainty, shortlist persistence, multiweek windows, contract promise, live/event chemistry and migration.');
