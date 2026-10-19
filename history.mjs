import {LEAGUES,playerRows,getTeam} from './league.mjs';
import {archiveSettlements} from './match-ledger.mjs';
import {teamName} from './identity.mjs';
import {internationalTeam} from './national-countries.mjs';

export function archiveSeason(season){
  const seasonStartYear=season.calendar?.startYear??2026+(season.history?.length??0),existing=season.history?.find(row=>row.archive?.seasonStartYear===seasonStartYear),number=existing?.archive?.number??(season.history?.length??0)+1;
  const leagueStates={...(season.world??{}),[season.leagueId]:season};
  const leagues=Object.entries(leagueStates).map(([leagueId,state])=>({
    leagueId,league:LEAGUES.find(item=>item.id===leagueId)?.name??leagueId,
    players:playerRows(state).map(row=>({...row,name:state.playerData?.[row.id]?.name??row.name,seasonTeamId:row.teamId,age:state.playerData?.[row.id]?.age,potential:state.playerData?.[row.id]?.potential,retired:!!state.playerData?.[row.id]?.retired,retiredYear:state.playerData?.[row.id]?.retiredYear,freeAgent:!!state.playerData?.[row.id]?.freeAgent,honors:[...(state.playerData?.[row.id]?.honors??[])],awardHistory:structuredClone(state.playerData?.[row.id]?.awardHistory??[]),transferHistory:structuredClone(state.playerData?.[row.id]?.transferHistory??[]),careerStats:state.playerData?.[row.id]?.careerStats?{...state.playerData[row.id].careerStats}:undefined,bestPerformance:state.playerData?.[row.id]?.bestPerformance?{...state.playerData[row.id].bestPerformance}:undefined,attributes:state.playerData?.[row.id]?.attributes?{...state.playerData[row.id].attributes}:undefined})),...(leagueId===season.leagueId?{}:{matches:structuredClone(state.results??[])})
  }));
  const currentSeason=number,careerTransfers=Object.values(season.playerData??{}).flatMap(player=>(player.transferHistory??[]).filter(row=>row.season===currentSeason)),uniqueTransfers=[...new Map(careerTransfers.map(row=>[row.eventId,row])).values()];
  return {lifeEvents:structuredClone((season.lifeEvents??[]).filter(row=>row.year===seasonStartYear)),financeLedger:structuredClone(season.financeLedger??[]),number,revision:(existing?.archive?.revision??0)+1,seasonStartYear,teamId:season.teamId,leagueId:season.leagueId,week:season.week,leagues,matchSettlements:archiveSettlements(season),retirements:structuredClone(season.retirements??[]),freeAgents:structuredClone((season.freeAgents??[]).map(id=>{const player=season.playerData?.[id];return player?{id,name:player.name,teamId:player.teamId,age:player.age}:null}).filter(Boolean)),careerTransfers:structuredClone(uniqueTransfers),awardHistory:structuredClone(season.awardHistory??[]),cup:season.cup?{players:playerRows(season.cup).map(row=>({...row,seasonTeamId:row.teamId,age:season.playerData?.[row.id]?.age,potential:season.playerData?.[row.id]?.potential,honors:[...(season.playerData?.[row.id]?.honors??[])],awardHistory:structuredClone(season.playerData?.[row.id]?.awardHistory??[]),transferHistory:structuredClone(season.playerData?.[row.id]?.transferHistory??[])})),results:structuredClone(season.cup.results??[])}:null,results:structuredClone(season.results??[]),champion:(season.awards?.champion??null),cupChampion:season.cup?.champion??null,awards:structuredClone(season.awards??null),cupAwards:structuredClone(season.cup?.awards??null)};
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

const LEDGER_FIELDS=['appearances','goals','assists','tackles','interceptions','saves','shots','passesCompleted','keyPasses','shotsOnTarget','headers','playingSeconds'];
const emptyLedger=()=>Object.fromEntries(LEDGER_FIELDS.map(field=>[field,0]));
// MATCH-LEDGER-01: one read-only query for a player's current and archived club
// record, national record and youth record. Every match keeps the team that player
// actually represented (row.teamId), never the player's current club. Missing detail
// stays unknown instead of becoming zero.
export function playerCareerLedger(season,playerId,career=null){
  const player=season?.playerData?.[playerId],careerPlayer=career?.id===playerId?career:null;
  const nationalCareer=careerPlayer?.nationalCareer??player?.nationalCareer??null,journey=careerPlayer?.journey??player?.journey??null,dossier=playerCareerDossier(season?.history??[],playerId);
  const currentSeason=(season?.history?.length??0)+1,currentYear=season?.calendar?.startYear??2026+(season?.history?.length??0);
  const matches=[],seen=new Set(),ownGoalCounts=new Map();
  const noteOwnGoals=result=>{const id=result.matchId;if(!id)return;for(const event of result.goalEvents??[])if(event.ownGoal===true&&(event.scorerId===playerId||event.actorId===playerId))ownGoalCounts.set(id,(ownGoalCounts.get(id)??0)+1)};
  const push=match=>{
    const key=match.matchId??`${match.season??'?'}:${match.competition}:${match.teamId}:${match.opponent}:${match.date??match.week??match.round??''}`;
    if(seen.has(key))return;seen.add(key);matches.push({...match,ownGoals:match.competition==='youth'?0:ownGoalCounts.get(match.matchId)??0});
  };
  const playerLine=row=>{
    const minutes=row?.minutesPlayed??(row?.playingSeconds&&row?.duration?Math.round(row.playingSeconds/row.duration*90):row?.playingSeconds>0?Math.round(row.playingSeconds/180*90):0);
    const played=minutes>0||(row?.started!==false&&(row?.minuteOff??0)>0||(row?.playingSeconds??0)>0);
    const line={played,minutes,started:row?.started!==false,rating:row?.rating??null};
    for(const field of LEDGER_FIELDS)line[field]=row?.[field]===undefined?null:row[field];
    line.minutesPlayed=minutes;
    line.playingSeconds=typeof row?.playingSeconds==='number'?row.playingSeconds:(minutes>0?Math.round(minutes/90*180):0);
    line.goals=row?.goals??0;line.assists=row?.assists??0;line.reds=row?.reds??0;
    return line;
  };
  const matchFromResult=(result,{seasonNumber,year,competition,leagueId=null,league=null})=>{
    const row=result.playerStats?.find(item=>item.playerId===playerId);if(!row||!Array.isArray(result.score))return null;
    noteOwnGoals(result);
    const home=result.home===row.teamId,opponentId=home?result.away:result.home,playerScore=home?[...result.score]:[result.score[1],result.score[0]];
    const line=playerLine({...row,playingSeconds:row.playingSeconds??(result.duration?Math.round((row.minutesPlayed??0)/90*result.duration):0)});
    return {matchId:result.matchId??null,season:seasonNumber,year,competition,leagueId,league,phase:result.phase??null,round:result.round??null,week:result.week??null,date:result.date??null,source:result.source??null,home:result.home,away:result.away,homeName:result.homeName??teamName(season,result.home)??getTeam(result.home)?.name??result.home,awayName:result.awayName??teamName(season,result.away)??getTeam(result.away)?.name??result.away,score:[...result.score],playerScore,teamId:row.teamId,teamName:teamName(season,row.teamId)??row.teamName??row.teamId,opponentId,opponent:teamName(season,opponentId)??result[home?'awayName':'homeName'],...line,detail:true,hasReport:!!result.report,report:result.report??null,penalties:Array.isArray(result.penalties)?[...result.penalties]:null};
  };
  // Archived seasons (also the source for players no longer in the current squad).
  for(const entry of season?.history??[]){const archive=entry.archive;if(!archive)continue;
    for(const group of archive.leagues??[])for(const result of group.matches??(group.leagueId===archive.leagueId?archive.results??[]:[])){const match=matchFromResult(result,{seasonNumber:archive.number??null,year:archive.seasonStartYear??null,competition:'league',leagueId:group.leagueId,league:group.league});if(match)push(match)}
    if(archive.cup)for(const result of archive.cup.results??[]){const match=matchFromResult(result,{seasonNumber:archive.number??null,year:archive.seasonStartYear??null,competition:'cup',league:'欧洲冠军杯'});if(match)push(match)};
  }
  // Current season club records: own league plus every world league, then the cup.
  const currentStates=[[season,'league',season?.leagueId],...Object.entries(season?.world??{}).map(([id])=>[season.world[id],'league',id])];
  for(const [state,competition,leagueId] of currentStates)for(const result of state?.results??[]){const match=matchFromResult(result,{seasonNumber:currentSeason,year:currentYear,competition,leagueId,league:LEAGUES.find(item=>item.id===leagueId)?.name??leagueId});if(match)push(match)}
  for(const result of season?.cup?.results??[]){const match=matchFromResult(result,{seasonNumber:currentSeason,year:currentYear,competition:'cup',league:'欧洲冠军杯'});if(match)push(match)}
  // National record: own goals never enter club totals; shootouts stay separate.
  const nationId=careerPlayer?.international?.nationId??player?.international?.nationId??null,nationName=nationId?internationalTeam(nationId)?.name??'国家队':null;
  for(const row of nationalCareer?.history??[]){
    const year=Number.isInteger(row.year)?row.year:currentYear;
    push({matchId:`national:${row.id}`,season:null,year,competition:'national',national:true,leagueId:null,league:row.competition??'国家队',phase:row.stage??null,date:row.date??null,teamId:nationId,teamName:nationName,opponent:row.opponent??'对手',playerScore:Array.isArray(row.score)?[...row.score]:null,score:null,started:row.started!==false,minutes:row.minutes??0,goals:row.goals??0,assists:row.assists??0,rating:row.rating??null,reds:0,detail:true,hasReport:!!row.report,report:row.report??null,penalties:Array.isArray(row.penalties)?[...row.penalties]:null,windowId:row.windowId??null});
  }
  // Youth record: friendly/assessment matches, never professional totals.
  for(const [index,row] of (journey?.youthResults??[]).entries())push({matchId:`youth:${playerId}:${index}`,season:null,year:null,competition:'youth',youth:true,leagueId:null,league:'青训',teamId:journey.homeTeamId??null,teamName:teamName(season,journey.homeTeamId??season?.teamId),opponent:row.opponent,playerScore:Array.isArray(row.score)?[...row.score]:null,started:true,minutes:null,goals:row.goals??0,assists:row.assists??0,rating:row.rating??null,reds:0,detail:true,hasReport:!!row.report,report:row.report??null});
  const sortKey=match=>`${String(match.year??0).padStart(4,'0')}:${String(match.date??'').padStart(10,'0')}:${String(match.week??0).padStart(3,'0')}:${match.matchId??''}`;
  matches.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
  const sum=(rows,fields=LEDGER_FIELDS)=>rows.reduce((total,row)=>{for(const field of fields){if(field==='appearances')total.appearances+=(row.detail!==false&&row.played!==false?1:0);else if(typeof row[field]==='number')total[field]=(total[field]??0)+row[field]}return total},{...emptyLedger()});
  const clubMatches=matches.filter(match=>!match.national&&!match.youth),nationalMatches=matches.filter(match=>match.national),youthMatches=matches.filter(match=>match.youth);
  const totals=sum(clubMatches),nationalTotals=sum(nationalMatches),youthTotals=sum(youthMatches);
  const careerTotals=player?.careerStats??dossier.latest?.careerStats??null;
  const baseline=careerTotals?Object.fromEntries(LEDGER_FIELDS.map(field=>[field,Math.max(0,(careerTotals[field]??0)-(totals[field]??0))])):null;
  const incomplete=baseline?LEDGER_FIELDS.filter(field=>(baseline[field]??0)>0):LEDGER_FIELDS.slice();
  // Season -> club segments (a mid-season transfer keeps both teams) plus national/youth.
  const seasonMap=new Map();
  const seasonFor=match=>{
    const key=`${match.year??'unknown'}:${match.season??'national'}`;
    if(!seasonMap.has(key))seasonMap.set(key,{season:match.season??null,year:match.year??null,label:match.season?`${match.year??''}/${String((match.year??0)+1).slice(-2)}`:match.year?String(match.year):'青训与国家队',club:[],national:[],youth:[],totals:emptyLedger(),nationalTotals:emptyLedger(),youthTotals:emptyLedger()});
    return seasonMap.get(key);
  };
  const segment=(bucket,match,teamId,label)=>{let row=bucket.find(item=>item.teamId===teamId);if(!row){row={teamId,team:label,matches:[],totals:emptyLedger(),firstDate:match.date??null,lastDate:match.date??null};bucket.push(row)}row.matches.push(match);row.lastDate=match.date??row.lastDate;row.totals=sum(row.matches);return row};
  for(const match of matches){
    const group=seasonFor(match);
    if(match.national)segment(group.national,match,match.teamId??nationId,match.teamName??nationName??'国家队');
    else if(match.youth)segment(group.youth,match,match.teamId??'youth','青训');
    else segment(group.club,match,match.teamId,match.teamName);
  }
  for(const group of seasonMap.values()){group.club.sort((a,b)=>String(a.firstDate??'').localeCompare(String(b.firstDate??''))||a.team.localeCompare(b.team));group.totals=sum(group.club.flatMap(row=>row.matches));group.nationalTotals=sum(group.national.flatMap(row=>row.matches));group.youthTotals=sum(group.youth.flatMap(row=>row.matches))}
  const seasons=[...seasonMap.values()].sort((a,b)=>String(b.year??0).localeCompare(String(a.year??0))||String(b.season??0).localeCompare(String(a.season??0)));
  const transferMap=new Map();
  for(const transfer of [...(dossier.transfers??[]),...(careerPlayer?.transferHistory??[]),...(player?.transferHistory??[]),...(season?.playerData?.[playerId]?.transferHistory??[])])transferMap.set(transfer.eventId??`${transfer.year}:${transfer.from}:${transfer.to}`,transfer);
  const transfers=[...transferMap.values()].sort((a,b)=>(a.year??0)-(b.year??0));
  return {id:playerId,name:careerPlayer?.name??player?.name??dossier.name??playerId,teamId:player?.teamId??careerPlayer?.teamId??dossier.teamId??null,team:player?.teamId?teamName(season,player.teamId):careerPlayer?.teamId?teamName(season,careerPlayer.teamId):dossier.team??null,retired:!!player?.retired||!!dossier.retirement,retirement:dossier.retirement??null,currentSeason,currentYear,totals,careerTotals,baseline,incomplete,nationalTotals,youthTotals,matches,seasons,transfers,nationalTeamId:nationId,nationalTeam:nationName};
}

function contributionScore(player){  const i=player.index??5,g=player.goals??0,a=player.assists??0,t=player.tackles??0,x=player.interceptions??0,s=player.saves??0;
  if(i===0)return +(s*.45+(player.appearances??0)*.2+g*5+a*2).toFixed(1);
  if(i<=2)return +(g*4+a*3+t*.45+x*.5+(player.blocks??0)*.6).toFixed(1);
  if(i<=4)return +(g*4+a*3.5+t*.35+x*.4+(player.keyPasses??0)*.5).toFixed(1);
  return +(g*5+a*3+(player.shotsOnTarget??0)*.5+(player.headers??0)*.15).toFixed(1);
}
