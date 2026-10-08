import assert from 'node:assert/strict';
import {aggregateTeamRows,combinePlayerRows,playerStatValue,queryPlayers,queryTeamRows} from './stats.mjs';
import {allTimePlayerLeaders,playerCareerDossier} from './history.mjs';

const league={players:{a:{appearances:2,goals:3,assists:1,shots:5,shotsOnTarget:4,passes:8,passesCompleted:6,tackles:2,interceptions:1,saves:0}},playerData:{a:{id:'a',name:'Ari',teamId:'club-a',position:5}},rosterIds:{'club-a':['a']}};
const cup={players:{a:{appearances:1,goals:1,assists:2,shots:2,shotsOnTarget:1,passes:4,passesCompleted:3,tackles:1,interceptions:0,saves:0},b:{appearances:1,goals:0,assists:0,shots:1,shotsOnTarget:0,passes:3,passesCompleted:1,tackles:4,interceptions:2,saves:1}},playerData:{a:{id:'a',name:'Ari',teamId:'club-a',position:5},b:{id:'b',name:'Bea',teamId:'club-b',position:1}},rosterIds:{'club-a':['a'],'club-b':['b']}};
const rows=combinePlayerRows(league,cup);
assert.equal(rows.length,2);
assert.deepEqual([rows[0].appearances,rows[0].goals,rows[0].assists],[3,4,3]);
assert.equal(playerStatValue(rows[0],'goals','perAppearance'),4/3);
assert.equal(playerStatValue(rows[0],'passAccuracy'),9/12);
assert.equal(playerStatValue({passes:0,passesCompleted:0},'passAccuracy'),null);
assert.equal(playerStatValue({passes:4},'passAccuracy'),null);
assert.equal(playerStatValue({appearances:0,goals:0},'goals','perAppearance'),null);
assert.equal(queryPlayers(rows,{teamId:'club-a',position:'forward',minAppearances:2,search:'ar',metric:'goals'})[0].id,'a');
assert.equal(queryPlayers(rows,{position:'defender'}).length,1);
assert.equal(queryPlayers(rows,{search:'no match'}).length,0);
assert.deepEqual(queryPlayers(rows,{metric:'shotConversion',minAttempts:2}).map(row=>row.id),['a']);
assert.deepEqual(queryPlayers(rows,{metric:'goals'}).map(row=>row.id),['a','b']);
assert.deepEqual(queryPlayers([{id:'missing',name:'Missing',team:'X',appearances:1},{id:'known',name:'Known',team:'X',appearances:1,goals:0}],{metric:'goals',direction:'asc'}).map(row=>row.id),['known','missing']);
const clubs=aggregateTeamRows({results:[{home:'club-a',away:'club-b',score:[2,1],stats:{shots:[5,3],passes:[12,9],passesCompleted:[8,6]}}]},{results:[{home:'club-a',away:'club-c',score:[0,0],stats:{shots:[2,4],passes:[10,11],passesCompleted:[7,8]}}]}).map(row=>({...row,name:row.teamId}));
const clubA=clubs.find(row=>row.teamId==='club-a');
assert.deepEqual([clubA.matches,clubA.wins,clubA.draws,clubA.goalsFor,clubA.shots],[2,1,1,2,7]);
assert.equal(queryTeamRows(clubs,{minMatches:2,metric:'goalsFor'})[0].teamId,'club-a');
const past=[{archive:{leagues:[{leagueId:'epl',players:[{id:'p:club-a:5',name:'Ari',teamId:'club-a',index:5,appearances:10,goals:8,assists:2},{id:'keeper',name:'Keeper',teamId:'club-a',index:0,appearances:10,saves:20}]}],cup:{players:[{id:'p:club-a:5',name:'Ari',teamId:'club-a',index:5,goals:2,assists:1},{id:'cup-only',name:'Bea',teamId:'club-b',index:5,goals:1}]}}},{summary:'legacy entry without detailed data'}];
assert.deepEqual(allTimePlayerLeaders(past).map(row=>[row.id,row.goals,row.assists,row.appearances]),[['p:club-a:5',10,3,10],['cup-only',1,0,0],['keeper',0,0,10]]);
assert.equal(allTimePlayerLeaders(past,'epl','goals')[0].goals,8);
assert.equal(allTimePlayerLeaders(past,'all','contribution').find(row=>row.id==='keeper').contribution,11);
const award={id:'p',award:'年度金球奖 · 第 2 名',competition:'europe',season:1,year:2026};
const dossier=playerCareerDossier([
  {archive:{number:1,seasonStartYear:2026,leagues:[{leagueId:'eng',league:'英超',players:[{id:'p',name:'Ari',team:'Arsenal',teamId:'arsenal',seasonTeamId:'arsenal',age:20,appearances:10,goals:4,assists:2,tackles:3,awardHistory:[award],bestPerformance:{impact:12,competition:'league',round:4,score:[3,1],goals:2}}]}],cup:{players:[{id:'p',name:'Ari',team:'Arsenal',teamId:'arsenal',seasonTeamId:'arsenal',age:20,appearances:2,goals:1,assists:1,tackles:1,awardHistory:[award]}]}}},
  {archive:{number:2,seasonStartYear:2027,leagues:[{leagueId:'eng',league:'英超',players:[{id:'p',name:'Ari',team:'Chelsea',teamId:'chelsea',seasonTeamId:'chelsea',age:21,appearances:8,goals:3,assists:4,tackles:2,retired:true,retiredYear:2028,awardHistory:[award]}]}],retirements:[{id:'p',year:2028,age:22,teamId:'chelsea'}]}}
],'p');
assert.deepEqual([dossier.totals.appearances,dossier.totals.goals,dossier.totals.assists],[20,8,7]);
assert.equal(dossier.seasons.length,2);
assert.deepEqual(dossier.seasons[0].competitions,['英超','欧洲冠军杯']);
assert.deepEqual([dossier.seasons[0].stats.appearances,dossier.seasons[0].stats.goals],[12,5]);
assert.equal(dossier.seasons[1].team,'Chelsea');
assert.equal(dossier.awards.length,1,'career honors repeated in snapshots should appear once');
assert.equal(dossier.retirement.year,2028);
assert.equal(dossier.bestPerformance.goals,2);
const knockout=aggregateTeamRows({results:[{home:'club-a',away:'club-b',score:[1,1],winner:'club-b'}]});
assert.deepEqual([knockout.find(row=>row.teamId==='club-a').draws,knockout.find(row=>row.teamId==='club-b').wins],[0,1]);
console.log('PASS: cross-competition player aggregation, per-appearance rates and layered player queries.');
