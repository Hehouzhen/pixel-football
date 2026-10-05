export const TACTIC_NAMES={balanced:'控球推进',press:'高位压迫',counter:'快速反击'};
export const TACTIC_HINTS={balanced:'封堵接应线路，等待转移中的抢断机会。',press:'尽快出球，寻找压迫球员身后的空间。',counter:'保留回防球员，避免失球后全员上抢。'};
export function tacticalPlan(style='balanced',score=[0,0],team=0,progress=0,outfield=5){
 const late=progress>=.72,gap=score[team]-score[1-team],mentality=late&&gap<0?'chase':late&&gap>0?'protect':'normal';
 const line=(style==='press'?40:style==='counter'?-30:0)+(mentality==='chase'?35:mentality==='protect'?-45:0)-(5-outfield)*22;
 return {style,mentality,line,forward:mentality==='chase'?45:mentality==='protect'?-35:0,press:mentality==='chase'?1:mentality==='protect'?-1:0,shortHanded:outfield<5};
}
