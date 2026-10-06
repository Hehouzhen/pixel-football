import {LEAGUES,getTeam,leagueAwards,playerRows} from './league.mjs';
import {teamName} from './identity.mjs';

export const ABILITIES=['shooting','passing','defense','goalkeeping','speed'];
export const ABILITY_LABELS={shooting:'射门',passing:'传球',defense:'防守',goalkeeping:'守门',speed:'速度'};
export const STAT_FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','crossesCompleted','tackles','tackleAttempts','interceptions','keyPasses','saves','fouls','yellows','reds','blocks','turnovers','headers','bicycles','headerGoals','bicycleGoals','penaltyGoals','forwardPasses','touches','playingSeconds','distance','carryDistance','possession'];
export const STAT_LABELS={goals:'进球',assists:'助攻',shots:'射门',shotsOnTarget:'射正',passes:'传球',passesCompleted:'成功传球',crosses:'传中',crossesCompleted:'成功传中',tackles:'成功抢断',tackleAttempts:'抢断尝试',interceptions:'拦截',keyPasses:'关键传球',saves:'扑救',fouls:'犯规',yellows:'黄牌',reds:'红牌',blocks:'封堵',turnovers:'丢失球权',headers:'头球',bicycles:'倒钩',headerGoals:'头球进球',bicycleGoals:'倒钩进球',penaltyGoals:'点球进球',forwardPasses:'向前传球',touches:'触球',playingSeconds:'上场秒数',distance:'跑动距离',carryDistance:'带球距离',possession:'控球秒数'};
export const POSITION_LABELS=['门将','后卫','后卫','中场','中场','前锋'];

export function teamLeague(id){return LEAGUES.find(l=>l.teams.some(t=>t.id===id))?.id}
export function seasonState(season,leagueId){return leagueId===season.leagueId?season:season.world?.[leagueId]}
export function syncIdentity(season){for(const state of [...Object.values(season.world??{}),season.cup].filter(Boolean)){state.rosterIds=season.rosterIds;state.playerData=season.playerData;state.teamNames=season.teamNames}return season}
export function overall(player){const a=player.attributes,i=player.position;return Math.round(i===0?a.goalkeeping*.7+a.passing*.15+a.defense*.15:i<=2?a.defense*.55+a.passing*.25+a.shooting*.2:i<=4?a.passing*.45+a.defense*.25+a.shooting*.3:a.shooting*.55+a.passing*.3+a.defense*.15)}
function log(season,kind,detail){season.godEdits=[...(season.godEdits??[]),{kind,detail,at:Date.now()}].slice(-50)}
function nameValid(value,max=40){return typeof value==='string'&&value.trim().length>0&&value.trim().length<=max}
function assertGod(season){if(!season.godMode)throw new Error('请先开启 God Mode')}
function checkNumber(season,teamId,id,number){if(season.rosterIds[teamId].some(other=>other!==id&&season.playerData[other].number===number))throw new Error(`${teamName(season,teamId)}的 ${number} 号已被使用`)}

export function editTeamName(season,teamId,name){assertGod(season);if(!getTeam(teamId)||!nameValid(name,60))throw new Error('球队名称须为 1–60 个字符');const next=structuredClone(season),before=teamName(next,teamId);next.teamNames??={};next.teamNames[teamId]=name.trim();syncIdentity(next);log(next,'team',`${before} → ${name.trim()}`);return next}

export function editPlayer(season,career,id,change){assertGod(season);const next=structuredClone(season),updatedCareer=career?structuredClone(career):null,p=next.playerData[id];if(!p)throw new Error('找不到球员');
  const name=String(change.name??p.name).trim(),number=Number(change.number??p.number),teamId=change.teamId??p.teamId,position=Number(change.position??p.position);
  if(!nameValid(name,updatedCareer?.id===id?10:40)||!Number.isInteger(number)||number<(updatedCareer?.id===id?2:1)||number>99)throw new Error('姓名或号码无效；MyCareer 姓名最多 10 字，号码为 2–99');
  if(!next.rosterIds[teamId]||!Number.isInteger(position)||position<0||position>5)throw new Error('球队或位置无效');
  if(updatedCareer?.id===id&&(teamId!==p.teamId||![1,3,5].includes(position)))throw new Error('MyCareer 球员请通过赛季换队；自建球员仅支持后卫、中场、前锋位置');
  const attributes={...p.attributes};for(const key of ABILITIES){const value=Number(change.attributes?.[key]??attributes[key]);if(!Number.isInteger(value)||value<1||value>99)throw new Error('能力值须为 1–99 的整数');attributes[key]=value}
  const oldTeam=p.teamId,oldPosition=p.position,targetId=next.rosterIds[teamId][position];
  if(updatedCareer?.id===targetId&&id!==targetId)throw new Error('目标位置是 MyCareer 球员；请直接编辑自建球员的位置');
  if(targetId!==id){const other=next.playerData[targetId],oldNumber=p.number;next.rosterIds[oldTeam][oldPosition]=targetId;next.rosterIds[teamId][position]=id;other.teamId=oldTeam;other.position=oldPosition;if(oldTeam===teamId&&number===other.number)other.number=oldNumber;else if(next.rosterIds[oldTeam].some(otherId=>otherId!==targetId&&next.playerData[otherId].number===other.number)){other.number=Array.from({length:99},(_,i)=>i+1).find(n=>!next.rosterIds[oldTeam].some(otherId=>otherId!==targetId&&next.playerData[otherId].number===n))}}
  p.name=name;p.number=number;p.teamId=teamId;p.position=position;p.attributes=attributes;
  if(oldTeam!==teamId){const from=seasonState(next,teamLeague(oldTeam)),to=seasonState(next,teamLeague(teamId));if(from!==to){const original=from.players[id],swapped=to.players[targetId];delete from.players[id];delete to.players[targetId];if(original)to.players[id]=original;if(swapped)from.players[targetId]=swapped}}
  checkNumber(next,teamId,id,number);if(targetId!==id)checkNumber(next,oldTeam,targetId,next.playerData[targetId].number);
  for(const state of [next,...Object.values(next.world??{}),next.cup].filter(Boolean)){delete state.names?.[`${oldTeam}:${oldPosition}`];delete state.names?.[`${teamId}:${position}`]}
  if(updatedCareer?.id===id){updatedCareer.name=name;updatedCareer.number=number;updatedCareer.attributes={shooting:attributes.shooting,passing:attributes.passing,defense:attributes.defense,speed:attributes.speed};updatedCareer.index=position;updatedCareer.position=position===1?'defender':position===3?'midfielder':'forward';if(teamId!==oldTeam)next.teamId=teamId}
  syncIdentity(next);log(next,'player',`${id} · ${p.name} · ${teamName(next,teamId)}`);return {season:next,career:updatedCareer};
}

export function editPlayerStats(season,career,id,competition,leagueId,values){assertGod(season);const next=structuredClone(season),updatedCareer=career?structuredClone(career):null,p=next.playerData[id];if(!p)throw new Error('找不到球员');const state=competition==='cup'?next.cup:seasonState(next,leagueId);if(!state||competition!=='cup'&&(!teamLeague(p.teamId)||leagueId!==teamLeague(p.teamId)))throw new Error('统计赛事无效');
  const row={...(state.players[id]??{})},changes=[];for(const key of STAT_FIELDS){if(values[key]===undefined)continue;const value=Number(values[key]);if(!Number.isFinite(value)||value<0||value>1000000||(!['distance','carryDistance','possession','playingSeconds'].includes(key)&&!Number.isInteger(value)))throw new Error(`${STAT_LABELS[key]}须为非负数`);const old=row[key]??0;if(value!==old){row[key]=value;changes.push(`${STAT_LABELS[key]} ${old}→${value}`);if(updatedCareer?.id===id){updatedCareer.stats[key]=(updatedCareer.stats[key]??0)+value-old;const year=(next.history?.length??0)+1;if(competition==='league'&&updatedCareer.seasonLedger?.[year]?.[key]!==undefined)updatedCareer.seasonLedger[year][key]+=value-old}}}
  if(!changes.length)return {season:next,career:updatedCareer};state.players[id]=row;
  if(competition==='league'&&leagueId===next.leagueId&&next.awards)next.awards=leagueAwards(next);
  if(competition==='cup'&&next.cup?.awards)next.cup.awards.goldenBoot=playerRows(next.cup).filter(r=>r.index>0).sort((a,b)=>b.goals-a.goals)[0];
  syncIdentity(next);log(next,'stats',`${p.name} · ${competition==='cup'?'杯赛':leagueId} · ${changes.join('，')}`);return {season:next,career:updatedCareer};
}
