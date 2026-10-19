import test from 'node:test';
import assert from 'node:assert/strict';
import {createSeason} from './league.mjs';
import {ceremony} from './awards.mjs';

test('Ballon shortlist explains positional contribution and excludes players below 900 minutes',()=>{
  const season=createSeason('england','arsenal',20261019),ids=[0,1,5].map(index=>season.rosterIds.arsenal[index]),[keeper,defender,forward]=ids;
  season.players[keeper]={appearances:10,saves:60,goalsConceded:5};
  season.players[defender]={appearances:20,tackles:100,interceptions:50,blocks:20};
  season.players[forward]={appearances:20,goals:15,assists:5,keyPasses:12};
  const shortMinutes=season.rosterIds.chelsea[5];season.players[shortMinutes]={appearances:5,goals:30};
  season.results=Array.from({length:20},(_,week)=>({competition:'league',week,home:'arsenal',away:'chelsea',score:[1,0],playerStats:[
    ...(week<10?[{playerId:keeper,teamId:'arsenal',minutesPlayed:90}]:[]),
    {playerId:defender,teamId:'arsenal',minutesPlayed:90},
    {playerId:forward,teamId:'arsenal',minutesPlayed:90},
    ...(week<5?[{playerId:shortMinutes,teamId:'chelsea',minutesPlayed:90}]:[])
  ]}));
  season.cup={phase:'complete',champion:'arsenal',players:{},results:[],rosterIds:season.rosterIds,playerData:season.playerData};
  const show=ceremony(season,'europe'),shortlist=show.ballonCandidates;
  assert.deepEqual(shortlist.map(row=>row.id).sort(),ids.slice(1).concat(ids[0]).sort());
  assert(!shortlist.some(row=>row.id===shortMinutes));
  assert(shortlist.every(row=>row.breakdown.minutes>=900&&Number.isFinite(row.score)));
  assert(shortlist.every(row=>['individual','efficiency','participation','majorMatches','trophies','discipline'].every(key=>Number.isFinite(row.breakdown[key]))));
});
