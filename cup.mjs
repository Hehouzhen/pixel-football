import {recordLifeMatch} from './football-life.mjs';
import {LEAGUES,getTeam,fixtures,standings,simulate,simulateFixture,orientStats,addPlayer,playerRows,prepareSeason,createMatchRecord} from './league.mjs';
import {teamName,rosterRating} from './identity.mjs';

const hash=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))%100000,0),dice=seed=>{const x=Math.sin(seed*127.1+78.3)*43758.5453;return x-Math.floor(x)};
export function simulateShootout(season,home,away,seed){const scores=[0,0],ratings=[rosterRating(season,home),rosterRating(season,away)],base=hash(home)+hash(away)*3+(season.seed??0)*101+seed*17;for(let round=0;round<5;round++){for(let side=0;side<2;side++){const chance=Math.max(.62,Math.min(.86,.75+(ratings[side]-ratings[1-side])*.12));if(dice(base+round*2+side)<chance)scores[side]++}if(Math.abs(scores[0]-scores[1])>4-round)break}for(let round=0;round<6&&scores[0]===scores[1];round++){for(let side=0;side<2;side++){const chance=Math.max(.62,Math.min(.86,.75+(ratings[side]-ratings[1-side])*.12));if(dice(base+10+round*2+side)<chance)scores[side]++}if(scores[0]!==scores[1])break}const winner=scores[0]===scores[1]?(ratings[0]>=ratings[1]?home:away):scores[0]>scores[1]?home:away;return {winner,score:scores}}

function groupFixtures(group){const ids=[...group,null],rounds=[];for(let round=0;round<5;round++){const games=[];for(let i=0;i<3;i++){const a=ids[i],b=ids[5-i];if(a&&b)games.push(round%2?[b,a]:[a,b])}rounds.push(games);ids.splice(1,0,ids.pop())}return rounds}
function leagueTables(season){return LEAGUES.map(league=>{const prior=season.previousLeagueStandings?.[league.id];return prior?prior.slice(0,4):[...league.teams].sort((a,b)=>getTeam(b.id).strength-getTeam(a.id).strength||a.id.localeCompare(b.id)).slice(0,4).map(team=>team.id)})}
function groupsFor(tables,seed){const groups=Array.from({length:4},()=>[]);tables.forEach((table,league)=>{const draw=[...table];for(let i=draw.length-1;i>0;i--){const j=Math.floor(dice(seed+league*53+i*97)*(i+1));[draw[i],draw[j]]=[draw[j],draw[i]]}draw.forEach((team,group)=>groups[group].push(team))});return groups}
function v2(season){return season.cup?.formatVersion===2}

export function startCup(season){
  prepareSeason(season);if(!season.world||season.cup)return season;
  if(season.formatVersion!==2){
    const teams=LEAGUES.flatMap(league=>standings(season,league.id).slice(0,2).map(row=>row.id));
    season.cup={phase:'league',round:0,teams,fixtures:fixtures({teams:teams.map(id=>({id}))}).slice(0,4),results:[],players:{},names:{...season.names},rosterIds:season.rosterIds,playerData:season.playerData,semis:null,final:null,champion:null};settleCup(season);return season;
  }
  const groups=groupsFor(leagueTables(season),season.seed??0),schedule=Array.from({length:5},(_,round)=>groups.flatMap(group=>groupFixtures(group)[round]));
  season.cup={formatVersion:2,phase:'league',round:0,teams:groups.flat(),groups,fixtures:schedule,results:[],players:{},names:{...season.names},rosterIds:season.rosterIds,playerData:season.playerData,quarters:null,semis:null,final:null,champion:null};settleCup(season);return season;
}

export function cupNextMatch(season){
  const cup=season.cup;if(!cup||cup.phase==='complete')return null;
  if(!v2(season)){
    const games=cup.phase==='league'?cup.fixtures[cup.round]:cup.phase==='semi'?cup.semis:[cup.final];
    return games?.find(pair=>pair?.includes(season.teamId))??null;
  }
  const games=cup.phase==='league'?cup.fixtures[cup.round]:cup.phase==='quarterfinal'?cup.quarters?.[cup.round]:cup.phase==='semi'?cup.semis?.[cup.round]:[cup.final];
  return games?.find(pair=>pair?.includes(season.teamId))??null;
}

function tableFor(season,ids){const cup=season.cup,rows=ids.map(id=>({id,name:teamName(season,id),played:0,points:0,for:0,against:0}));for(const {home,away,score:[h,a]} of cup.results.filter(r=>r.phase==='league'&&ids.includes(r.home)&&ids.includes(r.away))){const x=rows.find(row=>row.id===home),y=rows.find(row=>row.id===away);x.played++;y.played++;x.for+=h;x.against+=a;y.for+=a;y.against+=h;if(h>a)x.points+=3;else if(a>h)y.points+=3;else{x.points++;y.points++}}return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.id.localeCompare(b.id))}
export function cupStandings(season,groupIndex=null){const cup=season.cup;if(!cup)return [];if(cup.formatVersion===2)return groupIndex===null?cup.groups.map((_,i)=>tableFor(season,cup.groups[i])):tableFor(season,cup.groups[groupIndex]??[]);const rows=cup.teams.map(id=>({id,name:teamName(season,id),played:0,points:0,for:0,against:0}));for(const {home,away,score:[h,a]} of cup.results.filter(r=>r.phase==='league')){const x=rows.find(row=>row.id===home),y=rows.find(row=>row.id===away);x.played++;y.played++;x.for+=h;x.against+=a;y.for+=a;y.against+=h;if(h>a)x.points+=3;else if(a>h)y.points+=3;else{x.points++;y.points++}}return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for)}

export function cupNeedsShootout(season,score){const cup=season.cup;if(!cup||!score)return false;if(cup.formatVersion!==2)return cup.phase!=='league'&&score[0]===score[1];if(cup.phase==='final')return score[0]===score[1];if(!['quarterfinal','semi'].includes(cup.phase)||cup.round!==1)return false;const pair=cupNextMatch(season),first=cup.results.findLast(r=>r.phase===cup.phase&&pair?.includes(r.home)&&pair?.includes(r.away));if(!first)return false;const homeScore=pair[0]===season.teamId?score[0]:score[1],awayScore=pair[0]===season.teamId?score[1]:score[0];return first.score[0]+awayScore===first.score[1]+homeScore}

function advanceV2(cup,winners){
  if(cup.phase==='league'){
    cup.round++;if(cup.round===5){const top=cup.groups.map((_,i)=>cupStandings({cup,teamNames:{}},i).slice(0,2)),first=[[top[0][0].id,top[1][1].id],[top[1][0].id,top[0][1].id],[top[2][0].id,top[3][1].id],[top[3][0].id,top[2][1].id]];cup.quarters=[first,first.map(([a,b])=>[b,a])];cup.phase='quarterfinal';cup.round=0;cup._winners=[]}return;
  }
  if(cup.phase==='quarterfinal'||cup.phase==='semi'){
    cup._winners??=[];if(cup.round===1)cup._winners.push(...winners);cup.round++;
    if(cup.round===2){if(cup.phase==='quarterfinal'){const w=cup._winners,first=[[w[0],w[2]],[w[1],w[3]]];cup.semis=[first,first.map(([a,b])=>[b,a])];cup.phase='semi';cup.round=0;cup._winners=[]}else{cup.final=[cup._winners[0],cup._winners[1]];cup.phase='final';cup.round=0;cup._winners=[]}}
    return;
  }
  cup.champion=winners[0];cup.phase='complete';cup.round=0;delete cup._winners;
  cup.awards={goldenBoot:playerRows(cup).filter(p=>p.index>0).sort((a,b)=>b.goals-a.goals||a.id.localeCompare(b.id))[0]??null};
}

function playV2Round(season,userScore,matchStats,teamStats,shootout,report,simulation=null){
  prepareSeason(season);const cup=season.cup;cup.rosterIds=season.rosterIds;cup.playerData=season.playerData;
  const phase=cup.phase,round=cup.round,games=phase==='league'?cup.fixtures[round]:phase==='quarterfinal'?cup.quarters[round]:phase==='semi'?cup.semis[round]:[cup.final],winners=[];
  for(const [home,away] of games){
    const own=home===season.teamId||away===season.teamId,homeIsUser=home===season.teamId,played=own&&userScore!==null;
    const seed=40+round+(['league','quarterfinal','semi','final'].indexOf(phase)*7),simulated=played?null:simulateFixture(season,home,away,seed,'cup'),score=played?(homeIsUser?[...userScore]:[userScore[1],userScore[0]]):simulated.score;
    const stats=played?orientStats(teamStats,homeIsUser)??simulate(home,away,seed,score,season.seed??0,['balanced','balanced'],season).stats:simulated.stats;
    const tie=phase==='quarterfinal'||phase==='semi',previous=tie&&round===1?cup.results.findLast(r=>r.phase===phase&&[r.home,r.away].includes(home)&&[r.home,r.away].includes(away)):null;
    let winner=null,penalties=null;
    if(phase==='final')winner=score[0]===score[1]?(played?shootout?.winner:simulateShootout(season,home,away,seed).winner):(score[0]>score[1]?home:away);
    else if(tie&&round===1){const currentHome=previous.score[1]+score[0],currentAway=previous.score[0]+score[1],aggregate=currentHome===currentAway;winner=aggregate?(played?shootout?.winner:simulateShootout(season,home,away,seed).winner):(currentHome>currentAway?home:away)}
    if(winner){winners.push(winner);if((phase==='final'||tie&&round===1)&&score[0]===score[1])penalties=played?(homeIsUser?shootout.score:[...shootout.score].reverse()):simulateShootout(season,home,away,seed).score}
    const details=played?simulation:simulated,record=createMatchRecord(season,{competition:'cup',phase,round,home,away,score,stats,userTeamId:season.teamId,report:played?report:null,playerStats:details?.playerStats??null,matchStats:played?matchStats:null,duration:report?.duration??null});cup.results.push({phase,round,home,away,score,stats,source:played?(simulation?.source??'played'):'simulated',...record,...(details?.weather?{weather:details.weather}:{}),...(report&&played?{report}:{}),...(details?.goalEvents?{goalEvents:details.goalEvents}:{}),...(winner?{winner}:{}),...(penalties?{penalties}:{})});
    const stage=phase==='league'?'小组赛':phase==='quarterfinal'?'八强':phase==='semi'?'半决赛':'决赛',context={competition:'cup',phase:stage,round:phase==='league'?round+1:stage};
    for(const row of record.playerStats)addPlayer(cup,row.teamId,row.index,row,{...context,score:row.teamId===home?score:[score[1],score[0]]});
  }
  advanceV2(cup,winners);
}

function playLegacyRound(season,userScore,matchStats,teamStats,shootout,report,simulation=null){
  prepareSeason(season);season.cup.rosterIds=season.rosterIds;season.cup.playerData=season.playerData;
  const cup=season.cup,phase=cup.phase,round=cup.round,games=phase==='league'?cup.fixtures[round]:phase==='semi'?cup.semis:[cup.final],winners=[];
  for(const [home,away] of games){const own=home===season.teamId||away===season.teamId,homeIsUser=home===season.teamId,played=own&&userScore!==null,seed=round+30+(['league','semi','final'].indexOf(phase)*10),simulated=played?null:simulateFixture(season,home,away,seed,'cup'),score=played?(homeIsUser?[...userScore]:[userScore[1],userScore[0]]):simulated.score,stats=played?orientStats(teamStats,homeIsUser)??simulate(home,away,seed,score,season.seed??0,['balanced','balanced'],season).stats:simulated.stats;let winner=null,penalties=null;if(phase!=='league'){const generated=score[0]===score[1]&&!played?simulateShootout(season,home,away,seed):null;winner=score[0]===score[1]?(played?shootout?.winner:generated.winner):(score[0]>score[1]?home:away);if(score[0]===score[1])penalties=played?(homeIsUser?shootout.score:[...shootout.score].reverse()):generated.score;winners.push(winner)}const details=played?simulation:simulated,record=createMatchRecord(season,{competition:'cup',phase,round,home,away,score,stats,userTeamId:season.teamId,report:played?report:null,playerStats:details?.playerStats??null,matchStats:played?matchStats:null,duration:report?.duration??null});cup.results.push({phase,round,home,away,score,stats,source:played?(simulation?.source??'played'):'simulated',...record,...(details?.weather?{weather:details.weather}:{}),...(played&&report?{report}:{}),...(details?.goalEvents?{goalEvents:details.goalEvents}:{}),...(winner?{winner}:{}),...(penalties?{penalties}:{})});const stage=phase==='league'?'league':phase==='semi'?'半决赛':'决赛',context={competition:'cup',phase:stage,round:phase==='league'?round+1:stage};for(const row of record.playerStats)addPlayer(cup,row.teamId,row.index,row,{...context,score:row.teamId===home?score:[score[1],score[0]]})}
  if(phase==='league'){cup.round++;if(cup.round===4){const top=cupStandings(season).slice(0,4);cup.semis=[[top[0].id,top[3].id],[top[1].id,top[2].id]];cup.phase='semi';cup.round=0}}else if(phase==='semi'){cup.final=winners;cup.phase='final';cup.round=0}else{cup.champion=winners[0];cup.phase='complete';cup.round=0;cup.awards={goldenBoot:playerRows(cup).filter(p=>p.index>0).sort((a,b)=>b.goals-a.goals)[0]}}
}

function playRound(season,...args){return v2(season)?playV2Round(season,...args):playLegacyRound(season,...args)}
function settleCup(season){while(season.cup?.phase!=='complete'&&!cupNextMatch(season))playRound(season,null,null,null,null,null)}
export function completeCupMatch(season,score,matchStats,teamStats,shootout=null,report=null,simulation=null){const pair=cupNextMatch(season);if(!pair)throw new Error('No cup match to complete');if(cupNeedsShootout(season,score)&&!pair.includes(shootout?.winner))throw new Error('Shootout winner required');playRound(season,score,matchStats,teamStats,shootout,report,simulation);settleCup(season);for(const result of season.cup.results)recordLifeMatch(season,result,30);return season}
