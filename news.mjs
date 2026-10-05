import {seasonRounds,standings} from './league.mjs';
import {teamName} from './identity.mjs';

const resultWord=(ours,theirs)=>ours>theirs?'取胜':ours<theirs?'告负':'战平';

export function makeMatchNews({before,after,mode,competition='league',score,opponent,stats,careerBefore=null,careerAfter=null,shootout=null,source='played'}){
  const year=(before.history?.length??0)+1;
  const round=competition==='league'?before.week+1:competition==='cup'?(before.cup?.phase==='final'?'决赛':'半决赛'):0;
  const team=teamName(before,before.teamId);
  const outcome=shootout?(shootout.winner===before.teamId?'点球获胜':'点球告负'):resultWord(score[0],score[1]);
  const beforeRank=competition==='league'?standings(before).findIndex(r=>r.id===before.teamId)+1:null;
  const afterRank=competition==='league'?standings(after).findIndex(r=>r.id===after.teamId)+1:null;
  const wonTitle=competition==='league'&&after.week===seasonRounds(after)&&after.awards?.champion===before.teamId;
  const cupTitle=competition==='cup'&&after.cup?.phase==='complete'&&after.cup.champion===before.teamId;
  const firstGoal=mode==='career'&&careerBefore?.stats.goals===0&&careerAfter?.lastMatch.goals>0;
  const hatTrick=mode==='career'&&careerAfter?.lastMatch.goals>=3;
  const rankChange=before.week===0?`球队目前排名第 ${afterRank}。`:beforeRank&&afterRank&&beforeRank!==afterRank?`球队从第 ${beforeRank} 位来到第 ${afterRank} 位。`:`球队目前排名第 ${afterRank}。`;
  let type='result',headline=shootout?`${team} ${shootout.winner===before.teamId?'点球淘汰':'点球不敌'} ${opponent}`:`${team} ${score[0]>score[1]?'击败':score[0]<score[1]?'不敌':'战平'} ${opponent}`;
  if(cupTitle){type='title';headline=`${team} 捧起杯赛冠军`}
  else if(wonTitle){type='title';headline=`${team} 锁定联赛冠军`}
  else if(hatTrick){type='milestone';headline=`${careerAfter.name} 上演帽子戏法`}
  else if(firstGoal){type='milestone';headline=`${careerAfter.name} 收获生涯首球`}
  else if(competition==='league'&&before.week>0&&afterRank<beforeRank&&afterRank<=2){type='table';headline=`${team} ${outcome}后升至联赛第 ${afterRank} 位`}
  const lead=competition==='cup'?`${team} 在杯赛${round}以 ${score[0]} : ${score[1]} ${outcome}。`:`第 ${round} 轮，${team} 以 ${score[0]} : ${score[1]} ${outcome}。`;
  const personal=mode==='career'&&careerAfter?.lastMatch?`${careerAfter.name} 本场收获 ${careerAfter.lastMatch.goals} 球、${careerAfter.lastMatch.assists} 次助攻，评分 ${careerAfter.lastMatch.rating.toFixed(1)}。`:'';
  const table=competition==='league'?rankChange:'';
  const shotLine=stats?.shots?`双方射门 ${stats.shots[0]} : ${stats.shots[1]}，射正 ${stats.onTarget?.[0]??0} : ${stats.onTarget?.[1]??0}。`:'';
  return {id:`${year}:${competition}:${round}:${after.results.length}:${after.cup?.results?.length??0}`,year,round,mode,competition,source,type,team,opponent,score:[...score],shootout:shootout?.score??null,headline,lead,body:[personal,table,shotLine].filter(Boolean).join(' '),stats:stats?{shots:[...(stats.shots??[0,0])],onTarget:[...(stats.onTarget??[0,0])],saves:[...(stats.saves??[0,0])]}:null};
}

export function addMatchNews(season,article){season.news=[...(season.news??[]),article].slice(-80);return season}
