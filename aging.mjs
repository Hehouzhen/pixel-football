const clamp=(n,min=1,max=99)=>Math.max(min,Math.min(max,Math.round(n)));
const hash=text=>{let value=2166136261;for(const char of String(text)){value^=char.charCodeAt(0);value=Math.imul(value,16777619)}return value>>>0};
const pick=(id,year,values)=>values[hash(`${id}:${year}`)%values.length];

export function seasonStartYear(season){return season?.calendar?.startYear??2026+(season?.history?.length??0)}
export function seasonLabel(season){const year=seasonStartYear(season);return `${year}/${String(year+1).slice(-2)} 赛季`}

export function playerAgeProfile(id,position,attributes={}){
  const [min,max]=position===0?[24,32]:position<=2?[19,30]:position<=4?[19,29]:[18,29];
  const age=min+hash(`${id}:age`)%(max-min+1);
  const values=Object.entries(attributes).filter(([key])=>key!=='goalkeeping').map(([,value])=>value);
  const rating=values.length?values.reduce((a,b)=>a+b,0)/values.length:60;
  return {age,potential:clamp(rating+8+hash(`${id}:potential`)%16,60,96)};
}

function develop(player,year){
  const age=player.age,attrs=player.attributes??{},position=player.position;
  const physical=['speed','endurance'];
  const technical=position===0?['goalkeeping','passing']:position<=2?['defense','aerial','passing']:position<=4?['passing','firstTouch','shooting']:['shooting','firstTouch','speed'];
  if(age<=20){
    const average=technical.reduce((sum,key)=>sum+(attrs[key]??60),0)/technical.length;
    if(average<player.potential){const key=pick(player.id,year,technical);attrs[key]=clamp((attrs[key]??60)+1)}
  }else if(age<=24){
    if(hash(`${player.id}:${year}:growth`)%3===0){const key=pick(player.id,year,technical);if((attrs[key]??60)<player.potential)attrs[key]=clamp(attrs[key]+1)}
  }else if(age>=30){
    const decline=age>=36?1:age>=33?1:hash(`${player.id}:${year}:decline`)%2;
    for(let i=0;i<decline;i++){const key=pick(player.id,year+i,physical);attrs[key]=clamp((attrs[key]??60)-1)}
    if(age>=36&&hash(`${player.id}:${year}:technical`)%2===0){const key=pick(player.id,year,technical);attrs[key]=clamp((attrs[key]??60)-1)}
  }
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
    player.age++;
    develop(player,year);
    player.lastAgedStartYear=year;
  }
  if(career){const player=season.playerData?.[career.id];if(player){career.age=player.age;career.potential=player.potential;career.attributes={...career.attributes,...player.attributes}}}
  return season;
}
