import {EventMatch} from './simulation.mjs';
import {nextCalendarFixture} from './calendar.mjs';
import {prepareFixtureTeams} from './recovery.mjs';
import {commitCareerGrowth} from './identity.mjs';
import {completeWeek,orientStats,prepareSeason,seasonRounds} from './league.mjs';
import {completeCupMatch,cupNeedsShootout,simulateShootout,advanceScheduledCup} from './cup.mjs';
import {finishCareerMatch,careerObjective} from './career.mjs';
import {teamName} from './identity.mjs';
import {makeMatchNews,addMatchNews} from './news.mjs';
import {journeyOpportunity,prepareJourneyLineup,finishJourneyMatch} from './career-journey.mjs';
import {matchIdentity,findSettlement} from './match-ledger.mjs';
export function simulateNextScheduled(season,career=null,{duration=180,autoRotate=true}={}){
 const s=structuredClone(season);s.calendar.dated=true;advanceScheduledCup(s);const event=nextCalendarFixture(s);if(!event)return null;
 prepareFixtureTeams(s,event,{autoOwn:autoRotate});const opportunity=career?.journey?journeyOpportunity(career,s):null;if(opportunity)prepareJourneyLineup(s,career,opportunity);const before=structuredClone(s),[home,away]=event.pair,own=home===s.teamId?0:1,week=event.competition==='league'?s.week:30+s.cup.round+(['league','semi','final'].indexOf(s.cup.phase)*10),matchId=matchIdentity(s,{competition:event.competition,week:event.competition==='league'?s.week:0,phase:event.competition==='cup'?s.cup.phase:null,round:event.competition==='cup'?s.cup.round:null,home,away});
 const engine=new EventMatch({season:s,home,away,week,competition:event.competition,duration,managedSide:opportunity&&!opportunity.starter?own:autoRotate?null:own,recordEvents:false});
 if(opportunity&&!opportunity.starter){while(!engine.done&&engine.clock<opportunity.minuteOn*60)engine.step();if(!engine.done)engine.substitute(own,engine.active[own][career.index],career.id);engine.managedSide=autoRotate?null:own}
 const result=engine.run(),score=own===0?result.score:[...result.score].reverse(),stats=orientStats(result.stats,own===0),ownRows=result.playerStats.filter(p=>p.teamId===s.teamId),otherRows=result.playerStats.filter(p=>p.teamId!==s.teamId),rows=[...ownRows,...otherRows];
 const shootout=event.competition==='cup'&&cupNeedsShootout(s,score)?simulateShootout(s,home,away,week,result):null;
 if(shootout){for(const attempt of shootout.attempts)engine.emit('shootout-attempt',engine.players.get(attempt.playerId),`点球第 ${attempt.round} 轮 · ${attempt.playerName}${attempt.scored?'罚进':'未进'} · ${attempt.score.join(' : ')}`,1);engine.emit('shootout-complete',null,`点球大战 ${shootout.score.join(' : ')} · ${teamName(s,shootout.winner)} 获胜`,2);result.journal=[...engine.highlights]}
 const settledShootout=shootout&&own===1?{...shootout,score:[...shootout.score].reverse()}:shootout;
 const details={...result,source:'simulated',...(shootout?{shootout}:{})};
 if(event.competition==='cup')completeCupMatch(s,score,rows,stats,settledShootout,null,details,{matchId});else completeWeek(s,score,rows,stats,null,details,{matchId});
 const careerLine=ownRows.find(row=>row.playerId===career?.id),opponent=teamName(s,event.pair[1-own]),champion=event.competition==='cup'&&before.cup.phase==='final'&&s.cup.champion===s.teamId;
 let p=career?finishCareerMatch(career,careerLine??{playingSeconds:0},score,duration,{objective:careerObjective(career.position,before.week,duration),source:'simulated',goalEvents:result.goalEvents,competition:event.competition,season:(s.history?.length??0)+1,opponent,seasonState:before,final:event.competition==='cup'&&before.cup.phase==='final',champion}):null;
 if(p?.journey&&careerLine?.playingSeconds>0)p=finishJourneyMatch(p,before,careerLine,score,{opponent,opponentId:event.pair[1-own],started:careerLine.started,champion});
 const article=makeMatchNews({before,after:s,mode:p?'career':'club',competition:event.competition,score,opponent:teamName(s,event.pair[1-own]),stats,careerBefore:career,careerAfter:p,shootout:settledShootout,source:'simulated',goalEvents:result.goalEvents});addMatchNews(s,article);if(p){if(p.journey)commitCareerGrowth(s,p,career);prepareSeason(s,p)}
 return {season:s,career:p,event,score,article};
}
export function longSimulationBoundary(season,target,count,{stopImportant=true,initialRequests=[]}={}){
 const event=nextCalendarFixture(season);if(!event)return '赛季比赛已经完成';
 if(/^\d+$/.test(target)&&count>=Number(target))return `已完成 ${count} 场比赛`;
 if(target==='winter'&&event.date>=`${(season.calendar?.startYear??2026)+1}-01-01`)return '已推进至冬窗';
 if(target==='league'&&season.week>=seasonRounds(season))return '联赛已结束';
 if(stopImportant&&(season.playerRequests??[]).some(r=>r.teamId===season.teamId&&r.status==='open'&&!initialRequests.includes(r.id)))return '有新的球员诉求需要处理';
 if(stopImportant&&season.balance<0)return '俱乐部资金不足，需要检查收支';
 return null;
}
