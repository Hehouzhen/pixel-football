import assert from 'node:assert/strict';
import {createSeason,prepareSeason,simulateWeek,seasonRounds} from './league.mjs';
import {carryIdentity,generateProspect} from './identity.mjs';
import {squadPlayers,selectStarter,renewContract,renewalTerms,refreshPlayerRequests,answerPlayerRequest,recordLifeMatch,advanceContracts} from './football-life.mjs';
import {cashOffers,startCashNegotiation,counterNegotiation,cashInboundOffers,respondToCashInbound,finances,windowState,offers,startNegotiation} from './transfers.mjs';
import {makeClubSlot,exportBackup,importBackup} from './save-slots.mjs';
import {editPlayer} from './god-mode.mjs';
import {advancePlayerWorld} from './world.mjs';

const backup=s=>importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(s),null,null]})).slots[0].season;
let season=createSeason('england','arsenal',17);for(const p of squadPlayers(season,'arsenal'))p.contractEndYear=2029;
assert.equal(seasonRounds(season),30);
for(const ids of Object.values(season.squadIds))assert.equal(ids.length,10);
const initial=JSON.stringify(season.squadIds);prepareSeason(season);assert.equal(JSON.stringify(season.squadIds),initial,'读档不得重复生成替补');
assert.equal(new Set(squadPlayers(season,'arsenal').map(p=>p.number)).size,10);
const oldId=season.rosterIds.arsenal[5],reserve=squadPlayers(season,'arsenal').find(p=>p.position===5&&p.id!==oldId);
assert.throws(()=>selectStarter(season,0,reserve.id));
assert.throws(()=>selectStarter(season,5,reserve.id,oldId));
season=selectStarter(season,5,reserve.id);
simulateWeek(season);
const first=season.results.find(r=>[r.home,r.away].includes('arsenal'));
assert(first.playerStats.some(row=>row.playerId===reserve.id));
assert.equal(season.players[oldId],undefined,'未上场球员不得获得本场数据');
assert.equal(season.players[reserve.id].appearances,1);
assert.equal(backup(season).rosterIds.arsenal[5],reserve.id);
const snapshot=JSON.stringify({balance:season.balance,ledger:season.financeLedger});recordLifeMatch(season,first,30);assert.equal(JSON.stringify({balance:season.balance,ledger:season.financeLedger}),snapshot,'重复结算不能重复扣工资');
assert.equal(season.financeLedger.length,1);
const cupBalance=season.balance;recordLifeMatch(season,{...first,competition:'cup',matchId:'test-cup'},30);assert.equal(season.balance,cupBalance,'欧冠不重复结算年度工资');

for(const p of squadPlayers(season,'arsenal'))p.contractEndYear=2029;
while(season.week<6)simulateWeek(season);
refreshPlayerRequests(season);
const request=season.playerRequests.find(r=>r.playerId===oldId&&r.kind==='minutes');assert(request);
season=answerPlayerRequest(season,request.id,'promise');
const attributes={...season.playerData[oldId].attributes};
season=selectStarter(season,5,oldId);
for(let i=0;i<3;i++)simulateWeek(season);
assert.equal(season.playerRequests.find(r=>r.id===request.id).status,'fulfilled','第三次首发即可提前兑现');
assert.equal(season.playerData[oldId].relationship,'settled');
assert.deepEqual(season.playerData[oldId].attributes,attributes,'人际关系不暗中改变能力');
assert.equal(backup(season).playerRequests.find(r=>r.id===request.id).status,'fulfilled');
let failed=structuredClone(season),r=failed.playerRequests.find(item=>item.id===request.id);r.id+='-second';r.status='open';
failed=answerPlayerRequest(failed,r.id,'promise');failed=selectStarter(failed,5,reserve.id);
for(let i=0;i<6;i++)simulateWeek(failed);
assert.equal(failed.playerRequests.find(item=>item.id===r.id).status,'broken');
assert.equal(failed.playerData[oldId].relationship,'unhappy');
assert.deepEqual(failed.playerData[oldId].attributes,attributes);

let renewal=createSeason('england','arsenal',17),p=renewal.playerData[renewal.rosterIds.arsenal[5]];p.age=34;p.contractEndYear=2027;
const terms=renewalTerms(renewal,p.id);assert.equal(terms.maximumYears,1);
assert.throws(()=>renewContract(renewal,p.id,{years:2,salary:terms.minimum}));
assert.throws(()=>renewContract(renewal,p.id,{years:1,salary:terms.minimum-.1}));
renewal=renewContract(renewal,p.id,{years:1,salary:terms.minimum});assert.equal(renewal.playerData[p.id].contractWage,terms.minimum);assert.equal(backup(renewal).playerData[p.id].lifeHistory.at(-1).type,'renewal');
assert.equal(renewal.playerData[p.id].contractEndYear,2028,'续约一年必须延长到期日');
renewal.calendar.startYear=2027;advanceContracts(renewal,generateProspect);
assert(!renewal.playerData[p.id].freeAgent,'刚续约的球员不能在下个夏季自由离队');

let rotating=createSeason('england','arsenal',17);
const defender=squadPlayers(rotating,'arsenal').find(p=>p.position===1&&!rotating.rosterIds.arsenal.includes(p.id));
rotating=selectStarter(rotating,2,defender.id);
const defenderOffer=offers(rotating).find(o=>o.position===2);
assert.equal(defenderOffer.outgoingId,defender.id);
assert.doesNotThrow(()=>startNegotiation(rotating,defenderOffer.id,{outgoingId:defender.id,fee:0,salary:0}),'同位置组调换首发后仍可正常询价谈判');

const european=structuredClone(season),europeanPlayer=european.playerData[oldId];
european.playerRequests=[];europeanPlayer.squadRole='starter';europeanPlayer.contractEndYear=2029;
european.results=Array.from({length:6},()=>({home:'arsenal',away:'chelsea',playerStats:[]}));
european.cup={results:Array.from({length:3},()=>({home:'arsenal',away:'chelsea',playerStats:[{playerId:oldId,started:true,minutesPlayed:90}]}))};
refreshPlayerRequests(european);
assert(!european.playerRequests.some(r=>r.playerId===oldId&&r.kind==='minutes'),'最近六场中的欧冠首发必须计入球员诉求判断');

let market=createSeason('england','arsenal',17);const originalStarter=market.rosterIds.arsenal[5],money=finances(market),target=cashOffers(market).find(o=>o.position===5&&o.allowed&&o.fee<=money.balance&&money.wages+o.wageExpectation<=money.wageCap);assert(target);
let talk=startCashNegotiation(market,target.id,{fee:+(target.askingFee*.9).toFixed(1),salary:target.wageExpectation});assert.equal(talk.talk.status,'club-counter');
talk=counterNegotiation(backup(talk.season),talk.talk.id,{});assert.equal(talk.talk.status,'accepted');market=talk.season;
assert.equal(squadPlayers(market,'arsenal').length,11);assert.equal(market.playerData[target.id].teamId,'arsenal');assert.equal(market.playerData[target.id].contractEndYear,2029);
assert.equal(squadPlayers(market,target.from).length,9);assert.equal(windowState(market).used,1);
assert.equal(market.rosterIds.arsenal[5],originalStarter,'现金购买不擅自移出原首发');
assert.equal(backup(market).negotiations.at(-1).cash,true);
assert.equal(market.playerData[target.id].transferHistory.at(-1).fee,talk.talk.fee);
const beforeMove=market.rosterIds.arsenal[5];market=selectStarter(market,5,target.id);assert.equal(market.rosterIds.arsenal[5],target.id);assert.equal(market.playerData[beforeMove].teamId,'arsenal');

let selling=createSeason('england','arsenal',17);for(const own of squadPlayers(selling,'arsenal'))own.transferStatus='listed';
const bid=cashInboundOffers(selling)[0];assert(bid);const before=finances(selling).balance;
const sold=respondToCashInbound(selling,bid.id,'accept');assert.equal(squadPlayers(sold.season,'arsenal').length,9);assert.equal(sold.season.playerData[bid.playerId].teamId,bid.buyerId);assert.equal(finances(sold.season).balance,+(before+bid.fee).toFixed(1));
assert.equal(backup(sold.season).inboundResponses[bid.id].status,'accepted');
assert(!cashInboundOffers(respondToCashInbound(selling,bid.id,'reject').season).some(item=>item.id===bid.id));

let expiry=createSeason('england','arsenal',17);for(const own of squadPlayers(expiry,'arsenal'))own.contractEndYear=2029;const expired=expiry.rosterIds.arsenal[5];expiry.playerData[expired].contractEndYear=2027;expiry.calendar.startYear=2027;
advanceContracts(expiry,generateProspect);assert(expiry.playerData[expired].freeAgent);assert(expiry.freeAgents.includes(expired));assert(!expiry.rosterIds.arsenal.includes(expired));assert.equal(squadPlayers(expiry,'arsenal').length,9);
const afterExpiry=JSON.stringify(expiry);advanceContracts(expiry,generateProspect);assert.equal(JSON.stringify(expiry),afterExpiry);
assert.equal(backup(expiry).lifeEvents.at(-1).type,'expiry');
const next=createSeason('england','arsenal',19);next.calendar.startYear=2027;carryIdentity(season,next);assert.equal(next.playerRequests.find(item=>item.id===request.id).status,'fulfilled');assert(next.lifeEvents.length);

let god=createSeason('england','arsenal',17);god.godMode=true;const bench=squadPlayers(god,'arsenal').find(item=>!god.rosterIds.arsenal.includes(item.id)),lineup=[...god.rosterIds.arsenal];god=editPlayer(god,null,bench.id,{name:'替补新名字'}).season;assert.deepEqual(god.rosterIds.arsenal,lineup,'编辑替补姓名不得替换首发');assert.equal(backup(god).playerData[bench.id].name,'替补新名字');
const broken=JSON.parse(exportBackup({version:2,active:0,slots:[makeClubSlot(market),null,null]}));broken.slots[0].season.squadIds.arsenal.push(target.id);assert.throws(()=>importBackup(JSON.stringify(broken)));
let campaign=createSeason('england','arsenal',17);
for(let year=2026;year<2029;year++){
  while(campaign.week<30)simulateWeek(campaign);
  assert.equal(campaign.results.length,240);assert.equal(campaign.financeLedger.length,30);assert(Number.isFinite(campaign.balance)&&campaign.balance>0);
  for(const result of campaign.results)for(const [side,teamId] of [result.home,result.away].entries())assert.equal(result.playerStats.filter(row=>row.teamId===teamId).reduce((n,row)=>n+(row.goals??0),0),result.score[side]);
  const following=createSeason('england','arsenal',year);following.calendar.startYear=year+1;carryIdentity(campaign,following);advancePlayerWorld(following);
  for(const [teamId,ids] of Object.entries(following.squadIds)){assert(ids.length>=6&&ids.length<=12);assert(following.rosterIds[teamId].every(id=>ids.includes(id)&&!following.playerData[id].freeAgent&&!following.playerData[id].retired));}
  campaign=backup(following);
}
console.log('PASS: ten-player squads, stable lineups, contracts, real promises, cash transfer negotiation, salary accounting, expiry, God Mode and strict save round-trip.');
