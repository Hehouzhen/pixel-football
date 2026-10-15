import {teamSetup} from './team-tactics.mjs';

export const OPPONENT_PROFILES={
 block:{name:'低位防守',style:'counter',formation:'2-2-1',pattern:'vertical',line:-24,duties:['keeper','cover','cover','creator','engine','runner'],strengths:['双后卫优先保护中路','夺球后寻找身后空间'],weakness:'耐心转移，利用边路拉开防线'},
 wings:{name:'边路冲击',style:'balanced',formation:'2-2-1',pattern:'wide',line:5,duties:['keeper','cover','ballplayer','creator','engine','target'],strengths:['边路接应后寻找传中','近点与远点分工包抄'],weakness:'限制边路出球，争取反击中路'},
 control:{name:'中场控制',style:'possession',formation:'2-2-1',pattern:'support',line:8,duties:['keeper','cover','ballplayer','creator','engine','target'],strengths:['短距离接应，频繁回做','寻找上抢后留下的空间'],weakness:'保护中路，等待横向传递失误'},
 pressure:{name:'前场压迫',style:'press',formation:'1-2-2',pattern:'vertical',line:15,duties:['keeper','cover','engine','creator','runner','runner'],strengths:['更多人参与前场压迫','断球后直接攻击球门'],weakness:'提前出球，攻击压迫者身后'},
 pivot:{name:'支点反击',style:'counter',formation:'2-2-1',pattern:'vertical',line:-10,duties:['keeper','cover','ballplayer','engine','runner','target'],strengths:['支点回接，突击手前插','优先寻找纵向出球机会'],weakness:'保护支点身边的第二接应点'},
 rotation:{name:'灵活换位',style:'balanced',formation:'1-2-2',pattern:'support',line:8,duties:['keeper','cover','ballplayer','engine','creator','target'],strengths:['前锋回接，中场接力向前','增加前场短传接应点'],weakness:'保持区域保护，留意后排前插'}
};
export function profileFor(id='',style='balanced',override=null){const keys=style==='press'?['pressure']:style==='counter'?['block','pivot']:style==='possession'?['control']:['wings','control','rotation'],hash=[...String(id)].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0),key=Object.hasOwn(OPPONENT_PROFILES,override)?override:keys[hash%keys.length],profile=OPPONENT_PROFILES[key];return {id:key,...profile,setup:teamSetup({formation:profile.formation,duties:profile.duties})}}
export function chooseAdaptation(channels,passes,shots){const total=channels.reduce((a,b)=>a+b,0),peak=Math.max(...channels),channel=channels.indexOf(peak);if(total>=4&&peak/total>=.65)return {type:'screen',channel,note:channel===1?'对手加强中路保护，尝试转向两翼接应。':'对手开始保护你常用的边路，观察另一侧空间。',evidence:`上半场 ${peak}/${total} 次向前传递经过${['上侧边路','中路','下侧边路'][channel]}`};if(passes>=6&&shots<=1)return {type:'wide',channel:null,note:'对手开始增加边路推进与包抄，注意远点。',evidence:`上半场完成 ${passes} 次传球，仅 ${shots} 次射门`};return null}
