import {positionRating} from './ratings.mjs';

// Initial game calibration, not official ratings or a real national squad list.
export const NATIONAL_TEAMS=[
 {id:'chn',name:'中国',region:'亚洲',confederation:'AFC',color:'#bd3d41',secondary:'#ead19c',strength:'争取洲际突破',competition:'逐步争取位置',route:'先在俱乐部站稳，再争取国家队机会；团队突破需要更多队友一起成长。',cup:'亚洲杯 / 世界杯',bench:{forward:65,midfielder:66,defender:65}},
 {id:'arg',name:'阿根廷',region:'南美洲',confederation:'CONMEBOL',color:'#8ac5e0',secondary:'#f0eee0',strength:'争冠竞争者',competition:'位置竞争激烈',route:'在高水平竞争中找到自己的作用，替补奇兵和战术型球员也有发展空间。',cup:'美洲杯 / 世界杯',bench:{forward:88,midfielder:86,defender:84}},
 {id:'fra',name:'法国',region:'欧洲',confederation:'UEFA',color:'#344f91',secondary:'#eee8d8',strength:'争冠竞争者',competition:'阵容深度充足',route:'能力、近期表现与战术适配共同决定机会；争取名单和主力是两段不同的路。',cup:'欧洲杯 / 世界杯',bench:{forward:88,midfielder:85,defender:86}},
 {id:'jpn',name:'日本',region:'亚洲',confederation:'AFC',color:'#345c9f',secondary:'#f0eee0',strength:'洲际强队',competition:'稳定的职业竞争',route:'先争取国家队位置，再承担洲际成绩期待，寻找世界大赛的突破。',cup:'亚洲杯 / 世界杯',bench:{forward:77,midfielder:79,defender:77}},
 {id:'mar',name:'摩洛哥',region:'非洲',confederation:'CAF',color:'#ad4245',secondary:'#427b62',strength:'具备大赛突破能力',competition:'不同位置需求不同',route:'把俱乐部的特点带进国家队，在团队强项与短板之间找到自己的职责。',cup:'非洲杯 / 世界杯',bench:{forward:76,midfielder:78,defender:80}},
 {id:'nzl',name:'新西兰',region:'大洋洲',confederation:'OFC',color:'#e4e6df',secondary:'#344451',strength:'全球大赛挑战较大',competition:'争取成为可靠成员',route:'国家队机会与大赛难度形成反差，成为重要成员后仍需面对更强的对手。',cup:'大洋洲国家杯 / 世界杯',bench:{forward:65,midfielder:64,defender:65}}
];
export const nationById=id=>NATIONAL_TEAMS.find(n=>n.id===id)??null;
export function validInternational(value){return value===undefined||!!value&&typeof value==='object'&&!Array.isArray(value)&&value.version===1&&!!nationById(value.nationId)&&Object.keys(value).every(k=>['version','nationId'].includes(k))}
export function chooseNation(player,id){if(!nationById(id))throw new Error('未知代表国家');if(player.international)throw new Error('代表国家已经保存');return {...structuredClone(player),international:{version:1,nationId:id}}}

export function nationalAssessment(player){
 const nation=nationById(player.international?.nationId);if(!nation)return null;
 const rows=(player.history??[]).filter(r=>['league','cup'].includes(r.competition??'league')&&r.minutes!==0).slice(-8),average=rows.length?rows.reduce((n,r)=>n+(r.rating??6),0)/rows.length:null,minutes=rows.every(r=>Number.isFinite(r.minutes))?rows.reduce((n,r)=>n+r.minutes,0):null;
 const ability=positionRating({position:player.index,attributes:player.attributes}),reference=nation.bench[player.position],form=average===null?0:Math.max(-3,Math.min(3,(average-6.5)*2)),enough=rows.length>=3&&(minutes===null||minutes>=90),professional=!player.journey||player.journey.stage==='professional';
 let status='积累职业表现',reason='先在俱乐部获得职业出场；青年比赛不会计入成年国家队考察。';
 if(player.retired){status='职业生涯已结束';reason='已保留代表身份，本阶段不安排国家队征召。'}
 else if(professional&&rows.length){
  const gap=ability+form-reference;
  if(!enough){status='职业样本较少';reason='需要更多近期职业比赛，少量高分不会直接换来名单位置。'}
  else if(gap>=5){status='具备主力竞争条件';reason='能力与近期表现超过该位置的初步竞争参考线，仍需等待正式名单与战术安排。'}
  else if(gap>=-2){status='具备名单竞争条件';reason='已接近该位置的竞争水平，可以继续通过稳定出场与表现争取机会。'}
  else if(gap>=-10){status='有望进入考察范围';reason='已有职业表现，但距离该位置的竞争水平还有差距。'}
  else{status='继续在俱乐部成长';reason='该位置竞争较强，现阶段优先积累出场和发展自己的特点。'}
 }
 return {nation,status,reason,ability,reference,average,minutes,sample:rows.length,appearances:player.stats?.appearances??0};
}
