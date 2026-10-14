const clamp=(n,min=1,max=99)=>Math.max(min,Math.min(max,Math.round(n)));
import {positionRating,ABILITIES} from './ratings.mjs';
const hash=text=>{let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0};
const pick=(id,year,values)=>values[hash(`${id}:${year}`)%values.length];

export function seasonStartYear(season){return season?.calendar?.startYear??2026+(season?.history?.length??0)}
export function seasonLabel(season){const year=seasonStartYear(season);return `${year}/${String(year+1).slice(-2)} 赛季`}

export function playerAgeProfile(id,position,attributes={}){
  const [min,max]=position===0?[24,32]:position<=2?[19,30]:position<=4?[19,29]:[18,29];
  const age=min+hash(`${id}:age`)%(max-min+1);
  const rating=positionRating({position,attributes});
  return {age,potential:clamp(rating+8+hash(`${id}:potential`)%16,60,96)};
}

export const validTrainingFocus=focus=>focus==='balanced'||ABILITIES.includes(focus);
function develop(player,year){
  const age=player.age,attrs=player.attributes??{},position=player.position,focus=validTrainingFocus(player.trainingFocus)?player.trainingFocus:'balanced';
  const physical=['speed','acceleration','strength','endurance'];
  const technical=position===0?['reflexes','handling','keeperPositioning','oneOnOne','passing','decisions']:position<=2?['defense','aerial','passing','marking','positioning','composure']:position<=4?['passing','firstTouch','longPassing','decisions','dribbling','offBall']:['shooting','firstTouch','offBall','composure','dribbling','aerial'];
  const before={...attrs},ratingBefore=positionRating(player),total=player.careerStats?.appearances??0,appearances=Math.max(0,total-(player.lastDevelopmentAppearances??0)),exposure=.6+.4*Math.min(1,appearances/25);
  if(age<=29&&ratingBefore<(player.potential??86)){
    const budget=Math.round((age<=20?8+hash(`${player.id}:${year}:growth`)%5:age<=24?5+hash(`${player.id}:${year}:growth`)%4:age<=28?2:1)*exposure);
    const options=[...technical,...(age<=24?physical:[])],gains={};
    for(let i=0;i<budget;i++){const key=focus!=='balanced'&&i<2?focus:pick(player.id,`${year}:${i}`,options);if((gains[key]??0)>=2||attrs[key]>=99||positionRating(player)>=(player.potential??86))continue;attrs[key]=clamp(attrs[key]+1);gains[key]=(gains[key]??0)+1}
  }
  if(age>=30){
    const amount=age>=36?3:age>=33?2:hash(`${player.id}:${year}:decline`)%2;
    const ordered=physical.slice().sort((a,b)=>hash(`${player.id}:${year}:${a}`)-hash(`${player.id}:${year}:${b}`));
    for(const key of ordered.slice(0,amount))attrs[key]=clamp((attrs[key]??60)-1);
    if(age>=36){const key=pick(player.id,year,technical);attrs[key]=clamp((attrs[key]??60)-1)}
    if(age<=34&&focus!=='balanced'&&!physical.includes(focus)&&hash(`${player.id}:${year}:veteran-training`)%2===0)attrs[focus]=clamp((attrs[focus]??60)+1);
  }
  if(position===0)attrs.goalkeeping=Math.round(['reflexes','handling','keeperPositioning','oneOnOne'].reduce((sum,key)=>sum+(attrs[key]??60),0)/4);
  player.lastDevelopmentAppearances=total;
  player.lastDevelopment={year,ageBefore:age-1,ageAfter:age,focus,appearances,ratingBefore,ratingAfter:positionRating(player),changes:Object.fromEntries(ABILITIES.filter(key=>attrs[key]!==before[key]).map(key=>[key,attrs[key]-(before[key]??attrs[key])]))};
}

export function advanceSeasonAges(season,career=null){
  const year=seasonStartYear(season);
  season.calendar={...(season.calendar??{}),startYear:year};
  for(const player of Object.values(season.playerData??{})){
    if(player.retired)continue;
    player.age??=playerAgeProfile(player.id,player.position,player.attributes).age;
    player.potential??=playerAgeProfile(player.id,player.position,player.attributes).potential;
    if(player.lastAgedStartYear===undefined){player.lastAgedStartYear=year;continue}
    if(player.lastAgedStartYear>=year)continue;
    for(let current=player.lastAgedStartYear+1;current<=year;current++){player.age++;develop(player,current)}
    player.lastAgedStartYear=year;
  }
  if(career){const player=season.playerData?.[career.id];if(player){career.age=player.age;career.potential=player.potential;career.attributes={...career.attributes,...player.attributes};if(player.lastDevelopment){career.developmentHistory=[...(career.developmentHistory??[]).filter(row=>row.year!==player.lastDevelopment.year),structuredClone(player.lastDevelopment)].slice(-60)}}}
  return season;
}
