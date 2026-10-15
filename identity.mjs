import {ensureFootballLife} from './football-life.mjs';
import {careerDeal} from './player-value.mjs';
import {LEAGUES,getTeam} from './clubs.mjs';
import {playerAgeProfile,seasonStartYear} from './aging.mjs';
import {ensureRatings,positionRating} from './ratings.mjs';

export function teamName(season,id){return season?.teamNames?.[id]??getTeam(id)?.name??id}

const clamp=n=>Math.max(1,Math.min(99,Math.round(n)));
const hash=text=>{let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0};
export const playerId=(teamId,index)=>`p:${teamId}:${index}`;

export function initialAttributes(teamId,index){
  const strength=getTeam(teamId)?.strength??1;
  const base=60+Math.round((strength-1)*25);
  const variation=((index*7+teamId.length*3)%9)-4;
  return ensureRatings({shooting:clamp(base+(index===5?12:index>=3?5:index===0?-22:-10)+variation),passing:clamp(base+(index===3||index===4?9:index===0?-5:0)-variation),defense:clamp(base+(index===0?3:index<=2?12:index===5?-12:0)+variation),shielding:clamp(base+(index===0?-12:index<=2?7:index===5?8:index>=3?3:0)+variation),goalkeeping:clamp(base+(index===0?18:-28)+variation),speed:clamp(base+(index===0?-18:index===5?10:3)-variation),firstTouch:clamp(base+(index===0?-14:index>=3?7:index===5?4:0)+variation),endurance:clamp(base+(index===0?-8:index>=3?5:2)-variation),aerial:clamp(base+(index===0?7:index<=2?12:index===5?8:-5)+variation)});
}

export function createIdentity(nameFor){
  const rosterIds={},playerData={};
  for(const team of LEAGUES.flatMap(league=>league.teams)){
    rosterIds[team.id]=Array.from({length:6},(_,index)=>{
      const id=playerId(team.id,index);
      const attributes=initialAttributes(team.id,index);
      playerData[id]={id,name:nameFor(team.id,index),number:index===0?1:index+5,teamId:team.id,position:index,attributes,lastAgedStartYear:2026,retired:false,honors:[],awardHistory:[],...playerAgeProfile(id,index,attributes)};
      return id;
    });
  }
  return ensureFootballLife({rosterIds,playerData},generateProspect);
}

export function generateProspect(playerData,teamId,index,year,number=index===0?1:index+5){
  let serial=0,id;
  do{id=`p:${teamId}:${index}:y${year}:${serial++}`}while(playerData[id]);
  const seed=hash(id),base=initialAttributes(teamId,index),focus=index===0?['goalkeeping','speed','passing']:index<=2?['defense','aerial','speed']:index<=4?['passing','firstTouch','endurance']:['shooting','speed','firstTouch'];
  const attributes=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,clamp(value+(hash(`${id}:${key}`)%13)-6+(focus.includes(key)?4:0))]));
  const technical=focus.reduce((sum,key)=>sum+(attributes[key]??60),0)/focus.length,potential=clamp(technical+5+seed%17,62,94),names=Object.values(playerData).filter(player=>player.teamId===teamId&&player.name).map(player=>player.name),parts=names.map(name=>name.includes(' ')?name.trim().split(/\s+/):[...name]).filter(name=>name.length>=2);
  let name;
  for(let offset=0;offset<parts.length*parts.length;offset++){
    const first=parts[(seed+offset)%parts.length],last=parts[(seed*7+offset*3)%parts.length],cjk=/[\u3400-\u9fff]/u.test(first[0]+last.at(-1)),candidate=cjk?`${first[0]}${last.slice(1).join('')}`:`${first[0]} ${last.at(-1)}`;
    if(!names.includes(candidate)){name=candidate;break}
  }
  name??=`${teamId} 青训 ${year}`;
  return {id,name,number,teamId,position:index,age:(index===0?18:17)+seed%5,potential,lastAgedStartYear:year,retired:false,origin:'academy',honors:[],awardHistory:[],transferHistory:[],careerStats:Object.fromEntries(['appearances','goals','assists','shots','shotsOnTarget','passes','passesCompleted','tackles','interceptions','saves','keyPasses','playingSeconds'].map(field=>[field,0])),attributes};
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
  for(const team of LEAGUES.flatMap(league=>league.teams))if(!season.rosterIds[team.id]){
    season.rosterIds[team.id]=Array.from({length:6},(_,index)=>{
      const id=playerId(team.id,index),attributes=initialAttributes(team.id,index);
      season.playerData[id]={id,name:nameFor(team.id,index),number:index===0?1:index+5,teamId:team.id,position:index,attributes,lastAgedStartYear:season.calendar?.startYear??2026,retired:false,honors:[],awardHistory:[],...playerAgeProfile(id,index,attributes)};
      return id;
    });
  }
  for(const state of Object.values(season.world??{})){state.rosterIds=season.rosterIds;state.playerData=season.playerData}
  if(season.cup){season.cup.rosterIds=season.rosterIds;season.cup.playerData=season.playerData}
  season.teamNames??={};
  season.freeAgents??=[];
  season.calendar??={startYear:seasonStartYear(season)};
  season.godMode??=false;
  const tracked=[season,...Object.values(season.world??{}),season.cup].filter(Boolean);
  for(const p of Object.values(season.playerData)){
    p.number??=p.position===0?1:p.position+5;
    p.attributes.speed??=initialAttributes(p.teamId,p.position).speed;
    p.attributes.shielding??=initialAttributes(p.teamId,p.position).shielding;
    p.attributes.firstTouch??=initialAttributes(p.teamId,p.position).firstTouch;
    p.attributes.endurance??=initialAttributes(p.teamId,p.position).endurance;
    p.attributes.aerial??=initialAttributes(p.teamId,p.position).aerial;
    ensureRatings(p.attributes);
    const ageProfile=playerAgeProfile(p.id,p.position,p.attributes);
    p.age??=ageProfile.age;p.potential??=ageProfile.potential;p.lastAgedStartYear??=season.calendar.startYear;
    p.retired??=false;p.honors??=[];p.awardHistory??=[];
    if(!p.careerStats){
      const fields=['appearances','goals','assists','shots','shotsOnTarget','passes','passesCompleted','tackles','interceptions','saves','keyPasses','playingSeconds'];
      p.careerStats=Object.fromEntries(fields.map(field=>[field,0]));
      for(const state of tracked){
        const stats=state.players?.[p.id];
        if(!stats)continue;
        for(const field of fields.slice(1))p.careerStats[field]+=stats[field]??0;
        p.careerStats.appearances+=state.results?.filter(r=>r.home===p.teamId||r.away===p.teamId).length??0;
      }
    }
  }
  if(career){const defaults=initialAttributes(season.teamId,career.index);for(const key of ['speed','shielding','firstTouch','endurance','aerial'])career.attributes[key]??=defaults[key];ensureRatings(career.attributes);career.age??=18;career.potential??=86;career.trainingPoints??=0}
  if(career){
    const id=career.id??season.rosterIds[season.teamId]?.[career.index];
    if(id){career.id=id;season.playerData[id].name=career.name;season.playerData[id].number=career.number;season.playerData[id].appearance=structuredClone(career.appearance??{});season.playerData[id].trainingFocus=career.trainingFocus??'balanced';season.playerData[id].age=career.age;season.playerData[id].potential=career.potential;season.playerData[id].attributes={...season.playerData[id].attributes,...career.attributes};season.playerData[id].honors=[...new Set([...(season.playerData[id].honors??[]),...(career.honors??[])])].slice(-200);career.attributes={...season.playerData[id].attributes}}
  }
  for(const ids of Object.values(season.rosterIds)){const used=new Set();for(const id of career&&ids.includes(career.id)?[career.id,...ids.filter(other=>other!==career.id)]:ids){const player=season.playerData[id];if(used.has(player.number))player.number=Array.from({length:99},(_,i)=>i+1).find(number=>!used.has(number)&&!ids.some(other=>other!==id&&season.playerData[other].number===number));used.add(player.number)}}
  ensureFootballLife(season,generateProspect);
  return season;
}

export function activePlayers(season,teamId){return (season.rosterIds?.[teamId]??[]).map(id=>season.playerData[id])}
export function carryIdentity(oldSeason,newSeason,career=null){
  if(oldSeason.teamId===newSeason.teamId){if(oldSeason.teamSetup)newSeason.teamSetup=structuredClone(oldSeason.teamSetup);if(oldSeason.tactic)newSeason.tactic=oldSeason.tactic;}
  newSeason.rosterIds=structuredClone(oldSeason.rosterIds);
  newSeason.playerData=structuredClone(oldSeason.playerData);
  newSeason.pairChemistry=Object.fromEntries(Object.entries(oldSeason.pairChemistry??{}).flatMap(([key,score])=>{
    const [a,b]=key.split('|');return newSeason.playerData[a]?.teamId===newSeason.playerData[b]?.teamId&&score>54?[[key,score-4]]:[];
  }));
  newSeason.scoutingReports=structuredClone(oldSeason.scoutingReports??{});
  newSeason.shortlist=[...(oldSeason.shortlist??[])];
  newSeason.squadIds=structuredClone(oldSeason.squadIds??{});
  newSeason.lifeEvents=structuredClone(oldSeason.lifeEvents??[]);
  newSeason.playerRequests=structuredClone(oldSeason.playerRequests??[]);
  newSeason.freeAgents=[...new Set(oldSeason.freeAgents??[])];
  newSeason.teamNames={...oldSeason.teamNames};
  newSeason.godMode=!!oldSeason.godMode;
  if(career?.journey&&oldSeason.teamId!==newSeason.teamId){
    const id=career.id,from=oldSeason.teamId,to=newSeason.teamId,year=newSeason.calendar?.startYear??2026,deal=careerDeal(career,oldSeason,to,career.transferOffer?.kind);if(!deal.affordable)throw new Error('球队预算不足，无法完成转会');
    newSeason.worldFunds??={};const funds=teamId=>oldSeason.worldFunds?.[teamId]??(teamId===from&&oldSeason.balance!=null?oldSeason.balance:16+(getTeam(teamId)?.strength??1)*18);newSeason.worldFunds[from]=+(funds(from)+deal.fee).toFixed(2);newSeason.worldFunds[to]=+(funds(to)-deal.fee).toFixed(2);newSeason.balance=newSeason.worldFunds[to];newSeason.playerData[id].contractEndYear=year+deal.years;newSeason.playerData[id].contractWage=deal.annualWage;
    const oldSlot=newSeason.rosterIds[from].indexOf(id);
    if(oldSlot>=0){const reserve=(newSeason.squadIds[from]??[]).map(key=>newSeason.playerData[key]).filter(p=>p.id!==id&&!newSeason.rosterIds[from].includes(p.id)&&!p.retired&&!p.freeAgent&&(p.position===0?0:p.position<3?1:p.position<5?3:5)===(oldSlot<3?1:oldSlot<5?3:5)).sort((a,b)=>positionRating(b)-positionRating(a))[0];if(reserve)newSeason.rosterIds[from][oldSlot]=reserve.id;else{const replacement=generateProspect(newSeason.playerData,from,oldSlot,year,career.number);newSeason.playerData[replacement.id]=replacement;newSeason.rosterIds[from][oldSlot]=replacement.id;newSeason.squadIds[from].push(replacement.id);}}
    newSeason.squadIds[from]=(newSeason.squadIds[from]??[]).filter(key=>key!==id);newSeason.squadIds[to]=[...new Set([...(newSeason.squadIds[to]??newSeason.rosterIds[to]),id])];newSeason.playerData[id].teamId=to;
    const kind=career.transferOffer?.kind??'transfer';if(kind==='loan')career.journey.loan={parentTeamId:from,returnYear:year+1};else if(career.journey.loan)delete career.journey.loan;
    career.journey.seekLoan=false;career.journey.clubGames=0;career.journey.trust=38;career.journey.firstStart=false;career.journey.clubs=[...career.journey.clubs,to].slice(-100);career.journey.pending='first-contract';career.journey.resolved=career.journey.resolved.filter(key=>!['first-contract','identity','partnership','setback','reunion'].includes(key));
    const transfer={eventId:'career-transfer:'+id+':'+year,playerId:id,playerName:career.name,season:(oldSeason.history?.length??0)+1,year,from,to,fromName:teamName(oldSeason,from),toName:teamName(newSeason,to),fromLeagueId:oldSeason.leagueId,toLeagueId:newSeason.leagueId,fee:deal.fee,marketValue:deal.marketValue,annualWage:deal.annualWage,years:deal.years,reason:kind==='loan'?'loan':kind==='return'?'loan-return':'player-choice',expectedRole:career.transferOffer?.expectedRole??'轮换竞争者'};
    career.transferHistory=[...(career.transferHistory??[]),transfer].slice(-100);newSeason.playerData[id].transferHistory=[...(newSeason.playerData[id].transferHistory??[]),transfer].slice(-100);
    career.journey.memories=[...career.journey.memories,{id:transfer.eventId,title:kind==='loan'?'去另一片球场寻找机会':kind==='return'?'回到原队，再争取一次':'新的更衣室',text:transfer.fromName+' → '+transfer.toName+'。'+transfer.expectedRole,kind:'milestone',chapter:'professional'}].slice(-80);
  }else if(career&&oldSeason.teamId!==newSeason.teamId){
    const id=career.id??oldSeason.rosterIds[oldSeason.teamId][career.index];
    const targetId=oldSeason.rosterIds[newSeason.teamId][career.index],target=newSeason.playerData[targetId],year=newSeason.calendar?.startYear??2026+(oldSeason.history?.length??0)+1,replacement=generateProspect(newSeason.playerData,oldSeason.teamId,career.index,year,newSeason.playerData[id]?.number);
    newSeason.playerData[replacement.id]=replacement;
    newSeason.freeAgents.push(targetId);target.freeAgent=true;
    newSeason.rosterIds[oldSeason.teamId][career.index]=replacement.id;
    newSeason.rosterIds[newSeason.teamId][career.index]=id;
    newSeason.playerData[id]={...newSeason.playerData[id],teamId:newSeason.teamId,position:career.index};
    const transfer={eventId:`career-transfer:${id}:${year}`,playerId:id,playerName:career.name,season:(oldSeason.history?.length??0)+1,year,from:oldSeason.teamId,to:newSeason.teamId,fromName:teamName(oldSeason,oldSeason.teamId),toName:teamName(newSeason,newSeason.teamId),fromLeagueId:oldSeason.leagueId,toLeagueId:newSeason.leagueId,reason:'player-choice',...(career.transferOffer?{expectedRole:career.transferOffer.expectedRole,ambition:career.transferOffer.ambition,offerSummary:career.transferOffer.rationale}:{}),releasedId:targetId,replacementId:replacement.id};
    career.transferHistory=[...(career.transferHistory??[]).filter(item=>item.eventId!==transfer.eventId),transfer].slice(-100);
    newSeason.playerData[id].transferHistory=[...(newSeason.playerData[id].transferHistory??[]).filter(item=>item.eventId!==transfer.eventId),transfer].slice(-100);
  }
  if(career){
    career.id??=newSeason.rosterIds[newSeason.teamId][career.index];
    newSeason.playerData[career.id].name=career.name;
    newSeason.playerData[career.id].number=career.number;
    newSeason.playerData[career.id].appearance=structuredClone(career.appearance??{});
    newSeason.playerData[career.id].trainingFocus=career.trainingFocus??'balanced';
    newSeason.playerData[career.id].age=career.age??newSeason.playerData[career.id].age;
    newSeason.playerData[career.id].potential=career.potential??newSeason.playerData[career.id].potential;
    newSeason.playerData[career.id].attributes={...newSeason.playerData[career.id].attributes,...career.attributes};
  }
  ensureFootballLife(newSeason,generateProspect);
  return newSeason;
}
export function rosterRating(season,teamId){
  const players=activePlayers(season,teamId);
  if(!players.length)return getTeam(teamId).strength;
  const quality=players.reduce((sum,p)=>sum+positionRating(p),0)/players.length;
  const baseline=Array.from({length:6},(_,i)=>positionRating({position:i,attributes:initialAttributes(teamId,i)})).reduce((sum,value)=>sum+value,0)/6;
  return getTeam(teamId).strength+(quality-baseline)/100;
}
