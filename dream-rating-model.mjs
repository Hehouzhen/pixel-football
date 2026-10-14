import {ABILITY_LABELS,skillValue} from './ratings.mjs';

export const DREAM_RATING_MODEL_VERSION=4;
export const DREAM_GAME_ROLE_LABELS={GK:'门将',CB:'中后卫',FB:'边后卫',DM:'后腰',CM:'中场',AM:'前腰',WG:'边锋',WM:'边路组织者',ST:'中锋'};
export const DREAM_ROLE_WEIGHTS={
  GK:{reflexes:.28,handling:.24,keeperPositioning:.22,oneOnOne:.20,decisions:.03,passing:.03},
  CB:{defense:.24,marking:.22,positioning:.22,strength:.08,aerial:.08,speed:.05,decisions:.06,composure:.05},
  FB:{speed:.12,acceleration:.10,defense:.16,marking:.16,crossing:.12,endurance:.12,positioning:.10,passing:.07,decisions:.05},
  DM:{defense:.18,marking:.15,positioning:.16,passing:.11,decisions:.12,endurance:.10,strength:.08,longPassing:.06,firstTouch:.04},
  CM:{passing:.20,decisions:.18,firstTouch:.15,longPassing:.14,endurance:.10,dribbling:.10,positioning:.02,offBall:.04,composure:.05,speed:.02},
  AM:{dribbling:.16,passing:.15,decisions:.13,firstTouch:.13,shooting:.11,offBall:.10,acceleration:.08,longShots:.06,composure:.05,crossing:.03},
  WG:{speed:.16,acceleration:.15,dribbling:.17,crossing:.10,shooting:.13,offBall:.12,firstTouch:.08,passing:.04,composure:.03,strength:.02},
  WM:{crossing:.20,longPassing:.13,passing:.13,decisions:.13,firstTouch:.09,endurance:.09,composure:.06,dribbling:.08,speed:.09},
  ST:{shooting:.28,offBall:.20,composure:.15,acceleration:.07,firstTouch:.10,aerial:.04,speed:.04,dribbling:.05,strength:.03,decisions:.04},
};
export function dreamGameRole(player){return player.gameRole}
export function dreamOverall(player,role=dreamGameRole(player)){
  const weights=DREAM_ROLE_WEIGHTS[role];
  if(!weights)throw new Error(`Unknown Dream Squad role: ${role}`);
  return Math.round(Object.entries(weights).reduce((sum,[ability,weight])=>sum+skillValue(player.attributes,ability)*Math.round(weight*100),0)/100);
}
const roles={
  'keeper-line':['门线守护者','反应、接球和近门扑救',['reflexes','handling','keeperPositioning','oneOnOne'],['balanced','press','counter']],
  'keeper-sweeper':['出球门将','出球、出击和覆盖身后',['passing','longPassing','keeperPositioning'],['balanced','counter']],
  'def-stopper':['防线铁闸','盯人、抢断和防线判断',['defense','marking','positioning','aerial'],['press','balanced']],
  'def-playmaker':['出球中卫','防线阅读与传球组织',['passing','longPassing','decisions','positioning'],['balanced','counter']],
  'fb-overlap':['助攻边卫','传中、接应和边路推进',['crossing','speed','endurance','offBall'],['press','counter']],
  'fb-defender':['锁边后卫','盯人、站位和防守判断',['defense','marking','positioning'],['press','balanced']],
  'mid-anchor':['中场屏障','拦截、保护防线与位置纪律',['defense','marking','positioning','endurance'],['press','balanced']],
  'mid-playmaker':['比赛节拍器','传球、接球与组织判断',['passing','decisions','firstTouch','longPassing'],['balanced']],
  'mid-engine':['全能引擎','跑动覆盖与攻守衔接',['endurance','speed','strength','offBall'],['press','counter']],
  'wing-dribbler':['持球爆点','启动、盘带和持球突破',['dribbling','acceleration','speed','firstTouch'],['press','counter']],
  'wing-creator':['边路指挥官','传球、传中与创造机会',['crossing','passing','decisions','longPassing'],['balanced','counter']],
  'wing-inside':['内切攻击手','盘带、跑位与射门',['shooting','dribbling','offBall','acceleration'],['counter']],
  'striker-finisher':['禁区终结者','跑位、终结和受压稳定性',['shooting','offBall','composure'],['balanced','counter']],
  'striker-target':['锋线支点','争顶、护球与身体对抗',['aerial','strength','shielding','firstTouch'],['balanced']],
  'striker-speed':['纵深突击手','启动和攻击防线身后',['speed','acceleration','offBall','dribbling'],['counter']],
};
function sourceRole(player){
  const a=player.attributes;
  switch(player.gameRole){
    case 'GK':return (player.distributionRating??a.longPassing)>=65?'keeper-sweeper':'keeper-line';
    case 'CB':return a.passing>=78&&a.longPassing>=75?'def-playmaker':'def-stopper';
    case 'FB':return (a.crossing+a.offBall)/2>(a.marking+a.positioning)/2?'fb-overlap':'fb-defender';
    case 'DM':return (a.passing+a.longPassing+a.decisions)/3>(a.defense+a.marking+a.positioning)/3?'mid-playmaker':'mid-anchor';
    case 'CM':return a.endurance>=86&&a.speed>=75&&a.strength>=72?'mid-engine':'mid-playmaker';
    case 'AM':return (a.shooting+a.offBall)/2>(a.passing+a.decisions)/2?'wing-inside':'wing-creator';
    case 'WM':return 'wing-creator';
    case 'WG':return a.crossing>=a.dribbling&&a.passing>=a.acceleration?'wing-creator':a.shooting>=a.passing&&a.offBall>=a.crossing?'wing-inside':'wing-dribbler';
    case 'ST':return a.strength>=85&&a.aerial>=80&&a.speed<83?'striker-target':a.speed>=85&&a.acceleration>=85?'striker-speed':'striker-finisher';
    default:throw new Error(`Unknown role: ${player.gameRole}`);
  }
}
export function dreamRoleProfile(player){
  const id=player.archetype??sourceRole(player),definition=roles[id];
  if(!definition)throw new Error(`Unknown archetype: ${id}`);
  const [label,description,fields,tactics]=definition,a=player.attributes;
  const strengths=[...fields].sort((x,y)=>a[y]-a[x]).slice(0,3).map(key=>ABILITY_LABELS[key]);
  const weakFields=player.gameRole==='GK'?['speed','passing','longPassing']:['speed','strength','aerial','defense','endurance','shooting','passing'];
  const weaknesses=[...weakFields].sort((x,y)=>a[x]-a[y]).slice(0,2).map(key=>ABILITY_LABELS[key]);
  return {id,label,description,fields,tactics,strengths,weaknesses};
}
export function strongestRoleAbilities(role){return Object.entries(DREAM_ROLE_WEIGHTS[role]??{}).sort((a,b)=>b[1]-a[1]).map(([key])=>key)}
export const DREAM_HISTORY_IMPACT_RULE='Historical sources inform editorial comparisons; no history or source overall field is read by the ability formula.';
