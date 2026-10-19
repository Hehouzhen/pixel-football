import {getTeam} from './clubs.mjs';
import {resolveWorldPlayer} from './player-registry.mjs';
export function matchGoalEvents(match,season){return (match.matchEvents??match.events??[]).filter(e=>e.type==='goal').map(e=>{const id=e.playerId??match.playerIds?.[e.player],out=match.substitutedOut??match.substitutions?.find(p=>p.playerId===id),name=e.playerName??(out&&out.playerId===id?out.playerName:null)??(match.playerIds?.[e.player]===id?match.playerNames?.[e.player]:null)??resolveWorldPlayer(season,id)?.name??`${e.shirtNumber??match.playerNumbers?.[e.player]??match.numbers?.[e.player]??'?'}号球员`;return {minute:e.minute,teamId:match.teamIds?.[e.team],scorerId:id,scorerName:name,side:e.team,...(e.ownGoal===true?{ownGoal:true}:{})}})}
export function resultGoalEvents(result,season){
 if(result.goalEvents?.length)return result.goalEvents;
 const report=result.report;if(!report?.events)return [];
 return matchGoalEvents(report,season).map(event=>{
  const row=result.playerStats?.find(p=>p.playerId===event.scorerId),teamIds=[result.home,result.away],label=report.teams?.[event.side],named=typeof label==='string'&&label?teamIds.find(id=>[result[id===result.home?'homeName':'awayName'],season?.teamNames?.[id],getTeam(id)?.name].includes(label)):undefined,fallback=event.ownGoal===true?named:row?.teamId??named??teamIds.find(id=>result.lineups?.find(l=>l.teamId===id)?.playerIds.includes(event.scorerId))??teamIds.find(id=>season?.rosterIds?.[id]?.includes(event.scorerId)),teamId=event.teamId??fallback;
  return {minute:event.minute,teamId,scorerName:report.events.find(e=>e.type==='goal'&&e.minute===event.minute&&(e.playerId??report.playerIds?.[e.player])===event.scorerId)?.playerName??row?.playerName??event.scorerName,...(event.ownGoal===true?{ownGoal:true}:{})};
 });
}
