import React from 'react';
import {PixelPlayer} from './ui.jsx';
import {DREAM_POSITIONS} from './dream-team.mjs';

const team={id:'dream-squad',name:'DREAM SQUAD',color:'#5b82d8',secondary:'#efeadd'};
const toneFor=player=>player.era==='current'?'current':player.position===0?'keeper':player.position===2?'wide':player.position===1?'guard':player.position===3?'midfield':'royal';

function PitchMotif({tone}){
  if(tone==='keeper')return <svg viewBox="0 0 320 300" aria-hidden="true"><path d="M35 296V51h250v245M55 296V73h210v223M35 51l20 22m230-22-20 22M35 100h250M35 144h250M35 188h250M35 232h250M80 51v245M125 51v245M170 51v245M215 51v245M260 51v245"/></svg>;
  if(tone==='wide')return <svg viewBox="0 0 320 300" aria-hidden="true"><path d="M-15 292C52 243 38 168 106 126S187 70 290-12M18 324C95 248 69 174 133 132S210 64 322-20M56 331C132 252 105 182 163 140S237 77 340-5M3 201h63m188-132h70"/></svg>;
  if(tone==='guard')return <svg viewBox="0 0 320 300" aria-hidden="true"><path d="M31 310V25h258v285M52 310V47h216v263M82 310V89h156v221M31 186h258M52 220h216M82 256h156"/></svg>;
  if(tone==='midfield')return <svg viewBox="0 0 320 300" aria-hidden="true"><circle cx="160" cy="149" r="91"/><circle cx="160" cy="149" r="119"/><path d="M-20 149h360M160-25v349M33 57l254 184M287 57 33 241"/></svg>;
  if(tone==='current')return <svg viewBox="0 0 320 300" aria-hidden="true"><path d="M-34 260 296-22M-19 281 314-4M-4 302 332 16M11 323 350 36M-28 152h116m-95 24H69m185-81h93m-78 24h78"/></svg>;
  return <svg viewBox="0 0 320 300" aria-hidden="true"><circle cx="160" cy="148" r="98"/><circle cx="160" cy="148" r="117"/><path d="M160-20v69M160 247v73M-10 148h70m200 0h70M42 30l50 50m135 135 50 50M278 30l-50 50M92 215l-50 50"/></svg>;
}

export function DreamPremiumCard({player}){
  if(player.cardArt)return <img className="dream-premium-card icon-special-card" data-premium-card-id={player.id} src={player.cardArt} alt={`${player.name} · ${player.editionName} · 99 分像素特卡`} width="1024" height="1536"/>;
  const tone=toneFor(player),current=player.era==='current',period=current?'ACTIVE':(player.referencePeriod?.split(' ')[0]??'PEAK'),surname=player.name.replace(/\s+(Jr\.?|Júnior)$/i,'').split(' ').at(-1);
  return <div className={`dream-premium-card tone-${tone}`} data-premium-card-id={player.id}>
    <div className="premium-header"><span className="premium-edition"><b>PP</b><span>{current?'CURRENT XI':'THE ARCHIVE'}<small>{player.editionName}</small></span></span><span className="premium-overall">{player.overall}<small>OVR</small></span></div>
    <div className="premium-stage"><div className="premium-energy" aria-hidden="true"><i/><i/></div><div className="premium-sparks" aria-hidden="true"/><div className="premium-motif"><PitchMotif tone={tone}/></div><span className="premium-surname" aria-hidden="true">{surname}</span><div className="premium-sprite"><PixelPlayer team={team} number={player.number} appearance={player.appearance} keeper={player.position===0}/></div><span className="premium-period">{period}</span><span className="premium-position-code">{player.gameRole} / {player.overall}</span></div>
    <div className="premium-footer"><div className="premium-foot-top"><span>{DREAM_POSITIONS[player.position]}</span><span>✧ {player.role.label}</span></div><strong>{player.name}</strong><div className="premium-foot-bottom"><span>{current?'当代球员档案':'巅峰时期档案'}</span><span>PIXEL PITCH</span></div></div>
  </div>;
}
