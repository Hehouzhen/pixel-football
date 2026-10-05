import {getTeam,standings,seasonRounds,currentFixture} from './league.mjs';
import {cupNextMatch} from './cup.mjs';
export const ROLE_STAGES=['新秀','稳定主力','球队核心','俱乐部传奇'];
const requirements=[{appearances:6,points:8,goodGames:0,titles:0},{appearances:18,points:30,goodGames:5,titles:0},{appearances:42,points:80,goodGames:12,titles:1}];
export function positionContribution(stat={},position='forward'){
 const value=k=>stat[k]??0;
 const points=position==='defender'?Math.min(value('tackles'),5)*.5+Math.min(value('interceptions'),5)*.5+Math.min(value('blocks'),4)*.75:position==='midfielder'?value('assists')*2+Math.min(value('keyPasses'),4)*.75+Math.min(value('forwardPasses'),8)*.1+Math.min(value('passesCompleted'),10)*.05+value('goals')*.5:value('goals')*2+value('assists')+Math.min(value('shotsOnTarget'),4)*.5;
 return Math.min(6,points);
}
export function clubRecord(player,season){
 if(player.clubProgress?.[season.teamId])return player.clubProgress[season.teamId];
 const current=(season.history?.length??0)+1,name=getTeam(season.teamId)?.name,rows=(player.history??[]).filter(r=>(r.report?.teams?.[0]??(r.season===current&&!player.clubProgress?name:season.history?.[r.season-1]?.team))===name),record={appearances:rows.length,points:0,goodGames:0,titles:[]};
 for(const row of rows){const points=positionContribution(row,player.position);record.points+=points;if(row.rating>=7&&points>0)record.goodGames++;if(row.storyChampion)record.titles.push(`${row.season}:${row.competition}`)}
 const years=new Set(rows.map(r=>r.season));for(const year of years){const past=season.history?.[year-1];if(past?.champion===season.teamId)record.titles.push(`${year}:league`);if(past?.cupChampion===season.teamId)record.titles.push(`${year}:cup`)}
 if(years.has(current)){if(season.week===seasonRounds(season)&&standings(season)[0]?.id===season.teamId)record.titles.push(`${current}:league`);if(season.cup?.champion===season.teamId)record.titles.push(`${current}:cup`)}
 record.points=+record.points.toFixed(2);record.titles=[...new Set(record.titles)];return record;
}
export function roleProgress(player,season){
 const record=clubRecord(player,season),values={...record,titles:record.titles.length};let tier=0;for(const need of requirements){if(Object.entries(need).every(([k,n])=>values[k]>=n))tier++;else break}
 const target=requirements[tier]??null;return {tier,name:ROLE_STAGES[tier],next:ROLE_STAGES[tier+1]??null,record,target,checks:target?Object.entries(target).filter(([,n])=>n>0).map(([key,target])=>({key,target,value:values[key],complete:values[key]>=target})):[]};
}
export function rememberClub(player,season){const next=structuredClone(player);next.clubProgress={...next.clubProgress,[season.teamId]:structuredClone(clubRecord(player,season))};return next}
export function advanceClubRole(player,stat,context){
 const season=context.seasonState;if(!season)return player.clubProgress;
 const record=structuredClone(clubRecord(player,season)),points=positionContribution(stat,player.position);record.appearances++;record.points=+(record.points+points).toFixed(2);if(stat.rating>=7&&points>0)record.goodGames++;
 if(context.champion)record.titles=[...new Set([...record.titles,`${context.season??1}:${context.competition??'league'}`])];
 return {...player.clubProgress,[season.teamId]:record};
}
export function matchFeedback(stat={},position='forward'){
 const n=k=>stat[k]??0,positive=[];
 if(position==='forward'){if(n('goals'))positive.push(`${n('goals')}次进球`);if(n('shotsOnTarget'))positive.push(`${n('shotsOnTarget')}/${n('shots')}次射正`);if(n('assists'))positive.push(`${n('assists')}次助攻`)}
 else if(position==='midfielder'){if(n('keyPasses'))positive.push(`${n('keyPasses')}次关键传球`);if(n('assists'))positive.push(`${n('assists')}次助攻`);if(n('passesCompleted'))positive.push(`${n('passesCompleted')}/${n('passes')}次成功传球`);if(n('forwardPasses'))positive.push(`${n('forwardPasses')}次向前传球`)}
 else{if(n('tackles'))positive.push(`${n('tackles')}次成功抢断`);if(n('interceptions'))positive.push(`${n('interceptions')}次拦截`);if(n('blocks'))positive.push(`${n('blocks')}次封堵`)}
 const concern=n('reds')?'本场被罚下，球队失去一名场上球员。':n('turnovers')>=3?`本场丢失${n('turnovers')}次球权，受压时的处理需要改善。`:position==='forward'&&n('shots')>=3&&n('shotsOnTarget')/n('shots')<.4?'射正比例偏低，先跑出更好的出脚位置。':n('passes')>=5&&n('passesCompleted')/n('passes')<.6?'传球成功率偏低，接球人和线路都需要留出空间。':n('fouls')>=2?'本场犯规较多，靠近前先控制防守距离。':!positive.length?'本场还没有记录到主要位置贡献。':'本场未触发失误或纪律方面的重点提醒。';
 const advice=n('reds')||n('fouls')>=2?'先封线路、保持距离，避免从背后连续抢断。':n('turnovers')>=3?'接球前观察近身压力；有安全接应时尽早传球。':position==='forward'?'寻找禁区附近的空当；受压时用传球和补射创造机会。':position==='midfielder'?'先拉开接应角度，再寻找向前传球与二过一。':'优先守住球门与持球者之间的区域，再选择抢断时机。';
 return {positive:positive.length?positive.slice(0,3).join(' · '):'主要位置贡献暂未记录',concern,advice,points:+positionContribution(stat,position).toFixed(2)};
}
export function importantMatch(player,season,competition='league'){
 if(!player||!season)return null;
 if(competition==='cup'){if(!cupNextMatch(season))return null;return season.cup?.phase==='final'?{title:'欧洲冠军杯决赛',detail:'这一场决定冠军归属。个人贡献按正常规则记录。'}:season.cup?.phase==='semi'?{title:'欧洲冠军杯半决赛',detail:'争取进入决赛；不要因关键比赛而忽略正常传跑与防守。'}:null}
 if(!currentFixture(season))return null;
 if(!player.stats.appearances)return {title:'你的职业首秀',detail:'从一次跑位、一次接应开始。完成比赛后留下第一份档案。'};
 const table=standings(season),mine=table.find(r=>r.id===season.teamId),opponent=currentFixture(season).find(id=>id!==season.teamId),rival=table.find(r=>r.id===opponent),remaining=seasonRounds(season)-season.week;
 if(remaining<=3&&mine.points+remaining*3>=table[0].points&&(table.indexOf(mine)<=1||table.indexOf(rival)<=1))return {title:'争冠阶段的重要对阵',detail:`联赛还剩${remaining}轮，距当前榜首${table[0].points-mine.points}分。此战影响争冠形势，不保证胜利就夺冠。`};
 if(remaining===1)return {title:'联赛收官战',detail:'最后一轮联赛，完成本季的最后一份联赛表现记录。'};
 const previous=season.results.filter(r=>(r.home===season.teamId&&r.away===opponent)||(r.away===season.teamId&&r.home===opponent)).at(-1);
 if(previous){const side=previous.home===season.teamId?0:1;if(previous.score[side]<previous.score[1-side])return {title:'再次面对上次击败你的球队',detail:`上一次${previous.source==='simulated'?'模拟对阵':'对阵'}，球队以${previous.score[side]}:${previous.score[1-side]}落败。用这场检验你的应对。`}}
 return null;
}
