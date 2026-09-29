const POSITION={forward:{label:'前锋',index:5,primary:'shooting',attributes:{shooting:70,passing:58,defense:50}},midfielder:{label:'中场',index:3,primary:'passing',attributes:{shooting:58,passing:70,defense:56}},defender:{label:'后卫',index:1,primary:'defense',attributes:{shooting:52,passing:58,defense:70}}};
const FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','tackles','touches','fouls','yellows','reds','distance','possession','headers','bicycles'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export const POSITIONS=Object.entries(POSITION).map(([id,value])=>({id,label:value.label}));
export const positionLabel=id=>POSITION[id]?.label??'球员';

export function createCareerPlayer(name,number,position){
  const config=POSITION[position];
  if(!config)throw new Error('Unknown position');
  const clean=String(name).trim().slice(0,10);
  if(!clean)throw new Error('Player name is required');
  return {name:clean,number:clamp(Math.round(Number(number)||10),2,99),position,index:config.index,level:1,xp:0,attributes:{...config.attributes},stats:{appearances:0,wins:0,draws:0,losses:0,ratingTotal:0,...Object.fromEntries(FIELDS.map(field=>[field,0]))},lastMatch:null};
}

export function playerRating(stat={},score=[0,0]){
  const result=score[0]>score[1] ? .25 : score[0]<score[1] ? -.15 : 0;
  return clamp(6+result+(stat.goals??0)*1.55+(stat.assists??0)*.9+(stat.shotsOnTarget??0)*.12+(stat.passesCompleted??0)*.025+(stat.tackles??0)*.25-(stat.fouls??0)*.2-(stat.yellows??0)*.25-(stat.reds??0)*1.25,4,10);
}

export function finishCareerMatch(player,stat,score,duration){
  const next=structuredClone(player),match={};for(const field of FIELDS)match[field]=stat?.[field]??0;
  const rating=playerRating(match,score),xpGain=20+Math.round((rating-5)*10)+match.goals*12+match.assists*8,newXp=next.xp+Math.max(15,xpGain),newLevel=1+Math.floor(newXp/100),levels=newLevel-next.level;
  next.xp=newXp;next.level=newLevel;
  if(levels>0){const primary=POSITION[next.position].primary;for(const key of Object.keys(next.attributes))next.attributes[key]=Math.min(99,next.attributes[key]+levels*(key===primary?2:1))}
  next.stats.appearances++;next.stats[score[0]>score[1]?'wins':score[0]<score[1]?'losses':'draws']++;next.stats.ratingTotal+=rating;for(const field of FIELDS)next.stats[field]+=match[field];
  next.lastMatch={...match,rating:+rating.toFixed(1),xpGain:Math.max(15,xpGain),score:[...score],minutes:Math.round(duration/2)};
  return next;
}
