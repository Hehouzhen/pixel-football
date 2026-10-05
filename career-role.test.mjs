import assert from 'node:assert/strict';
import {createCareerPlayer,finishCareerMatch} from './career.mjs';
import {roleProgress,clubRecord,positionContribution,matchFeedback,importantMatch,rememberClub} from './career-role.mjs';
import {careerTimeline} from './career-story.mjs';
import {createSeason,LEAGUES,seasonRounds,simulateWeek,getTeam} from './league.mjs';
import {makeCareerSlot,exportBackup,importBackup} from './save-slots.mjs';
const league=LEAGUES[0],s=createSeason(league.id,league.teams[0].id,42),neutral=createCareerPlayer('身份测试',29,'forward');
assert.equal(roleProgress(neutral,s).name,'新秀');assert.equal(importantMatch(neutral,s).title,'你的职业首秀');
let p=neutral;
for(let i=0;i<42;i++){p=finishCareerMatch(p,{goals:1,shots:2,shotsOnTarget:1},[1,0],180,{seasonState:s,season:1,opponent:'Newcastle United',champion:i===41});if(i===5){assert.equal(roleProgress(p,s).name,'稳定主力');assert.equal(p.lastMatch.roleBefore,0);assert.equal(p.lastMatch.roleAfter,1)}if(i===17)assert.equal(roleProgress(p,s).name,'球队核心');if(i===40)assert.equal(roleProgress(p,s).name,'球队核心')}
assert.equal(roleProgress(p,s).name,'俱乐部传奇');assert(careerTimeline(p).some(r=>r.labels.includes('成长为俱乐部传奇')));assert.equal(neutral.stats.appearances,0);
const nextClub=createSeason(league.id,league.teams[1].id);assert.equal(roleProgress(p,nextClub).name,'新秀');let moved=finishCareerMatch(p,{shots:1,shotsOnTarget:1},[0,0],180,{seasonState:nextClub,season:1});assert.equal(moved.clubProgress[s.teamId].appearances,42);assert.equal(moved.clubProgress[nextClub.teamId].appearances,1);assert.equal(roleProgress(moved,s).name,'俱乐部传奇');
for(const position of ['forward','midfielder','defender']){let idle=createCareerPlayer('空闲样本',9,position);for(let i=0;i<8;i++)idle=finishCareerMatch(idle,{},[0,0],180,{seasonState:s});assert.equal(roleProgress(idle,s).name,'新秀');assert.equal(positionContribution({goals:100,keyPasses:100,tackles:100,interceptions:100,blocks:100},position),6)}
assert(positionContribution({keyPasses:3},'midfielder')>positionContribution({keyPasses:3},'forward'));assert(positionContribution({blocks:3},'defender')>positionContribution({blocks:3},'midfielder'));
assert.match(matchFeedback({turnovers:4,keyPasses:3,passes:8,passesCompleted:6},'midfielder').concern,/4次球权/);assert.match(matchFeedback({reds:1,turnovers:4},'defender').concern,/被罚下/);assert.match(matchFeedback({shots:4,shotsOnTarget:0},'forward').concern,/射正比例/);assert.match(matchFeedback({},'defender').positive,/暂未记录/);
const old={...p};delete old.clubProgress;assert.equal(clubRecord(old,s).appearances,42);assert.equal(roleProgress(old,{...nextClub,history:[{team:getTeam(s.teamId).name}]}).record.appearances,0,'never attribute old team appearances to a new club');
const archived=rememberClub(old,s);assert.equal(archived.clubProgress[s.teamId].appearances,42);assert.equal(roleProgress(archived,nextClub).record.appearances,0);assert.equal(old.clubProgress,undefined);assert.equal(roleProgress(archived,s).name,'俱乐部传奇');
const unknown={...old,history:[{...p.history[0],season:1,report:null}]};const switched={...nextClub,history:[{team:getTeam(s.teamId).name}]};assert.equal(clubRecord(unknown,switched).appearances,0);
const backup=exportBackup({active:0,slots:[makeCareerSlot(s,p),null,null]});assert.equal(roleProgress(importBackup(backup).slots[0].player,s).tier,3);
for(const mutation of [r=>r.points=-1,r=>r.goodGames=43,r=>r.titles=['1:league','1:league'],r=>r.points=9999]){const data=JSON.parse(backup);mutation(data.slots[0].player.clubProgress[s.teamId]);assert.throws(()=>importBackup(JSON.stringify(data)),/角色进度/)}
const semi={...s,cup:{phase:'semi',semis:[[s.teamId,league.teams[1].id]]}};assert.match(importantMatch(p,semi,'cup').title,/半决赛/);assert.equal(importantMatch(p,{...semi,teamId:league.teams[2].id},'cup'),null);
const final={...s,cup:{phase:'final',final:[s.teamId,league.teams[1].id]}};assert.match(importantMatch(p,final,'cup').title,/决赛/);
let race=structuredClone(s);while(race.week<seasonRounds(race)-1)race=simulateWeek(race);assert(importantMatch(p,race));race=simulateWeek(race);assert.equal(importantMatch(p,race),null);
console.log('PASS: position-specific club roles, idle resistance, transfers, old-save evidence, feedback, promotions, important matches and strict backups.');
