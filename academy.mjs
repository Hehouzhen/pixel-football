import {generateProspect} from './identity.mjs';
import {estimatedWage,squadPlayers,wageBudget} from './football-life.mjs';
import {positionRating} from './ratings.mjs';
import {wage,finances} from './transfers.mjs';
import {prepareSeason} from './league.mjs';

const positions=[0,1,2,3,4,5],hash=text=>{let n=2166136261;for(const char of String(text)){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const yearOf=season=>season.calendar?.startYear??2026+(season.history?.length??0);
const defaultAcademy=teamId=>({teamId,level:1,focus:'balanced',prospects:[],graduates:[]});
const focusLabel=focus=>focus==='balanced'?'均衡':({0:'门将',1:'左后卫',2:'右后卫',3:'中场',4:'边中场',5:'前锋'}[focus]??'均衡');
function playerNeed(season,teamId){const squad=squadPlayers(season,teamId);return positions.map(position=>({position,count:squad.filter(player=>player.position===position).length,rating:Math.min(...squad.filter(player=>player.position===position).map(positionRating),99)})).sort((a,b)=>a.count-b.count||a.rating-b.rating||a.position-b.position)}
function createClass(season,academy,year,count){const created=[],needs=playerNeed(season,academy.teamId);for(let index=0;index<count&&academy.prospects.length<6;index++){
 const focusPosition=academy.focus==='balanced'?needs[index%needs.length].position:academy.focus,used=new Set([...squadPlayers(season,academy.teamId).map(player=>player.number),...academy.prospects.map(id=>season.playerData[id]?.number)]),number=positions.map((_,i)=>i+1).find(n=>!used.has(n))??(index+20),player=generateProspect(season.playerData,academy.teamId,focusPosition,year,number),penalty=academy.level===1?15:academy.level===2?10:6;
 player.age=16+hash(`${player.id}:academy-age`)%3;player.academyLevel=academy.level;player.academyFocus=focusLabel(academy.focus);
 const boost=focusPosition===0?['goalkeeping','reflexes','handling','keeperPositioning','oneOnOne']:focusPosition<=2?['defense','aerial','speed']:focusPosition<=4?['passing','firstTouch','endurance']:['shooting','speed','firstTouch'];
 for(const key of Object.keys(player.attributes))player.attributes[key]=Math.max(1,player.attributes[key]-penalty+(academy.focus!=='balanced'&&boost.includes(key)?2:0));
 player.potential=Math.min(99,player.potential+(academy.level-1)*3);player.academy=true;season.playerData[player.id]=player;academy.prospects.push(player.id);created.push({id:player.id,name:player.name,teamId:academy.teamId,age:player.age,position:focusPosition,year});
 }
 return created;
}

export function initializeAcademy(season,teamId=season.teamId){
 const next=structuredClone(season);if(next.academy?.teamId===teamId)return next;
 const academy=defaultAcademy(teamId);createClass(next,academy,yearOf(next),2);next.academy=academy;return next;
}

export function academyState(season){return season.academy??defaultAcademy(season.teamId)}

export function setAcademyFocus(season,focus){
 if(focus!=='balanced'&&!positions.includes(focus))throw new Error('青训位置无效');
 const next=season.academy?.teamId===season.teamId?structuredClone(season):initializeAcademy(season),academy={...next.academy,focus};next.academy=academy;return next;
}

export const academyUpgradeCost=level=>level===1?8:level===2?15:Infinity;
export function upgradeAcademy(season){
 const next=season.academy?.teamId===season.teamId?structuredClone(season):initializeAcademy(season),academy=next.academy,cost=academyUpgradeCost(academy.level);
 if(!Number.isFinite(cost)||finances(next).balance<cost)throw new Error('资金不足或青训中心已达到最高等级');
 next.balance=+(finances(next).balance-cost).toFixed(1);academy.level++;return next;
}

export function academyBenchReleases(season){const lineup=new Set(season.rosterIds?.[season.teamId]??[]);return (season.squadIds?.[season.teamId]??[]).filter(id=>!lineup.has(id)).map(id=>season.playerData[id]).filter(player=>player&&!player.freeAgent&&!player.retired).sort((a,b)=>positionRating(a)-positionRating(b));}
export function academyPromotionCost(season,releaseId){if(!releaseId)return 0;const player=season.playerData?.[releaseId];if(!player)return Infinity;const remaining=Math.max(0,Math.min(2,(player.contractEndYear??yearOf(season))-yearOf(season)));return +(wage(player)*remaining*.5).toFixed(1)}

export function promoteAcademyPlayer(season,playerId,releaseId=null){
 const next=structuredClone(season),academy=next.academy,player=next.playerData?.[playerId];
 if(!academy||academy.teamId!==next.teamId||!academy.prospects.includes(playerId)||!player||player.freeAgent||player.retired)throw new Error('请选择本队青训球员');
 let squad=squadPlayers(next,next.teamId);
 if(squad.length>=12){
  const outgoing=academyBenchReleases(next).find(item=>item.id===releaseId),cost=academyPromotionCost(next,releaseId);
  if(!outgoing||!Number.isFinite(cost)||finances(next).balance<cost)throw new Error('一线队已满，请选择可释放的替补并确认补偿资金');
  next.balance=+(finances(next).balance-cost).toFixed(1);outgoing.freeAgent=true;next.freeAgents=[...new Set([...(next.freeAgents??[]),outgoing.id])];next.squadIds[next.teamId]=next.squadIds[next.teamId].filter(id=>id!==outgoing.id);squad=squadPlayers(next,next.teamId);
 }
 const salary=Math.max(.3,Math.min(.7,+(estimatedWage(player)*.5).toFixed(1)));
 if(squad.reduce((sum,item)=>sum+wage(item),0)+salary>wageBudget(next.teamId))throw new Error('工资预算不足，无法注册这名青训球员');
 const used=new Set(squad.map(item=>item.number));player.number=Array.from({length:99},(_,i)=>i+1).find(number=>!used.has(number))??player.number;
 player.teamId=next.teamId;player.freeAgent=false;player.contractWage=salary;player.contractEndYear=yearOf(next)+2+hash(`${player.id}:academy-contract`)%2;player.squadRole='prospect';player.origin='academy';
 next.squadIds[next.teamId]=[...next.squadIds[next.teamId],playerId];academy.prospects=academy.prospects.filter(id=>id!==playerId);academy.graduates=[...(academy.graduates??[]),{id:player.id,name:player.name,year:yearOf(next),age:player.age,position:player.position}].slice(-60);
 prepareSeason(next);return next;
}

export function carryAcademy(oldSeason,newSeason,teamId=newSeason.teamId){
 if(oldSeason.academy?.teamId===teamId)newSeason.academy=structuredClone(oldSeason.academy);
 else newSeason.academy=defaultAcademy(teamId);
 return newSeason;
}

export function advanceAcademySeason(season,teamId,year){
 if(!season.academy||season.academy.teamId!==teamId)season.academy=defaultAcademy(teamId);
 const academy=season.academy;
 academy.prospects=academy.prospects.filter(id=>{const player=season.playerData[id];if(!player||player.age>=21){if(player){player.freeAgent=true;season.freeAgents=[...new Set([...(season.freeAgents??[]),id])]}return false}return true});
 return createClass(season,academy,year,2);
}
