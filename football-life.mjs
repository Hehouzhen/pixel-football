import {recordRecovery} from './recovery.mjs';
import {getTeam} from './clubs.mjs';
import {positionRating} from './ratings.mjs';
import {initialTraits,recordChemistry} from './player-context.mjs';
import {wageExpectation} from './player-value.mjs';

export const SQUAD_ROLES={starter:'常规首发',rotation:'轮换球员',prospect:'培养对象'};
export const positionGroup=index=>index===0?0:index<3?1:index<5?3:5;
export const lifeYear=season=>season.calendar?.startYear??2026;
const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
export const playerQuality=positionRating;
export const estimatedWage=wageExpectation;
export const squadPlayers=(season,teamId)=>[...new Set([...(season.squadIds?.[teamId]??[]),...(season.rosterIds?.[teamId]??[])])].map(id=>season.playerData[id]).filter(p=>p&&!p.retired&&!p.freeAgent&&p.teamId===teamId);
export const annualWage=p=>p.contractWage??estimatedWage(p);
export const wageBudget=teamId=>24+(getTeam(teamId)?.strength??1)*4;

export function lifeEvent(season,type,playerId,text,key){
  season.lifeEvents??=[];
  const id=`life:${key}`;
  if(season.lifeEvents.some(event=>event.id===id))return;
  const p=season.playerData[playerId],event={id,type,playerId,teamId:p?.teamId??season.teamId,year:lifeYear(season),week:season.week,text};
  season.lifeEvents=[...season.lifeEvents,event].slice(-400);
  if(p)p.lifeHistory=[...(p.lifeHistory??[]),event].slice(-60);
}

export function ensureFootballLife(season,generate){
  season.squadIds??={};season.lifeEvents??=[];season.playerRequests??=[];
  for(const p of Object.values(season.playerData))p.traits??=initialTraits(p);
  for(const [teamId,lineup] of Object.entries(season.rosterIds)){
    if(!season.squadIds[teamId]){
      season.squadIds[teamId]=[...lineup];
      for(const position of [0,1,3,5]){
        const p=generate(season.playerData,teamId,position,lifeYear(season),12+season.squadIds[teamId].length-6);
        for(const key of Object.keys(p.attributes))p.attributes[key]=Math.max(1,p.attributes[key]-8);
        p.age=Math.max(18,p.age);p.potential=Math.max(60,Math.min(96,p.potential));
        p.contractWage=+(estimatedWage(p)*.65).toFixed(1);p.squadRole='prospect';
        season.playerData[p.id]=p;season.squadIds[teamId].push(p.id);
      }
    }
    season.squadIds[teamId]=squadPlayers(season,teamId).map(p=>p.id);
    for(const p of squadPlayers(season,teamId)){
      p.contractEndYear??=lifeYear(season)+1+hash(`${p.id}:contract`)%3;
      p.squadRole??=lineup.includes(p.id)?'starter':'rotation';
      p.careerPriority??=['opportunity','loyalty','ambition','income'][hash(`${p.id}:priority`)%4];
      p.relationship??='settled';
      p.lifeHistory??=[];
    }
    const used=new Set();
    for(const id of [...lineup,...season.squadIds[teamId].filter(id=>!lineup.includes(id))]){
      const p=season.playerData[id];if(used.has(p.number))p.number=Array.from({length:99},(_,i)=>i+1).find(n=>!used.has(n)&&!squadPlayers(season,teamId).some(other=>other.id!==id&&other.number===n));used.add(p.number);
    }
  }
  return season;
}

export function selectStarter(season,slot,playerId,protectedId=null){
  const next=structuredClone(season),p=next.playerData[playerId],lineup=next.rosterIds[next.teamId];
  if(!Number.isInteger(slot)||slot<0||slot>5||!p||!squadPlayers(next,next.teamId).some(item=>item.id===playerId)||positionGroup(p.position)!==positionGroup(slot))throw new Error('请选择该位置的一线队球员');
  if(protectedId&&lineup[slot]===protectedId&&playerId!==protectedId)throw new Error('MyCareer 球员保留在当前首发位置');
  const previous=lineup.indexOf(playerId);if(previous>=0&&previous!==slot)throw new Error('该球员已在另一首发位置');
  lineup[slot]=playerId;delete next.names?.[`${next.teamId}:${slot}`];return next;
}

export function canRelease(season,playerId){
  const p=season.playerData[playerId];if(!p)return false;
  const remaining=squadPlayers(season,p.teamId).filter(other=>other.id!==playerId);
  return remaining.length>=6&&[[0,1],[1,2],[3,2],[5,1]].every(([group,count])=>remaining.filter(other=>positionGroup(other.position)===group).length>=count);
}

export function movePlayer(season,playerId,to,{salary,years=3,fee=0,reason='cash-transfer'}={}){
  const p=season.playerData[playerId],from=p?.teamId;
  if(!p||p.retired||p.freeAgent||from===to||!getTeam(to)||!canRelease(season,playerId)||squadPlayers(season,to).length>=12)throw new Error('交易会破坏阵容位置覆盖或超出十二人上限');
  const slot=season.rosterIds[from].indexOf(playerId);
  season.squadIds[from]=squadPlayers(season,from).filter(other=>other.id!==playerId).map(other=>other.id);
  if(slot>=0){const replacement=squadPlayers(season,from).filter(other=>!season.rosterIds[from].includes(other.id)&&positionGroup(other.position)===positionGroup(slot)).sort((a,b)=>playerQuality(b)-playerQuality(a))[0];season.rosterIds[from][slot]=replacement.id;}
  p.teamId=to;p.contractWage=salary??annualWage(p);p.contractEndYear=lifeYear(season)+years;p.squadRole='rotation';p.relationship='settled';
  season.squadIds[to]=[...new Set([...(season.squadIds[to]??season.rosterIds[to]),playerId])];
  const used=new Set(squadPlayers(season,to).filter(other=>other.id!==p.id).map(other=>other.number));if(used.has(p.number))p.number=Array.from({length:99},(_,i)=>i+1).find(n=>!used.has(n));
  for(const r of season.playerRequests??[])if(r.playerId===p.id&&['open','promised'].includes(r.status))r.status='closed';
  const id=`cash:${lifeYear(season)}:${from}:${to}:${playerId}:${(p.transferHistory??[]).length}`,move={eventId:id,playerId,playerName:p.name,year:lifeYear(season),season:(season.history?.length??0)+1,from,to,fromName:season.teamNames?.[from]??getTeam(from).name,toName:season.teamNames?.[to]??getTeam(to).name,fee,reason};
  p.transferHistory=[...(p.transferHistory??[]),move].slice(-100);
  lifeEvent(season,'transfer',p.id,`${p.name} 从 ${move.fromName} 转会至 ${move.toName}，转会费 €${fee}m。`,id);
  return id;
}

export function renewalTerms(season,playerId){
  const p=season.playerData[playerId];if(!p||p.retired||p.freeAgent)throw new Error('该球员没有可续约的在队合同');
  const raise=p.careerPriority==='income'?1.12:1.04,minimum=+(Math.max(estimatedWage(p),annualWage(p))*raise*(p.relationship==='unhappy'?1.1:1)).toFixed(1);
  return {minimum,maximumYears:p.age>=33?1:3,reason:p.age>=33?'球员希望逐年评估职业生涯':p.relationship==='unhappy'?'此前承诺未兑现，球员要求更高待遇':'球员根据能力、现有待遇和职业诉求提出预期'};
}

export function renewContract(season,playerId,{years,salary}){
  const next=structuredClone(season),p=next.playerData[playerId],terms=renewalTerms(next,playerId);
  if(p.teamId!==next.teamId||!squadPlayers(next,next.teamId).some(item=>item.id===playerId))throw new Error('只能处理本队球员合同');
  if(!Number.isInteger(years)||years<1||years>terms.maximumYears||!Number.isFinite(salary)||salary<terms.minimum)throw new Error(`球员要求至少 €${terms.minimum}m 年薪，合同最长 ${terms.maximumYears} 年`);
  const total=squadPlayers(next,next.teamId).reduce((n,item)=>n+annualWage(item),0)-annualWage(p)+salary;
  if(total>wageBudget(next.teamId))throw new Error('续约后超过球队年薪预算');
  p.contractWage=+salary.toFixed(1);p.contractEndYear=Math.max(p.contractEndYear,lifeYear(next)+1)+years;p.relationship='settled';
  for(const request of next.playerRequests??[])if(request.playerId===playerId&&request.kind==='renewal'&&request.status==='open')request.status='fulfilled';
  lifeEvent(next,'renewal',playerId,`${p.name} 续约至 ${p.contractEndYear} 年，年薪 €${p.contractWage}m。`,`renewal:${playerId}:${lifeYear(next)}:${p.contractEndYear}:${p.contractWage}`);
  return next;
}

export function answerPlayerRequest(season,requestId,action){
  const next=structuredClone(season),request=next.playerRequests?.find(row=>row.id===requestId),p=next.playerData[request?.playerId];
  if(!request||request.status!=='open'||!p||p.teamId!==next.teamId||!['promise','decline','list'].includes(action)||action==='promise'&&request.kind!=='minutes')throw new Error('这项诉求已处理或回应无效');
  request.status=action==='promise'?'promised':action==='list'?'listed':'declined';
  if(action==='promise'){request.matchesSeen=0;request.starts=0;request.target=3;request.horizon=6;p.relationship='awaiting';}
  else if(action==='list'){p.transferStatus='listed';p.relationship='settled';}
  else p.relationship='unhappy';
  lifeEvent(next,'decision',p.id,action==='promise'?`向 ${p.name} 承诺：未来六场比赛至少三次首发。`:action==='list'?`同意为 ${p.name} 听取转会报价。`:`未同意 ${p.name} 的${request.kind==='minutes'?'出场':'续约'}诉求。`,`${request.id}:${action}`);
  return next;
}

export function refreshPlayerRequests(season){
  const year=lifeYear(season),own=squadPlayers(season,season.teamId),open=()=>season.playerRequests.filter(r=>r.teamId===season.teamId&&['open','promised'].includes(r.status)).length;
  const games=[...season.results,...(season.cup?.results??[])].filter(r=>r.home===season.teamId||r.away===season.teamId);
  for(const p of own){
    if(open()>=3)break;
    const starts=games.slice(-6).filter(r=>r.playerStats?.some(row=>row.playerId===p.id&&row.started&&row.minutesPlayed>0)).length;
    const kind=p.contractEndYear===year+1?'renewal':games.length>=6&&p.squadRole==='starter'&&starts<3?'minutes':null;
    if(!kind||season.playerRequests.some(r=>r.playerId===p.id&&r.year===year))continue;
    const id=`request:${year}:${p.id}`;
    season.playerRequests.push({id,playerId:p.id,teamId:season.teamId,year,kind,status:'open',text:kind==='renewal'?`${p.name} 的合同将在本赛季结束时到期，希望讨论续约。`:`${p.name} 最近六场只获得 ${starts} 次首发，希望获得更多机会。`});
    lifeEvent(season,'request',p.id,season.playerRequests.at(-1).text,id);
  }
  season.playerRequests=season.playerRequests.slice(-100);
}

export function recordLifeMatch(season,result,rounds){
  season.lifeSettlements??=[];
  if(season.lifeSettlements.includes(result.matchId))return;
  season.lifeSettlements.push(result.matchId);
  recordRecovery(season,result);
  recordChemistry(season,result);
  const own=[result.home,result.away].includes(season.teamId);
  if(own){
    for(const r of season.playerRequests??[]){
      if(r.status!=='promised')continue;
      const p=season.playerData[r.playerId];
      if(!p||p.teamId!==season.teamId||p.freeAgent||p.retired){r.status='closed';continue;}
      r.matchesSeen++;if(result.playerStats?.some(row=>row.playerId===r.playerId&&row.started&&row.minutesPlayed>0))r.starts++;
      if(r.starts>=r.target||r.matchesSeen>=r.horizon){r.status=r.starts>=r.target?'fulfilled':'broken';p.relationship=r.status==='fulfilled'?'settled':'unhappy';lifeEvent(season,'promise',p.id,`${p.name} 的出场承诺${r.status==='fulfilled'?'提前兑现':'未兑现'}：${r.matchesSeen} 场中首发 ${r.starts} 次。`,`${r.id}:${r.status}`);}
    }
  }
  if(result.competition==='league'){
    for(const teamId of [result.home,result.away]){
      const strength=getTeam(teamId)?.strength??1,wages=squadPlayers(season,teamId).reduce((n,p)=>n+annualWage(p),0),income=(16+strength*3)/rounds,expense=wages/rounds,balance=teamId===season.teamId?season.balance:season.worldFunds?.[teamId];
      const before=balance??16+strength*18,after=+(before+income-expense).toFixed(4);
      if(teamId===season.teamId){season.balance=after;season.financeLedger??=[];season.financeLedger.push({id:result.matchId,year:lifeYear(season),week:result.week,income,expense,balance:after});}
      else{season.worldFunds??={};season.worldFunds[teamId]=after;}
    }
  }
  if(own)refreshPlayerRequests(season);
}

export function advanceContracts(season,generate,protectedId=null){
  const year=lifeYear(season);
  if(season.contractsSettledYear===year)return;
  for(const request of season.playerRequests??[])if(request.status==='open'&&request.year<year)request.status='closed';
  for(const request of season.playerRequests??[])if(request.status==='promised'){
    const p=season.playerData[request.playerId];if(p?.teamId!==request.teamId){request.status='closed';continue;}request.status='broken';if(p)p.relationship='unhappy';
    lifeEvent(season,'promise',request.playerId,'赛季结束，出场承诺尚未兑现。',`${request.id}:season-end`);
  }
  for(const [teamId,lineup] of Object.entries(season.rosterIds))for(const p of [...squadPlayers(season,teamId)]){
    if(p.contractEndYear>year)continue;
    if(teamId!==season.teamId||p.id===protectedId){p.contractEndYear=year+(p.age>=33?1:2);continue;}
    p.freeAgent=true;season.freeAgents=[...new Set([...(season.freeAgents??[]),p.id])];
    season.squadIds[teamId]=season.squadIds[teamId].filter(id=>id!==p.id);
    const slot=lineup.indexOf(p.id);
    if(slot>=0){
      let replacement=squadPlayers(season,teamId).find(other=>!lineup.includes(other.id)&&positionGroup(other.position)===positionGroup(slot));
      if(!replacement){replacement=generate(season.playerData,teamId,slot,year,p.number);replacement.contractEndYear=year+3;replacement.squadRole='prospect';season.playerData[replacement.id]=replacement;season.squadIds[teamId].push(replacement.id);}
      lineup[slot]=replacement.id;
    }
    lifeEvent(season,'expiry',p.id,`${p.name} 合同到期，自由离队。`,`expiry:${p.id}:${year}`);
    for(const r of season.playerRequests??[])if(r.playerId===p.id&&['open','promised'].includes(r.status))r.status='closed';
  }
  season.contractsSettledYear=year;
}
