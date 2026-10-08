import assert from 'node:assert/strict';
import {Match,FIELD} from './engine.mjs';
import {createSeason,currentFixture,simulateFixture,simulateWeek,seasonRounds,standings} from './league.mjs';
import {startCup,cupNextMatch,completeCupMatch} from './cup.mjs';
import {weatherForFixture} from './weather.mjs';
import {makeClubSlot,exportBackup,importBackup} from './save-slots.mjs';

const seed={seed:42},counts={clear:0,drizzle:0,rain:0};
for(let week=0;week<5000;week++)counts[weatherForFixture(seed,'arsenal','chelsea',week).type]++;
assert.equal(weatherForFixture(seed,'arsenal','chelsea',7).type,weatherForFixture(seed,'arsenal','chelsea',7).type,'fixture weather is deterministic');
assert((counts.rain+counts.drizzle)/5000>.12&&(counts.rain+counts.drizzle)/5000<.18,'all rain occurs in a low share of fixtures');
assert(counts.drizzle/5000>.085&&counts.drizzle/5000<.13,'drizzle stays near its intended share');
assert(counts.rain/5000>.025&&counts.rain/5000<.06,'heavy rain remains uncommon');

const dry= new Match({weather:{type:'clear',label:'晴天',ballDrag:1,firstTouchPenalty:0,passPenalty:0,goalPenalty:0}});
const wet= new Match({weather:{type:'rain',label:'大雨',ballDrag:.88,firstTouchPenalty:.04,passPenalty:.035,goalPenalty:.13}});
for(const match of [dry,wet]){match.state='playing';match.ball={...match.ball,owner:null,x:FIELD.center,y:FIELD.top+25,z:0,vx:0,vy:0,vz:0};match.players[5].x=FIELD.center;match.players[5].y=FIELD.top+25;match.takeBall(5)}
assert(wet.players[5].settle>dry.players[5].settle,'wet conditions modestly increase first-touch settling time');
const rollingSpeed=match=>{match.state='playing';match.players.forEach(player=>player.cool=10);match.ball={...match.ball,owner:null,x:FIELD.center,y:FIELD.center,z:0,vx:100,vy:0,vz:0};match.step(.01);return Math.hypot(match.ball.vx,match.ball.vy)};
assert(rollingSpeed(wet)>rollingSpeed(dry),'wet turf lets a rolling ball travel slightly farther');

const season=createSeason('england','arsenal',42),fixture=currentFixture(season),predicted=simulateFixture(season,...fixture,season.week);
assert.deepEqual(simulateFixture(season,...fixture,season.week).weather,predicted.weather);
simulateWeek(season);
const leagueResult=season.results.find(result=>result.home===fixture[0]&&result.away===fixture[1]);
assert.deepEqual(leagueResult.weather,predicted.weather,'simulated league fixture stores its weather');
assert.equal(leagueResult.playerStats.filter(p=>p.teamId===leagueResult.home).reduce((n,p)=>n+(p.goals??0),0),leagueResult.score[0]);
assert.equal(leagueResult.playerStats.filter(p=>p.teamId===leagueResult.away).reduce((n,p)=>n+(p.goals??0),0),leagueResult.score[1]);

while(season.week<seasonRounds(season))simulateWeek(season);season.teamId=standings(season)[0].id;startCup(season);const pair=cupNextMatch(season),cupWeather=simulateFixture(season,...pair,30+season.cup.round,'cup').weather;
completeCupMatch(season,[0,0],Array.from({length:12},()=>({})),null,null,null,{source:'played',weather:cupWeather});
assert.deepEqual(season.cup.results.find(result=>result.home===pair[0]&&result.away===pair[1]).weather,cupWeather,'played cup fixture stores its weather');
const backup={version:2,active:0,slots:[makeClubSlot(season),null,null]};
assert(importBackup(exportBackup(backup)),'weather-bearing results survive save export/import');

assert.equal(seasonRounds(createSeason('england','arsenal')),30);
