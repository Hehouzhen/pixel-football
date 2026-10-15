import React,{useState} from 'react';
import {CinematicScene as PixelScene} from './cinematic-scenes.jsx';
import {getTeam} from './clubs.mjs';
import {teamName} from './identity.mjs';
import {money,marketValue} from './player-value.mjs';
export {PixelScene};

export function CareerComic({player,season}){
  const [page,setPage]=useState(0),j=player.journey,team=getTeam(season.teamId),last=season.history?.at(-1),first=j?.memories?.find(m=>m.kind==='origin'),milestone=j?.memories?.find(m=>m.title==='第一份职业合同')??j?.memories?.find(m=>m.kind==='milestone');
  const pages=[{title:'第一盏灯',kind:'origin',identity:first?.scene,text:first?.text??`${player.name}，从第一次接应开始。`},{title:'球衣上的名字',kind:'contract',identity:milestone?.scene,text:milestone?.text??`你穿上${teamName(season,season.teamId)}的${player.number}号球衣，继续争取下一次机会。`},{title:last?'这一年，留在这里':'故事还在继续',kind:'season',text:last?`${last.team} · 联赛第 ${last.standing??'—'} 名 · ${last.summary?.goalsFor??0} 个球队进球。下一次走进球场时，这段经历仍属于你。`:`职业出场 ${player.stats.appearances} 次，${player.stats.goals} 个进球，${player.stats.assists} 次助攻。每一次上场，都在写下后面的故事。`}],scene=pages[page];
  return <section className="career-comic" aria-label="生涯漫画"><div className="comic-heading"><h3>{scene.title}</h3><span>{page+1} / {pages.length}</span></div><PixelScene player={scene.identity?.player??player} team={scene.identity?.team??(scene.kind==='origin'?getTeam(j?.homeTeamId??season.teamId):scene.kind==='contract'?getTeam(j?.contract?.teamId??season.teamId):team)} kind={scene.kind} caption={scene.text+(!scene.identity&&page<2?' · 旧记录未保存当时外观，显示当前形象。':'')}/><div className="comic-controls"><button disabled={page===0} onClick={()=>setPage(page-1)}>上一页</button><button disabled={page===pages.length-1} onClick={()=>setPage(page+1)}>下一页</button></div></section>;
}

export function CareerContract({player,season,locked=false}){
  const row=season.playerData[player.id]??player,last=player.transferHistory?.at(-1),professional=player.journey?.stage==='professional',value=marketValue({...row,...player});
  return <section className="career-contract-page"><h3>身价与合同</h3><p>估值反映能力、年龄、发展空间与近期表现；实际成交金额单独记录。</p><dl className="career-contract-facts"><div><dt>预计身价</dt><dd>{money(value)}</dd></div><div><dt>合同到期</dt><dd>{professional?row.contractEndYear??'未记录':'尚未签订'}</dd></div><div><dt>年薪</dt><dd>{professional&&row.contractWage!=null?money(row.contractWage):'签约后确定'}</dd></div><div><dt>最近成交</dt><dd>{last?.fee!=null?money(last.fee):last?'旧档未记录金额':professional?'青训签约 · 无转会费':'—'}</dd></div></dl><PixelScene player={player} team={getTeam(season.teamId)} caption={`${teamName(season,season.teamId)} · ${player.name} · ${player.number} 号`}/><h3>转会经历</h3>{player.transferHistory?.length?<ol className="contract-history">{[...player.transferHistory].reverse().map((move,i)=><li key={move.eventId??i}><span>{move.year} · {move.fromName} → {move.toName}</span><strong>{move.fee==null?'旧档未记录金额':money(move.fee)}</strong><small>{move.reason==='loan'?'一季租借':move.reason==='loan-return'?'租借归队':'正式转会'}</small></li>)}</ol>:<p>第一份球衣，也是第一段经历。未来的合同与交易会留在这里。</p>}</section>;
}
