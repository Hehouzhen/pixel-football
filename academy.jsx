import React,{useState} from 'react';
import {academyState,academyUpgradeCost,academyBenchReleases,academyPromotionCost,promoteAcademyPlayer,upgradeAcademy,setAcademyFocus,initializeAcademy} from './academy.mjs';
import {squadPlayers} from './football-life.mjs';
import {positionRating} from './ratings.mjs';
import {finances} from './transfers.mjs';

const POSITION_NAMES=['门将','左后卫','右后卫','中场','边中场','前锋'];
export function AcademyPanel({season,onSave}){
 const [releaseByProspect,setReleaseByProspect]=useState({}),[message,setMessage]=useState(''),teamId=season.teamId,academy=academyState(season),squad=squadPlayers(season,teamId),bench=academyBenchReleases(season),money=finances(season),upgradeCost=academyUpgradeCost(academy.level),missing=season.academy?.teamId!==teamId;
 const apply=change=>{try{onSave(change());setMessage('')}catch(error){setMessage(error.message??'青训操作未能完成')}};
 return <section className="panel academy-panel"><div className="panel-label">YOUTH ACADEMY · CLUB DEVELOPMENT</div><h2>青训与俱乐部建设</h2><p className="club-copy">青训球员有独立身份和年龄；提升设施可提高新秀初始质量。提拔后进入一线队并计入 12 人阵容上限。</p>
  {missing?<><p>这份旧存档尚未建立青训名单。建立后获得两名 16–18 岁新秀。</p><button className="primary" onClick={()=>apply(()=>initializeAcademy(season,teamId))}>建立青年梯队</button></>:<>
   <div className="academy-summary"><span>设施等级 <b>{academy.level}/3</b></span><span>一线队 <b>{squad.length}/12</b></span><span>可用资金 <b>{money.balance.toFixed(1)}m</b></span></div>
   <div className="academy-controls"><label>青训重点<select aria-label="青训重点" value={academy.focus} onChange={event=>apply(()=>setAcademyFocus(season,event.target.value==='balanced'?'balanced':+event.target.value))}><option value="balanced">均衡培养</option>{POSITION_NAMES.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label><button className="subtle" disabled={academy.level>=3||money.balance<upgradeCost} onClick={()=>apply(()=>upgradeAcademy(season))}>{academy.level>=3?'设施已满级':`升级设施 · ${upgradeCost}m`}</button></div>
   <h3>青训名单 · {academy.prospects.length}/6</h3>
   {academy.prospects.map(id=>{const player=season.playerData[id];if(!player)return null;const releaseId=releaseByProspect[id]??'',needsRelease=squad.length>=12,compensation=academyPromotionCost(season,releaseId);return <article className="academy-prospect" key={id}><div><strong>{player.name}</strong><span>{POSITION_NAMES[player.position]} · {player.age} 岁 · 能力 {Math.round(positionRating(player))} · 潜力 {player.potential}</span><small>培养重点：{player.academyFocus??'均衡'}</small></div><div className="academy-action">{needsRelease&&<label>释放替补<select aria-label={`${player.name} 释放替补`} value={releaseId} onChange={event=>setReleaseByProspect({...releaseByProspect,[id]:event.target.value})}><option value="">先选择替补</option>{bench.map(item=><option value={item.id} key={item.id}>{item.name} · 补偿 {academyPromotionCost(season,item.id).toFixed(1)}m</option>)}</select></label>}<button className="subtle" disabled={needsRelease&&!releaseId||needsRelease&&money.balance<compensation} onClick={()=>apply(()=>promoteAcademyPlayer(season,id,releaseId||null))}>提拔入一线队</button></div></article>})}
   {!academy.prospects.length&&<p>本季青训名单已空；下一次休赛期将生成新一届球员。</p>}
   {academy.graduates?.length>0&&<details className="academy-graduates"><summary>已提拔球员 · {academy.graduates.length}</summary>{academy.graduates.slice(-6).reverse().map(row=><div key={`${row.id}:${row.year}`}><span>{row.year} · {row.age} 岁 · {POSITION_NAMES[row.position]}</span><b>{row.name}</b></div>)}</details>}
   <small>工资预算 {money.wages.toFixed(1)}m / {money.wageCap.toFixed(1)}m · 青训重点只影响新一届球员；设施升级从俱乐部资金扣除。</small>
  </>}
  {message&&<p className="save-error" role="alert">{message}</p>}
 </section>
}
