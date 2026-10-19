import {squadPlayers,wageBudget,playerQuality,lifeYear,lifeEvent,ensureFootballLife,canRelease,movePlayer,positionGroup} from './football-life.mjs';
import {generateProspect} from './identity.mjs';
import {LEAGUES,getTeam,prepareSeason,seasonRounds} from './league.mjs';
import {activePlayers,teamName} from './identity.mjs';
import {squadNeeds} from './market-intelligence.mjs';

import {marketValue,wageExpectation} from './player-value.mjs';
const positions=['门将','后卫','后卫','中场','中场','前锋'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=n=>+Math.max(0,n).toFixed(1);
const hash=text=>{let n=2166136261;for(const char of String(text)){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const seasonNumber=season=>(season.history?.length??0)+1;
const marketKey=season=>`${season.calendar?.startYear??2026+(season.history?.length??0)}:${windowState(season).kind}`;
const rated=playerQuality;
export const value=marketValue;
export const wage=p=>p.contractWage??wageExpectation(p);
export function windowState(season){const winterRound=Math.floor((seasonRounds(season)??14)/2),span=season.formatVersion===1?1:3,kind=season.week<span?'summer':season.week>=winterRound&&season.week<winterRound+span?'winter':null,limit=kind==='summer'?2:kind==='winter'?1:0,used=(season.transfers??[]).filter(t=>t.season===seasonNumber(season)&&t.window===kind).length;return {kind,limit,used,remaining:kind?Math.max(0,limit-used):0}}
export function finances(season){const team=getTeam(season.teamId),strength=team?.strength??1,base=+(16+strength*18).toFixed(1),balance=season.balance??base,wages=squadPlayers(season,season.teamId).reduce((n,p)=>n+wage(p),0);return {balance:+balance.toFixed(1),wages:+wages.toFixed(1),wageCap:+wageBudget(season.teamId).toFixed(1)}}
const teamPlayers=(season,teamId)=>activePlayers(season,teamId).filter(Boolean);
const allTeams=()=>LEAGUES.flatMap(league=>league.teams.map(team=>({team,league})));
const teamFunds=(season,teamId)=>season.worldFunds?.[teamId]??+(16+(getTeam(teamId)?.strength??1)*18).toFixed(1);
const inquiryNumbers=(season,target,outgoing)=>{
  const current=value(target),replacement=value(outgoing),seller=getTeam(target.teamId),buyer=getTeam(season.teamId),need=Math.max(0,rated(target)-rated(outgoing));
  const ask=round(Math.max(1,current*(1.04+(seller?.strength??1)*.004)-replacement*.88));
  const wageExpectation=round(wage(target)*clamp(1.05-((buyer?.strength??1)-(seller?.strength??1))*.012,.86,1.24));
  const interest=buyer?.strength>seller?.strength+1?'较高':buyer?.strength>=seller?.strength-1?'观望':'偏低';
  return {ask,wageExpectation,interest,need,reason:need>12?'对方认为你的交换人无法胜任该位置':(seller?.strength??1)<(buyer?.strength??1)?'对方可能接受重建型报价':'目标球员属于对方常规阵容'};
};

export function offers(season){
  const own=season.teamId,current=teamPlayers(season,own);
  return allTeams().filter(({team})=>team.id!==own).flatMap(({team,league})=>teamPlayers(season,team.id).map(p=>{
    const outgoing=current[p.position],info=inquiryNumbers(season,p,outgoing),fee=round(Math.max(1,info.ask*.94));
    const allowed=rated(outgoing)>=rated(p)-12;
    return {id:p.id,from:team.id,leagueId:league.id,league:league.name,name:p.name,position:p.position,rating:rated(p),outgoingRating:rated(outgoing),age:p.age,potential:p.potential,marketValue:value(p),outgoing:outgoing.name,outgoingId:outgoing.id,fee,wage:wage(p),outgoingWage:wage(outgoing),askingFee:info.ask,wageExpectation:info.wageExpectation,interest:info.interest,allowed,reason:allowed?info.reason:'卖方认为同位置替代球员实力差距过大'};
  })).sort((a,b)=>a.position-b.position||b.rating-a.rating||a.name.localeCompare(b.name));
}

export function inquiry(season,targetId){
  const offer=offers(season).find(item=>item.id===targetId);if(!offer)throw new Error('目标球员已不在可谈市场');
  return {playerId:offer.id,clubId:offer.from,askingFee:offer.askingFee,wageExpectation:offer.wageExpectation,interest:offer.interest,available:offer.allowed,reason:offer.reason,marketValue:offer.marketValue,rating:offer.rating,position:positions[offer.position]};
}

export function cashOffers(season){
  return allTeams().filter(({team})=>team.id!==season.teamId).flatMap(({team,league})=>squadPlayers(season,team.id).map(p=>{
    const starter=season.rosterIds[team.id].includes(p.id),contractLeft=p.contractEndYear-lifeYear(season),askingFee=round(value(p)*(contractLeft<=1?.86:1.12)*(starter?1.12:.9)),allowed=canRelease(season,p.id)&&p.transferStatus!=='not-for-sale';
    return {id:p.id,from:team.id,leagueId:league.id,league:league.name,name:p.name,position:p.position,rating:rated(p),age:p.age,potential:p.potential,marketValue:value(p),fee:askingFee,askingFee,wageExpectation:minimumWage(season,p),interest:starter?'观望':'较高',allowed,reason:!canRelease(season,p.id)?'卖方没有足够的同位置球员接替':p.transferStatus==='not-for-sale'?'卖方将球员列为非卖品':contractLeft<=1?'合同只剩一年，卖方愿意评估现金报价':starter?'出售首发需要足够的重建资金':'球员希望获得更稳定的出场机会'};
  })).sort((a,b)=>a.position-b.position||b.rating-a.rating);
}

function resolveCashTerms(season,talk,fee,salary,roundNo){
  const offer=cashOffers(season).find(item=>item.id===talk.targetId),money=finances(season),target=season.playerData[talk.targetId];
  if(!offer||target.teamId!==talk.sellerId||!offer.allowed)return replyReason('rejected',offer?.reason??'球员归属已变化，请重新询价');
  if(!windowState(season).remaining||squadPlayers(season,season.teamId).length>=12)return replyReason('rejected','转会名额已用完或一线队达到十二人上限');
  if(fee>money.balance||money.wages+salary>money.wageCap)return replyReason('rejected','报价超过转会资金或年薪预算');
  if(fee<offer.askingFee*.7)return replyReason('rejected','现金报价与卖方估值相差太大');
  if(fee<offer.askingFee)return roundNo>=1?replyReason('rejected','还价仍未达到卖方的最终预期'):{...replyReason('club-counter',`卖方希望收到 €${offer.askingFee}m 的现金报价`),counterFee:offer.askingFee};
  const expected=requiredWage(offer.wageExpectation,talk.years);
  if(salary<expected)return roundNo>=1?replyReason('rejected','年薪未达到球员最终预期'):{...replyReason('player-counter',`球员希望获得 €${expected}m 年薪${talk.years<3?'；短约需要更高年薪':''}`),counterWage:expected};
  if(talk.role==='rotation'&&target.careerPriority==='opportunity')return roundNo>=1?replyReason('rejected','球员希望获得稳定首发机会'):{...replyReason('player-counter','球员希望以常规首发身份加盟'),counterRole:'starter'};
  const eventId=movePlayer(season,target.id,season.teamId,{salary,fee,years:talk.years??3});
  target.squadRole=talk.role;
  if(talk.role==='starter')addSigningPromise(season,target.id);
  season.balance=round(money.balance-fee);season.worldFunds??={};season.worldFunds[talk.sellerId]=round(teamFunds(season,talk.sellerId)+fee);
  season.transfers=[...(season.transfers??[]),{eventId,season:seasonNumber(season),year:lifeYear(season),window:windowState(season).kind,in:target.id,out:null,from:talk.sellerId,to:season.teamId,fee,summary:`${target.name} 加盟 ${teamName(season,season.teamId)}（现金购买）`}];
  talk.eventId=eventId;return replyReason('accepted',`${target.name} 接受 ${talk.years} 年合同，交易完成；可在球队生活中安排出场`);
}

export function startCashNegotiation(season,targetId,{fee,salary,years=3,role='starter'}={}){
  const next=structuredClone(season);prepareSeason(next);
  if(!Number.isFinite(fee)||fee<0||!Number.isFinite(salary)||salary<0||!Number.isInteger(years)||years<1||years>3||!['starter','rotation'].includes(role))throw new Error('转会费、年薪或合同条件无效');
  const target=next.playerData[targetId];if(!target||target.teamId===next.teamId)throw new Error('交易球员已失效');
  const talk={id:`cash-talk:${marketKey(next)}:${targetId}:${(next.negotiations??[]).length}`,targetId,sellerId:target.teamId,outgoingId:null,cash:true,fee:round(fee),salary:round(salary),years,role,round:0};
  const result=resolveCashTerms(next,talk,talk.fee,talk.salary,0);Object.assign(talk,{status:result.status,reason:result.detail},result.counterFee==null?{}:{counterFee:result.counterFee},result.counterWage==null?{}:{counterWage:result.counterWage},result.counterRole==null?{}:{counterRole:result.counterRole});
  next.negotiations=[...(next.negotiations??[]),talk].slice(-30);return {season:next,talk,result};
}

export function cashInboundOffers(season){
  if(!windowState(season).remaining)return [];
  const answered=season.inboundResponses??{},bids=[];
  for(const p of squadPlayers(season,season.teamId)){
    if(!canRelease(season,p.id)||p.transferStatus==='not-for-sale')continue;
    for(const {team} of allTeams()){
      if(team.id===season.teamId||squadPlayers(season,team.id).length>=12)continue;
      const alternative=teamPlayers(season,team.id).filter(other=>positionGroup(other.position)===positionGroup(p.position)).sort((a,b)=>rated(a)-rated(b))[0],need=alternative?rated(p)-rated(alternative):15,priority=squadNeeds(season,team.id).find(row=>row.group===positionGroup(p.position)),id=`cash-bid:${marketKey(season)}:${team.id}:${p.id}`,fee=round(value(p)*(p.contractEndYear-lifeYear(season)<=1?.85:1.08));
      if(need<0||need<4&&priority?.priority<3||answered[id]||fee>teamFunds(season,team.id)||squadPlayers(season,team.id).reduce((n,other)=>n+wage(other),0)+wage(p)>wageBudget(team.id))continue;
      if(p.careerPriority==='ambition'&&team.strength<getTeam(season.teamId).strength&&p.transferStatus!=='listed')continue;
      bids.push({id,playerId:p.id,playerName:p.name,buyerId:team.id,buyerName:teamName(season,team.id),fee,need,reason:`${priority?.label??positions[p.position]}：${priority?.reason??'需要补强'}；目标${need>=12?'明显强于':need>=4?'可能优于':'接近'}现有选择`});
    }
  }
  return bids.sort((a,b)=>b.need-a.need||a.id.localeCompare(b.id)).slice(0,2);
}

export function respondToCashInbound(season,offerId,action,counterFee){
  const next=structuredClone(season),offer=cashInboundOffers(next).find(item=>item.id===offerId);
  if(!offer||!['accept','reject','counter'].includes(action))throw new Error('报价已失效或回应无效');
  next.inboundResponses??={};
  if(action==='reject'){next.inboundResponses[offerId]={status:'rejected'};return {season:next,message:'已拒绝现金报价'};}
  const fee=action==='counter'?counterFee:offer.fee,p=next.playerData[offer.playerId];
  if(!Number.isFinite(fee)||fee<0)throw new Error('还价必须是有效的非负数字');
  if(fee>value(p)*1.28||fee>teamFunds(next,offer.buyerId)){next.inboundResponses[offerId]={status:'rejected',fee};return {season:next,message:'对方认为还价超过预算或引援价值，结束谈判'};}
  const before=finances(next).balance,eventId=movePlayer(next,p.id,offer.buyerId,{fee,reason:'cash-incoming-bid'});
  next.balance=round(before+fee);next.worldFunds??={};next.worldFunds[offer.buyerId]=round(teamFunds(next,offer.buyerId)-fee);
  next.transfers=[...(next.transfers??[]),{eventId,season:seasonNumber(next),year:lifeYear(next),window:windowState(next).kind,in:null,out:p.id,from:next.teamId,to:offer.buyerId,fee,summary:`${p.name} 转会至 ${offer.buyerName}（现金出售）`}];
  next.inboundResponses[offerId]={status:'accepted',fee,eventId};return {season:next,message:`交易完成：${p.name} 转会至 ${offer.buyerName}`};
}

function minimumFee(target,outgoing){return round(Math.max(1,value(target)*(1.04+(getTeam(target.teamId)?.strength??1)*.004)-value(outgoing)*.88))}
function minimumWage(season,target){const own=getTeam(season.teamId)?.strength??1,seller=getTeam(target.teamId)?.strength??1;return round(wage(target)*clamp(1.05-(own-seller)*.012,.86,1.24))}
function requiredWage(base,years=3){return round(base*(years===1?1.1:years===2?1.05:1))}
function replyReason(status,detail){return {status,detail}}
function addSigningPromise(season,id){const p=season.playerData[id],year=lifeYear(season);p.squadRole='starter';season.playerRequests??=[];season.playerRequests.push({id:`signing:${year}:${id}:${season.transfers?.length??0}`,playerId:id,teamId:season.teamId,year,kind:'signing',status:'promised',text:`向 ${p.name} 承诺：未来六场比赛至少三次首发。`,matchesSeen:0,starts:0,target:3,horizon:6});season.playerRequests=season.playerRequests.slice(-100)}

function finalizeTrade(season,{incomingId,outgoingId,from,to,fee,salary,years=3,role='rotation',kind='managed-club'}){
  const next=season,incoming=next.playerData[incomingId],outgoing=next.playerData[outgoingId];
  if(!incoming||!outgoing||positionGroup(incoming.position)!==positionGroup(outgoing.position)||incoming.teamId!==from||outgoing.teamId!==to)throw new Error('交易阵容已变化，请重新询价');
  const ownSlot=next.rosterIds[to].indexOf(outgoingId),sellerSlot=next.rosterIds[from].indexOf(incomingId);if(ownSlot<0||sellerSlot<0)throw new Error("交换球员已离开首发阵容");next.rosterIds[to][ownSlot]=incomingId;next.rosterIds[from][sellerSlot]=outgoingId;
  incoming.teamId=to;outgoing.teamId=from;incoming.freeAgent=false;outgoing.freeAgent=false;
  if(salary!=null)incoming.contractWage=round(salary);
  incoming.contractEndYear=lifeYear(next)+years;outgoing.contractEndYear=lifeYear(next)+3;incoming.relationship=outgoing.relationship="settled";
  if(to===next.teamId)incoming.squadRole=role;
  ensureFootballLife(next,generateProspect);
  const fromNumbers=new Set(teamPlayers(next,from).filter(p=>p.id!==outgoingId).map(p=>p.number));if(fromNumbers.has(outgoing.number))outgoing.number=Array.from({length:99},(_,i)=>i+1).find(n=>!fromNumbers.has(n));
  const toNumbers=new Set(teamPlayers(next,to).filter(p=>p.id!==incomingId).map(p=>p.number));if(toNumbers.has(incoming.number))incoming.number=Array.from({length:99},(_,i)=>i+1).find(n=>!toNumbers.has(n));
  const year=next.calendar?.startYear??2026+(next.history?.length??0),win=windowState(next),eventId=`${kind}:${year}:${win.kind}:${incomingId}:${outgoingId}:${(next.transfers??[]).length}`;
  const moves=[
    {eventId:`${eventId}:${incomingId}`,playerId:incomingId,playerName:incoming.name,season:seasonNumber(next),year,from,to,fromName:teamName(next,from),toName:teamName(next,to),fromLeagueId:getTeam(from)?.leagueId,toLeagueId:getTeam(to)?.leagueId,fee,reason:kind},
    {eventId:`${eventId}:${outgoingId}`,playerId:outgoingId,playerName:outgoing.name,season:seasonNumber(next),year,from:to,to:from,fromName:teamName(next,to),toName:teamName(next,from),fromLeagueId:getTeam(to)?.leagueId,toLeagueId:getTeam(from)?.leagueId,fee:0,reason:kind}
  ];
  for(const move of moves){const player=next.playerData[move.playerId];player.transferHistory=[...(player.transferHistory??[]).filter(item=>item.eventId!==move.eventId),move].slice(-100);lifeEvent(next,"transfer",player.id,`${player.name} 从 ${move.fromName} 转会至 ${move.toName}。`,move.eventId);for(const r of next.playerRequests??[])if(r.playerId===player.id&&r.teamId!==player.teamId&&["open","promised"].includes(r.status))r.status="closed";}
  next.transfers=[...(next.transfers??[]),{eventId,season:seasonNumber(next),year,window:win.kind,in:incomingId,out:outgoingId,from,to,fee,summary:`${incoming.name} 加盟 ${teamName(next,to)}；${outgoing.name} 转会 ${teamName(next,from)}`}];
  if(role==='starter'&&to===next.teamId)addSigningPromise(next,incomingId);
  return eventId;
}

function resolveTerms(season,talk,fee,salary,roundNo){
  if(talk.cash)return resolveCashTerms(season,talk,fee,salary,roundNo);
  const target=season.playerData[talk.targetId],outgoing=season.playerData[talk.outgoingId];
  if(!target||!outgoing||target.teamId!==talk.sellerId||outgoing.teamId!==season.teamId)return replyReason('rejected','球队阵容已变化，请重新询价');
  if(!windowState(season).remaining)return replyReason('rejected','本窗口的转会名额已用完');
  if(rated(outgoing)<rated(target)-12)return replyReason('rejected','卖方认为交换球员无法填补该位置');
  const money=finances(season),nextWages=money.wages-wage(outgoing)+salary;
  if(fee>money.balance)return replyReason('rejected','报价超过可用转会资金');
  if(nextWages>money.wageCap)return replyReason('rejected','这份年薪会超过球队工资预算');
  const ask=minimumFee(target,outgoing),packageValue=value(outgoing)*.88+fee;
  if(packageValue<value(target)*.78)return replyReason('rejected','报价与卖方估值相差太大，建议更换交易方案');
  if(packageValue<value(target)*1.04){
    if(roundNo>=1)return replyReason('rejected','卖方已给过还价，本轮仍未达到预期');
    return {...replyReason('club-counter',`卖方认为这名球员的合理补偿约为 €${ask}m`),counterFee:ask};
  }
  const expected=requiredWage(minimumWage(season,target),talk.years);
  if(salary<expected*.82)return replyReason('rejected',`球员不接受这份年薪；预期约为 €${expected}m`);
  if(salary<expected){
    if(roundNo>=1)return replyReason('rejected',`球员的最终年薪预期为 €${expected}m`);
    return {...replyReason('player-counter',`球员愿意加盟，但希望年薪提高到约 €${expected}m`),counterWage:expected};
  }
  if(talk.role==='rotation'&&target.careerPriority==='opportunity')return roundNo>=1?replyReason('rejected','球员希望获得稳定首发机会'):{...replyReason('player-counter','球员希望以常规首发身份加盟'),counterRole:'starter'};
  const id=finalizeTrade(season,{incomingId:talk.targetId,outgoingId:talk.outgoingId,from:talk.sellerId,to:season.teamId,fee,salary,years:talk.years??3,role:talk.role??'rotation'});
  season.balance=round(money.balance-fee);talk.status='completed';talk.eventId=id;talk.fee=fee;talk.salary=salary;
  season.worldFunds??={};season.worldFunds[talk.sellerId]=round(teamFunds(season,talk.sellerId)+fee);
  return replyReason('accepted',`${target.name} 接受合同，交易完成`);
}

export function startNegotiation(season,targetId,{outgoingId,fee,salary,years=3,role='starter'}={}){
  const next=structuredClone(season);prepareSeason(next);const win=windowState(next);
  if(!win.remaining)throw new Error('当前没有开放的转会名额');
  const target=next.playerData[targetId],outgoing=next.playerData[outgoingId];
  if(!target||!outgoing||outgoing.teamId!==next.teamId||positionGroup(target.position)!==positionGroup(outgoing.position)||target.teamId===next.teamId)throw new Error('交易对象或交换球员已失效');
  if(!Number.isFinite(+fee)||+fee<0||!Number.isFinite(+salary)||+salary<0||!Number.isInteger(years)||years<1||years>3||!['starter','rotation'].includes(role))throw new Error('转会费、年薪或合同条件无效');
  const talk={id:`talk:${marketKey(next)}:${targetId}:${outgoingId}:${(next.negotiations??[]).length}`,targetId,sellerId:target.teamId,outgoingId,fee:round(fee),salary:round(salary),years,role,round:0,status:'pending',reason:'俱乐部正在评估报价'};
  const result=resolveTerms(next,talk,talk.fee,talk.salary,0);talk.status=result.status;talk.reason=result.detail;if(result.counterFee!=null)talk.counterFee=result.counterFee;if(result.counterWage!=null)talk.counterWage=result.counterWage;if(result.counterRole!=null)talk.counterRole=result.counterRole;
  next.negotiations=[...(next.negotiations??[]),talk].slice(-30);return {season:next,talk:structuredClone(talk),result};
}

export function counterNegotiation(season,talkId,{fee,salary,years,role}={}){
  const next=structuredClone(season),talk=next.negotiations?.find(item=>item.id===talkId);
  if(!talk||!['club-counter','player-counter'].includes(talk.status))throw new Error('这笔谈判已经结束');
  talk.round++;talk.fee=round(fee??talk.counterFee??talk.fee);talk.salary=round(salary??talk.counterWage??talk.salary);talk.years=years??talk.years??3;talk.role=role??talk.counterRole??talk.role??'rotation';
  if(!Number.isFinite(talk.fee)||!Number.isFinite(talk.salary)||!Number.isInteger(talk.years)||talk.years<1||talk.years>3||!['starter','rotation'].includes(talk.role))throw new Error('转会费、年薪或合同条件无效');
  const result=resolveTerms(next,talk,talk.fee,talk.salary,talk.round);talk.status=result.status;talk.reason=result.detail;delete talk.counterFee;delete talk.counterWage;delete talk.counterRole;if(result.counterFee!=null)talk.counterFee=result.counterFee;if(result.counterWage!=null)talk.counterWage=result.counterWage;if(result.counterRole!=null)talk.counterRole=result.counterRole;
  return {season:next,talk:structuredClone(talk),result};
}

export function withdrawNegotiation(season,talkId){
  const next=structuredClone(season),talk=next.negotiations?.find(item=>item.id===talkId);
  if(!talk||!['club-counter','player-counter'].includes(talk.status))throw new Error('这笔谈判已经结束');
  talk.status='rejected';talk.reason='你选择结束本轮谈判';return next;
}

export function inboundOffers(season){
  const win=windowState(season);if(!win.kind||!win.remaining)return [];
  const answered=new Set(Object.keys(season.inboundResponses??{})),own=teamPlayers(season,season.teamId).filter(p=>season.rosterIds?.[season.teamId]?.includes(p.id)),candidates=[];
  for(const outgoing of own){if(outgoing.transferStatus==='not-for-sale')continue;
    for(const {team} of allTeams()){
      if(team.id===season.teamId)continue;const replacement=season.playerData[season.rosterIds[team.id]?.[outgoing.position]],priority=squadNeeds(season,team.id).find(row=>row.group===positionGroup(outgoing.position));if(!replacement||rated(outgoing)<rated(replacement)+4)continue;
      const need=rated(outgoing)-rated(replacement),fee=round(Math.max(1,value(outgoing)*.78-value(replacement)*.62)),id=`bid:${marketKey(season)}:${team.id}:${outgoing.id}`;
      if(fee>teamFunds(season,team.id)||answered.has(id))continue;
      const score=need+(priority?.priority??1)*3+(team.strength<getTeam(season.teamId).strength?4:0)+(hash(`${season.seed}:${id}`)%4);
      const playerInterest=outgoing.transferStatus==='listed'||team.strength>=(getTeam(season.teamId)?.strength??1)?'较高':'观望';
      candidates.push({id,playerId:outgoing.id,playerName:outgoing.name,position:outgoing.position,buyerId:team.id,buyerName:teamName(season,team.id),replacementId:replacement.id,replacementName:replacement.name,fee,marketValue:value(outgoing),rating:rated(outgoing),playerInterest,reason:`${teamName(season,team.id)}：${priority?.label??positions[outgoing.position]}${priority?.reason??'需要补强'}` ,score});
    }
  }
  return candidates.sort((a,b)=>b.score-a.score||a.buyerId.localeCompare(b.buyerId)).slice(0,2).map(({score,...offer})=>offer);
}

export function respondToInbound(season,offerId,action,counterFee){
  const next=structuredClone(season),offer=inboundOffers(next).find(item=>item.id===offerId);
  if(!offer)throw new Error('这份报价已失效或已处理');
  if(!windowState(next).remaining)throw new Error('当前没有可用的转会名额');
  if(!['accept','reject','counter'].includes(action)||action==='counter'&&(!Number.isFinite(+counterFee)||+counterFee<0))throw new Error('报价回应无效');
  if(action==='reject'){next.inboundResponses??={};next.inboundResponses[offerId]={status:'rejected'};return {season:next,message:'已拒绝报价'};}
  const fee=action==='counter'?round(counterFee):offer.fee;
  if(action==='counter'){
    const counterCeiling=round(value(next.playerData[offer.playerId])*1.22-value(next.playerData[offer.replacementId])*.62);
    if(fee>counterCeiling||fee>teamFunds(next,offer.buyerId)){next.inboundResponses??={};next.inboundResponses[offerId]={status:'rejected',fee};return {season:next,message:`${offer.buyerName} 拒绝还价：报价超出其预算或估值范围`};}
  }
  const player=next.playerData[offer.playerId],buyer=getTeam(offer.buyerId),seller=getTeam(next.teamId),willing=player.transferStatus==='listed'||(buyer?.strength??1)>=(seller?.strength??1)||fee>=value(player)*1.05;
  if(!willing){next.inboundResponses??={};next.inboundResponses[offerId]={status:'rejected',fee};return {season:next,message:`${player.name} 不愿意转会到 ${offer.buyerName}`};}
  const buyerWages=squadPlayers(next,offer.buyerId).reduce((sum,p)=>sum+wage(p),0)-wage(next.playerData[offer.replacementId])+wage(player);
  if(buyerWages>wageBudget(offer.buyerId)){next.inboundResponses??={};next.inboundResponses[offerId]={status:'rejected',fee};return {season:next,message:`${offer.buyerName} 的工资预算不足，报价失效`};}
  next.worldFunds??={};next.worldFunds[offer.buyerId]=round(teamFunds(next,offer.buyerId)-fee);next.balance=round(finances(next).balance+fee);
  const eventId=finalizeTrade(next,{incomingId:offer.replacementId,outgoingId:offer.playerId,from:offer.buyerId,to:next.teamId,fee:0,kind:'incoming-bid'});
  next.transfers.at(-1).fee=fee;next.transfers.at(-1).summary=`${offer.playerName} 转会至 ${offer.buyerName}；${offer.replacementName} 加盟 ${teamName(next,next.teamId)}`;
  const ownMove=next.playerData[offer.playerId].transferHistory.at(-1);ownMove.fee=fee;ownMove.reason='incoming-bid';
  next.inboundResponses??={};next.inboundResponses[offerId]={status:'accepted',fee,eventId};return {season:next,message:`交易完成：${offer.playerName} 转会至 ${offer.buyerName}`};
}

export function sign(season,targetId){
  const next=structuredClone(season);prepareSeason(next);const win=windowState(next);
  if(!win.remaining)throw new Error('当前没有开放的转会名额');
  const offer=offers(next).find(item=>item.id===targetId);if(!offer)throw new Error('报价已失效');if(!offer.allowed)throw new Error(offer.reason);
  const money=finances(next),out=next.playerData[offer.outgoingId],incoming=next.playerData[targetId];
  if(offer.fee>money.balance)throw new Error('转会费超过可用资金');if(money.wages-wage(out)+wage(incoming)>money.wageCap)throw new Error('签约后工资总额超出上限');
  finalizeTrade(next,{incomingId:targetId,outgoingId:out.id,from:offer.from,to:next.teamId,fee:offer.fee,salary:wage(incoming)});next.balance=round(money.balance-offer.fee);return next;
}
