import {seasonRounds,standings} from './league.mjs';
import {teamName} from './identity.mjs';

const resultWord=(ours,theirs)=>ours>theirs?'取胜':ours<theirs?'告负':'战平';
const pick=(key,options)=>{let hash=0;for(const char of key)hash=(Math.imul(hash,31)+char.charCodeAt(0))|0;return options[((hash%options.length)+options.length)%options.length]};

export function makeMatchNews({before,after,mode,competition='league',score,opponent,stats,careerBefore=null,careerAfter=null,shootout=null,source='played',goalEvents=[]}){
  const year=(before.history?.length??0)+1;
  const round=competition==='league'?before.week+1:competition==='cup'?(before.cup?.phase==='final'?'决赛':'半决赛'):0;
  const team=teamName(before,before.teamId);
  const outcome=shootout?(shootout.winner===before.teamId?'点球获胜':'点球告负'):resultWord(score[0],score[1]);
  const beforeRank=competition==='league'?standings(before).findIndex(r=>r.id===before.teamId)+1:null;
  const afterRank=competition==='league'?standings(after).findIndex(r=>r.id===after.teamId)+1:null;
  const wonTitle=competition==='league'&&after.week===seasonRounds(after)&&after.awards?.champion===before.teamId;
  const cupTitle=competition==='cup'&&after.cup?.phase==='complete'&&after.cup.champion===before.teamId;
  const firstGoal=mode==='career'&&careerBefore?.stats.goals===0&&careerAfter?.lastMatch.goals>0;
  const careerGoals=careerAfter?.lastMatch?.goals??0;
  const hatTrick=mode==='career'&&careerGoals===3;
  const rankChange=before.week===0?`球队目前排名第 ${afterRank}。`:beforeRank&&afterRank&&beforeRank!==afterRank?`球队从第 ${beforeRank} 位来到第 ${afterRank} 位。`:`球队目前排名第 ${afterRank}。`;
  const margin=score[0]-score[1],lastGoal=[...goalEvents].sort((a,b)=>b.minute-a.minute)[0],lateWinner=margin!==0&&lastGoal?.teamId===before.teamId&&lastGoal.minute>=80;
  let type='result',headline=shootout?`${team} ${shootout.winner===before.teamId?'点球淘汰':'点球不敌'} ${opponent}`:margin===0?pick(`${team}:${opponent}:${year}:${round}`,[`${team} 与 ${opponent} 握手言和`,`${team} 战平 ${opponent}，双方各取一分`,`${team} 和 ${opponent} 难分高下`]):lateWinner?`${team} 末段制胜，险胜 ${opponent}`:score[1]===0&&margin>0?pick(`${team}:${opponent}:${year}:${round}`,[`${team} 零封 ${opponent}`,`${team} 完胜 ${opponent}，防线交出零封`,`${team} 以 ${score[0]} : 0 击退 ${opponent}`]):score[0]+score[1]>=5?pick(`${team}:${opponent}:${year}:${round}`,[`${team} 与 ${opponent} 联手奉献进球大战`,`${team} 在进球大战中${margin>0?'击败':'不敌'} ${opponent}`,`${score[0]+score[1]} 球对攻！${team} ${resultWord(score[0],score[1])} ${opponent}`]):Math.abs(margin)>=3?`${team} 大比分${margin>0?'击败':'不敌'} ${opponent}`:Math.abs(margin)===1?pick(`${team}:${opponent}:${year}:${round}`,[`${team} 一球险胜 ${opponent}`,`${team} 以微弱优势${margin>0?'拿下':'负于'} ${opponent}`,`${team} ${resultWord(score[0],score[1])} ${opponent}，胜负只差一球`]):pick(`${team}:${opponent}:${year}:${round}`,[`${team} ${resultWord(score[0],score[1])} ${opponent}`,`${team} 与 ${opponent} 交锋，${resultWord(score[0],score[1])}收场`,`${team} ${margin>0?'拿下':'未能拿下'} ${opponent}`]);
  if(cupTitle){type='title';headline=`${team} 捧起杯赛冠军`}
  else if(wonTitle){type='title';headline=`${team} 锁定联赛冠军`}
  else if(mode==='career'&&careerGoals>=4){type='milestone';headline=careerGoals===4?`${careerAfter.name} 上演大四喜`:careerGoals===5?`${careerAfter.name} 五子登科`:`${careerAfter.name} 单场打入 ${careerGoals} 球`}
  else if(hatTrick){type='milestone';headline=`${careerAfter.name} 上演帽子戏法`}
  else if(firstGoal){type='milestone';headline=`${careerAfter.name} 收获生涯首球`}
  else if(competition==='league'&&before.week>0&&afterRank<beforeRank&&afterRank<=2){type='table';headline=`${team} ${outcome}后升至联赛第 ${afterRank} 位`}
  const roundLabel=competition==='cup'?`杯赛${round}`:`联赛第 ${round} 轮`;
  const lead=pick(`${headline}:${year}:${round}`,[`${roundLabel}，${team}以 ${score[0]} : ${score[1]} ${outcome}。`,`${roundLabel}战罢，${team} ${outcome}，比分定格在 ${score[0]} : ${score[1]}。`,`${team}在${roundLabel}中${outcome} ${opponent}，最终比分 ${score[0]} : ${score[1]}。`]);
  const personal=mode==='career'&&careerAfter?.lastMatch?`${careerAfter.name} 本场收获 ${careerAfter.lastMatch.goals} 球、${careerAfter.lastMatch.assists} 次助攻，评分 ${careerAfter.lastMatch.rating.toFixed(1)}。`:'';
  const table=competition==='league'?rankChange:'';
  const shotLine=stats?.shots?`双方射门 ${stats.shots[0]} : ${stats.shots[1]}，射正 ${stats.onTarget?.[0]??0} : ${stats.onTarget?.[1]??0}。`:'';
  const scorers=goalEvents.map(e=>`${e.minute}′ ${teamName(before,e.teamId)}：${e.scorerName}${e.assistName?`（${e.assistName} 助攻）`:''}`).join('；');
  return {id:`${year}:${competition}:${round}:${after.results.length}:${after.cup?.results?.length??0}`,year,round,mode,competition,source,type,team,opponent,score:[...score],shootout:shootout?.score??null,headline,lead,body:[personal,scorers&&`进球：${scorers}。`,table,shotLine].filter(Boolean).join(' '),stats:stats?{shots:[...(stats.shots??[0,0])],onTarget:[...(stats.onTarget??[0,0])],saves:[...(stats.saves??[0,0])]}:null};
}

export function addMatchNews(season,article){season.news=[...(season.news??[]),article].slice(-80);return season}
