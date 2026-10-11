import {LEAGUES,playerRows,getTeam} from './league.mjs';

export function archiveSeason(season){
  const seasonStartYear=season.calendar?.startYear??2026+(season.history?.length??0),existing=season.history?.find(row=>row.archive?.seasonStartYear===seasonStartYear),number=existing?.archive?.number??(season.history?.length??0)+1;
  const leagueStates={...(season.world??{}),[season.leagueId]:season};
  const leagues=Object.entries(leagueStates).map(([leagueId,state])=>({
    leagueId,league:LEAGUES.find(item=>item.id===leagueId)?.name??leagueId,
    players:playerRows(state).map(row=>({...row,name:state.playerData?.[row.id]?.name??row.name,seasonTeamId:row.teamId,age:state.playerData?.[row.id]?.age,potential:state.playerData?.[row.id]?.potential,retired:!!state.playerData?.[row.id]?.retired,retiredYear:state.playerData?.[row.id]?.retiredYear,freeAgent:!!state.playerData?.[row.id]?.freeAgent,honors:[...(state.playerData?.[row.id]?.honors??[])],awardHistory:structuredClone(state.playerData?.[row.id]?.awardHistory??[]),transferHistory:structuredClone(state.playerData?.[row.id]?.transferHistory??[]),careerStats:state.playerData?.[row.id]?.careerStats?{...state.playerData[row.id].careerStats}:undefined,bestPerformance:state.playerData?.[row.id]?.bestPerformance?{...state.playerData[row.id].bestPerformance}:undefined,attributes:state.playerData?.[row.id]?.attributes?{...state.playerData[row.id].attributes}:undefined})),...(leagueId===season.leagueId?{}:{matches:structuredClone(state.results??[])})
  }));
  const currentSeason=number,careerTransfers=Object.values(season.playerData??{}).flatMap(player=>(player.transferHistory??[]).filter(row=>row.season===currentSeason)),uniqueTransfers=[...new Map(careerTransfers.map(row=>[row.eventId,row])).values()];
  return {lifeEvents:structuredClone((season.lifeEvents??[]).filter(row=>row.year===seasonStartYear)),financeLedger:structuredClone(season.financeLedger??[]),number,revision:(existing?.archive?.revision??0)+1,seasonStartYear,teamId:season.teamId,leagueId:season.leagueId,week:season.week,leagues,retirements:structuredClone(season.retirements??[]),freeAgents:structuredClone((season.freeAgents??[]).map(id=>{const player=season.playerData?.[id];return player?{id,name:player.name,teamId:player.teamId,age:player.age}:null}).filter(Boolean)),careerTransfers:structuredClone(uniqueTransfers),awardHistory:structuredClone(season.awardHistory??[]),cup:season.cup?{players:playerRows(season.cup).map(row=>({...row,seasonTeamId:row.teamId,age:season.playerData?.[row.id]?.age,potential:season.playerData?.[row.id]?.potential,honors:[...(season.playerData?.[row.id]?.honors??[])],awardHistory:structuredClone(season.playerData?.[row.id]?.awardHistory??[]),transferHistory:structuredClone(season.playerData?.[row.id]?.transferHistory??[])})),results:structuredClone(season.cup.results??[])}:null,results:structuredClone(season.results??[]),champion:(season.awards?.champion??null),cupChampion:season.cup?.champion??null,awards:structuredClone(season.awards??null),cupAwards:structuredClone(season.cup?.awards??null)};
}

export function upsertSeasonHistory(history,row){
  const year=row.archive?.seasonStartYear??row.seasonStartYear,number=row.archive?.number;
  const index=(history??[]).findIndex(entry=>{
    const savedYear=entry.archive?.seasonStartYear??entry.seasonStartYear;
    return year!=null?savedYear===year||savedYear==null&&number!=null&&entry.archive?.number===number:number!=null&&entry.archive?.number===number;
  });
  if(index<0)return [...(history??[]),row];
  return history.map((entry,i)=>i===index?row:entry);
}

export function attachOffseason(archive,summary){
  if(!archive||!summary)return archive;
  archive.offseason=structuredClone(summary);
  archive.retirements=[...new Map([...(archive.retirements??[]),...(summary.retirements??[])].map(item=>[item.id,item])).values()];
  archive.worldTransfers=structuredClone(summary.transfers??[]);
  const moves=(summary.transfers??[]).flatMap(event=>event.moves??[]),known=new Set((archive.careerTransfers??[]).map(item=>item.eventId));
  archive.careerTransfers=[...(archive.careerTransfers??[]),...moves.filter(item=>!known.has(item.eventId))];
  const retired=new Map((summary.retirements??[]).map(item=>[item.id,item]));
  for(const league of archive.leagues??[])for(const player of league.players??[]){
    const event=retired.get(player.id);
    if(event){player.retired=true;player.retiredYear=event.year;player.retirementSeason=event.season??archive.number}
  }
  archive.revision=(archive.revision??0)+1;
  return archive;
}

export function allTimePlayerLeaders(history,leagueId='all',metric='goals'){
  const totals=new Map(),seenArchives=new Set();
  for(const [entryIndex,season] of (history??[]).entries()){
    const archive=season.archive;
    if(!archive)continue;
    const archiveKey=archive.seasonStartYear??archive.number??`entry:${entryIndex}`;
    if(seenArchives.has(archiveKey))continue;
    seenArchives.add(archiveKey);
    const seenPlayers=new Set();
    const leagues=leagueId==='all'?archive.leagues??[]:(archive.leagues??[]).filter(item=>item.leagueId===leagueId);
    for(const group of leagues)for(const row of group.players??[]){
      const current=totals.get(row.id)??{id:row.id,name:row.name,team:row.team,teamId:row.seasonTeamId??row.teamId,index:row.index,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0};
      current.name=row.name;current.team=row.team;current.teamId=row.seasonTeamId??row.teamId;current.index=row.index;current.age=row.age??current.age;current.potential=row.potential??current.potential;current.retired=!!row.retired||current.retired;current.freeAgent=!!row.freeAgent;current.retirementYear=row.retiredYear??current.retirementYear;if(!seenPlayers.has(row.id)){current.seasons++;seenPlayers.add(row.id)}current.awards??=[];current.transfers??=[];for(const award of row.awardHistory??[])if(!current.awards.some(item=>item.season===award.season&&item.competition===award.competition&&item.award===award.award))current.awards.push(award);for(const transfer of row.transferHistory??[])if(!current.transfers.some(item=>item.eventId===transfer.eventId))current.transfers.push(transfer);
      for(const field of ['appearances','goals','assists','tackles','interceptions','saves','shots','passesCompleted','blocks','keyPasses','shotsOnTarget','headers'])current[field]=(current[field]??0)+(row[field]??0);
      totals.set(row.id,current);
    }
    for(const retired of [...(archive.retirements??[]),...(season.retirements??[])]){const current=totals.get(retired.id)??{id:retired.id,name:retired.name,team:retired.teamId,teamId:retired.teamId,index:null,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0,awards:[]};current.retired=true;current.retirementYear=retired.year;current.age=retired.age;totals.set(retired.id,current)}
    for(const transfer of archive.careerTransfers??[]){const current=totals.get(transfer.playerId)??{id:transfer.playerId,name:transfer.playerName,team:transfer.toName,teamId:transfer.to,index:null,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0,awards:[],transfers:[]};current.name=transfer.playerName??current.name;current.team=transfer.toName??current.team;current.teamId=transfer.to??current.teamId;current.freeAgent=false;current.transfers??=[];if(!current.transfers.some(item=>item.eventId===transfer.eventId))current.transfers.push(transfer);totals.set(transfer.playerId,current)}
    for(const freeAgent of archive.freeAgents??[]){const current=totals.get(freeAgent.id)??{id:freeAgent.id,name:freeAgent.name,team:freeAgent.teamId,teamId:freeAgent.teamId,index:null,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0,awards:[],transfers:[]};current.freeAgent=true;current.name=freeAgent.name??current.name;current.age=freeAgent.age??current.age;totals.set(freeAgent.id,current)}
    if(leagueId==='all'&&archive.cup)for(const row of archive.cup.players??[]){
      const current=totals.get(row.id)??{id:row.id,name:row.name,team:row.team,teamId:row.seasonTeamId??row.teamId,index:row.index,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0};
      current.name=row.name;current.team=row.team;current.teamId=row.seasonTeamId??row.teamId;current.index=row.index;current.age=row.age??current.age;current.potential=row.potential??current.potential;current.retired=!!row.retired||current.retired;current.freeAgent=!!row.freeAgent;current.retirementYear=row.retiredYear??current.retirementYear;if(!seenPlayers.has(row.id)){current.seasons++;seenPlayers.add(row.id)}current.awards??=[];current.transfers??=[];for(const award of row.awardHistory??[])if(!current.awards.some(item=>item.season===award.season&&item.competition===award.competition&&item.award===award.award))current.awards.push(award);for(const transfer of row.transferHistory??[])if(!current.transfers.some(item=>item.eventId===transfer.eventId))current.transfers.push(transfer);
      for(const field of ['appearances','goals','assists','tackles','interceptions','saves','shots','passesCompleted','blocks','keyPasses','shotsOnTarget','headers'])current[field]=(current[field]??0)+(row[field]??0);
      totals.set(row.id,current);
    }
    for(const award of archive.awardHistory??[]){const current=totals.get(award.id)??{id:award.id,name:award.id,team:null,teamId:null,index:null,appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0,seasons:0,awards:[],transfers:[]};current.awards??=[];if(!current.awards.some(item=>item.season===award.season&&item.competition===award.competition&&item.award===award.award))current.awards.push(award);totals.set(award.id,current)}
  }
  if(metric==='contribution')for(const row of totals.values())row.contribution=contributionScore(row);
  return [...totals.values()].sort((a,b)=>(b[metric]??0)-(a[metric]??0)||a.name.localeCompare(b.name));
}

export function playerCareerDossier(history,id){
  const totals={appearances:0,goals:0,assists:0,tackles:0,interceptions:0,saves:0,shots:0,passesCompleted:0,blocks:0,keyPasses:0,shotsOnTarget:0,headers:0};
  const seasons=[],awards=new Map(),transfers=new Map(),seenArchives=new Set(),matches=[];let latest=null,bestPerformance=null,retirement=null;
  for(const [entryIndex,entry] of (history??[]).entries()){
    const archive=entry.archive;if(!archive)continue;
    const archiveKey=archive.seasonStartYear??archive.number??`entry:${entryIndex}`;
    if(seenArchives.has(archiveKey))continue;
    seenArchives.add(archiveKey);
    for(const transfer of archive.careerTransfers??[])if(transfer.playerId===id)transfers.set(transfer.eventId,transfer);
    const leagueRows=(archive.leagues??[]).flatMap(group=>(group.players??[]).filter(row=>row.id===id).map(row=>({...row,competition:group.league,leagueId:group.leagueId})));
    const cupRows=(archive.cup?.players??[]).filter(row=>row.id===id).map(row=>({...row,competition:'欧洲冠军杯',leagueId:null}));
    const rows=[...leagueRows,...cupRows];
    const matchGroups=[...(archive.leagues??[]).map(group=>({competition:'league',leagueId:group.leagueId,league:group.league,results:group.matches??(group.leagueId===archive.leagueId?archive.results:[])})),...(archive.cup?[{competition:'cup',leagueId:null,league:'欧洲冠军杯',results:archive.cup.results??[]}]:[])];
    for(const group of matchGroups)for(const result of group.results??[]){
      const playerStats=result.playerStats?.find(row=>row.playerId===id);
      if(!playerStats||!Array.isArray(result.score))continue;
      matches.push({matchId:result.matchId??`${archive.seasonStartYear??archive.number}:${group.competition}:${result.phase??result.week??result.round??0}:${result.home}:${result.away}`,season:archive.number??seasons.length+1,year:archive.seasonStartYear??2026+seasons.length,competition:group.competition,league:group.league,leagueId:group.leagueId,phase:result.phase??null,round:result.round??null,week:result.week??null,source:result.source??null,home:result.home,away:result.away,homeName:result.homeName??getTeam(result.home)?.name??result.home,awayName:result.awayName??getTeam(result.away)?.name??result.away,score:[...result.score],playerTeamId:playerStats.teamId,playerStats});
    }
    for(const row of rows){
      for(const transfer of row.transferHistory??[])transfers.set(transfer.eventId,transfer);
      latest={...latest,...row};
      const seasonRow=seasons.at(-1)?.number===archive.number?seasons.at(-1):{number:archive.number??seasons.length+1,year:archive.seasonStartYear??2026+seasons.length,teamId:row.seasonTeamId??row.teamId,team:row.team,league:row.competition,age:row.age,competitions:[],stats:Object.fromEntries(Object.keys(totals).map(field=>[field,0]))};
      if(!seasons.includes(seasonRow))seasons.push(seasonRow);
      if(!seasonRow.competitions.includes(row.competition))seasonRow.competitions.push(row.competition);
      if(row.competition!=='欧洲冠军杯'){
        seasonRow.teamId=row.seasonTeamId??row.teamId;seasonRow.team=row.team;seasonRow.league=row.competition;seasonRow.age=row.age??seasonRow.age;
      }
      for(const field of Object.keys(totals)){const value=row[field]??0;totals[field]+=value;seasonRow.stats[field]+=value}
      for(const award of row.awardHistory??[])awards.set(`${award.season}:${award.competition}:${award.award}`,award);
      if(row.bestPerformance&&(!bestPerformance||row.bestPerformance.impact>bestPerformance.impact))bestPerformance=row.bestPerformance;
    }
    for(const award of (archive.awardHistory??[]).filter(item=>item.id===id))awards.set(`${award.season}:${award.competition}:${award.award}`,award);
    for(const retired of [...(archive.retirements??[]),...(entry.retirements??[])])if(retired.id===id)retirement=retired;
  }
  const matchOrder=match=>match.competition!=='cup'?match.week??0:match.phase==='league'?match.round??0:match.phase==='quarterfinal'?10+(match.round??0):match.phase==='semi'?20+(match.round??0):30;
  matches.sort((a,b)=>b.year-a.year||b.season-a.season||(b.competition==='cup')-(a.competition==='cup')||matchOrder(b)-matchOrder(a));
  return {id,...latest,totals,seasons,matches,awards:[...awards.values()].sort((a,b)=>(a.year??0)-(b.year??0)||(a.season??0)-(b.season??0)),transfers:[...transfers.values()].sort((a,b)=>a.year-b.year),bestPerformance:latest?.bestPerformance??bestPerformance,retirement};
}

function contributionScore(player){
  const i=player.index??5,g=player.goals??0,a=player.assists??0,t=player.tackles??0,x=player.interceptions??0,s=player.saves??0;
  if(i===0)return +(s*.45+(player.appearances??0)*.2+g*5+a*2).toFixed(1);
  if(i<=2)return +(g*4+a*3+t*.45+x*.5+(player.blocks??0)*.6).toFixed(1);
  if(i<=4)return +(g*4+a*3.5+t*.35+x*.4+(player.keyPasses??0)*.5).toFixed(1);
  return +(g*5+a*3+(player.shotsOnTarget??0)*.5+(player.headers??0)*.15).toFixed(1);
}
