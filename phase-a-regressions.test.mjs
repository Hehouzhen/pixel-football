import assert from 'node:assert/strict';
import {Match} from './engine.mjs';
import {createSeason,simulateFixture,keeperLeaders,getTeam} from './league.mjs';
import {archiveSeason,upsertSeasonHistory,allTimePlayerLeaders,playerCareerDossier} from './history.mjs';
import {generateProspect} from './identity.mjs';
import {inquiry,offers,counterNegotiation,startNegotiation,finances} from './transfers.mjs';
import {handlePassInput} from './match-input.mjs';

const careerPass=new Match({careerIndex:5});careerPass.state='playing';careerPass.ball.owner=3;
let requests=0,kicks=0,beeps=0;
careerPass.requestPass=()=>{requests++;return true};careerPass.kick=()=>{kicks++;return true};
handlePassInput(careerPass,true,()=>beeps++);
assert.deepEqual([requests,kicks,beeps],[1,0,1],'MyCareer possession by a teammate requests a pass instead of remotely kicking');

const careerOwnBall=new Match({careerIndex:5});careerOwnBall.state='playing';careerOwnBall.ball.owner=5;careerOwnBall.pointer={x:700,y:280};
let aimedTarget=null;careerOwnBall.kick=(id,shoot,power,target)=>{aimedTarget=target;return true};careerOwnBall.requestPass=()=>{throw new Error('a player with the ball must pass it')};
handlePassInput(careerOwnBall,true);
assert.deepEqual(aimedTarget,{x:700,y:280},'controlled MyCareer player keeps pointer-directed passing');
const opponentHasBall=new Match({careerIndex:5});opponentHasBall.state='playing';opponentHasBall.ball.owner=11;let requestsWithoutBall=0;opponentHasBall.requestPass=()=>{requestsWithoutBall++;return false};
handlePassInput(opponentHasBall);assert.equal(requestsWithoutBall,1,'MyCareer can request the ball while the opponent has possession');
const clubPass=new Match();clubPass.state='playing';clubPass.ball.owner=3;let clubKicks=0;clubPass.kick=()=>{clubKicks++;return true};
handlePassInput(clubPass);assert.equal(clubKicks,1,'club mode keeps teammate-directed passing behavior');

for(let seed=1;seed<=35;seed++)for(const [home,away] of [['arsenal','chelsea'],['bayern','dortmund'],['milan','inter']]){
  const season=createSeason('england','arsenal',seed),match=simulateFixture(season,home,away,seed);
  for(const row of match.playerStats)assert((row.passesCompleted??0)<=(row.passes??0),`${row.playerId} completed more passes than attempts at seed ${seed}`);
  for(const [teamId,side] of [[home,0],[away,1]]){
    const rows=match.playerStats.filter(row=>row.teamId===teamId);
    assert.equal(rows.reduce((sum,row)=>sum+(row.passes??0),0),match.stats.passes[side]);
    assert.equal(rows.reduce((sum,row)=>sum+(row.passesCompleted??0),0),match.stats.passesCompleted[side]);
    assert.equal(rows.reduce((sum,row)=>sum+(row.goals??0),0),match.score[side]);
  }
}

const keeperSeason=createSeason('england','arsenal',31),oldKeeper=keeperSeason.rosterIds.arsenal[0],newKeeper=generateProspect(keeperSeason.playerData,'arsenal',0,2027);
keeperSeason.playerData[newKeeper.id]=newKeeper;keeperSeason.rosterIds.arsenal[0]=newKeeper.id;
const opposingKeeper=keeperSeason.rosterIds.chelsea[0],arsenalLineup=[...keeperSeason.rosterIds.arsenal],chelseaLineup=[...keeperSeason.rosterIds.chelsea];
keeperSeason.players[oldKeeper]={saves:2};keeperSeason.players[newKeeper.id]={saves:1};
keeperSeason.results=[
  {home:'arsenal',away:'chelsea',score:[0,0],playerStats:[{playerId:oldKeeper,teamId:'arsenal',index:0,saves:2},{playerId:opposingKeeper,teamId:'chelsea',index:0,saves:2}]},
  {home:'arsenal',away:'chelsea',score:[0,1],report:{playerIds:[...arsenalLineup,...chelseaLineup]}}
];
const keeperRows=keeperLeaders(keeperSeason),oldRecord=keeperRows.find(row=>row.id===oldKeeper),newRecord=keeperRows.find(row=>row.id===newKeeper.id);
assert.deepEqual([oldRecord.cleanSheets,oldRecord.conceded,oldRecord.saves],[1,0,2],'simulated clean sheet stays with the match goalkeeper');
assert.deepEqual([newRecord.cleanSheets,newRecord.conceded,newRecord.saves],[0,1,1],'played match report identifies the goalkeeper after a roster change');

const archivedSeason=createSeason('england','arsenal',45);archivedSeason.week=30;archivedSeason.calendar.startYear=2034;
const firstRow={archive:archiveSeason(archivedSeason)};archivedSeason.history=upsertSeasonHistory([],firstRow);
const refreshedArchive=archiveSeason(archivedSeason);
assert.equal(refreshedArchive.number,1,'re-archiving the current season preserves its stable season number');
archivedSeason.history=upsertSeasonHistory(archivedSeason.history,{archive:refreshedArchive,team:'Updated'});
assert.equal(archivedSeason.history.length,1,'repeat archive updates the existing season entry');
assert.equal(archivedSeason.history[0].team,'Updated');
const nextSeason={...archivedSeason,calendar:{startYear:2035},history:archivedSeason.history};
assert.equal(archiveSeason(nextSeason).number,2,'the next calendar season receives the next stable number');

const firstArchive={number:1,seasonStartYear:2034,leagues:[{leagueId:'england',players:[{id:'p',name:'Player',team:'Arsenal',teamId:'arsenal',index:5,appearances:12,goals:2}]}],cup:{players:[{id:'p',name:'Player',team:'Arsenal',teamId:'arsenal',index:5,appearances:2,goals:1}]}};
const secondArchive={number:2,seasonStartYear:2035,leagues:[{leagueId:'england',players:[{id:'p',name:'Player',team:'Arsenal',teamId:'arsenal',index:5,appearances:8,goals:1}]}]};
const history=[{archive:firstArchive},{archive:structuredClone(firstArchive)},{archive:secondArchive}],leader=allTimePlayerLeaders(history,'all','goals').find(row=>row.id==='p');
assert.deepEqual([leader.seasons,leader.appearances,leader.goals],[2,22,4],'league and cup count as one season, and duplicate archives are ignored');
assert.deepEqual([playerCareerDossier(history,'p').totals.appearances,playerCareerDossier(history,'p').totals.goals],[22,4]);

let transferSeason=createSeason('england','arsenal',17);
const target=offers(transferSeason).find(item=>item.position===5&&item.allowed&&item.fee<=finances(transferSeason).balance&&finances(transferSeason).wages-item.outgoingWage+item.wageExpectation<=finances(transferSeason).wageCap);
const market=inquiry(transferSeason,target.id);let negotiation=startNegotiation(transferSeason,target.id,{outgoingId:target.outgoingId,fee:1,salary:market.wageExpectation});
negotiation=counterNegotiation(negotiation.season,negotiation.talk.id,{});transferSeason=negotiation.season;
const incoming=transferSeason.playerData[target.id].transferHistory.at(-1),outgoing=transferSeason.playerData[target.outgoingId].transferHistory.at(-1);
assert.deepEqual([incoming.from,incoming.to,incoming.fromName,incoming.toName],[target.from,'arsenal',getTeam(target.from).name,'Arsenal']);
assert.deepEqual([outgoing.from,outgoing.to,outgoing.fromName,outgoing.toName],['arsenal',target.from,'Arsenal',incoming.fromName],'both transfer-history entries follow each player from their old club to their new club');

console.log('PASS: MyCareer pass routing, realistic simulated passing, goalkeeper clean sheets, idempotent archives, seasonal totals and transfer directions.');
