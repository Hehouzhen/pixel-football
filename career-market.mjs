import {LEAGUES,getTeam} from './clubs.mjs';
import {seasonRounds} from './league.mjs';
import {positionRating} from './ratings.mjs';
import {positionGroup,squadPlayers,annualWage,wageBudget} from './football-life.mjs';
import {careerDeal,wageExpectation} from './player-value.mjs';
import {nationalExposure} from './national-progression.mjs';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const marketSeason=s=>(s.history?.length??0)+1;
export const careerMarketOpen=(p,s)=>!!p&&!!s&&!p.retired&&(!p.journey||p.journey.stage==='professional')&&s.week===seasonRounds(s)&&(!s.cup||s.cup.phase==='complete');
export const currentCareerMarket=(p,s)=>p?.transferMarket?.season===marketSeason(s)&&p.transferMarket.clubId===s.teamId?p.transferMarket:null;

export function marketProfile(p,s){
 const rows=(p.history??[]).filter(r=>r.season===marketSeason(s)),ledger=p.seasonLedger?.[String(marketSeason(s))],apps=ledger?.appearances??rows.length,avg=apps?(ledger?.ratingTotal??rows.reduce((n,r)=>n+(r.rating??6),0))/apps:6;
 const knownMinutes=rows.length>0&&rows.every(r=>Number.isFinite(r.minutes)),minutes=knownMinutes?rows.reduce((n,r)=>n+r.minutes,0):null,confidence=minutes===null?Math.min(1,apps/12)*.6:Math.min(1,minutes/900);
 const total=k=>ledger?.[k]??rows.reduce((n,r)=>n+(r[k]??0),0),impact=apps?(p.position==='forward'?(total('goals')+total('assists')*.5)/apps:p.position==='midfielder'?(total('assists')+total('keyPasses')*.16+total('forwardPasses')*.035)/apps:(total('tackles')*.22+total('interceptions')*.25+total('blocks')*.35)/apps):0;
 const quality=positionRating({attributes:p.attributes,position:p.index}),exposure=clamp(nationalExposure(p,s.calendar?.startYear??2026).attention,0,1)*2,level=clamp((getTeam(s.teamId)?.strength??1)/1.10,.85,1.05),performance=(clamp((avg-6)*3,-3,6)+clamp(impact,0,2)*2)*confidence*level,upside=(p.age??25)<=23?clamp(((p.potential??quality)-quality)*.1,0,2):0;
 return {quality,apps,minutes,avg:+avg.toFixed(2),confidence,performance:+performance.toFixed(2),appeal:quality+performance+upside+exposure};
}

function clubAssessment(p,s,team,league,profile,intent,priority){
 const squad=squadPlayers(s,team.id),group=positionGroup(p.index),rivals=squad.filter(q=>positionGroup(q.position)===group).sort((a,b)=>positionRating(b,p.index)-positionRating(a,p.index)),incumbent=rivals[0],gap=profile.quality-(incumbent?positionRating(incumbent,p.index):profile.quality-8),fit=(p.style==='runner'&&team.style==='counter'||p.position==='midfielder'&&team.style==='balanced'||p.position==='defender'&&team.style==='press')?2:0;
 const threshold=66+(team.strength-.97)*100,interest=profile.appeal-threshold+clamp(gap,-15,10)*.25+fit+(intent==='loan'?-Math.max(0,(team.strength-1.08)*100)+4:0),level=interest>=1&&profile.confidence>=.5?'contact':interest>=-4?'watch':interest>=-10?'scout':'none';
 const kind=p.journey?.loan?.parentTeamId===team.id?'return':intent==='loan'?'loan':'transfer',deal=careerDeal(p,s,team.id,kind),salary=kind==='return'?deal.annualWage:wageExpectation({...s.playerData?.[p.id],...p,position:p.index}),annual=+(salary*(priority==='wage'?1.05:1)).toFixed(2),wages=squad.reduce((n,q)=>n+annualWage(q),0),capacity=squad.length<12;
 const blockers=[...(!capacity?['一线队名单已满']:[]),...(!deal.affordable?['转会预算不足']:[]),...(wages+annual>wageBudget(team.id)?['工资空间不足']:[])];
 const expectedRole=gap>=5?'核心主力':gap>=-1?'常规首发':gap>=-8?'轮换竞争者':'培养对象',rationale=level==='none'?'当前实力或有效比赛样本尚未达到球队考察要求。':`${profile.confidence>=.5?'本季表现已有足够出场样本':'球探仍需要更多正式比赛样本'}；${gap>=0?'该位置存在补强机会':'加盟后需要与现有人选竞争'}${fit?'，球员特点适合球队打法':''}。`;
 return {teamId:team.id,leagueId:league.id,teamName:s.teamNames?.[team.id]??team.name,leagueName:league.name,level,interest:+interest.toFixed(2),strength:team.strength,gap:+gap.toFixed(2),rival:incumbent?.name??'暂无固定人选',rationale,blockers,expectedRole,ambition:team.strength>=1.12?'争冠级舞台':team.strength>=1.05?'欧战竞争':'稳定成长',kind,...deal,annualWage:annual,affordable:blockers.length===0,marketSeason:marketSeason(s)};
}

function assess(p,s,m){
 const profile=marketProfile(p,s),all=LEAGUES.flatMap(league=>league.teams.filter(t=>t.id!==s.teamId).map(team=>clubAssessment(p,s,team,league,profile,m.intent,m.priority))),order=(a,b)=>b.interest-a.interest||a.teamId.localeCompare(b.teamId),shortlist=all.filter(c=>c.level!=='none').sort(order).slice(0,8);
 for(const id of m.targets){const row=all.find(c=>c.teamId===id);if(row&&!shortlist.some(c=>c.teamId===id))shortlist.push(row)}
 const preference=c=>m.priority==='minutes'?c.gap:m.priority==='stage'?c.strength:c.annualWage;
 const offers=all.filter(c=>(c.level==='contact'||c.kind==='return')&&c.affordable&&m.intent!=='stay').sort((a,b)=>Number(m.targets.includes(b.teamId))-Number(m.targets.includes(a.teamId))||preference(b)-preference(a)||b.interest-a.interest||a.teamId.localeCompare(b.teamId)).slice(0,3);
 const returning=all.find(c=>c.kind==='return'&&c.affordable);if(returning&&m.intent!=='stay'&&!offers.some(c=>c.teamId===returning.teamId)){offers.unshift(returning);offers.splice(3)}
 return {profile,contacts:shortlist.sort(order),offers};
}

export function advanceCareerMarket(p,s,action){
 if(!careerMarketOpen(p,s))throw new Error('转会沟通仅在职业赛季结束后的休赛期开放');
 const next=structuredClone(p),old=currentCareerMarket(p,s),m=old?structuredClone(old):{version:1,season:marketSeason(s),clubId:s.teamId,phase:0,intent:'explore',priority:'minutes',targets:[],contacts:[],offers:[],negotiated:false};
 if(action.type==='intent'){
  if(!['stay','explore','request','loan'].includes(action.intent)||!['minutes','stage','wage'].includes(action.priority)||!Array.isArray(action.targets)||action.targets.length>3||new Set(action.targets).size!==action.targets.length||action.targets.some(id=>!getTeam(id)||id===s.teamId))throw new Error('转会意愿或目标球队无效');
  if(action.intent==='loan'&&(!p.journey||p.journey.loan))throw new Error('当前不能申请新的租借');
  Object.assign(m,{intent:action.intent,priority:action.priority,targets:[...action.targets],phase:0,contacts:[],offers:[],negotiated:false});
  delete m.profile;
 }else if(action.type==='progress'){
  if(m.phase===2)return next;
  if(m.phase===0){const result=assess(p,s,m);Object.assign(m,{profile:result.profile,contacts:result.contacts,phase:1});}
  else if(m.phase===1){const result=assess(p,s,m);Object.assign(m,{offers:result.offers,phase:2});}
 }else if(action.type==='negotiate'){
  if(m.phase!==2||m.negotiated)throw new Error('本轮报价只能争取一次待遇调整');
  m.negotiated=true;m.offers=m.offers.map(o=>{const salary=+(o.annualWage*1.03).toFixed(2),wages=squadPlayers(s,o.teamId).reduce((n,q)=>n+annualWage(q),0);return wages+salary<=wageBudget(o.teamId)?{...o,annualWage:salary}:o});
 }else throw new Error('未知转会操作');
 const row=s.playerData?.[p.id],price=careerDeal(p,s,s.teamId).askingPrice;
 m.response=m.intent==='stay'?'俱乐部欢迎你继续留队，现有合同继续有效。':m.intent==='explore'?'经纪人将私下了解市场。尚未正式申请离队，现有合同继续有效。':m.intent==='loan'?'俱乐部愿意评估一季租借；需要接收方有名单和工资空间。':(row?.contractEndYear??0)>(s.calendar?.startYear??2026)?`俱乐部同意听取报价，当前放人价格约 €${price.toFixed(2)}m。没有成交前仍按现有合同履约。`:'合同即将到期，可以寻找免转会费的加盟机会。';
 m.log=[...(m.log??[]),{id:(m.log?.at(-1)?.id??0)+1,action:action.type,intent:m.intent,offers:m.offers.map(o=>({teamId:o.teamId,teamName:o.teamName,fee:o.fee,annualWage:o.annualWage,years:o.years,kind:o.kind}))}].slice(-30);
 next.transferMarket=m;return next;
}

// Frozen quotes are accepted only from this season's persisted market.
export function careerMarketOffers(p,s){const m=currentCareerMarket(p,s);return m?.phase===2?m.offers:[]}
export function marketAgreement(p,s,to){
 const offer=careerMarketOffers(p,s).find(o=>o.teamId===to);if(!offer)return null;
 const current=careerDeal(p,s,to,offer.kind),wages=squadPlayers(s,to).reduce((n,q)=>n+annualWage(q),0),funds=s.worldFunds?.[to]??16+(getTeam(to)?.strength??1)*18;
 if(squadPlayers(s,to).length>=12||offer.fee>funds||wages+offer.annualWage>wageBudget(to)||current.fee!==offer.fee)throw new Error('报价条件已变化，请重新与经纪人确认');
 return {...offer,affordable:true};
}

const text=(s,n=300)=>typeof s==='string'&&s.length<=n,amount=n=>Number.isFinite(n)&&n>=0&&n<=100000;
export function validCareerMarket(m){
 if(m===undefined)return true;
 if(!m||m.version!==1||!Number.isInteger(m.season)||m.season<1||!getTeam(m.clubId)||![0,1,2].includes(m.phase)||!['stay','explore','request','loan'].includes(m.intent)||!['minutes','stage','wage'].includes(m.priority)||typeof m.negotiated!=='boolean'||!text(m.response)||!Array.isArray(m.targets)||m.targets.length>3||new Set(m.targets).size!==m.targets.length||m.targets.some(id=>!getTeam(id)||id===m.clubId))return false;
 const row=o=>o&&getTeam(o.teamId)&&o.teamId!==m.clubId&&LEAGUES.some(l=>l.id===o.leagueId&&l.teams.some(t=>t.id===o.teamId))&&['none','scout','watch','contact'].includes(o.level)&&['transfer','loan','return'].includes(o.kind)&&['teamName','leagueName','rationale','expectedRole','ambition','rival'].every(k=>text(o[k]))&&['fee','annualWage','marketValue','askingPrice','strength'].every(k=>amount(o[k]))&&Number.isFinite(o.interest)&&Number.isFinite(o.gap)&&Number.isInteger(o.years)&&o.years>=1&&o.years<=5&&o.marketSeason===m.season&&typeof o.affordable==='boolean'&&Array.isArray(o.blockers)&&o.blockers.length<=3&&o.blockers.every(k=>text(k));
 if(m.log!==undefined&&(!Array.isArray(m.log)||m.log.length>30||m.log.some(r=>!r||!Number.isInteger(r.id)||r.id<1||!['intent','progress','negotiate'].includes(r.action)||!['stay','explore','request','loan'].includes(r.intent)||!Array.isArray(r.offers)||r.offers.length>3||r.offers.some(o=>!getTeam(o.teamId)||!text(o.teamName)||!amount(o.fee)||!amount(o.annualWage)||!['transfer','loan','return'].includes(o.kind)||!Number.isInteger(o.years)||o.years<1||o.years>5))))return false;
 return ['contacts','offers'].every(k=>Array.isArray(m[k])&&m[k].length<=(k==='contacts'?11:3)&&new Set(m[k].map(o=>o?.teamId)).size===m[k].length&&m[k].every(row))&&(m.phase===2||m.offers.length===0)&&m.offers.every(o=>o.affordable&&o.blockers.length===0)&&(m.profile===undefined||m.profile&&['quality','apps','avg','confidence','performance','appeal'].every(k=>Number.isFinite(m.profile[k]))&&(m.profile.minutes===null||amount(m.profile.minutes)));
}
