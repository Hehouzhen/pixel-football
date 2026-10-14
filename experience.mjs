export const STYLES={
  forward:[{id:'finisher',name:'禁区终结者',description:'近距离射门更稳定，推进速度略低'},{id:'runner',name:'跑动前锋',description:'冲刺更省体力，射门球速略低'}],
  midfielder:[{id:'creator',name:'组织核心',description:'传球落点更稳定，冲刺速度略低'},{id:'engine',name:'全能中场',description:'跑动更持久，传球球速略低'}],
  defender:[{id:'stopper',name:'拦截后卫',description:'抢断范围更大，传球球速略低'},{id:'ballplayer',name:'出球后卫',description:'传球更稳定，抢断范围略小'}]
};
export const styleName=id=>Object.values(STYLES).flat().find(s=>s.id===id)?.name??'均衡';
export {HAIRSTYLES} from './appearance.mjs';
export const SHOES=['#eef3dc','#e9c64a','#ef806a','#7ebfff','#b08ce0','#252d3a'];
export const CELEBRATIONS=['冲刺挥拳','滑跪','Siu 式旋跳'];
export const rate=(n,d)=>d?`${Math.round(n/d*100)}%`:'—';
export const OUTCOMES={goal:'进球',saved:'扑救',blocked:'封堵',woodwork:'击中门框',wide:'射偏',whistle:'未完成',pending:'进行中',lost:'丢失球权',foul:'赢得犯规'};
export function shotAdvice(shot){if(!shot)return '';if(shot.outcome==='saved')return shot.power!=null&&shot.power<.6&&shot.distance>20?'门将扑救｜远距离且力度偏轻，下次可增加力度或继续推进':'门将扑救｜机会已打正，留意补射机会';if(shot.outcome==='blocked')return shot.pressured?'后卫封堵｜出脚时有人贴近，先横向摆脱或寻找接应':'后卫封堵｜调整射门线路，避开防守球员';if(shot.outcome==='woodwork')return '击中门框｜球已打中门柱或横梁，准备争抢反弹球';if(shot.outcome==='wide')return '射偏｜对照瞄准点，微调鼠标方向';if(shot.outcome==='goal')return '进球｜这次选位与瞄准奏效，记住射门节奏';if(shot.outcome==='whistle')return '射门未完成';return OUTCOMES[shot.outcome]??''}
export function matchTip({hasBall=false,opponentHasBall=false,stamina=1,shotOpen=false,pressure=false}={}){if(!hasBall)return opponentHasBall?'先用 WASD 站到持球人正面；靠近后按 E 主动抢断。':'';if(stamina<.2)return '体能偏低：减少冲刺，避免带球时被追上。';if(shotOpen)return '已进入射门范围且通道畅通：鼠标瞄准守门员反方向，按住左键蓄力后松开。';if(pressure)return '防守者已贴近：先横向摆脱，或把球传给空位队友。';return '还没有形成射门通道：继续向前调整位置，或观察空位队友。'}
export function objectiveFor(position,round=0,duration=180){
  const pools={forward:[['shotsOnTarget',2,'射正'],['goals',1,'进球'],['keyPasses',2,'关键传球'],['headers',1,'头球攻门']],midfielder:[['forwardPasses',4,'有效向前传球'],['keyPasses',2,'关键传球'],['interceptions',2,'拦截'],['passesCompleted',8,'成功传球']],defender:[['tackles',2,'成功抢断'],['interceptions',2,'拦截'],['forwardPasses',3,'有效向前传球'],['blocks',1,'封堵射门']]};
  const [field,base,label]=pools[position][round%4],target=Math.max(1,Math.round(base*duration/180));return {field,target,label:`完成 ${target} 次${label}`};
}
export function matchInsights(report,side=0){const shots=report.shots.filter(s=>s.team===side),goals=shots.filter(s=>s.outcome==='goal').length,close=shots.filter(s=>s.x>.83&&Math.abs(s.y-.5)<.245).length;return [`${shots.length} 次射门，${goals} 次进球；进球转化率 ${rate(goals,shots.length)}`,`${close} 次射门来自禁区，${shots.length-close} 次来自禁区外`,`${shots.filter(s=>s.pressured).length} 次射门时附近有防守球员，${shots.filter(s=>s.outcome==='blocked').length} 次被封堵`];}
export function milestones(stat,score){const out=[];if(stat.goals>=3)out.push('单场帽子戏法');if(stat.goals>=1)out.push('首次进球');if(stat.assists>=1)out.push('首次助攻');if(stat.interceptions>=3)out.push('拦截高手');if(stat.tackles>=3)out.push('防线卫士');if(stat.headerGoals)out.push('头球破门');if(stat.bicycleGoals)out.push('倒钩破门');if(score[1]===0)out.push('帮助球队零封');return out;}
