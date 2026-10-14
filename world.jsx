import React from 'react';
import {LEAGUES,getTeam} from './league.mjs';
import {worldHistory} from './world-history.mjs';

export function WorldDynamics({season}){
  const entries=(season.history??[]).filter(row=>row.offseason).slice(-5).reverse(),latest=season.worldOffseason??entries[0]?.offseason;
  const clubHistory=worldHistory(season.history??[]).filter(item=>item.seasons>0);
  return <div className="world-dynamics">
    <section className="panel schedule-panel">
      <div className="panel-label">WORLD SQUAD · SEASON ENGINE</div>
      <h2>全联赛球员世界</h2>
      <p>五个联赛、{LEAGUES.reduce((sum,league)=>sum+league.teams.length,0)} 支球队共同推进。球员年龄与能力每季变化；休赛期在一线队有空位时提拔青训新人，退役后由同位置球员接替；电脑球队按位置能力重新竞争首发。球员身份、荣誉和历史统计会继续保留。</p>
      <div className="world-league-grid">{LEAGUES.map(league=><div className="schedule-row" key={league.id}><strong>{league.name}</strong><span>{league.teams.length} 队 · {league.teams.length*6} 个首发席位</span></div>)}</div>
    </section>
    <section className="panel schedule-panel">
      <h2>最近一次休赛期</h2>
      {latest?<>
        <p>{latest.year}/{String(latest.year+1).slice(-2)} · {latest.development?.aged??0} 名球员年龄推进 · {latest.development?.improved??0} 人能力上升 · {latest.development?.declined??0} 人能力下滑 · {latest.retirements?.length??0} 人退役</p>
        <p>{latest.marketOpened?`转会市场开放；下一次预计 ${latest.nextMarketYear} 年。`:`转会市场预计 ${latest.nextMarketYear} 年开放。`}</p>
        {latest.transfers?.length?<div className="world-event-list">{latest.transfers.map(event=><article className="schedule-row" key={event.eventId}><strong>{event.league}</strong><span>{event.players[0]}：{event.fromName} → {event.toName}</span><small>互换球员：{event.players[1]} · 转会费 {event.fee}</small></article>)}</div>:<p>本次休赛期没有转会；球员成长与退役补位仍会结算。</p>}
        {latest.youthIntake?.length>0&&<details><summary>青训提拔 · {latest.youthIntake.length} 人</summary>{latest.youthIntake.map(p=><div className="schedule-row" key={p.id}><strong>{p.name}</strong><span>{getTeam(p.teamId)?.name} · {p.age} 岁</span></div>)}</details>}{latest.retirements?.length>0&&<details><summary>查看退役名单</summary>{latest.retirements.map(event=><div className="schedule-row" key={event.id}><span>{event.name}</span><small>{getTeam(event.teamId)?.name??event.teamId} · {event.age} 岁退役</small></div>)}</details>}
      </>:<p>完成首个赛季并推进新赛季后，这里会记录全联赛的成长、退役与转会。</p>}
    </section>
    <section className="panel schedule-panel world-legacy">
      <div className="panel-label">TITLES · RIVALRIES · ERAS</div><h2>王朝与宿敌</h2>
      <p>依据已保存的联赛赛果整理冠军走势。重复争夺前两名的球队会形成宿敌记录，交锋战绩只统计真实赛果。</p>
      {clubHistory.length?<div className="world-legacy-grid">{clubHistory.map(item=><article className="world-legacy-card" key={item.leagueId}><small>{item.league} · 已记录 {item.seasons} 个赛季</small><strong>{item.champion?getTeam(item.champion)?.name??item.champion:'—'}</strong><span>最近冠军{item.titleRun>1?` · 连续 ${item.titleRun} 次夺冠`:''}</span>{item.rival?<div className="schedule-row"><b>反复争冠</b><span>{getTeam(item.rival[0])?.name??item.rival[0]} · {getTeam(item.rival[1])?.name??item.rival[1]}</span><small>历史交锋 {item.record.wins} 胜 · {item.record.draws} 平 · {item.record.losses} 负</small></div>:<span>目前还没有重复出现的冠军争夺组合</span>}<details><summary>最近赛季</summary>{item.latest.map(row=><div className="schedule-row" key={row.year}><span>{row.year}/{String(row.year+1).slice(-2)}</span><strong>{getTeam(row.champion)?.name??row.champion}</strong><small>{row.runnerUp?`亚军：${getTeam(row.runnerUp)?.name??row.runnerUp}`:'亚军未记录'}</small></div>)}</details></article>)}</div>:<p>赛季结束并建立下一赛季后，这里会逐步形成各联赛的冠军榜、王朝和宿敌记录。</p>}
    </section>
    {entries.length>1&&<section className="panel schedule-panel"><h2>休赛期年鉴</h2>{entries.slice(1).map(row=><div className="schedule-row" key={row.offseason.year}><span>{row.offseason.year} 年</span><strong>{row.offseason.retirements?.length??0} 人退役</strong><span>{row.offseason.transfers?.length??0} 笔 AI 转会</span><small>下次转会窗：{row.offseason.nextMarketYear} 年</small></div>)}</section>}
  </div>;
}
