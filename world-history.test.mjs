import assert from 'node:assert/strict';
import {worldHistory} from './world-history.mjs';
import {LEAGUES,createSeason,fixtures,seasonRounds} from './league.mjs';

const league=LEAGUES[0],teamA=league.teams[0].id,teamB=league.teams[1].id;
const history=[];
for(let year=2026;year<2028;year++){
  const season=createSeason(league.id,teamA,year),matches=[];
  for(const [home,away] of fixtures(league).flat())matches.push({home,away,score:home===teamA?[2,0]:away===teamA?[0,1]:home===teamB?[1,0]:away===teamB?[0,1]:[0,0]});
  history.push({archive:{seasonStartYear:year,number:year-2025,leagueId:league.id,results:matches,leagues:[{leagueId:league.id,players:[]},...LEAGUES.slice(1).map(item=>({leagueId:item.id,matches:[],players:[]}))]}});
  assert.equal(fixtures(league).length,seasonRounds(season));
}
const table=worldHistory(history),tracked=table.find(item=>item.leagueId===league.id);
assert.equal(table.length,LEAGUES.length);
assert.equal(tracked.seasons,2);
assert.equal(tracked.champion,teamA);
assert.equal(tracked.titleRun,2);
assert.deepEqual(tracked.rival,[teamA,teamB].sort());
assert(tracked.record.wins+tracked.record.draws+tracked.record.losses>0);
assert.equal(worldHistory([...history,history[1]]).find(item=>item.leagueId===league.id).seasons,2,'duplicate archive revisions count only once');
console.log('World history tests passed');
