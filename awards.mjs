import {getLeague,playerRows,keeperLeaders,leagueAwards,standings} from './league.mjs';
import {teamName} from './identity.mjs';

const score=r=>(r.goals??0)*4+(r.assists??0)*2.5+(r.tackles??0)*.35+(r.interceptions??0)*.4+(r.saves??0)*.35;
const best=(rows,filter,weight=score)=>rows.filter(filter).sort((a,b)=>weight(b)-weight(a)||a.id.localeCompare(b.id))[0]??null;
const six=rows=>[best(rows,r=>r.index===0),best(rows,r=>r.index===1),best(rows,r=>r.index===2),best(rows,r=>r.index===3),best(rows,r=>r.index===4),best(rows,r=>r.index===5)];
export function nextCeremony(season){if(season.awards&&!season.seenAwards?.includes('league'))return 'league';if(season.cup?.phase==='complete'&&!season.seenAwards?.includes('europe'))return 'europe';return null}
export function ceremony(season,kind){
  if(kind==='league'){
    const rows=playerRows(season),a=season.awards??leagueAwards(season),defender=best(rows,r=>r.index===1||r.index===2,r=>(r.tackles??0)+(r.interceptions??0)*1.4+(r.blocks??0)*1.5);
    return {eyebrow:getLeague(season.leagueId).name.toUpperCase(),title:'联赛年度颁奖典礼',subtitle:`第 ${(season.history?.length??0)+1} 赛季 · 14 轮的答案`,awards:[['联赛冠军',teamName(season,a.champion),`${standings(season)[0]?.points??0} 积分`],['赛季最佳球员',a.mvp?.name,`${a.mvp?.goals??0} 球 · ${a.mvp?.assists??0} 助攻`],['金靴奖',a.goldenBoot?.name,`${a.goldenBoot?.goals??0} 球`],['助攻王',a.playmaker?.name,`${a.playmaker?.assists??0} 助攻`],['金手套',a.goldenGlove?.name,`${a.goldenGlove?.cleanSheets??0} 场零封`],['最佳防守球员',defender?.name,`${(defender?.tackles??0)+(defender?.interceptions??0)} 次抢断与拦截`]],lineup:six(rows)};
  }
  const cup=season.cup,rows=playerRows(cup),combined=rows.map(r=>({...r,league:season.players[r.id]??{},total:score(r)+score(season.players[r.id]??{})*.45+(r.teamId===cup.champion?8:0)})),ballon=best(combined,()=>true,r=>r.total),keeper=best(rows,r=>r.index===0,r=>(r.saves??0)*1.5),playmaker=best(rows,r=>r.index>0,r=>r.assists??0),defender=best(rows,r=>r.index===1||r.index===2,r=>(r.tackles??0)+(r.interceptions??0)*1.4+(r.blocks??0));
  return {eyebrow:'EUROPEAN FOOTBALL HONOURS',title:'欧洲足球年度颁奖典礼',subtitle:'欧洲冠军杯落幕 · 荣耀之夜',awards:[['欧洲冠军杯冠军',teamName(season,cup.champion),'欧洲之巅'],['年度金球奖',ballon?.name,`${ballon?.team??''} · 联赛与杯赛综合表现`],['欧洲金靴',cup.awards?.goldenBoot?.name,`${cup.awards?.goldenBoot?.goals??0} 球`],['欧洲助攻王',playmaker?.name,`${playmaker?.assists??0} 助攻`],['最佳门将',keeper?.name,`${keeper?.saves??0} 次扑救`],['最佳防守球员',defender?.name,`${(defender?.tackles??0)+(defender?.interceptions??0)} 次抢断与拦截`]],lineup:six(rows)};
}
