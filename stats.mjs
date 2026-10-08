import {playerRows} from './league.mjs';

export const STAT_GROUPS=[
  {id:'attack',label:'进攻',fields:[['goals','进球'],['assists','助攻'],['shots','射门'],['shotsOnTarget','射正'],['headerGoals','头球进球'],['bicycleGoals','倒钩进球']]},
  {id:'creation',label:'组织',fields:[['passes','传球尝试'],['passesCompleted','成功传球'],['keyPasses','关键传球'],['forwardPasses','向前传球'],['crosses','传中尝试'],['crossesCompleted','成功传中']]},
  {id:'defense',label:'防守',fields:[['tackleAttempts','抢断尝试'],['tackles','抢断'],['interceptions','拦截'],['blocks','封堵'],['turnovers','丢失球权']]},
  {id:'efficiency',label:'效率',fields:[['shotAccuracy','射正率'],['shotConversion','射门转化率'],['passAccuracy','传球成功率'],['crossAccuracy','传中成功率'],['tackleSuccess','抢断成功率']]},
  {id:'keeper',label:'门将',fields:[['saves','扑救']]},
  {id:'discipline',label:'纪律',fields:[['fouls','犯规'],['yellows','黄牌'],['reds','红牌']]},
];

export const TEAM_STAT_GROUPS=[
  {id:'attack',label:'进攻',fields:[['goalsFor','进球'],['shots','射门'],['onTarget','射正']]},
  {id:'creation',label:'组织',fields:[['passes','传球尝试'],['passesCompleted','成功传球'],['crosses','传中']]},
  {id:'defense',label:'防守',fields:[['tackles','抢断'],['fouls','犯规']]},
  {id:'keeper',label:'门将',fields:[['saves','扑救']]},
  {id:'discipline',label:'纪律',fields:[['yellows','黄牌'],['reds','红牌']]},
];

export const POSITION_NAMES={0:'门将',1:'后卫',2:'后卫',3:'中场',4:'中场',5:'前锋'};
const RATE_STATS={shotAccuracy:['shotsOnTarget','shots'],shotConversion:['goals','shots'],passAccuracy:['passesCompleted','passes'],crossAccuracy:['crossesCompleted','crosses'],tackleSuccess:['tackles','tackleAttempts']};
export const RATE_DENOMINATORS=Object.fromEntries(Object.entries(RATE_STATS).map(([metric,[,denominator]])=>[metric,denominator]));

export function combinePlayerRows(...states){
  const combined=new Map();
  for(const state of states.filter(Boolean))for(const row of playerRows(state)){
    const current=combined.get(row.id);
    if(!current){combined.set(row.id,{...row,attributes:state.playerData?.[row.id]?.attributes,careerStats:state.playerData?.[row.id]?.careerStats,bestPerformance:state.playerData?.[row.id]?.bestPerformance});continue}
    for(const [field,value] of Object.entries(row)){
      if(['name','team','teamId','index'].includes(field))current[field]=value;
      else if(typeof value==='number')current[field]=(current[field]??0)+value;
    }
    current.attributes=state.playerData?.[row.id]?.attributes??current.attributes;
    current.careerStats=state.playerData?.[row.id]?.careerStats??current.careerStats;
    current.bestPerformance=state.playerData?.[row.id]?.bestPerformance??current.bestPerformance;
  }
  return [...combined.values()];
}

export function playerStatValue(player,field,format='total'){
  if(RATE_STATS[field]){const [numerator,denominator]=RATE_STATS[field];return player[denominator]>0&&typeof player[numerator]==='number'?player[numerator]/player[denominator]:null}
  const raw=player[field];
  if(typeof raw!=='number')return null;
  if(format==='perAppearance')return player.appearances>0?raw/player.appearances:null;
  return raw;
}

export function aggregateTeamRows(...states){
  const teams=new Map();
  for(const state of states.filter(Boolean))for(const result of state.results??[]){
    for(const side of [0,1]){
      const teamId=side===0?result.home:result.away;
      const row=teams.get(teamId)??{teamId,matches:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0};
      const goals=result.score?.[side]??0,against=result.score?.[1-side]??0;
      row.matches++;row.goalsFor+=goals;row.goalsAgainst+=against;
      const cupWinner=result.winner;
      if(cupWinner){if(cupWinner===teamId)row.wins++;else row.losses++}
      else if(goals>against)row.wins++;else if(goals<against)row.losses++;else row.draws++;
      for(const [field,values] of Object.entries(result.stats??{}))if(Array.isArray(values)&&typeof values[side]==='number')row[field]=(row[field]??0)+values[side];
      teams.set(teamId,row);
    }
  }
  return [...teams.values()];
}

export function queryTeamRows(rows,{search='',teamId='all',minMatches=0,metric='goalsFor',direction='desc'}={}){
  const term=search.trim().toLocaleLowerCase();
  return rows.filter(row=>(teamId==='all'||row.teamId===teamId)&&(row.matches??0)>=minMatches&&(!term||`${row.name??''} ${row.teamId}`.toLocaleLowerCase().includes(term))).sort((a,b)=>{
    const av=a[metric],bv=b[metric];
    if(typeof av!=='number'||typeof bv!=='number')return typeof av==='number'?-1:typeof bv==='number'?1:a.teamId.localeCompare(b.teamId);
    const primary=(bv-av)*(direction==='desc'?1:-1);
    return primary||a.teamId.localeCompare(b.teamId);
  });
}

export function queryPlayers(rows,{search='',teamId='all',position='all',minAppearances=0,minAttempts=0,metric='goals',format='total',direction='desc'}={}){
  const term=search.trim().toLocaleLowerCase();
  return rows.filter(row=>
    (teamId==='all'||row.teamId===teamId)&&
    (position==='all'||(position==='defender'?[1,2].includes(row.index):position==='midfielder'?[3,4].includes(row.index):position==='forward'?row.index===5:row.index===0))&&
    (row.appearances??0)>=minAppearances&&
    (!RATE_DENOMINATORS[metric]||(row[RATE_DENOMINATORS[metric]]??0)>=minAttempts)&&
    (!term||`${row.name} ${row.team}`.toLocaleLowerCase().includes(term))
  ).sort((a,b)=>{
    const av=playerStatValue(a,metric,format),bv=playerStatValue(b,metric,format);
    if(av===null||bv===null)return av===null?(bv===null?a.name.localeCompare(b.name):1):-1;
    const primary=(bv-av)*(direction==='desc'?1:-1);
    return primary||((b.goals??0)-(a.goals??0))||a.name.localeCompare(b.name);
  });
}
