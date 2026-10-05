export function careerRows(player){return (player.history??[]).map((r,i)=>({...r,matchId:r.matchId??Math.max(1,player.stats.appearances-player.history.length+i+1)}))}

export function careerTimeline(player){
 const rows=careerRows(player),events=new Map();
 const add=(r,label)=>{const event=events.get(r.matchId)??{...r,labels:[]};if(!event.labels.includes(label))event.labels.push(label);events.set(r.matchId,event)};
 for(const r of player.memories??[])for(const label of r.reasons.filter(n=>n!=='我的收藏'))add(r,label);
 let goals=0,assists=0;
 for(const r of rows){
  if(r.matchId===1)add(r,'首秀');
  if(rows[0]?.matchId===1){if(!goals&&r.goals)add(r,'首次进球');if(!assists&&r.assists)add(r,'首次助攻')}
  goals+=r.goals;assists+=r.assists;
  if(r.goals>=3)add(r,'帽子戏法');
  if(r.roleAfter>r.roleBefore)add(r,['成长为新秀','成长为稳定主力','成长为球队核心','成长为俱乐部传奇'][r.roleAfter]);
  if(r.storyFinal)add(r,'杯赛决赛');if(r.storyChampion)add(r,'冠军之战');
  if((r.growth&&Object.values(r.growth).some(n=>n>0)))add(r,`成长至 LV.${r.level}`);
  if(player.position==='midfielder'&&(r.keyPasses??0)>=3)add(r,'组织代表作 · 3+关键传球');
  if(player.position==='defender'&&(r.tackles??0)+(r.interceptions??0)+(r.blocks??0)>=6)add(r,'防守代表作 · 6+有效防守');
 }
 return [...events.values()].sort((a,b)=>b.matchId-a.matchId).map(r=>({...r,report:rows.find(n=>n.matchId===r.matchId)?.report??r.report??null}));
}

export function selectSignature(player,matchId){const next=structuredClone(player);if(matchId===null){delete next.signatureMatchId;return next}if(next.memories?.some(r=>r.matchId===matchId))next.signatureMatchId=matchId;return next}
export const signatureMatch=player=>player?.memories?.find(r=>r.matchId===player.signatureMatchId)??null;

export function careerSeasonSummary(player,year){
 const rows=careerRows(player).filter(r=>r.season===year),stored=player.seasonLedger?.[String(year)],ledger=stored?.appearances>=rows.length?stored:null;
 if(!rows.length&&!ledger)return null;
 const sum=k=>rows.reduce((n,r)=>n+(r[k]??0),0),appearances=ledger?.appearances??rows.length;
 const first=rows[0],last=rows.at(-1),growth=Object.fromEntries(['shooting','passing','defense'].map(k=>[k,rows.length&&rows.every(r=>r.growth?.[k]!==undefined)?sumGrowth(rows,k):null]));
 return {year,rows,appearances,goals:ledger?.goals??sum('goals'),assists:ledger?.assists??sum('assists'),rating:appearances?(ledger?.ratingTotal??sum('rating'))/appearances:0,xp:ledger?.xpGain??sum('xpGain'),wins:ledger?.wins??rows.filter(r=>r.score[0]>r.score[1]).length,draws:ledger?.draws??rows.filter(r=>r.score[0]===r.score[1]).length,losses:ledger?.losses??rows.filter(r=>r.score[0]<r.score[1]).length,growth,first,last,best:rows.slice().sort((a,b)=>b.rating-a.rating||b.goals-a.goals).slice(0,3),detailedComplete:rows.length===appearances,contributions:['shots','shotsOnTarget','passes','passesCompleted','keyPasses','tackles','interceptions','blocks','turnovers'].map(k=>[k,!rows.length||rows.some(r=>r[k]===undefined)?null:sum(k)])};
}
function sumGrowth(rows,k){return rows.reduce((n,r)=>n+r.growth[k],0)}
