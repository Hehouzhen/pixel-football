import assert from 'node:assert/strict';
import {resultGoalEvents} from './result-info.mjs';

const season={rosterIds:{arsenal:Array.from({length:6},(_,i)=>`a${i}`),chelsea:Array.from({length:6},(_,i)=>`c${i}`)},playerData:{}};
for(const [team,ids] of Object.entries(season.rosterIds))ids.forEach((id,position)=>season.playerData[id]={id,teamId:team,name:`${team}-${position}`});
const played={home:'chelsea',away:'arsenal',score:[0,1],report:{teams:['阿森纳','切尔西'],playerIds:[...season.rosterIds.arsenal,...season.rosterIds.chelsea],numbers:Array.from({length:12},(_,i)=>i+1),events:[{type:'goal',player:5,team:0,minute:73}]}};
assert.deepEqual(resultGoalEvents(played,season),[{minute:73,teamId:'arsenal',scorerName:'arsenal-5'}],'played goal uses stable player identity when the user team is away');
const simulated={goalEvents:[{minute:12,teamId:'chelsea',scorerName:'chelsea-2',assistName:'chelsea-3'}]};
assert.deepEqual(resultGoalEvents(simulated,season),simulated.goalEvents,'simulated goal and assist names remain intact');
