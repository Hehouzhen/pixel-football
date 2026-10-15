export const TACTIC_NAMES={balanced:'均衡组织',possession:'控球推进',press:'高位压迫',counter:'快速反击'};
export const TACTIC_HINTS={possession:'保持紧凑，封住中场短传接应点；不要盲目追球。',balanced:'封堵接应线路，等待转移中的抢断机会。',press:'尽快出球，寻找压迫球员身后的空间。',counter:'保留回防球员，避免失球后全员上抢。'};
export const ATTACK_PATTERN_NAMES={support:'短传推进',vertical:'快速纵深',wide:'边路配合'};
export const ATTACK_PATTERN_HINTS={support:'一人靠近做短传接应，一人适度前插，一人拉开宽度，最后一人留在球后保护。',vertical:'前插球员更早攻击身后，另一侧保持接应；传球机会更直接，失球时更依赖后方保护。',wide:'一人拉到边线提供出球点，进入进攻三区后两人分攻近点和远点，留一人保护回传。'};
export const isAttackPattern=pattern=>Object.hasOwn(ATTACK_PATTERN_NAMES,pattern);
export const attackPatternForStyle=style=>style==='counter'?'vertical':'support';
export function tacticalPlan(style='balanced',score=[0,0],team=0,progress=0,outfield=5){
 const late=progress>=.72,gap=score[team]-score[1-team],mentality=late&&gap<0?'chase':late&&gap>0?'protect':'normal';
 const line=(style==='press'?40:style==='counter'?-30:0)+(mentality==='chase'?35:mentality==='protect'?-45:0)-(5-outfield)*22;
 return {style,mentality,line,forward:mentality==='chase'?45:mentality==='protect'?-35:0,press:mentality==='chase'?1:mentality==='protect'?-1:0,shortHanded:outfield<5};
}
