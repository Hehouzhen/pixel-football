import {advanceClubRole,roleProgress} from './career-role.mjs';
import {objectiveFor,milestones,STYLES} from './experience.mjs';
import {LEAGUES} from './clubs.mjs';
import {ensureRatings,positionRating} from './ratings.mjs';
import {careerDeal} from './player-value.mjs';
const POSITION={forward:{label:'前锋',index:5,primary:'shooting',attributes:{shooting:70,passing:58,defense:50,shielding:66,speed:74,firstTouch:70,endurance:67,aerial:72}},midfielder:{label:'中场',index:3,primary:'passing',attributes:{shooting:58,passing:70,defense:56,shielding:64,speed:68,firstTouch:72,endurance:74,aerial:55}},defender:{label:'后卫',index:1,primary:'defense',attributes:{shooting:52,passing:58,defense:70,shielding:60,speed:63,firstTouch:59,endurance:70,aerial:75}}};
const FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','tackles','touches','fouls','yellows','reds','distance','possession','headers','bicycles','forwardPasses','interceptions','tackleAttempts','playingSeconds','keyPasses','blocks','turnovers','crossesCompleted','carryDistance','headerGoals','bicycleGoals','penaltyGoals','xG','xA','dribbles','dribblesCompleted','aerialDuels','aerialWon','keeperSpills'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const POSITIONS=Object.entries(POSITION).map(([id,value])=>({id,label:value.label}));
export const positionLabel=id=>POSITION[id]?.label??'球员';

export function createCareerPlayer(name,number,position,appearance={skin:'#ebbd89',hair:'#302b24'},style=null){
  const config=POSITION[position];
  if(!config)throw new Error('Unknown position');
  const clean=String(name).trim().slice(0,10);
  if(!clean)throw new Error('Player name is required');
  return {style:STYLES[position].some(s=>s.id===style)?style:null,bio:'',history:[],transferHistory:[],honors:[],name:clean,number:clamp(Math.round(Number(number)||10),2,99),position,index:config.index,appearance,age:18,potential:86,trainingFocus:'balanced',developmentHistory:[],trainingPoints:0,level:1,xp:0,attributes:ensureRatings({...config.attributes}),stats:{appearances:0,wins:0,draws:0,losses:0,ratingTotal:0,...Object.fromEntries(FIELDS.map(field=>[field,0]))},lastMatch:null};
}

export const careerObjective=(position,round=0,duration=180)=>objectiveFor(position,round,duration);
export function ratingBreakdown(stat={},score=[0,0],position='forward'){
  const result=score[0]>score[1]?.25:score[0]<score[1]?-.15:0,weights=position==='defender'?[.7,.6,.48,.3]:position==='midfielder'?[1,.95,.25,.2]:[1.45,.85,.2,.12];
  const entries=[['比赛结果',result],['进球',(stat.goals??0)*weights[0]],['助攻',(stat.assists??0)*weights[1]],['成功抢断',Math.min(stat.tackles??0,5)*weights[2]],['拦截',Math.min(stat.interceptions??0,5)*weights[3]],['射正',Math.min(stat.shotsOnTarget??0,4)*(position==='forward'?.18:.08)],['向前传球',Math.min(stat.forwardPasses??0,8)*(position==='midfielder'?.12:.04)],['成功传球',Math.min(stat.passesCompleted??0,15)*.01],['创造机会',Math.min(stat.keyPasses??0,4)*(position==='midfielder'?.18:.08)],['射门封堵',Math.min(stat.blocks??0,4)*(position==='defender'?.16:.04)],['丢失球权',-Math.min(stat.turnovers??0,4)*(position==='defender'?.12:position==='midfielder'?.09:.06)],['犯规',-(stat.fouls??0)*.2],['黄牌',-(stat.yellows??0)*.25],['红牌',-(stat.reds??0)*1.25]].filter(([,value])=>value!==0);
  return {rating:clamp(6+entries.reduce((n,[,value])=>n+value,0),4,10),entries};
}
export const playerRating=(stat,score,position)=>ratingBreakdown(stat,score,position).rating;
export function levelProgress(player){const target=Math.min(300,100+Math.max(0,player.level-5)*15),value=player.progressXp??player.xp%100;return {value,target,remaining:target-value,percent:value/target*100}}

const roleRating=(attributes,position)=>positionRating({attributes,position:POSITION[position]?.index??5});
const scheduleHash=text=>{let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0};
export function careerTransferWindow(career,season){
  if(career?.journey){const currentSeason=(season?.history?.length??0)+1;return {available:career.journey.stage==='professional',currentSeason,nextSeason:currentSeason,yearsUntil:0};}
  const currentSeason=(season?.history?.length??0)+1,seed=career?.id??`${career?.name??'player'}:${career?.position??''}:${career?.number??0}`;
  let nextSeason=2+scheduleHash(seed)%3,cycle=1;
  while(nextSeason<currentSeason)nextSeason+=2+scheduleHash(`${seed}:${cycle++}`)%3;
  return {available:nextSeason===currentSeason,currentSeason,nextSeason,yearsUntil:nextSeason-currentSeason};
}
export function careerTransferOffers(career,season){
  const currentId=season?.teamId,index=career?.index;if(!career||!currentId||!Number.isInteger(index))return [];
  if(!careerTransferWindow(career,season).available)return [];
  const playerQuality=roleRating(career.attributes,career.position),seasonNumber=(season.history?.length??0)+1,seasonRows=(career.history??[]).filter(row=>row.season===seasonNumber),ledger=career.seasonLedger?.[String(seasonNumber)],appearances=ledger?.appearances??seasonRows.length,ratingTotal=ledger?.ratingTotal??seasonRows.reduce((sum,row)=>sum+(row.rating??0),0),goals=ledger?.goals??seasonRows.reduce((sum,row)=>sum+(row.goals??0),0),assists=ledger?.assists??seasonRows.reduce((sum,row)=>sum+(row.assists??0),0),form=appearances?Math.max(-2,Math.min(3,(ratingTotal/appearances-6)*1.2+goals/appearances*.3+assists/appearances*.25)):0;
  const candidates=LEAGUES.flatMap(league=>league.teams.map(team=>({league,team}))).filter(({team})=>team.id!==currentId).map(({league,team})=>{
    const incumbentId=season.rosterIds?.[team.id]?.[index],incumbent=season.playerData?.[incumbentId],incumbentQuality=roleRating(incumbent?.attributes,career.position),gap=playerQuality-incumbentQuality;
    return {leagueId:league.id,leagueName:league.name,teamId:team.id,teamName:season.teamNames?.[team.id]??team.name,strength:team.strength,gap,incumbentQuality,score:gap*2.4+team.strength*8+form+(career.journey?.wish==='home'&&league.id===season.leagueId?8:career.journey?.wish==='ambition'?team.strength*12:career.journey?.wish==='expression'&&team.style===(['runner','engine'].includes(career.style)?'counter':'balanced')?8:0)};
  }).filter(offer=>offer.gap>=(career.journey?-16:-7)||appearances>=8&&form>=.8).filter(offer=>!career.journey||(season.squadIds?.[offer.teamId]?.length??10)<12&&offer.strength<=(playerQuality>=78&&form>=.8?1.3:playerQuality>=68||appearances>=8&&form>=1.2?1.13:1.04));
  const shortlist=[];
  for(const group of [candidates.slice().sort((a,b)=>b.gap-a.gap||b.strength-a.strength),candidates.filter(offer=>offer.gap>=-12||form>=.8).sort((a,b)=>b.strength-a.strength||b.gap-a.gap),candidates.slice().sort((a,b)=>b.score-a.score)]){
    const next=group.find(offer=>!shortlist.some(row=>row.teamId===offer.teamId));if(next)shortlist.push(next);if(shortlist.length===3)break;
  }
  const invitations=shortlist.map(offer=>{
    const expectedRole=offer.gap>=7?'核心主力':offer.gap>=1?'首发竞争者':offer.gap>=-4?'轮换球员':'阵容补强';
    const positionName=career.position==='forward'?'前锋':career.position==='midfielder'?'中场':'后卫';
    const rationale=offer.gap>=1?`球队${positionName}位置需要竞争，你的匹配能力高于现有首发 ${Math.round(offer.gap)} 点。`:form>=.8?'你本赛季的稳定表现引起了球队关注。':`球队希望增加${positionName}位置的阵容深度。`;
    const ambition=offer.strength>=1.12?'争冠级阵容':offer.strength>=1.06?'强队阵容':offer.strength>=1.01?'中游阵容':'成长型阵容';
    return {teamId:offer.teamId,leagueId:offer.leagueId,teamName:offer.teamName,leagueName:offer.leagueName,expectedRole,ambition,rationale};
  });
  if(career.journey?.seekLoan&&!career.journey.loan&&invitations.length)invitations[0]={...invitations[0],kind:'loan',expectedRole:'租借轮换',rationale:invitations[0].rationale+' 一季租借，下一次休赛期可考虑归队。'};
  const loan=career.journey?.loan;
  if(loan){const team=LEAGUES.flatMap(l=>l.teams.map(t=>({...t,league:l}))).find(t=>t.id===loan.parentTeamId);if(team&&(season.squadIds?.[team.id]?.length??10)<12)invitations.unshift({teamId:team.id,leagueId:team.league.id,teamName:season.teamNames?.[team.id]??team.name,leagueName:team.league.name,kind:'return',expectedRole:'归队竞争者',ambition:'结束租借',rationale:'租借期满，可以回到原队争取位置，也可以留队或选择其他邀请。'});}
  if(!career.journey)return invitations;
  return invitations.map(offer=>({...offer,...careerDeal(career,season,offer.teamId,offer.kind)})).filter(offer=>offer.affordable);
}

// Spatial snapshots are bounded separately from season totals and recent full reports.
export function memoryOf(row,reasons=['我的收藏']){const report=row.report?structuredClone(row.report):null;if(report)delete report.heat;return {matchId:row.matchId,season:row.season,competition:row.competition,opponent:row.opponent,score:[...row.score],rating:row.rating,goals:row.goals,assists:row.assists,reasons,report}}
export function toggleMatchMemory(player,matchId){const next=structuredClone(player),saved=next.memories??[];next.history=(next.history??[]).map((r,i)=>({...r,matchId:r.matchId??Math.max(1,next.stats.appearances-next.history.length+i+1)}));const row=next.history.find(r=>r.matchId===matchId),memory=saved.find(r=>r.matchId===matchId);if(memory){if(row&&!row.report)row.report=memory.report;next.memories=saved.filter(r=>r.matchId!==matchId);if(next.signatureMatchId===matchId)delete next.signatureMatchId;return next}if(!row?.report||saved.length>=30)return next;next.memories=[...saved,memoryOf(row)];return next}

export function finishCareerMatch(player,stat,score,duration,context={}){
  if(context.source==='simulated'&&stat?.playingSeconds===0)return structuredClone(player);
  const next=structuredClone(player);next.attributes.shielding??=POSITION[next.position].attributes.shielding;const match={};for(const field of FIELDS)match[field]=stat?.[field]??0;
  const rating=playerRating(match,score,next.position),objective=context.objective??careerObjective(next.position),objectiveComplete=match[objective.field]>=objective.target,engaged=['goals','assists','shotsOnTarget','passesCompleted','tackles','interceptions','blocks','keyPasses','carryDistance'].some(k=>match[k]>0),baseXp=15+(engaged?Math.max(0,Math.round((rating-5)*10)):0)+match.goals*12+match.assists*8+(objectiveComplete?10:0),xpGain=context.source==='simulated'?Math.round(baseXp*.7):baseXp;
  next.progressXp=levelProgress(next).value+xpGain;next.xp+=xpGain;while(next.progressXp>=levelProgress(next).target){next.progressXp-=levelProgress(next).target;next.level++}
  // Match XP records experience; permanent ability changes settle once each offseason.
  next.stats.appearances++;next.stats[score[0]>score[1]?'wins':score[0]<score[1]?'losses':'draws']++;next.stats.ratingTotal+=rating;for(const field of FIELDS)next.stats[field]=(next.stats[field]??0)+match[field];
  next.lastMatch={...match,rating:+rating.toFixed(1),xpGain,score:[...score],minutes:Math.min(90,Math.round((match.playingSeconds||duration)/duration*90)),objective:{...objective,complete:objectiveComplete},...(context.source?{source:context.source}:{}),...(context.goalEvents?{goalEvents:structuredClone(context.goalEvents)}:{}),growth:Object.fromEntries(Object.keys(next.attributes).map(k=>[k,next.attributes[k]-(player.attributes?.[k]??next.attributes[k])]))};
  if(context.seasonState){next.lastMatch.roleBefore=roleProgress(player,context.seasonState).tier;next.clubProgress=advanceClubRole(player,next.lastMatch,context);next.lastMatch.roleAfter=roleProgress(next,context.seasonState).tier}
  const previous=(next.history??[]).map((r,i)=>({...r,matchId:r.matchId??Math.max(1,next.stats.appearances-(next.history?.length??0)+i)}));
  const row={...next.lastMatch,...next.attributes,level:next.level,ratingVersion:2,storyFinal:context.final?1:0,storyChampion:context.champion?1:0,matchId:next.stats.appearances,competition:context.competition??'league',season:context.season??1,opponent:context.opponent??'对手',report:context.report?structuredClone(context.report):null};
  next.history=[...previous,row].slice(-2000);
  const reasons=[];if(next.stats.appearances===1)reasons.push('首秀');if(match.goals>0&&player.stats.goals===0)reasons.push('首次进球');if(match.assists>0&&player.stats.assists===0)reasons.push('首次助攻');if(match.goals>=3)reasons.push('帽子戏法');if(context.report?.events?.some(e=>e.type==='goal'&&e.player===next.index&&e.labels?.length))reasons.push('关键进球');if(context.final)reasons.push('杯赛决赛');if(context.champion)reasons.push('冠军之战');
  if(reasons.length&&(next.memories?.length??0)<30)next.memories=[...(next.memories??[]),memoryOf(row,reasons)];
  const best=new Set(next.history.map((r,i)=>({rating:r.rating,i})).sort((a,b)=>b.rating-a.rating).slice(0,3).map(r=>r.i));
  next.history.forEach((row,i)=>{if(i<next.history.length-5&&!best.has(i))row.report=null});
  next.seasonLedger??={};const key=String(context.season??1),ledger=next.seasonLedger[key]??{appearances:0,goals:0,assists:0,tackles:0,ratingTotal:0,xpGain:0,wins:0,draws:0,losses:0};
  ledger.appearances++;for(const field of ['goals','assists','tackles'])ledger[field]+=match[field];ledger.ratingTotal+=rating;ledger.xpGain+=next.lastMatch.xpGain;ledger[score[0]>score[1]?'wins':score[0]<score[1]?'losses':'draws']++;next.seasonLedger[key]=ledger;
  next.honors=[...new Set([...(next.honors??[]),...milestones(match,score)])];return next;
}
