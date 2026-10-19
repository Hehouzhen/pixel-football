// MATCH-LEDGER-01: stable match identity, a small result contract and settlement
// receipts. This module must stay free of league/cup imports so every producer can
// use it without a module cycle.

export const MATCH_LEDGER_VERSION=2;
export const MATCH_SETTLEMENTS_LIMIT=4000;

const clone=value=>value===undefined?undefined:structuredClone(value);
const stable=value=>{
  if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
function digest(value){let hash=2166136261;for(const char of stable(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16).padStart(8,'0')}
// Four salted 32-bit passes give a 128-bit fingerprint: strong enough to compare
// settlement facts without storing a second copy of every match in every receipt.
function strongDigest(value){const text=stable(value);return [0,0x9e3779b9,0x85ebca6b,0xc2b2ae35].map((seed,index)=>{let hash=(2166136261^seed)>>>0;for(const char of text){hash^=char.charCodeAt(0)+index*13;hash=Math.imul(hash,16777619)}return (hash>>>0).toString(16).padStart(8,'0')}).join('')}
function isStrong(value){return typeof value==='string'&&/^([0-9a-f]{8}|[0-9a-f]{32})$/.test(value)}

// The deterministic identity of one fixture. Called before kickoff so retries reuse
// the same id instead of deriving it from an already advanced week/phase.
export function matchIdentity(season,{leagueId=season?.leagueId,competition='league',phase=null,round=null,week=0,home,away}={}){
  const year=season?.calendar?.startYear??2026+(season?.history?.length??0);
  const seasonId=`${leagueId}:${year}:${season?.seed??0}`;
  const stage=competition==='cup'?`${phase??'unknown'}:${round??0}`:`week:${week}`;
  return `${seasonId}:${competition}:${stage}:${home}:${away}`;
}

export function matchSeasonId(season,{leagueId=season?.leagueId}={}){
  const year=season?.calendar?.startYear??2026+(season?.history?.length??0);
  return `${leagueId}:${year}:${season?.seed??0}`;
}

// The documented result contract. Producers keep their own generation logic; this
// adapter makes the facts they already store explicit and separates shootouts,
// participant boundaries and completeness.
export function normalizeMatchResult(result,{context={}}={}){
  if(!result||!result.home||!result.away)throw new Error('比赛结果缺少主客队');
  if(!Array.isArray(result.score)||result.score.length!==2)throw new Error('比赛结果缺少比分');
  const penalties=Array.isArray(result.penalties)?[...result.penalties]:null;
  const participantRows=Array.isArray(result.playerStats)?result.playerStats:[];
  return {
    version:MATCH_LEDGER_VERSION,
    matchId:result.matchId??null,
    seasonId:result.seasonId??null,
    context:{
      competition:result.competition??context.competition??'league',
      leagueId:context.leagueId??null,
      phase:result.phase??context.phase??null,
      round:result.round??context.round??null,
      week:result.week??context.week??null,
      date:result.date??context.date??null,
      source:result.source??context.source??'unknown'
    },
    result:{home:result.home,away:result.away,score:[...result.score],shootout:penalties?{score:penalties,winner:result.winner??null}:null},
    participants:participantRows.map(row=>({
      playerId:row.playerId??null,
      teamId:row.teamId??null,
      name:row.playerName??null,
      number:row.shirtNumber??null,
      started:row.started!==false,
      minuteOn:row.minuteOn??0,
      minuteOff:row.minuteOff??null,
      minutesPlayed:row.minutesPlayed??null,
      played:(row.playingSeconds??0)>0||(row.minutesPlayed??0)>0||(row.started!==false&&row.minuteOn===0)
    })),
    events:Array.isArray(result.goalEvents)?result.goalEvents.map(event=>({minute:event.minute??null,teamId:event.teamId??null,scorerId:event.scorerId??null,assistId:event.assistId??null,ownGoal:event.ownGoal===true})):[],
    completeness:{
      participants:participantRows.length>0?'full':'missing',
      events:Array.isArray(result.goalEvents)?'full':result.report?'summary':'missing',
      score:true
    }
  };
}

export const SETTLEMENT_STAT_FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','crossesCompleted','tackles','tackleAttempts','interceptions','blocks','saves','goalsConceded','keeperSpills','fouls','yellows','reds','playingSeconds','keyPasses','forwardPasses','touches','distance','possession','headers','bicycles','headerGoals','bicycleGoals','penaltyGoals','xG','xA','dribbles','dribblesCompleted','aerialDuels','aerialWon','turnovers','carryDistance','minutesPlayed','minuteOn','minuteOff','started'];
const SETTLEMENT_STAT_FIELDS_V1=SETTLEMENT_STAT_FIELDS.filter(field=>field!=='bicycles');
function participantWith(row,fields){const out={playerId:row.playerId??null,teamId:row.teamId??null};for(const field of fields)out[field]=row[field]===undefined?null:row[field];return out}
function normalizeParticipantsWith(rows,fields){return (rows??[]).map(row=>participantWith(row,fields)).sort((a,b)=>stable([a.playerId,a.teamId]).localeCompare(stable([b.playerId,b.teamId])))}
function receiptFormat(row){if(!row)return null;if(row.version===2)return 'v2';if(row.version===1)return typeof row.digest==='string'&&row.digest.length===8?'v1-8':'v1-32';return typeof row.digest==='string'&&row.digest.length===8?'v1-8':'v2'}
function participant(row){
  const out={playerId:row.playerId??null,teamId:row.teamId??null};
  for(const field of SETTLEMENT_STAT_FIELDS)out[field]=row[field]===undefined?null:row[field];
  return out;
}
function normalizeParticipants(rows){
  return (rows??[]).map(participant).sort((a,b)=>stable([a.playerId,a.teamId]).localeCompare(stable([b.playerId,b.teamId])));
}
function normalizeTeamStats(stats){
  if(!stats||typeof stats!=='object')return null;
  return Object.fromEntries(Object.keys(stats).sort().map(key=>[key,Array.isArray(stats[key])?[...stats[key]]:stats[key]]));
}
function normalizeEvents(events){
  return (events??[]).map(event=>[event.minute??null,event.teamId??null,event.scorerId??null,event.assistId??null,event.ownGoal===true]).sort((a,b)=>stable(a).localeCompare(stable(b)));
}
// Full normalized business facts. Display timestamps, object key order and row order
// never participate; every field that can reach a cumulative total does.
export function legacyV1Fingerprint(result){return strongDigest({home:result.home??null,away:result.away??null,score:Array.isArray(result.score)?[...result.score]:null,penalties:Array.isArray(result.penalties)?[...result.penalties]:null,winner:result.winner??null,participants:normalizeParticipantsWith(result.playerStats,SETTLEMENT_STAT_FIELDS_V1),teamStats:normalizeTeamStats(result.stats),events:normalizeEvents(result.goalEvents)})}
export function legacyV1PlayerDigest(rows){return strongDigest(normalizeParticipantsWith(rows,SETTLEMENT_STAT_FIELDS_V1))}
export function resultFingerprint(result){
  return stable({
    home:result.home??null,
    away:result.away??null,
    score:Array.isArray(result.score)?[...result.score]:null,
    penalties:Array.isArray(result.penalties)?[...result.penalties]:null,
    winner:result.winner??null,
    participants:normalizeParticipants(result.playerStats),
    teamStats:normalizeTeamStats(result.stats),
    events:normalizeEvents(result.goalEvents)
  });
}
export function resultDigest(result){return digest(resultFingerprint(result))}
export function settlementReceipts(season){
  season.matchSettlements??=[];
  return season.matchSettlements;
}
// Receipts are never pruned. Archived receipts remain queryable so an old match
// cannot be replayed merely because it left the active array.
export function findSettlement(season,matchId){
  if(!matchId)return null;
  const archived=(season?.history??[]).flatMap(entry=>entry?.archive?.matchSettlements??[]);
  return [...(season?.matchSettlements??[]),...archived].find(row=>row?.matchId===matchId)??null;
}
function legacyPlayerSummary(rows){return (rows??[]).map(row=>[row.playerId??null,row.teamId??null,row.goals??0,row.assists??0,row.started!==false?1:0,row.sentOffMinute??row.minuteOff??null]).sort((a,b)=>stable(a).localeCompare(stable(b)))}
function isLegacyEight(row){return receiptFormat(row)==='v1-8'}
function assertReceiptMatches(receipt,result){
  const next=strongDigest({home:result.home,away:result.away,score:result.score,penalties:result.penalties??null,winner:result.winner??null,participants:normalizeParticipants(result.playerStats),teamStats:normalizeTeamStats(result.stats),events:normalizeEvents(result.goalEvents)});
  if(receipt.digest&&strongDigest({home:receipt.home,away:receipt.away,score:receipt.score,penalties:receipt.penalties,winner:receipt.winner,participants:receipt.participants??[],teamStats:receipt.teamStats??null,events:receipt.events??[]})!==next&&receipt.digest!==next)throw new Error(`比赛 ${receipt.matchId} 已结算，重复提交的结果不一致`);
}
// Record one settled match. Repeating the same id and content returns the existing
// receipt without any further side effect; different content is a hard conflict.
export function recordSettlement(season,result,{userTeamId=season?.teamId}={}){
  if(!result?.matchId)throw new Error('比赛编号缺失，不能记录结算');
  const receipts=settlementReceipts(season),existing=findSettlement(season,result.matchId);
  if(existing){
    const format=receiptFormat(existing);
    if(format==='v1-8'){
      if(existing.home!==result.home||existing.away!==result.away||stable(existing.score)!==stable(result.score))throw new Error(`比赛 ${result.matchId} 已结算，重复提交的结果不一致`);
      return {status:'already',receipt:existing};
    }
    if(format==='v1-32'){
      const next=strongDigest({home:result.home,away:result.away,score:result.score,penalties:result.penalties??null,winner:result.winner??null,participants:normalizeParticipantsWith(result.playerStats,SETTLEMENT_STAT_FIELDS_V1),teamStats:normalizeTeamStats(result.stats),events:normalizeEvents(result.goalEvents)});
      if(existing.digest!==next)throw new Error(`比赛 ${result.matchId} 已结算，重复提交的结果不一致`);
      return {status:'already',receipt:existing};
    }
    if(existing.digest&&existing.digest!==strongDigest({home:result.home,away:result.away,score:result.score,penalties:result.penalties??null,winner:result.winner??null,participants:normalizeParticipants(result.playerStats),teamStats:normalizeTeamStats(result.stats),events:normalizeEvents(result.goalEvents)}))throw new Error(`比赛 ${result.matchId} 已结算，重复提交的结果不一致`);
    return {status:'already',receipt:existing};
  }
  const receipt={
    version:MATCH_LEDGER_VERSION,
    matchId:result.matchId,
    seasonId:result.seasonId??matchSeasonId(season),
    competition:result.competition??'league',
    phase:result.phase??null,round:result.round??null,week:result.week??null,
    home:result.home,away:result.away,score:[...result.score],homeIsUser:result.home===userTeamId,
    penalties:Array.isArray(result.penalties)?[...result.penalties]:null,
    winner:result.winner??null,
    playerDigest:strongDigest(normalizeParticipants(result.playerStats)),
    teamDigest:strongDigest(normalizeTeamStats(result.stats)),
    eventDigest:strongDigest(normalizeEvents(result.goalEvents)),
    digest:strongDigest({home:result.home,away:result.away,score:result.score,penalties:result.penalties??null,winner:result.winner??null,participants:normalizeParticipants(result.playerStats),teamStats:normalizeTeamStats(result.stats),events:normalizeEvents(result.goalEvents)})
  };
  receipts.push(receipt);
  return {status:'new',receipt};
}
// Guard used by a producer before it advances any state. A receipt means the
// fixture is settled: no simulation, recovery, finance, growth or calendar step may
// run again. Every provided business fact is compared through its 128-bit digest.
export function assertSettlementRetry(season,matchId,options={}){
  const receipt=findSettlement(season,matchId);
  if(!receipt)return null;
  const {score,playerStats,stats,penalties,winner,events,userTeamId=season?.teamId}=options;
  if(Array.isArray(score)&&score.length===2){
    const expected=receipt.home===userTeamId?[...score]:[score[1],score[0]];
    if(expected[0]!==receipt.score[0]||expected[1]!==receipt.score[1])throw new Error(`比赛 ${matchId} 已结算，重复提交的比分不一致`);
  }
  const format=receiptFormat(receipt);
  if(format==='v1-8'){
    if(Array.isArray(playerStats)&&receipt.playerDigest&&digest(legacyPlayerSummary(playerStats))!==receipt.playerDigest)throw new Error(`比赛 ${matchId} 已结算，重复提交的球员数据不一致`);
    return receipt;
  }
  if(format==='v1-32'){
    if(Array.isArray(playerStats)&&playerStats.length&&receipt.playerDigest&&strongDigest(normalizeParticipantsWith(playerStats,SETTLEMENT_STAT_FIELDS_V1))!==receipt.playerDigest)throw new Error(`比赛 ${matchId} 已结算，重复提交的球员数据不一致`);
    if(stats&&typeof stats==='object'&&receipt.teamDigest){const oriented=Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,Array.isArray(value)?(receipt.home===userTeamId?[...value]:[...value].reverse()):value]));if(receipt.teamDigest!==strongDigest(normalizeTeamStats(oriented)))throw new Error(`比赛 ${matchId} 已结算，重复提交的球队数据不一致`)}
    if(Array.isArray(events)&&receipt.eventDigest&&receipt.eventDigest!==strongDigest(normalizeEvents(events)))throw new Error(`比赛 ${matchId} 已结算，重复提交的进球事件不一致`);
    if(Array.isArray(penalties)&&receipt.penalties){const own=receipt.home===userTeamId?[...penalties]:[penalties[1],penalties[0]];if(stable(own)!==stable(receipt.penalties))throw new Error(`比赛 ${matchId} 已结算，重复提交的点球比分不一致`)}
    return receipt;
  }
  if(Array.isArray(playerStats)&&playerStats.length&&receipt.playerDigest&&receipt.playerDigest!==strongDigest(normalizeParticipants(playerStats)))throw new Error(`比赛 ${matchId} 已结算，重复提交的球员数据不一致`);
  if(stats&&typeof stats==='object'&&receipt.teamDigest){
    const oriented=Object.fromEntries(Object.entries(stats).map(([key,value])=>[key,Array.isArray(value)?(receipt.home===userTeamId?[...value]:[...value].reverse()):value]));
    if(receipt.teamDigest!==strongDigest(normalizeTeamStats(oriented)))throw new Error(`比赛 ${matchId} 已结算，重复提交的球队数据不一致`);
  }
  if(Array.isArray(penalties)&&receipt.penalties){const own=receipt.home===userTeamId?[...penalties]:[penalties[1],penalties[0]];if(stable(own)!==stable(receipt.penalties))throw new Error(`比赛 ${matchId} 已结算，重复提交的点球比分不一致`)}
  if(Array.isArray(events)&&receipt.eventDigest&&receipt.eventDigest!==strongDigest(normalizeEvents(events)))throw new Error(`比赛 ${matchId} 已结算，重复提交的进球事件不一致`);
  if(winner&&receipt.winner&&winner!==receipt.winner)throw new Error(`比赛 ${matchId} 已结算，重复提交的胜者不一致`);
  return receipt;
}
export function carrySettlements(oldSeason,newSeason){
  newSeason.matchSettlements=clone(oldSeason?.matchSettlements??[]);
  return newSeason;
}
export function archiveSettlements(season){return clone(season?.matchSettlements??[])}
