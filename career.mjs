import {advanceClubRole,roleProgress} from './career-role.mjs';
import {objectiveFor,milestones,STYLES} from './experience.mjs';
const POSITION={forward:{label:'前锋',index:5,primary:'shooting',attributes:{shooting:70,passing:58,defense:50}},midfielder:{label:'中场',index:3,primary:'passing',attributes:{shooting:58,passing:70,defense:56}},defender:{label:'后卫',index:1,primary:'defense',attributes:{shooting:52,passing:58,defense:70}}};
const FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','tackles','touches','fouls','yellows','reds','distance','possession','headers','bicycles','forwardPasses','interceptions','tackleAttempts','playingSeconds','keyPasses','blocks','turnovers','crossesCompleted','carryDistance','headerGoals','bicycleGoals','penaltyGoals'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const POSITIONS=Object.entries(POSITION).map(([id,value])=>({id,label:value.label}));
export const positionLabel=id=>POSITION[id]?.label??'球员';

export function createCareerPlayer(name,number,position,appearance={skin:'#ebbd89',hair:'#302b24'},style=null){
  const config=POSITION[position];
  if(!config)throw new Error('Unknown position');
  const clean=String(name).trim().slice(0,10);
  if(!clean)throw new Error('Player name is required');
  return {style:STYLES[position].some(s=>s.id===style)?style:null,bio:'',history:[],honors:[],name:clean,number:clamp(Math.round(Number(number)||10),2,99),position,index:config.index,appearance,level:1,xp:0,attributes:{...config.attributes},stats:{appearances:0,wins:0,draws:0,losses:0,ratingTotal:0,...Object.fromEntries(FIELDS.map(field=>[field,0]))},lastMatch:null};
}

export const careerObjective=(position,round=0,duration=180)=>objectiveFor(position,round,duration);
export function ratingBreakdown(stat={},score=[0,0],position='forward'){
  const result=score[0]>score[1]?.25:score[0]<score[1]?-.15:0,weights=position==='defender'?[.7,.6,.48,.3]:position==='midfielder'?[1,.95,.25,.2]:[1.45,.85,.2,.12];
  const entries=[['比赛结果',result],['进球',(stat.goals??0)*weights[0]],['助攻',(stat.assists??0)*weights[1]],['成功抢断',Math.min(stat.tackles??0,5)*weights[2]],['拦截',Math.min(stat.interceptions??0,5)*weights[3]],['射正',Math.min(stat.shotsOnTarget??0,4)*(position==='forward'?.18:.08)],['向前传球',Math.min(stat.forwardPasses??0,8)*(position==='midfielder'?.12:.04)],['成功传球',Math.min(stat.passesCompleted??0,15)*.01],['创造机会',Math.min(stat.keyPasses??0,4)*(position==='midfielder'?.18:.08)],['射门封堵',Math.min(stat.blocks??0,4)*(position==='defender'?.16:.04)],['丢失球权',-Math.min(stat.turnovers??0,4)*(position==='defender'?.12:position==='midfielder'?.09:.06)],['犯规',-(stat.fouls??0)*.2],['黄牌',-(stat.yellows??0)*.25],['红牌',-(stat.reds??0)*1.25]].filter(([,value])=>value!==0);
  return {rating:clamp(6+entries.reduce((n,[,value])=>n+value,0),4,10),entries};
}
export const playerRating=(stat,score,position)=>ratingBreakdown(stat,score,position).rating;
export function levelProgress(player){const target=Math.min(300,100+Math.max(0,player.level-5)*15),value=player.progressXp??player.xp%100;return {value,target,remaining:target-value,percent:value/target*100}}

// Spatial snapshots are bounded separately from season totals and recent full reports.
export function memoryOf(row,reasons=['我的收藏']){const report=row.report?structuredClone(row.report):null;if(report)delete report.heat;return {matchId:row.matchId,season:row.season,competition:row.competition,opponent:row.opponent,score:[...row.score],rating:row.rating,goals:row.goals,assists:row.assists,reasons,report}}
export function toggleMatchMemory(player,matchId){const next=structuredClone(player),saved=next.memories??[];next.history=(next.history??[]).map((r,i)=>({...r,matchId:r.matchId??Math.max(1,next.stats.appearances-next.history.length+i+1)}));const row=next.history.find(r=>r.matchId===matchId),memory=saved.find(r=>r.matchId===matchId);if(memory){if(row&&!row.report)row.report=memory.report;next.memories=saved.filter(r=>r.matchId!==matchId);if(next.signatureMatchId===matchId)delete next.signatureMatchId;return next}if(!row?.report||saved.length>=30)return next;next.memories=[...saved,memoryOf(row)];return next}

export function finishCareerMatch(player,stat,score,duration,context={}){
  const next=structuredClone(player),match={};for(const field of FIELDS)match[field]=stat?.[field]??0;
  const rating=playerRating(match,score,next.position),objective=context.objective??careerObjective(next.position),objectiveComplete=match[objective.field]>=objective.target,engaged=['goals','assists','shotsOnTarget','passesCompleted','tackles','interceptions','blocks','keyPasses','carryDistance'].some(k=>match[k]>0),xpGain=15+(engaged?Math.max(0,Math.round((rating-5)*10)):0)+match.goals*12+match.assists*8+(objectiveComplete?10:0);
  next.progressXp=levelProgress(next).value+xpGain;next.xp+=xpGain;const oldLevel=next.level;while(next.progressXp>=levelProgress(next).target){next.progressXp-=levelProgress(next).target;next.level++}const levels=next.level-oldLevel;
  if(levels>0){const primary=POSITION[next.position].primary;for(const key of Object.keys(next.attributes))next.attributes[key]=Math.min(99,next.attributes[key]+levels*(key===primary?2:1))}
  next.stats.appearances++;next.stats[score[0]>score[1]?'wins':score[0]<score[1]?'losses':'draws']++;next.stats.ratingTotal+=rating;for(const field of FIELDS)next.stats[field]=(next.stats[field]??0)+match[field];
  next.lastMatch={...match,rating:+rating.toFixed(1),xpGain:Math.max(15,xpGain),score:[...score],minutes:Math.min(90,Math.round((match.playingSeconds||duration)/duration*90)),objective:{...objective,complete:objectiveComplete},growth:Object.fromEntries(Object.keys(next.attributes).map(k=>[k,next.attributes[k]-player.attributes[k]]))};
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
