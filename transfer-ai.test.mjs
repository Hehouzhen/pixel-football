import assert from 'node:assert/strict';
import {createSeason} from './league.mjs';
import {counterNegotiation,finances,inboundOffers,inquiry,offers,respondToInbound,startNegotiation,windowState} from './transfers.mjs';
import {exportBackup,importBackup,makeClubSlot} from './save-slots.mjs';

let season=createSeason('england','arsenal',17);
const target=offers(season).find(item=>item.position===5&&item.allowed&&item.fee<=finances(season).balance&&finances(season).wages-item.outgoingWage+item.wageExpectation<=finances(season).wageCap);
assert(target,'应当能找到符合预算的引援目标');
const report=inquiry(season,target.id);
assert.equal(report.playerId,target.id);assert(report.askingFee>0);assert(report.wageExpectation>0);assert(['较高','观望','偏低'].includes(report.interest));

let negotiation=startNegotiation(season,target.id,{outgoingId:target.outgoingId,fee:1,salary:report.wageExpectation});
assert.equal(negotiation.talk.status,'club-counter','低报价应得到卖方还价');
season=negotiation.season;
const resumed=importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(season),null,null]})).slots[0].season;
assert.equal(resumed.negotiations.at(-1).status,'club-counter','读档后应保留谈判阶段');
negotiation=counterNegotiation(resumed,negotiation.talk.id,{});
season=negotiation.season;
assert.equal(negotiation.talk.status,'accepted','接受卖方报价和球员预期后应成交');
assert.equal(season.playerData[target.id].contractWage,report.wageExpectation);
assert.equal(season.rosterIds.arsenal[5],target.id);
assert.equal(season.playerData[target.id].transferHistory.length,1);
assert.equal(windowState(season).used,1);

let playerTalkSeason=createSeason('england','arsenal',23);
const playerTarget=offers(playerTalkSeason).find(item=>item.position===5&&item.allowed&&item.fee<=finances(playerTalkSeason).balance&&finances(playerTalkSeason).wages-item.outgoingWage+item.wageExpectation<=finances(playerTalkSeason).wageCap);
const playerReport=inquiry(playerTalkSeason,playerTarget.id),lowSalary=+(playerReport.wageExpectation*.9).toFixed(1);
let playerTalk=startNegotiation(playerTalkSeason,playerTarget.id,{outgoingId:playerTarget.outgoingId,fee:playerReport.askingFee,salary:lowSalary});
assert.equal(playerTalk.talk.status,'player-counter','俱乐部接受但工资偏低时应进入球员还价');
playerTalk=counterNegotiation(playerTalk.season,playerTalk.talk.id,{});
assert.equal(playerTalk.talk.status,'accepted','接受球员最终年薪后应完成交易');

let inboundSeason=createSeason('england','arsenal',17);
for(const player of Object.values(inboundSeason.playerData))if(player.teamId==='arsenal')player.transferStatus='listed';
const bids=inboundOffers(inboundSeason);
assert(bids.length>0,'挂牌球员且对方有阵容需求时应收到报价');
assert.deepEqual(inboundOffers(inboundSeason),bids,'同一存档的 AI 报价必须确定且可复现');
const bid=bids[0],ownPosition=inboundSeason.playerData[bid.playerId].position,beforeBalance=finances(inboundSeason).balance;
const response=respondToInbound(inboundSeason,bid.id,'accept');
assert.match(response.message,/交易完成/);
assert.equal(response.season.rosterIds.arsenal[ownPosition],bid.replacementId);
assert.equal(response.season.playerData[bid.playerId].teamId,bid.buyerId);
assert.equal(response.season.playerData[bid.replacementId].teamId,'arsenal');
assert.equal(finances(response.season).balance,+(beforeBalance+bid.fee).toFixed(1));
assert.equal(windowState(response.season).used,1);
assert.equal(inboundOffers(respondToInbound(inboundSeason,bid.id,'reject').season).some(item=>item.id===bid.id),false,'拒绝后不应重复推送同一报价');
assert.equal(importBackup(exportBackup({version:2,active:0,slots:[makeClubSlot(response.season),null,null]})).slots[0].season.playerData[bid.playerId].teamId,bid.buyerId);

console.log('PASS: deterministic negotiation, seller/player counters, incoming bids, roster integrity and save restoration.');
