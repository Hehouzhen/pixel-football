import React from 'react';

export function LiveSimulationWindow({match,control,onChange,onTakeOver,onClose}){
  const ended=match.state==='ended',paused=match.state==='paused';
  function run(target=null){onChange({target});if(paused){match.halftimeBreak=false;match.state='playing'}}
  return <section className="panel live-simulation" aria-label="本场模拟窗口">
    <style>{`.live-simulation{margin-bottom:16px;border:1px solid #779359}.live-simulation-top{display:flex;justify-content:space-between;align-items:center;gap:12px}.live-simulation h2{margin:0}.live-simulation p{color:#bac8c8;line-height:1.6}.live-simulation-actions{display:flex;flex-wrap:wrap;gap:8px}.live-simulation-actions button[aria-pressed=true]{outline:2px solid #cbef80}.live-simulation-score{font-size:24px;color:#eee1ae;font-variant-numeric:tabular-nums}.live-simulation summary{cursor:pointer;color:#cdeb9d;margin-top:12px}@media(max-width:600px){.live-simulation-top{align-items:flex-start;flex-wrap:wrap}.live-simulation-actions button{flex:1 1 125px}.live-simulation-score{font-size:20px}}`}</style>
    <div className="live-simulation-top"><h2>本场模拟窗口</h2><b className="live-simulation-score">{match.score.join(' : ')} · {match.practice?`第 ${match.attempts.length+(ended?0:1)} / 10 次`:`${Math.min(90,Math.floor(match.time/match.duration*90))}′`}</b><button className="subtle" onClick={onClose}>收起窗口</button></div>
    <p role="status">{ended?'本场已结束，可查看下方赛果。':match.halftimeBreak?'中场休息，模拟已暂停。':paused?'模拟已暂停。':'AI 正在比赛，下方球场同步呈现。'} {match.practice?'训练按单次尝试结束，可再试一次。':'赛果沿用本场结算；中场会停下，等待你继续。'}</p>
    <div className="live-simulation-actions">
      <button className="primary" disabled={ended} onClick={()=>{if(paused)run();else{match.state='paused';onChange({target:null})}}}>{paused?'继续模拟':'暂停模拟'}</button>
      {[1,2,4,8].map(speed=><button className="subtle" key={speed} disabled={ended} aria-pressed={control.speed===speed&&control.target===null} onClick={()=>onChange({speed,target:null})}>{speed} 倍</button>)}
      {!match.practice&&<button className="subtle" disabled={ended||match.half!==1} onClick={()=>run(match.duration/2)}>模拟至中场</button>}
      <button className="subtle" disabled={ended} onClick={()=>run(match.duration)}>{match.practice?'模拟本次训练':'模拟至终场'}</button>
      <button className="subtle" disabled={ended} onClick={onTakeOver}>亲自接管</button>
    </div>
    <details><summary>查看最近事件</summary>{match.events.slice(-6).map((event,i)=><p key={i}>{event.minute}′ {event.text}</p>)}{!match.events.length&&<p>等待本场第一个事件。</p>}</details>
  </section>
}
