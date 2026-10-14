const GOALS={
 forward:[
  {id:'appearances',label:'站稳轮换',description:'至少出场 20 次',field:'appearances',target:20},
  {id:'goal-contributions',label:'持续制造威胁',description:'进球与助攻合计达到 15',field:'contributions',target:15},
  {id:'rating',label:'保持高水准',description:'至少出场 15 次，平均评分达到 6.8',field:'rating',target:6.8,minimumAppearances:15}
 ],
 midfielder:[
  {id:'appearances',label:'站稳轮换',description:'至少出场 20 次',field:'appearances',target:20},
  {id:'assists-key-passes',label:'成为进攻枢纽',description:'助攻与关键传球合计达到 34',field:'creation',target:34},
  {id:'rating',label:'保持高水准',description:'至少出场 15 次，平均评分达到 6.8',field:'rating',target:6.8,minimumAppearances:15}
 ],
 defender:[
  {id:'appearances',label:'站稳轮换',description:'至少出场 20 次',field:'appearances',target:20},
  {id:'defensive-actions',label:'成为防线支柱',description:'成功抢断与拦截合计达到 48',field:'defending',target:48},
  {id:'rating',label:'保持高水准',description:'至少出场 15 次，平均评分达到 6.8',field:'rating',target:6.8,minimumAppearances:15}
 ]
};

export const careerGoals=position=>GOALS[position]??GOALS.forward;

export function careerGoalProgress(player,seasonNumber,goalId=player?.seasonGoal?.goalId){
 const goal=careerGoals(player?.position).find(item=>item.id===goalId);
 if(!goal)return null;
 const rows=(player.history??[]).filter(row=>row.season===seasonNumber),ledger=player.seasonLedger?.[String(seasonNumber)];
 const appearances=ledger?.appearances??rows.length;
 const total=field=>rows.reduce((sum,row)=>sum+(row[field]??0),0);
 const value=goal.field==='appearances'?appearances:
  goal.field==='contributions'?total('goals')+total('assists'):
  goal.field==='creation'?total('assists')+total('keyPasses'):
  goal.field==='defending'?total('tackles')+total('interceptions'):
  appearances?(ledger?.ratingTotal??total('rating'))/appearances:0;
 return {...goal,season:seasonNumber,appearances,value:+value.toFixed(1),complete:value>=goal.target&&(!goal.minimumAppearances||appearances>=goal.minimumAppearances),progress:Math.min(100,Math.round(value/goal.target*100))};
}

export function chooseCareerGoal(player,seasonNumber,goalId){
 if(!careerGoals(player.position).some(goal=>goal.id===goalId))return structuredClone(player);
 const next=structuredClone(player);
 next.seasonGoal={season:seasonNumber,goalId};
 return next;
}

export function settleCareerGoal(player,seasonNumber){
 const next=structuredClone(player),current=next.seasonGoal;
 if(!current||current.season!==seasonNumber||next.goalHistory?.some(row=>row.season===seasonNumber))return next;
 const result=careerGoalProgress(next,seasonNumber,current.goalId);
 if(!result)return next;
 const record={season:seasonNumber,goalId:result.id,label:result.label,field:result.field,target:result.target,value:result.value,appearances:result.appearances,complete:result.complete};
 next.goalHistory=[...(next.goalHistory??[]),record].slice(-60);
 if(record.complete)next.honors=[...new Set([...(next.honors??[]),`${seasonNumber} 赛季 · ${record.label}`])].slice(-200);
 return next;
}
