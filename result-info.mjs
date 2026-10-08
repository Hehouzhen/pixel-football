export function resultGoalEvents(result,season){
  if(result.goalEvents?.length)return result.goalEvents;
  const report=result.report;if(!report?.events)return [];
  return report.events.filter(event=>event.type==='goal').map(event=>{
    const index=event.player,playerId=report.playerIds?.[index],teamId=season.playerData?.[playerId]?.teamId??[result.home,result.away][event.team]??result.home,stableId=playerId??season.rosterIds?.[teamId]?.[index%6];
    return {minute:event.minute,teamId,scorerName:season.playerData?.[stableId]?.name??`${report.numbers?.[index]??'?'}号球员`};
  });
}
