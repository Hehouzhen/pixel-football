import {LEAGUES,getTeam,fixtures,standings,simulate,orientStats,addPlayer,addSimulatedPlayers,playerRows} from './league.mjs';

export function startCup(season){
  if(!season.world||season.cup)return season;
  const teams=LEAGUES.flatMap(league=>standings(season,league.id).slice(0,2).map(row=>row.id));
  season.cup={phase:'league',round:0,teams,fixtures:fixtures({teams:teams.map(id=>({id}))}).slice(0,4),results:[],players:{},names:{...season.names},semis:null,final:null,champion:null};
  settleCup(season);
  return season;
}

export function cupNextMatch(season){
  const cup=season.cup;
  if(!cup||cup.phase==='complete')return null;
  const games=cup.phase==='league'?cup.fixtures[cup.round]:cup.phase==='semi'?cup.semis:[cup.final];
  return games?.find(pair=>pair?.includes(season.teamId))??null;
}

export function cupStandings(season){
  const cup=season.cup,rows=cup.teams.map(id=>({id,name:getTeam(id).name,played:0,points:0,for:0,against:0}));
  for(const {home,away,score:[h,a]} of cup.results.filter(r=>r.phase==='league')){
    const x=rows.find(row=>row.id===home),y=rows.find(row=>row.id===away);
    x.played++;y.played++;x.for+=h;x.against+=a;y.for+=a;y.against+=h;
    if(h>a)x.points+=3;else if(a>h)y.points+=3;else{x.points++;y.points++}
  }
  return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for);
}

function playRound(season,userScore,matchStats,teamStats,shootout,report){
  const cup=season.cup,phase=cup.phase,round=cup.round,games=phase==='league'?cup.fixtures[round]:phase==='semi'?cup.semis:[cup.final],winners=[];
  for(const [home,away] of games){
    const own=home===season.teamId||away===season.teamId,homeIsUser=home===season.teamId,played=own&&userScore;
    const score=played?(homeIsUser?[...userScore]:[userScore[1],userScore[0]]):simulate(home,away,round+30,undefined,season.seed??0).score;
    const stats=played?orientStats(teamStats,homeIsUser)??simulate(home,away,round+30,score,season.seed??0).stats:simulate(home,away,round+30,score,season.seed??0).stats;
    let winner=null,penalties=null;
    if(phase!=='league'){
      winner=score[0]===score[1]?(played?shootout.winner:(getTeam(home).strength>=getTeam(away).strength?home:away)):(score[0]>score[1]?home:away);
      if(score[0]===score[1])penalties=played?(homeIsUser?shootout.score:[...shootout.score].reverse()):winner===home?[5,4]:[4,5];
      winners.push(winner);
    }
    cup.results.push({phase,round,home,away,score,stats,source:played?'played':'simulated',...(played&&report?{report}:{}),...(winner?{winner}:{}),...(penalties?{penalties}:{})});
    if(played&&matchStats){const opponent=homeIsUser?away:home;for(let i=0;i<6;i++){addPlayer(cup,season.teamId,i,matchStats[i]);addPlayer(cup,opponent,i,matchStats[i+6])}}
    else{addSimulatedPlayers(cup,home,0,score[0],stats,round+30);addSimulatedPlayers(cup,away,1,score[1],stats,round+30)}
  }
  if(phase==='league'){
    cup.round++;
    if(cup.round===4){const top=cupStandings(season);cup.semis=[[top[0].id,top[3].id],[top[1].id,top[2].id]];cup.phase='semi';cup.round=0}
  }else if(phase==='semi'){
    cup.final=winners;cup.phase='final';cup.round=0;
  }else{
    cup.champion=winners[0];cup.phase='complete';cup.round=0;
    cup.awards={goldenBoot:playerRows(cup).filter(p=>p.index>0).sort((a,b)=>b.goals-a.goals)[0]};
  }
}

function settleCup(season){while(season.cup?.phase!=='complete'&&!cupNextMatch(season))playRound(season)}

export function completeCupMatch(season,score,matchStats,teamStats,shootout=null,report=null){
  const pair=cupNextMatch(season);
  if(!pair)throw new Error('No cup match to complete');
  if(season.cup.phase!=='league'&&score[0]===score[1]&&!pair.includes(shootout?.winner))throw new Error('Shootout winner required');
  playRound(season,score,matchStats,teamStats,shootout,report);
  settleCup(season);
  return season;
}
