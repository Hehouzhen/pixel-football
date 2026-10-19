import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classicFixture} from './test-fixtures/identity-worlds.mjs';
import {playerCareerLedger} from './history.mjs';
import {archiveSeason} from './history.mjs';

const row=(id,teamId,over={})=>({playerId:id,teamId,playerName:'测试球员',shirtNumber:27,started:true,minuteOn:0,minuteOff:90,minutesPlayed:90,playingSeconds:180,goals:0,assists:0,reds:0,...over});
const result=(matchId,home,away,score,rows,extra={})=>({matchId,home,away,score,playerStats:rows,source:'played',...extra});

test('ledger separates club, national and youth records and keeps the team at the time',()=>{
 const {season,player}=classicFixture(),id=player.id;
 season.results.push(result('ledger:1','arsenal','chelsea',[1,0],[row(id,'arsenal',{goals:1})],{week:0}));
 season.results.push(result('ledger:2','chelsea','arsenal',[2,2],[row(id,'arsenal',{goals:0,assists:1})],{week:1}));
 season.playerData[id].teamId='chelsea';
 season.results.push(result('ledger:3','chelsea','liverpool',[0,1],[row(id,'chelsea',{started:false,minutesPlayed:0,playingSeconds:0})],{week:2}));
 player.nationalCareer={version:1,seasons:[],history:[{id:'national:1',year:2026,competition:'世界杯预选赛',windowId:'2026:0',date:'2026-09-01',opponent:'巴西',score:[2,1],goals:1,assists:0,minutes:90,rating:8,started:true}],honors:[],caps:1,starts:1,goals:1,assists:0,minutes:90,ratingTotal:8};
 player.journey={...player.journey,youthResults:[{title:'青训首战',opponent:'U18 对手',score:[3,2],rating:7.2,goals:2,assists:0,passesCompleted:5,tackles:1}],homeTeamId:'arsenal'};
 const ledger=playerCareerLedger(season,id,player);
 assert.equal(ledger.id,id);
 assert.equal(ledger.matches.filter(match=>match.competition==='national').length,1);
 assert.equal(ledger.matches.filter(match=>match.competition==='youth').length,1);
 assert.equal(ledger.nationalTotals.goals,1);
 assert.equal(ledger.youthTotals.goals,2);
 assert.equal(ledger.totals.goals,1,'national and youth goals never enter club totals');
 assert.equal(ledger.totals.appearances,2,'an unused substitute is not an appearance');
 assert.equal(ledger.matches.find(match=>match.matchId==='ledger:3').played,false);
 const segments=ledger.seasons[0].club;
 assert.deepEqual(segments.map(item=>item.teamId),['arsenal','chelsea']);
 assert.equal(ledger.matches.find(match=>match.matchId==='ledger:1').teamId,'arsenal');
 assert.equal(ledger.matches.find(match=>match.matchId==='ledger:3').teamId,'chelsea');
});

test('an own goal stays outside the scorer normal goals and is marked separately',()=>{
 const {season,player}=classicFixture(),id=player.id;
 season.results.push(result('ledger:own','arsenal','chelsea',[0,1],[row(id,'arsenal',{goals:0})],{week:0,goalEvents:[{minute:30,teamId:'chelsea',scorerId:id,ownGoal:true}]}));
 const ledger=playerCareerLedger(season,id,player);
 assert.equal(ledger.totals.goals,0);
 assert.equal(ledger.matches[0].ownGoals,1);
});

test('archived matches are traceable once and a missing old baseline is reported as unknown',()=>{
 const {season,player}=classicFixture(),id=player.id;
 season.results.push(result('ledger:1','arsenal','chelsea',[1,0],[row(id,'arsenal',{goals:1})],{week:0}));
 season.playerData[id].careerStats={...season.playerData[id].careerStats,appearances:6,goals:4};
 season.history=[{archive:archiveSeason(season)}];
 const ledger=playerCareerLedger(season,id,player);
 assert.equal(ledger.matches.length,1,'archived match is not counted twice with the live season');
 assert.equal(ledger.totals.appearances,1);
 assert.equal(ledger.totals.goals,1);
 assert.ok(ledger.baseline.appearances>=5);
 assert.ok(ledger.baseline.goals>=3);
 assert.ok(ledger.incomplete.includes('appearances'));
 assert.equal(ledger.careerTotals.appearances,6);
});

test('every supported match statistic is preserved exactly, including archive rows',()=>{
 const {season,player}=classicFixture(),id=player.id;
 season.results.push(result('ledger:fields','arsenal','chelsea',[2,0],[row(id,'arsenal',{tackles:7,passesCompleted:33,shots:4,shotsOnTarget:3,saves:1,keyPasses:2,interceptions:5,playingSeconds:177,minutesPlayed:88})],{week:0}));
 const live=playerCareerLedger(season,id,player);
 for(const [field,value] of [['tackles',7],['passesCompleted',33],['shots',4],['shotsOnTarget',3],['saves',1],['keyPasses',2],['interceptions',5],['playingSeconds',177]])assert.equal(live.totals[field],value,field);
 assert.equal(live.matches[0].minutes,88);
 season.history=[{archive:archiveSeason(season)}];
 const archived=playerCareerLedger(season,id,player);
 for(const [field,value] of [['tackles',7],['passesCompleted',33],['shots',4],['saves',1]])assert.equal(archived.totals[field],value,field);
});

test('career context supplies non-empty national and youth records',()=>{
 const {season,player}=classicFixture(),id=player.id;
 player.nationalCareer={version:1,seasons:[],history:[{id:'national:ctx',year:2026,competition:'世界杯预选赛',opponent:'巴西',score:[1,0],goals:1,assists:0,minutes:90,rating:7.5,started:true}],honors:[],caps:1,starts:1,goals:1,assists:0,minutes:90,ratingTotal:7.5};
 player.journey={...player.journey,youthResults:[{title:'青训首战',opponent:'U18 对手',score:[2,1],rating:7,goals:1,assists:0}]};
 const withCareer=playerCareerLedger(season,id,player),without=playerCareerLedger(season,id);
 assert.equal(withCareer.nationalTotals.goals,1);
 assert.equal(withCareer.youthTotals.goals,1);
 assert.equal(without.nationalTotals.goals,0);
 assert.equal(without.youthTotals.goals,0);
});

test('a same-name player with another id stays a separate dossier',()=>{
 const {season,player}=classicFixture(),id=player.id,other=season.rosterIds.arsenal[1];
 season.playerData[other].name=player.name;
 season.results.push(result('ledger:other','arsenal','chelsea',[2,0],[row(other,'arsenal',{goals:2})],{week:0}));
 const mine=playerCareerLedger(season,id,player),theirs=playerCareerLedger(season,other);
 assert.equal(mine.totals.goals,0);
 assert.equal(theirs.totals.goals,2);
 assert.notEqual(mine.id,theirs.id);
});
