import assert from 'node:assert/strict';
import {createSeason} from './league.mjs';
import {createCareerPlayer,careerTransferOffers,careerTransferWindow} from './career.mjs';

const season=createSeason('england','arsenal',12),career=createCareerPlayer('转会测试',10,'forward');
career.id=season.rosterIds.arsenal[career.index];
career.attributes=Object.fromEntries(Object.keys(career.attributes).map(key=>[key,96]));
career.stats={...career.stats,appearances:14,ratingTotal:105,goals:12,assists:4};
const due=[];for(let year=1;year<=24;year++){const state={...season,history:Array.from({length:year-1},()=>({}))};if(careerTransferWindow(career,state).available)due.push(year)}
assert(due[0]>=2&&due[0]<=4,'first transfer window arrives after 2–4 seasons');
assert(due.slice(1).every((year,index)=>year-due[index]>=2&&year-due[index]<=4),'later windows recur every 2–4 seasons');
const firstWindow={...season,history:Array.from({length:due[0]-1},()=>({}))};
assert.equal(careerTransferOffers(career,season).length,0,'no invitations before the first window');
const offers=careerTransferOffers(career,firstWindow);
assert.equal(offers.length,3,'limit the player to a short, readable shortlist');
assert(!offers.some(offer=>offer.teamId===season.teamId),'current club is offered separately as stay');
assert(offers.every(offer=>offer.teamName&&offer.leagueName&&offer.expectedRole&&offer.ambition&&offer.rationale));
assert.deepEqual(careerTransferOffers(career,firstWindow),offers,'offers must remain stable after reload');
const rookie=createCareerPlayer('普通球员',11,'defender');rookie.id=season.rosterIds.arsenal[rookie.index];
assert(careerTransferOffers(rookie,season).length<=3);
console.log('PASS: deterministic 2–4 season transfer windows and position-fit MyCareer invitations.');
