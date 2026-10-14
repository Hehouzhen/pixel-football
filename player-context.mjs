export const TRAITS={
  quickPass:{name:'一脚出球',description:'受压时更愿意尽快传给队友'},
  forwardRun:{name:'前插跑位',description:'进攻推进时主动寻找身后空间'},
  holdUp:{name:'背身支点',description:'受压时更愿意护球等待接应'},
  earlyCross:{name:'提前传中',description:'边路有空间时更早送出传中'},
  press:{name:'主动压迫',description:'压迫战术下更积极逼抢，体能消耗也更大'},
  cover:{name:'补位意识',description:'队友前压时更积极填补防守空位'},
  composed:{name:'冷静处理',description:'受压时减少高风险处理'},
  riskyTackle:{name:'冒险抢断',description:'更积极出脚，但犯规风险增加'}
};
const pools=[['quickPass','composed'],['press','cover','riskyTackle'],['press','cover','riskyTackle'],['quickPass','forwardRun','earlyCross','composed'],['quickPass','forwardRun','earlyCross','composed'],['forwardRun','holdUp','composed']];
const hash=text=>{let n=2166136261;for(const char of String(text)){n^=char.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const validTraits=traits=>Array.isArray(traits)&&traits.length<=2&&new Set(traits).size===traits.length&&traits.every(id=>Object.hasOwn(TRAITS,id));
export function initialTraits(player){const pool=pools[player.position]??pools[5],first=hash(`${player.id}:trait`)%pool.length;return [pool[first],...(pool.length>2&&hash(`${player.id}:second`)%3===0?[pool[(first+1+hash(`${player.id}:offset`)%(pool.length-1))%pool.length]]:[])];}
export const hasTrait=(player,id)=>player?.traits?.includes(id)??false;
export const pairKey=(a,b)=>a<b?`${a}|${b}`:`${b}|${a}`;
export const chemistryScore=(pairs,a,b)=>a&&b&&a!==b?pairs?.[pairKey(a,b)]??50:50;
export const chemistryBonus=(pairs,a,b)=>clamp((chemistryScore(pairs,a,b)-50)*.0008,-.024,.032);
export function recordChemistry(season,result){
  if(!Array.isArray(result.playerStats))return;
  season.pairChemistry??={};
  for(const teamId of [result.home,result.away]){
    const players=result.playerStats.filter(row=>row.teamId===teamId&&(row.minutesPlayed??0)>0);
    for(let i=0;i<players.length;i++)for(let j=i+1;j<players.length;j++){
      const a=players[i],b=players[j],shared=Math.max(0,Math.min(a.minuteOff??90,b.minuteOff??90)-Math.max(a.minuteOn??0,b.minuteOn??0));
      if(shared<15)continue;
      const key=pairKey(a.playerId,b.playerId);
      season.pairChemistry[key]=clamp((season.pairChemistry[key]??50)+(shared>=60?4:2),50,90);
    }
  }
  if(Object.keys(season.pairChemistry).length>4000){
    for(const key of Object.keys(season.pairChemistry)){
      const [a,b]=key.split('|');if(!season.playerData[a]||season.playerData[a].teamId!==season.playerData[b]?.teamId)delete season.pairChemistry[key];
    }
    const keys=Object.keys(season.pairChemistry).sort((a,b)=>season.pairChemistry[a]-season.pairChemistry[b]||a.localeCompare(b));
    for(let i=0;i<keys.length-4000;i++)delete season.pairChemistry[keys[i]];
  }
}
