import assert from 'node:assert/strict';
import {Match} from './engine.mjs';
import {ABILITIES} from './ratings.mjs';
import {DREAM_PLAYERS,teamOverall} from './dream-team.mjs';

const starters=Array.from({length:6},(_,position)=>DREAM_PLAYERS.filter(player=>player.id===player.footballerId&&player.position===position).sort((a,b)=>b.overall-a.overall)[0]);
const teamScore=teamOverall(starters);
const flattened=starters.map(player=>Object.fromEntries(ABILITIES.map(key=>[key,player.overall])));
const addStats=(sum,report,side)=>{
  sum.goals+=report.score[side];
  sum.shots+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.shots,0);
  sum.shotsOnTarget+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.shotsOnTarget,0);
  sum.passes+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.passes,0);
  sum.passesCompleted+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.passesCompleted,0);
  sum.tackles+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.tackles,0);
  sum.tackleAttempts+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.tackleAttempts,0);
  sum.saves+=report.stats.slice(side*6,side*6+6).reduce((n,row)=>n+row.saves,0);
};
const seededRandom=seed=>()=>{let n=seed|0;n^=n<<13;n^=n>>>17;n^=n<<5;seed=n>>>0;return seed/4294967296};
const totals=()=>({goals:0,shots:0,shotsOnTarget:0,passes:0,passesCompleted:0,tackles:0,tackleAttempts:0,saves:0});
const actual=totals(),flat=totals();
for(let seed=1;seed<=20;seed++){
  for(const swap of [false,true]){
    const originalRandom=Math.random;
    let report;
    try{
      Math.random=seededRandom(seed*7919);
      const first=swap?flattened:starters.map(player=>player.attributes),second=swap?starters.map(player=>player.attributes):flattened;
      const match=new Match({duration:180,difficulty:1,teams:['AI 1','AI 2'],strength:[teamScore/75,teamScore/75],playerAttributes:[...first,...second]});
      match.state='playing';match.selected[0]=-1;
      let ticks=0;
      while(match.state==='playing'&&ticks<20000){match.step(.04);ticks++}
      assert.equal(match.state,'ended','each seeded test reaches full time');
      report=match.report();
    }finally{Math.random=originalRandom}
    addStats(swap?flat:actual,report,swap?0:1);
    addStats(swap?actual:flat,report,swap?1:0);
  }
}
assert(actual.shots>0&&flat.shots>0,'both sides produce shots');
assert(actual.passes>0&&flat.passes>0,'both sides attempt passes');
assert(actual.tackleAttempts>0&&flat.tackleAttempts>0,'both sides attempt tackles');
assert(['goals','shots','passesCompleted','tackles','saves'].some(key=>actual[key]!==flat[key]),'individual ability profiles change match-level output even when displayed squad strength is equal');
for(const key of Object.keys(actual))assert(Number.isFinite(actual[key])&&Number.isFinite(flat[key]));
console.log('40 paired seeded AI matches, same six players, equal team strength, and home/away swapped:',JSON.stringify({matches:40,individualized:actual,overallFlattened:flat,perMatch:{individualizedGoals:+(actual.goals/40).toFixed(2),individualizedShots:+(actual.shots/40).toFixed(2),flattenedGoals:+(flat.goals/40).toFixed(2),flattenedShots:+(flat.shots/40).toFixed(2)}},null,2));
