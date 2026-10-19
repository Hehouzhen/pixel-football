import {prospectName} from './player-names.mjs';
import {ensureNationalWorld} from './world-player-identity.mjs';
import {ensureFootballLife} from './football-life.mjs';
import {careerDeal} from './player-value.mjs';
import {marketAgreement} from './career-market.mjs';
import {LEAGUES,getTeam} from './clubs.mjs';
import {playerAgeProfile,seasonStartYear,validTrainingFocus} from './aging.mjs';
import {ensureRatings,positionRating,ABILITIES} from './ratings.mjs';
import {validAppearance} from './appearance.mjs';
import {carrySettlements} from './match-ledger.mjs';

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
  return ensureNationalWorld(ensureFootballLife({rosterIds,playerData},generateProspect));
}

export function generateProspect(playerData,teamId,index,year,number=index===0?1:index+5){
  let serial=0,id;
  do{id=`p:${teamId}:${index}:y${year}:${serial++}`}while(playerData[id]);
  const seed=hash(id),base=initialAttributes(teamId,index),focus=index===0?['goalkeeping','speed','passing']:index<=2?['defense','aerial','speed']:index<=4?['passing','firstTouch','endurance']:['shooting','speed','firstTouch'];
  const attributes=Object.fromEntries(Object.entries(base).map(([key,value])=>[key,clamp(value+(hash(`${id}:${key}`)%13)-6+(focus.includes(key)?4:0))]));
  const technical=focus.reduce((sum,key)=>sum+(attributes[key]??60),0)/focus.length,potential=clamp(technical+5+seed%17,62,94),league=LEAGUES.find(l=>l.teams.some(t=>t.id===teamId)),name=prospectName(league?.id,seed,new Set(Object.values(playerData).map(p=>p.name)));
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

export const PROFILE_FIELDS=['name','number','appearance','attributes','age','potential','trainingFocus'];
const isNewCareer=career=>!career?.id;
function copyCanonicalProfile(canonical,career){
  career.name=canonical.name;career.number=canonical.number;
  career.appearance=structuredClone(canonical.appearance??career.appearance??{});
  career.age=canonical.age;career.potential=canonical.potential;
  career.trainingFocus=canonical.trainingFocus??career.trainingFocus??'balanced';
  career.attributes={...(canonical.attributes??career.attributes??{})};
}
// Normal prepare/open/save: an existing canonical profile wins; only truly missing
// legacy fields are filled from the MyCareer mirror. A brand-new career initializes
// the canonical record from its chosen profile once.
export function mirrorCareerProfile(season,career){
  if(!career||!season?.playerData)return null;
  const id=career.id??season.rosterIds?.[season.teamId]?.[career.index],canonical=season.playerData[id];
  if(!id||!canonical)return null;
  if(isNewCareer(career)){
    canonical.name=career.name;canonical.number=career.number;
    canonical.appearance=structuredClone(career.appearance??{});
    canonical.age=career.age;canonical.potential=career.potential;
    canonical.trainingFocus=career.trainingFocus??'balanced';
    canonical.attributes={...ensureRatings({...canonical.attributes,...career.attributes})};
  }else{
    if(canonical.name===undefined)canonical.name=career.name;
    if(canonical.number===undefined)canonical.number=career.number;
    if(canonical.appearance===undefined)canonical.appearance=structuredClone(career.appearance??{});
    if(canonical.age===undefined)canonical.age=career.age;
    if(canonical.potential===undefined)canonical.potential=career.potential;
    if(canonical.trainingFocus===undefined)canonical.trainingFocus=career.trainingFocus??'balanced';
    if(!canonical.attributes)canonical.attributes={...(career.attributes??{})};
  }
  career.id=id;copyCanonicalProfile(canonical,career);
  canonical.honors=[...new Set([...(canonical.honors??[]),...(career.honors??[])])].slice(-200);
  return canonical;
}
const KEEPER_FIELDS=['reflexes','handling','keeperPositioning','oneOnOne'];
function activeTeamIds(season,teamId){
  const ids=[...(season.rosterIds?.[teamId]??[]),...(season.squadIds?.[teamId]??[])];
  for(const [id,player] of Object.entries(season.playerData??{}))if(player?.teamId===teamId)ids.push(id);
  return [...new Set(ids)].filter(id=>{const player=season.playerData[id];return player&&!player.retired&&!player.freeAgent});
}
// Validate and normalize a profile patch without writing anything. Goalkeeper
// shorthand is expanded first so the final components (and the average) are what
// actually gets validated.
function profilePatch(season,playerId,patch,{career=null,checkNumber=true}={}){
  if(typeof playerId!=='string'||!season?.playerData||!Object.hasOwn(season.playerData,playerId))throw new Error('找不到球员');
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('没有可更新的资料字段');
  const p=season.playerData[playerId],next={},isCareer=career?.id===playerId;
  if(patch.name!==undefined){const name=String(patch.name).trim();if(!name||name.length>(isCareer?10:40))throw new Error('姓名须为 1–'+(isCareer?10:40)+' 个字符');next.name=name}
  if(patch.number!==undefined){const number=Number(patch.number);if(!Number.isInteger(number)||number<(isCareer?2:1)||number>99)throw new Error(isCareer?'号码须为 2–99':'号码须为 1–99');if(checkNumber){const teamIds=[...(season.rosterIds?.[p.teamId]??[]),...(season.squadIds?.[p.teamId]??[])];if(teamIds.some(id=>id!==playerId&&season.playerData[id]?.number===number))throw new Error('该号码已被本队使用')}next.number=number}
  if(patch.appearance!==undefined){if(!validAppearance(patch.appearance))throw new Error('外观参数无效');next.appearance=structuredClone(patch.appearance)}
  if(patch.attributes!==undefined){
    const source={...p.attributes,...patch.attributes};
    if(patch.attributes.goalkeeping!==undefined&&KEEPER_FIELDS.every(key=>patch.attributes[key]===undefined))for(const key of KEEPER_FIELDS)source[key]=patch.attributes.goalkeeping;
    const attributes=ensureRatings(source);
    attributes.goalkeeping=Math.round(KEEPER_FIELDS.reduce((sum,key)=>sum+attributes[key],0)/4);
    for(const key of ABILITIES)if(!Number.isInteger(attributes[key])||attributes[key]<1||attributes[key]>99)throw new Error('能力值须为 1–99 的整数');
    next.attributes=attributes;
  }
  if(patch.age!==undefined){const age=Number(patch.age);if(!Number.isInteger(age)||age<15||age>99)throw new Error('年龄须为 15–99 岁');next.age=age}
  if(patch.potential!==undefined){const potential=Number(patch.potential);if(!Number.isInteger(potential)||potential<1||potential>99)throw new Error('潜力须为 1–99');next.potential=potential}
  if(patch.trainingFocus!==undefined){if(!validTrainingFocus(patch.trainingFocus))throw new Error('训练重点无效');next.trainingFocus=patch.trainingFocus}
  if(!Object.keys(next).length)throw new Error('没有可更新的资料字段');
  return next;
}
// The one profile write entry used by God Mode and other generic editors. Stable
// ID only; all fields are validated before anything is written. A number already
// worn by a teammate is rejected here: only the MyCareer customization command
// below is allowed to resolve that conflict.
export function updatePlayerProfile(season,playerId,patch,{career=null}={}){
  const p=season?.playerData?.[playerId],next=profilePatch(season,playerId,patch,{career});
  Object.assign(p,next);
  if(career?.id===playerId)copyCanonicalProfile(p,career);
  return p;
}
// MyCareer customization command: the player's chosen number wins, and teammates
// who held it move to the lowest free squad number. Validation and the complete
// reassignment plan are built before any write, so a failure leaves the save
// untouched. Historical match reports and national-team numbers are not touched.
export function updateCareerProfile(season,career,patch){
  const id=career?.id,p=season?.playerData?.[id];
  if(!id||!p)throw new Error('找不到球员');
  const next=profilePatch(season,id,patch,{career,checkNumber:false}),reassigned=[];
  if(next.number!==undefined){
    const teamIds=activeTeamIds(season,p.teamId),used=new Set();
    for(const other of teamIds)if(other!==id)used.add(season.playerData[other]?.number);
    used.add(next.number);
    const conflicts=teamIds.filter(other=>other!==id&&season.playerData[other]?.number===next.number);
    for(const other of conflicts){
      const free=Array.from({length:99},(_,index)=>index+1).find(number=>!used.has(number));
      if(!free)throw new Error('本队 1–99 号已全部占用，无法为冲突队友调整号码');
      used.add(free);
      reassigned.push({id:other,name:season.playerData[other].name,from:season.playerData[other].number,to:free});
    }
    for(const item of reassigned)season.playerData[item.id].number=item.to;
  }
  Object.assign(p,next);
  copyCanonicalProfile(p,career);
  return {player:p,reassigned};
}
// Explicit growth commit for training / match growth. Only fields that changed
// during this business step are written back; other newer canonical edits survive.
export function commitCareerGrowth(season,career,previous=null){
  if(!career?.id||!season?.playerData?.[career.id])return null;
  const canonical=season.playerData[career.id],patch={};
  for(const key of ABILITIES)if(previous?.attributes?.[key]!==undefined){if(career.attributes?.[key]!==previous.attributes[key])patch[key]=career.attributes[key]}
  if(!previous)for(const key of ABILITIES)if(career.attributes?.[key]!==undefined)patch[key]=career.attributes[key];
  const attributes=ensureRatings({...canonical.attributes,...patch});
  for(const key of ABILITIES)if(!Number.isInteger(attributes[key])||attributes[key]<1||attributes[key]>99)throw new Error('成长能力值无效');
  canonical.attributes=attributes;
  if(previous){if(career.trainingFocus!==previous.trainingFocus){if(!validTrainingFocus(career.trainingFocus))throw new Error('训练重点无效');canonical.trainingFocus=career.trainingFocus}}
  else{const focus=career.trainingFocus??'balanced';if(!validTrainingFocus(focus))throw new Error('训练重点无效');canonical.trainingFocus=focus}
  copyCanonicalProfile(canonical,career);
  return canonical;
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
  if(career){const defaults=initialAttributes(season.teamId,career.index);for(const key of ['speed','shielding','firstTouch','endurance','aerial'])career.attributes[key]??=defaults[key];ensureRatings(career.attributes);career.age??=18;career.potential??=86;career.trainingPoints??=0;mirrorCareerProfile(season,career)}
  for(const ids of Object.values(season.rosterIds)){const used=new Set();for(const id of career&&ids.includes(career.id)?[career.id,...ids.filter(other=>other!==career.id)]:ids){const player=season.playerData[id];if(used.has(player.number))player.number=Array.from({length:99},(_,i)=>i+1).find(number=>!used.has(number)&&!ids.some(other=>other!==id&&season.playerData[other].number===number));used.add(player.number)}}
  if(career?.id&&season.playerData[career.id])copyCanonicalProfile(season.playerData[career.id],career);
  ensureFootballLife(season,generateProspect);
  ensureNationalWorld(season,career);
  return season;
}

export function activePlayers(season,teamId){return (season.rosterIds?.[teamId]??[]).map(id=>season.playerData[id])}
export function carryIdentity(oldSeason,newSeason,career=null){
  if(oldSeason.teamId===newSeason.teamId){if(oldSeason.teamSetup)newSeason.teamSetup=structuredClone(oldSeason.teamSetup);if(oldSeason.tactic)newSeason.tactic=oldSeason.tactic;}
  newSeason.rosterIds=structuredClone(oldSeason.rosterIds);
  newSeason.playerData=structuredClone(oldSeason.playerData);
  carrySettlements(oldSeason,newSeason);
  newSeason.pairChemistry=Object.fromEntries(Object.entries(oldSeason.pairChemistry??{}).flatMap(([key,score])=>{
    const [a,b]=key.split('|');return newSeason.playerData[a]?.teamId===newSeason.playerData[b]?.teamId&&score>54?[[key,score-4]]:[];
  }));
  newSeason.scoutingReports=structuredClone(oldSeason.scoutingReports??{});
  newSeason.shortlist=[...(oldSeason.shortlist??[])];
  if(oldSeason.nationalWorld)newSeason.nationalWorld=structuredClone(oldSeason.nationalWorld);
  newSeason.squadIds=structuredClone(oldSeason.squadIds??{});
  newSeason.lifeEvents=structuredClone(oldSeason.lifeEvents??[]);
  newSeason.playerRequests=structuredClone(oldSeason.playerRequests??[]);
  newSeason.freeAgents=[...new Set(oldSeason.freeAgents??[])];
  newSeason.teamNames={...oldSeason.teamNames};
  newSeason.godMode=!!oldSeason.godMode;
  if(career&&(career.journey||career.transferMarket)&&oldSeason.teamId!==newSeason.teamId){
    const id=career.id,from=oldSeason.teamId,to=newSeason.teamId,year=newSeason.calendar?.startYear??2026,deal=marketAgreement(career,oldSeason,to)??careerDeal(career,oldSeason,to,career.transferOffer?.kind);if(!deal.affordable)throw new Error('球队预算不足，无法完成转会');
    newSeason.worldFunds??={};const funds=teamId=>oldSeason.worldFunds?.[teamId]??(teamId===from&&oldSeason.balance!=null?oldSeason.balance:16+(getTeam(teamId)?.strength??1)*18);newSeason.worldFunds[from]=+(funds(from)+deal.fee).toFixed(2);newSeason.worldFunds[to]=+(funds(to)-deal.fee).toFixed(2);newSeason.balance=newSeason.worldFunds[to];newSeason.playerData[id].contractEndYear=year+deal.years;newSeason.playerData[id].contractWage=deal.annualWage;
    const oldSlot=newSeason.rosterIds[from].indexOf(id);
    if(oldSlot>=0){const reserve=(newSeason.squadIds[from]??[]).map(key=>newSeason.playerData[key]).filter(p=>p.id!==id&&!newSeason.rosterIds[from].includes(p.id)&&!p.retired&&!p.freeAgent&&(p.position===0?0:p.position<3?1:p.position<5?3:5)===(oldSlot<3?1:oldSlot<5?3:5)).sort((a,b)=>positionRating(b)-positionRating(a))[0];if(reserve)newSeason.rosterIds[from][oldSlot]=reserve.id;else{const replacement=generateProspect(newSeason.playerData,from,oldSlot,year,career.number);newSeason.playerData[replacement.id]=replacement;newSeason.rosterIds[from][oldSlot]=replacement.id;newSeason.squadIds[from].push(replacement.id);}}
    newSeason.squadIds[from]=(newSeason.squadIds[from]??[]).filter(key=>key!==id);newSeason.squadIds[to]=[...new Set([...(newSeason.squadIds[to]??newSeason.rosterIds[to]),id])];newSeason.playerData[id].teamId=to;
    const kind=career.transferOffer?.kind??'transfer';if(career.journey){if(kind==='loan')career.journey.loan={parentTeamId:from,returnYear:year+1};else if(career.journey.loan)delete career.journey.loan;
    career.journey.seekLoan=false;career.journey.clubGames=0;career.journey.trust=38;career.journey.firstStart=false;career.journey.clubs=[...career.journey.clubs,to].slice(-100);career.journey.pending='first-contract';career.journey.resolved=career.journey.resolved.filter(key=>!['first-contract','identity','partnership','setback','reunion'].includes(key));}
    const transfer={eventId:'career-transfer:'+id+':'+year,playerId:id,playerName:career.name,season:(oldSeason.history?.length??0)+1,year,from,to,fromName:teamName(oldSeason,from),toName:teamName(newSeason,to),fromLeagueId:oldSeason.leagueId,toLeagueId:newSeason.leagueId,fee:deal.fee,marketValue:deal.marketValue,annualWage:deal.annualWage,years:deal.years,reason:kind==='loan'?'loan':kind==='return'?'loan-return':'player-choice',expectedRole:career.transferOffer?.expectedRole??'轮换竞争者'};
    career.transferHistory=[...(career.transferHistory??[]),transfer].slice(-100);newSeason.playerData[id].transferHistory=[...(newSeason.playerData[id].transferHistory??[]),transfer].slice(-100);
    if(career.journey)career.journey.memories=[...career.journey.memories,{id:transfer.eventId,title:kind==='loan'?'去另一片球场寻找机会':kind==='return'?'回到原队，再争取一次':'新的更衣室',text:transfer.fromName+' → '+transfer.toName+'。'+transfer.expectedRole,kind:'milestone',chapter:'professional'}].slice(-80);
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
  if(career)mirrorCareerProfile(newSeason,career);
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
