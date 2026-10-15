export const FORMATIONS={
 '2-2-1':{label:'2—2—1',hint:'双后卫保护，两翼接应，单前锋牵制。',points:[[.035,.5],[.23,.28],[.23,.72],[.38,.25],[.38,.75],[.46,.5]],duties:['keeper','cover','ballplayer','creator','engine','target']},
 '1-2-2':{label:'1—2—2',hint:'增加前场接应点，单后卫需要中场及时回收。',points:[[.035,.5],[.24,.5],[.35,.25],[.35,.75],[.47,.28],[.47,.72]],duties:['keeper','cover','ballplayer','engine','runner','target']}
};
export const DUTIES={keeper:{label:'门将',hint:'守门并提供回传出口。'},cover:{label:'保护后卫',hint:'留在球后，优先保护中路和反击通道。'},ballplayer:{label:'出球后卫',hint:'靠近持球人，受压时提供斜后方出球点。'},creator:{label:'组织中场',hint:'缩短接应距离，接球后优先寻找安全传递。'},engine:{label:'往返中场',hint:'进攻时接近禁区，失球后积极回到中场。'},target:{label:'支点前锋',hint:'回撤接应，受压时短暂护球等待队友跟进。'},runner:{label:'突击前锋',hint:'更早攻击身后空当，承担更长的冲刺距离。'}};
export const TACTIC_DETAILS={balanced:'保持两层接应和球后保护，攻守风险适中。',possession:'靠近接应、更多短传回做；推进较慢，受压失误仍会丢球。',counter:'回收防线，夺回球权后尽早纵向传递；接应距离更长。',press:'三人协同压迫、整条防线上提；消耗更大，身后更容易被打穿。'};
export function teamSetup(value,style='balanced'){
 const formation=Object.hasOwn(FORMATIONS,value?.formation)?value.formation:style==='press'?'1-2-2':'2-2-1';
 const order=Array.isArray(value?.order)&&value.order.length===6&&value.order[0]===0&&new Set(value.order).size===6&&value.order.every(i=>Number.isInteger(i)&&i>=0&&i<6)?[...value.order]:[0,1,2,3,4,5];
 const duties=FORMATIONS[formation].duties.map((fallback,i)=>i===0?'keeper':Object.hasOwn(DUTIES,value?.duties?.[i])&&value.duties[i]!=='keeper'?value.duties[i]:fallback);
 return {formation,order,duties};
}
export function validTeamSetup(value){if(!value||!Object.hasOwn(FORMATIONS,value.formation)||!Array.isArray(value.order)||!Array.isArray(value.duties)||value.duties.length!==6)return false;return JSON.stringify(teamSetup(value))===JSON.stringify({formation:value.formation,order:value.order,duties:value.duties})}
export function dutyFor(setup,index){return setup.duties[setup.order.indexOf(index)]??'cover'}
export function anchorFor(setup,index,attacking=false){const slot=setup.order.indexOf(index),point=FORMATIONS[setup.formation].points[slot<0?index:slot];return [point[0]+(index===0?0:attacking?.06:0),point[1]]}
export function simulationRole(setup,index){const duty=dutyFor(setup,index);return index===0?0:['cover','ballplayer'].includes(duty)?1:['target','runner'].includes(duty)?5:3}
