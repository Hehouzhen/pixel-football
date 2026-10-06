import {LEAGUES,getTeam} from './clubs.mjs';

export function teamName(season,id){return season?.teamNames?.[id]??getTeam(id)?.name??id}

const clamp=n=>Math.max(1,Math.min(99,Math.round(n)));
export const playerId=(teamId,index)=>`p:${teamId}:${index}`;

export function initialAttributes(teamId,index){
  const strength=getTeam(teamId)?.strength??1;
  const base=60+Math.round((strength-1)*25);
  const variation=((index*7+teamId.length*3)%9)-4;
  return {shooting:clamp(base+(index===5?12:index>=3?5:index===0?-22:-10)+variation),passing:clamp(base+(index===3||index===4?9:index===0?-5:0)-variation),defense:clamp(base+(index===0?3:index<=2?12:index===5?-12:0)+variation),goalkeeping:clamp(base+(index===0?18:-28)+variation),speed:clamp(base+(index===0?-18:index===5?10:3)-variation)};
}

export function createIdentity(nameFor){
  const rosterIds={},playerData={};
  for(const team of LEAGUES.flatMap(league=>league.teams)){
    rosterIds[team.id]=Array.from({length:6},(_,index)=>{
      const id=playerId(team.id,index);
      playerData[id]={id,name:nameFor(team.id,index),number:index===0?1:index+5,teamId:team.id,position:index,attributes:initialAttributes(team.id,index)};
      return id;
    });
  }
  return {rosterIds,playerData};
}

function migrateStats(state,rosterIds){
  if(!state)return;
  const next={};
  for(const [key,stats] of Object.entries(state.players??{})){
    const cut=key.lastIndexOf(':'),teamId=key.slice(0,cut),index=Number(key.slice(cut+1));
    next[rosterIds[teamId]?.[index]??key]=stats;
  }
  state.players=next;
}

export function ensureIdentity(season,nameFor,career=null){
  if(!season.rosterIds||!season.playerData){
    Object.assign(season,createIdentity(nameFor));
    for(const [key,name] of Object.entries(season.names??{})){
      const cut=key.lastIndexOf(':'),id=season.rosterIds[key.slice(0,cut)]?.[Number(key.slice(cut+1))];
      if(id)season.playerData[id].name=name;
    }
    migrateStats(season,season.rosterIds);
    for(const state of Object.values(season.world??{}))migrateStats(state,season.rosterIds);
    migrateStats(season.cup,season.rosterIds);
  }
  season.teamNames??={};
  season.godMode??=false;
  for(const p of Object.values(season.playerData)){p.number??=p.position===0?1:p.position+5;p.attributes.speed??=initialAttributes(p.teamId,p.position).speed}
  if(career)career.attributes.speed??=initialAttributes(season.teamId,career.index).speed;
  if(career){
    const id=career.id??season.rosterIds[season.teamId]?.[career.index];
    if(id){career.id=id;season.playerData[id].name=career.name;season.playerData[id].number=career.number;season.playerData[id].attributes={...season.playerData[id].attributes,...career.attributes}}
  }
  for(const ids of Object.values(season.rosterIds)){const used=new Set();for(const id of career&&ids.includes(career.id)?[career.id,...ids.filter(other=>other!==career.id)]:ids){const player=season.playerData[id];if(used.has(player.number))player.number=Array.from({length:99},(_,i)=>i+1).find(number=>!used.has(number)&&!ids.some(other=>other!==id&&season.playerData[other].number===number));used.add(player.number)}}
  return season;
}

export function activePlayers(season,teamId){return (season.rosterIds?.[teamId]??[]).map(id=>season.playerData[id])}
export function carryIdentity(oldSeason,newSeason,career=null){
  const replacementPlayer=career&&oldSeason.teamId!==newSeason.teamId?newSeason.playerData[newSeason.rosterIds[oldSeason.teamId][career.index]]:null;
  newSeason.rosterIds=structuredClone(oldSeason.rosterIds);
  newSeason.playerData=structuredClone(oldSeason.playerData);
  newSeason.teamNames={...oldSeason.teamNames};
  newSeason.godMode=!!oldSeason.godMode;
  if(career&&oldSeason.teamId!==newSeason.teamId){
    const id=career.id??oldSeason.rosterIds[oldSeason.teamId][career.index];
    const replacement=`p:${oldSeason.teamId}:${career.index}:r${(oldSeason.history?.length??0)+1}`;
    newSeason.playerData[replacement]={...replacementPlayer,id};
    newSeason.rosterIds[oldSeason.teamId][career.index]=replacement;
    newSeason.rosterIds[newSeason.teamId][career.index]=id;
    newSeason.playerData[id]={...newSeason.playerData[id],teamId:newSeason.teamId,position:career.index};
  }
  if(career){
    career.id??=newSeason.rosterIds[newSeason.teamId][career.index];
    newSeason.playerData[career.id].name=career.name;
    newSeason.playerData[career.id].number=career.number;
    newSeason.playerData[career.id].attributes={...newSeason.playerData[career.id].attributes,...career.attributes};
  }
  return newSeason;
}
export function rosterRating(season,teamId){
  const players=activePlayers(season,teamId);
  if(!players.length)return getTeam(teamId).strength;
  const quality=players.reduce((sum,p)=>sum+(p.position===0?p.attributes.goalkeeping:(p.attributes.shooting+p.attributes.passing+p.attributes.defense+p.attributes.speed)/4),0)/players.length;
  const baseline=Array.from({length:6},(_,i)=>initialAttributes(teamId,i)).reduce((sum,a,i)=>sum+(i===0?a.goalkeeping:(a.shooting+a.passing+a.defense+a.speed)/4),0)/6;
  return getTeam(teamId).strength+(quality-baseline)/100;
}
