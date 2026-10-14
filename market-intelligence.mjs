import {LEAGUES,getTeam} from './clubs.mjs';
import {squadPlayers,positionGroup,lifeYear} from './football-life.mjs';
import {positionRating,ABILITIES} from './ratings.mjs';
import {TRAITS} from './player-context.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hash=text=>{let n=2166136261;for(const char of String(text)){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const labels={0:'门将',1:'后卫',3:'中场',5:'前锋'};
export function squadNeeds(season,teamId=season.teamId){
  const team=squadPlayers(season,teamId),lineup=season.rosterIds?.[teamId]??[];
  return [[0,1],[1,2],[3,2],[5,1]].map(([group,required])=>{
    const players=team.filter(p=>positionGroup(p.position)===group).sort((a,b)=>positionRating(b)-positionRating(a));
    const starters=players.filter(p=>lineup.includes(p.id)),weakest=starters.at(-1),depth=players.length-required;
    const priority=depth<1?3:weakest?.age>=32||weakest&&positionRating(weakest)<58?2:1;
    const reason=depth<1?'缺少可靠替补':weakest?.age>=32?'主力年龄偏大':priority===2?'主力能力需要提升':'位置覆盖充足';
    return {group,label:labels[group],required,count:players.length,depth,priority,reason,starterId:weakest?.id??null,starterRating:weakest?positionRating(weakest):null};
  }).sort((a,b)=>b.priority-a.priority||a.group-b.group);
}
export function publicRating(season,player){
  if(player.teamId===season.teamId||season.godMode)return {low:positionRating(player),high:positionRating(player)};
  const report=season.scoutingReports?.[player.id];
  if(report)return report.rating;
  const estimate=positionRating(player)+(hash(`${season.seed}:${player.id}:public`)%15)-7;
  return {low:clamp(estimate-10,1,99),high:clamp(estimate+10,1,99)};
}
export function abilityRange(season,player,key){
  const actual=player.attributes?.[key];if(actual==null)return null;
  if(player.teamId===season.teamId||season.godMode)return {low:actual,high:actual};
  const stored=season.scoutingReports?.[player.id]?.abilities?.[key];
  if(stored)return stored;
  return {low:clamp(actual+(hash(`${season.seed}:${player.id}:${key}:public`)%15)-17,1,99),high:clamp(actual+(hash(`${season.seed}:${player.id}:${key}:public`)%15)+3,1,99)};
}
export function observePlayer(season,id){
  const player=season.playerData?.[id];
  if(!player||player.retired||player.freeAgent||player.teamId===season.teamId)throw new Error('只能观察其他球队的在役球员');
  const next=structuredClone(season),year=lifeYear(next),week=next.week,previous=next.scoutingReports?.[id];
  if(previous?.year===year&&previous.week===week)throw new Error('本轮已观察该球员，下一轮可继续');
  const observed=Object.values(next.scoutingReports??{}).filter(report=>report.year===year&&report.week===week).length;
  if(observed>=3)throw new Error('本轮三份球探报告已经用完');
  const level=Math.min(3,(previous?.level??0)+1),radius=[0,8,4,2][level],bias=hash(`${next.seed}:${id}:scout`)%5-2,abilities={};
  for(const key of ABILITIES){const value=player.attributes[key];abilities[key]={low:clamp(value+bias-radius,1,99),high:clamp(value+bias+radius,1,99)}}
  const rating=positionRating(player);next.scoutingReports??={};next.scoutingReports[id]={year,week,level,rating:{low:clamp(rating+bias-radius,1,99),high:clamp(rating+bias+radius,1,99)},abilities};
  if(Object.keys(next.scoutingReports).length>60){const oldest=Object.entries(next.scoutingReports).sort((a,b)=>a[1].year-b[1].year||a[1].week-b[1].week)[0][0];delete next.scoutingReports[oldest]}
  return next;
}
export function candidateFit(season,player){
  const need=squadNeeds(season).find(row=>row.group===positionGroup(player.position)),team=getTeam(season.teamId),traits=player.traits??[];
  const matches=team?.style==='press'?['press','cover','quickPass']:team?.style==='counter'?['forwardRun','holdUp','earlyCross']:['quickPass','cover','composed'];
  const fit=traits.filter(id=>matches.includes(id)).map(id=>TRAITS[id].name);
  return {need:need?.reason??'可作为轮换',fit,summary:fit.length?`球风符合${team?.style==='press'?'高位压迫':team?.style==='counter'?'快速反击':'均衡组织'}：${fit.join('、')}`:'现有报告未显示明显战术特质优势'};
}
export function marketCandidates(season){return LEAGUES.flatMap(league=>league.teams).filter(team=>team.id!==season.teamId).flatMap(team=>squadPlayers(season,team.id));}
