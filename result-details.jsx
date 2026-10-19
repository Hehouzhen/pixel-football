import React from 'react';
import {teamName} from './identity.mjs';
import {resultGoalEvents} from './result-info.mjs';

export function ResultDetails({season,result}){
  const stats=result.stats,goals=resultGoalEvents(result,season),scoringTeams=[result.home,result.away].map(teamId=>({teamId,goals:goals.filter(goal=>goal.teamId===teamId)})).filter(side=>side.goals.length);
  return <div className="result-details"><small>{result.source==='simulated'?'模拟比赛':result.source==='played'?'实战比赛':'比赛来源未记录'} · {result.weather?.label??'天气未记录'}{stats?` · 射门 ${stats.shots?.join(' : ')??'—'} · 射正 ${stats.onTarget?.join(' : ')??'—'} · 成功传球 ${stats.passesCompleted?.join(' : ')??'—'}`:''}</small>
    {scoringTeams.length?scoringTeams.map(side=><p className="result-scorers" key={side.teamId}><strong>{teamName(season,side.teamId)}</strong>{side.goals.map((event,index)=><span key={`${event.minute}-${index}`}>{event.minute}′ {event.scorerName}{event.ownGoal?'（乌龙球）':''}{event.assistName?`（助攻 ${event.assistName}）`:''}</span>)}</p>):<p className="result-no-goals">{result.score[0]+result.score[1]===0?'暂无进球':'逐球记录未保存'}</p>}
  </div>;
}
