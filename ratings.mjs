const clamp=(v,min=1,max=99)=>Math.max(min,Math.min(max,v));
export const ABILITY_GROUPS=[
  {label:'身体',fields:['speed','acceleration','strength','endurance']},
  {label:'控球',fields:['firstTouch','dribbling','shielding']},
  {label:'进攻',fields:['shooting','longShots','aerial']},
  {label:'传球',fields:['passing','longPassing','crossing']},
  {label:'防守',fields:['defense','marking']},
  {label:'判断',fields:['positioning','offBall','decisions','composure']},
  {label:'门将',fields:['reflexes','handling','keeperPositioning','oneOnOne']},
];
export const ABILITIES=ABILITY_GROUPS.flatMap(group=>group.fields);
export const ABILITY_LABELS={shooting:'终结',passing:'短传',defense:'抢断',shielding:'护球',goalkeeping:'守门综合',speed:'速度',firstTouch:'停球',endurance:'体能',aerial:'争顶',acceleration:'加速',strength:'力量',dribbling:'盘带',longShots:'远射',longPassing:'长传',crossing:'传中',marking:'盯人',positioning:'防守站位',offBall:'无球跑位',decisions:'决策',composure:'冷静',reflexes:'门将反应',handling:'门将接球',keeperPositioning:'门将站位',oneOnOne:'一对一'};
export const ABILITY_HELP={speed:'持续跑动的最高速度',acceleration:'起步和短距离抢先',strength:'身体与空中对抗',endurance:'体力消耗和恢复',firstTouch:'接球调整与失误',dribbling:'带球突破与控制',shielding:'保护球和抵抗抢断',shooting:'一般射门的执行质量',longShots:'远距离射门质量',aerial:'争顶和头球',passing:'短传与受压出球',longPassing:'长距离转移和过顶球',crossing:'传中落点',defense:'主动抢断的执行',marking:'跟住对手和限制接球',positioning:'封线路和补位',offBall:'接应、前插和寻找空间',decisions:'AI 选择动作和时机',composure:'受压时保持动作稳定',reflexes:'扑救反应速度',handling:'抱稳来球和减少脱手',keeperPositioning:'缩小角度和出击站位',oneOnOne:'面对单刀的封堵'};

// Missing abilities are derived once from the saved ratings; historical match data stays intact.
export function ensureRatings(a={}){
  for(const key of ['shooting','passing','defense','speed','shielding','firstTouch','endurance','aerial','goalkeeping'])a[key]??=60;
  const mean=(...keys)=>Math.round(keys.reduce((n,k)=>n+a[k],0)/keys.length);
  const defaults={acceleration:a.speed,strength:mean('shielding','aerial'),dribbling:mean('firstTouch','shielding'),longShots:a.shooting,longPassing:a.passing,crossing:a.passing,marking:a.defense,positioning:a.defense,offBall:mean('shooting','firstTouch'),decisions:mean('passing','defense'),composure:mean('firstTouch','passing'),reflexes:a.goalkeeping,handling:a.goalkeeping,keeperPositioning:a.goalkeeping,oneOnOne:a.goalkeeping};
  for(const [key,value] of Object.entries(defaults))a[key]??=value;
  return a;
}
export function skillValue(a,key){
  if(key==='goalkeeping'&&a?.reflexes!==undefined)return ['reflexes','handling','keeperPositioning','oneOnOne'].reduce((sum,field)=>sum+(a[field]??a.goalkeeping??60),0)/4;
  if(a?.[key]!==undefined)return a[key];
  return ensureRatings({...a})[key]??60;
}
export function positionRating(player,position=player.position){
  const weights=position===0?{reflexes:.3,handling:.25,keeperPositioning:.25,oneOnOne:.15,passing:.05}:position<=2?{defense:.22,marking:.2,positioning:.2,strength:.1,speed:.1,aerial:.1,passing:.08}:position<=4?{passing:.22,longPassing:.12,decisions:.18,firstTouch:.14,offBall:.08,positioning:.08,endurance:.1,dribbling:.08}:{shooting:.3,offBall:.2,acceleration:.12,firstTouch:.1,composure:.1,dribbling:.08,aerial:.1};
  return Math.round(Object.entries(weights).reduce((sum,[key,weight])=>sum+skillValue(player.attributes,key)*weight,0));
}
export const duelChance=(attack,defense,advantage=0)=>clamp(1/(1+Math.exp(-((attack-defense)*.035+advantage))),.06,.94);
export const passChance=(passing,touch,difficulty,pressure=0)=>clamp(.91+(passing-60)*.0022+(touch-60)*.001-difficulty*.18-pressure*.14,.3,.98);
