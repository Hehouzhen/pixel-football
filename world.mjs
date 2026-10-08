import {LEAGUES,getTeam,prepareSeason,retireAgedPlayers} from './league.mjs';
import {activePlayers,rosterRating,teamName} from './identity.mjs';
import {advanceSeasonAges} from './aging.mjs';
import {value,wage} from './transfers.mjs';

const hash=text=>{let n=2166136261;for(const char of String(text)){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const seasonNumber=season=>(season.history?.length??0)+1;
const teamWages=(season,teamId)=>activePlayers(season,teamId).reduce((sum,player)=>sum+wage(player),0);
const teamCap=teamId=>14+(getTeam(teamId)?.strength??1)*2;

export function ensureWorldMarket(season){
  const year=season.calendar?.startYear??2026+(season.history?.length??0);
  season.worldMarket??={nextYear:year+2+hash(`${season.seed??0}:first-market`)%3,lastYear:null};
  return season.worldMarket;
}

function marketDeal(season,league,year,managedTeamId,protectedPlayerId){
  const eligible=league.teams.filter(team=>team.id!==managedTeamId).sort((a,b)=>rosterRating(season,a.id)-rosterRating(season,b.id)||a.id.localeCompare(b.id));
  if(eligible.length<2)return null;
  const half=Math.floor(eligible.length/2),offset=hash(`${season.seed??0}:${year}:${league.id}:pair`)%half;
  const buyers=eligible.slice(0,half),sellers=eligible.slice(-half).reverse();
  for(let step=0;step<half;step++){
    const buyer=buyers[(offset+step)%half],seller=sellers[(offset+step)%half];
    if(!buyer||!seller||buyer.id===seller.id)continue;
    const incomingRoster=season.rosterIds[seller.id],outgoingRoster=season.rosterIds[buyer.id];
    let best=null;
    for(let position=0;position<6;position++){
      const incoming=season.playerData[incomingRoster[position]],outgoing=season.playerData[outgoingRoster[position]];
      if(!incoming||!outgoing||incoming.retired||outgoing.retired||incoming.id===protectedPlayerId||outgoing.id===protectedPlayerId)continue;
      const gain=value(incoming)-value(outgoing);
      if(gain<2)continue;
      const fee=+Math.max(1,value(incoming)*1.25-value(outgoing)*.75).toFixed(1);
      const incomingWages=teamWages(season,buyer.id)-wage(outgoing)+wage(incoming);
      const outgoingWages=teamWages(season,seller.id)-wage(incoming)+wage(outgoing);
      const buyerFunds=season.worldFunds[buyer.id]??initialFunds(buyer.id);
      if(fee>buyerFunds||incomingWages>teamCap(buyer.id)||outgoingWages>teamCap(seller.id))continue;
      const score=gain+Math.max(0,(incoming.potential??60)-(outgoing.potential??60))*.05+Math.max(0,(outgoing.age??24)-(incoming.age??24))*.04;
      if(!best||score>best.score)best={incoming,outgoing,fee,score,position};
    }
    if(!best)continue;
    const {incoming,outgoing,fee,position}=best,from=seller.id,to=buyer.id;
    const fromNumber=incoming.number,toNumber=outgoing.number;
    season.rosterIds[to][position]=incoming.id;season.rosterIds[from][position]=outgoing.id;
    incoming.teamId=to;incoming.number=toNumber;incoming.freeAgent=false;
    outgoing.teamId=from;outgoing.number=fromNumber;outgoing.freeAgent=false;
    season.worldFunds[to]=+((season.worldFunds[to]??initialFunds(to))-fee).toFixed(1);
    season.worldFunds[from]=+((season.worldFunds[from]??initialFunds(from))+fee).toFixed(1);
    const eventId=`world-transfer:${year}:${league.id}:${from}:${to}:${position}`;
    const move=(player,origin,destination,transferFee)=>({eventId:`${eventId}:${player.id}`,playerId:player.id,playerName:player.name,season:seasonNumber(season),year,from:origin,to:destination,fromName:teamName(season,origin),toName:teamName(season,destination),fromLeagueId:league.id,toLeagueId:league.id,fee:transferFee,reason:'world-market'});
    const moves=[move(incoming,from,to,fee),move(outgoing,to,from,0)];
    for(const item of moves){const player=season.playerData[item.playerId];player.transferHistory=[...(player.transferHistory??[]).filter(old=>old.eventId!==item.eventId),item].slice(-100)}
    return {eventId,leagueId:league.id,league:league.name,from,to,fromName:teamName(season,from),toName:teamName(season,to),fee,position,players:[incoming.name,outgoing.name],moves};
  }
  return null;
}

const initialFunds=teamId=>+(16+(getTeam(teamId)?.strength??1)*18).toFixed(1);

export function advancePlayerWorld(season,{managedTeamId=season.teamId,career=null}={}){
  prepareSeason(season,career);
  const year=season.calendar?.startYear??2026+(season.history?.length??0);
  if(season.worldOffseason?.year===year)return season.worldOffseason;
  season.worldFunds??=Object.fromEntries(LEAGUES.flatMap(league=>league.teams.map(team=>[team.id,initialFunds(team.id)])));
  const market=ensureWorldMarket(season),before=new Map(Object.values(season.playerData).map(player=>[player.id,{age:player.age,attributes:{...player.attributes}}]));
  advanceSeasonAges(season,career);
  retireAgedPlayers(season,year);
  const retirements=(season.retirements??[]).filter(event=>event.year===year);
  const opened=year>=market.nextYear,transfers=[];
  if(opened){
    for(const league of LEAGUES){const deal=marketDeal(season,league,year,managedTeamId,career?.id);if(deal)transfers.push(deal)}
    market.lastYear=year;market.nextYear=year+2+hash(`${season.seed??0}:${year}:next-market`) % 3;
  }
  const development={improved:0,declined:0,aged:0};
  for(const player of Object.values(season.playerData)){
    const old=before.get(player.id);if(!old||player.retired)continue;
    if(player.age>old.age)development.aged++;
    const attrs=Object.keys(player.attributes??{});
    if(attrs.some(key=>player.attributes[key]>old.attributes[key]))development.improved++;
    if(attrs.some(key=>player.attributes[key]<old.attributes[key]))development.declined++;
  }
  const summary={year,season:seasonNumber(season),marketOpened:opened,nextMarketYear:market.nextYear,retirements:structuredClone(retirements),transfers,development};
  season.worldOffseason=summary;
  return summary;
}
