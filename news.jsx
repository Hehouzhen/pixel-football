import React from 'react';

export function NewsPage({articles,selectedId,onSelect,onBack}){
  const issue=articles.find(item=>item.id===selectedId)??articles.at(-1);
  return <div className="news-page">
    <div className="news-topline"><button onClick={onBack}>← 返回赛季</button><span>像素绿茵体育 / 赛后新闻</span><span>{articles.length} 期存档</span></div>
    <div className="news-masthead"><div className="news-logo"><span className="news-logo-mark">▦</span><span>绿茵<span>电讯</span></span></div><p>PIXEL PITCH PRESS · EVERY MATCH HAS A RESULT</p></div>
    {!issue?<div className="news-empty"><h2>头版尚未印出</h2><p>完成俱乐部或 MyCareer 的正式比赛后，这里会出现赛后报道。</p></div>:<div className="news-layout"><article className="news-article"><div className="news-meta"><span>{issue.type==='result'?'赛后速报':'焦点头版'}</span><span>第 {issue.year} 赛季 · {issue.competition==='cup'?`杯赛${issue.round}`:`联赛第 ${issue.round} 轮`}</span></div><h1>{issue.headline}</h1><p className="news-lead">{issue.lead}</p><div className="news-score"><span>{issue.team}</span><strong>{issue.score.join(' : ')}</strong><span>{issue.opponent}</span></div>{issue.shootout&&<p className="news-shootout">点球大战 {issue.shootout.join(' : ')}</p>}<div className="news-copy"><p>{issue.body||'比赛已经结束，双方本场的表现计入赛季记录。'}</p></div>{issue.stats&&<div className="news-facts">{[['射门',issue.stats.shots],['射正',issue.stats.onTarget],['扑救',issue.stats.saves]].map(([label,values])=><div key={label}><span>{label}</span><b>{values.join(' : ')}</b></div>)}</div>}<div className="news-footer">{issue.source==='simulated'?'本轮由系统模拟 · 不提供场上复盘':'赛果与数据来自本场比赛记录'}</div></article><aside className="news-archive"><h2>往期报道</h2>{[...articles].reverse().map(item=><button key={item.id} className={item.id===issue.id?'selected':''} onClick={()=>onSelect(item.id)}><small>第 {item.year} 赛季 · {item.competition==='cup'?`杯赛${item.round}`:`第 ${item.round} 轮`}</small><strong>{item.headline}</strong><span>{item.score.join(' : ')}</span></button>)}</aside></div>}
  </div>;
}
