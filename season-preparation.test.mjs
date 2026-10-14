import assert from 'node:assert/strict';
import {createSeason,prepareSeason} from './league.mjs';
import {startCup} from './cup.mjs';
import {nextCalendarFixture} from './calendar.mjs';
import {recoveryAt,recordRecovery,fitLineup} from './recovery.mjs';
import {fixtureDate,daysBetween} from './schedule.mjs';
import {simulateNextScheduled,longSimulationBoundary} from './long-simulation.mjs';
import {createCareerPlayer} from './career.mjs';
import {exportBackup,importBackup,makeCareerSlot} from './save-slots.mjs';
const season=createSeason('england','arsenal',891);season.calendar.dated=true;const career=createCareerPlayer('轮换测试',10,'forward');prepareSeason(season,career);startCup(season);
const date=nextCalendarFixture(season).date;assert.equal(new Date(date).getUTCDay(),6);assert.equal(new Date(fixtureDate(season,'cup',0,'league')).getUTCDay(),3);
const p=season.playerData[career.id];recordRecovery(season,{matchId:'load-1',date,competition:'league',duration:180,playerStats:[{playerId:p.id,playingSeconds:180,distance:1000}]});assert(recoveryAt(p,date).fatigue>40);assert(recoveryAt(p, new Date(Date.parse(date)+7*86400000).toISOString().slice(0,10)).readiness===1);const snapshot=JSON.stringify(p.recovery);recordRecovery(season,{matchId:'load-1',date,playerStats:[{playerId:p.id,playingSeconds:180}]});assert.equal(JSON.stringify(p.recovery),snapshot);
const reserve=season.squadIds.arsenal.find(id=>season.playerData[id].position===5&&id!==p.id);season.playerData[reserve].attributes={...p.attributes};assert.equal(fitLineup(season,'arsenal',date)[5],reserve);
let state=season,player=career,dates=[];for(let i=0;i<5;i++){const result=simulateNextScheduled(state,player);assert(result);state=result.season;player=result.career;dates.push(result.event.date);for(const r of [state.results.at(-1),...state.cup.results].filter(Boolean))assert.deepEqual(r.score,[r.home,r.away].map(team=>r.playerStats.filter(p=>p.teamId===team).reduce((n,p)=>n+p.goals,0)))}
assert.deepEqual(dates,[...dates].sort());assert.equal(longSimulationBoundary(state,'5',5),'已完成 5 场比赛');const restored=importBackup(exportBackup({version:2,active:0,slots:[makeCareerSlot(state,player),null,null]}));assert.deepEqual(restored.slots[0].season.playerData[p.id].recovery,state.playerData[p.id].recovery);
assert(state.results.every(r=>r.date));assert(daysBetween(dates[0],dates.at(-1))>0);assert.equal(season.week,0,'batch steps must not mutate the original save');
console.log('PASS: real dates, recovery, idempotent load, rotation, chronological batch simulation, scores, career and save round-trip');

for(const duration of [120,300]){const base=createSeason('england','arsenal',52);base.calendar.dated=true;prepareSeason(base);startCup(base);const result=simulateNextScheduled(base,null,{duration,autoRotate:false}),own=result.season.results.find(r=>[r.home,r.away].includes(base.teamId));assert.equal(own.duration,duration);assert(own.playerStats.filter(p=>p.teamId===base.teamId&&p.started).every(p=>p.minutesPlayed<=90));}
let full=createSeason('england','arsenal',951);full.calendar.dated=true;prepareSeason(full);startCup(full);let steps=0,last='';while(nextCalendarFixture(full)&&steps++<60){const result=simulateNextScheduled(full);assert(result.event.date>=last);last=result.event.date;full=result.season}assert.equal(full.week,30);assert.equal(full.results.length,240);assert.equal(full.cup.phase,'complete');assert.equal(full.cup.results.length,53);assert(Object.values(full.playerData).every(p=>!p.recovery||p.recovery.fatigue>=0&&p.recovery.fatigue<=100));
assert(longSimulationBoundary(full,'season',steps));console.log('PASS: 2/5 minute load normalization and dated full-season league/cup progression');

const {completeCupMatch}=await import('./cup.mjs');
const shootoutSeason=createSeason('england','arsenal',101);prepareSeason(shootoutSeason);shootoutSeason.calendar.dated=true;
shootoutSeason.cup={formatVersion:2,phase:'quarterfinal',round:0,teams:['arsenal','mancity','liverpool','chelsea','manutd','tottenham','newcastle','astonvilla'],quarters:[[['arsenal','mancity'],['liverpool','chelsea'],['manutd','tottenham'],['newcastle','astonvilla']],[['mancity','arsenal'],['chelsea','liverpool'],['tottenham','manutd'],['astonvilla','newcastle']]],results:[],players:{},names:{},rosterIds:shootoutSeason.rosterIds,playerData:shootoutSeason.playerData};
completeCupMatch(shootoutSeason,[1,0],Array.from({length:12},(_,i)=>({goals:i===5?1:0})),null);
completeCupMatch(shootoutSeason,[0,1],Array.from({length:12},(_,i)=>({goals:i===11?1:0})),null,{winner:'arsenal',score:[4,3]});
const tied=shootoutSeason.cup.results.find(r=>r.phase==='quarterfinal'&&r.round===1&&r.away==='arsenal');assert.deepEqual(tied.penalties,[3,4]);assert.equal(tied.winner,'arsenal');assert.notDeepEqual(tied.score,[0,0]);console.log('PASS: aggregate-draw penalties are recorded even when the second-leg score is not a draw, with correct away-team orientation');
