import {LEAGUES} from './league.mjs';

export function worldHistory(history=[]){
  const seasons=new Map();
  for(const [index,entry] of history.entries()){
    const archive=entry?.archive;if(!archive)continue;
    const key=archive.seasonStartYear??archive.number??index;if(seasons.has(key))continue;
    seasons.set(key,archive);
  }
  const archives=[...seasons.values()].sort((a,b)=>(a.seasonStartYear??0)-(b.seasonStartYear??0));
  return LEAGUES.map(league=>{
    const years=[];
    for(const archive of archives){
      const saved=archive.leagues?.find(item=>item.leagueId===league.id);if(!saved)continue;
      const matches=saved.matches??(archive.leagueId===league.id?archive.results:[]),table=new Map(league.teams.map(team=>[team.id,{teamId:team.id,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0,points:0}]));
      for(const match of matches??[]){
        if(!Array.isArray(match.score)||!table.has(match.home)||!table.has(match.away))continue;
        const [homeGoals,awayGoals]=match.score,home=table.get(match.home),away=table.get(match.away);
        home.played++;away.played++;home.goalsFor+=homeGoals;home.goalsAgainst+=awayGoals;away.goalsFor+=awayGoals;away.goalsAgainst+=homeGoals;
        if(homeGoals>awayGoals){home.wins++;home.points+=3;away.losses++}else if(homeGoals<awayGoals){away.wins++;away.points+=3;home.losses++}else{home.draws++;away.draws++;home.points++;away.points++}
      }
      const ranked=[...table.values()].filter(row=>row.played>0).sort((a,b)=>b.points-a.points||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor||a.teamId.localeCompare(b.teamId));
      if(ranked.length)years.push({year:archive.seasonStartYear??2026+(archive.number??0)-1,champion:ranked[0].teamId,runnerUp:ranked[1]?.teamId??null,played:ranked.reduce((sum,row)=>sum+row.played,0)});
    }
    const champion=years.at(-1)?.champion??null;let titleRun=0;
    for(let i=years.length-1;i>=0&&years[i].champion===champion;i--)titleRun++;
    const pairCounts=new Map();
    for(const year of years){if(!year.runnerUp)continue;const pair=[year.champion,year.runnerUp].sort().join('|');pairCounts.set(pair,(pairCounts.get(pair)??0)+1)}
    const rival=[...pairCounts].filter(([,count])=>count>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]?.split('|')??null;
    let record=null;
    if(rival){record={wins:0,draws:0,losses:0};for(const archive of archives){const saved=archive.leagues?.find(item=>item.leagueId===league.id),matches=saved?.matches??(archive.leagueId===league.id?archive.results:[]);for(const match of matches??[]){if(!rival.includes(match.home)||!rival.includes(match.away)||!Array.isArray(match.score))continue;const side=match.home===rival[0]?0:1,forGoals=match.score[side],against=match.score[1-side];if(forGoals>against)record.wins++;else if(forGoals<against)record.losses++;else record.draws++}}}
    return {leagueId:league.id,league:league.name,seasons:years.length,champion,titleRun,rival,record,latest:years.slice(-3).reverse()};
  });
}
