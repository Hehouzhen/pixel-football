import {sceneIdentity,validSceneIdentity} from './football-chronicle.mjs';
import {LEAGUES,getTeam,getLeague,createSeason,prepareSeason} from './league.mjs';
import {generateProspect,teamName} from './identity.mjs';
import {ensureRatings,positionRating} from './ratings.mjs';
import {playerRating} from './career.mjs';
import {positionContribution} from './career-role.mjs';
import {positionGroup} from './football-life.mjs';
import {nextCalendarFixture} from './calendar.mjs';
import {prepareFixtureTeams,recoveryAt} from './recovery.mjs';
import {careerDeal} from './player-value.mjs';
import {Match} from './engine.mjs';

export const JOURNEY_WISHES=[{id:'home',label:'让家乡被看见',text:'从熟悉的球场出发，争取上场和归属。'},{id:'ambition',label:'去最高的舞台',text:'接受更强的竞争，寻找跨级机会。'},{id:'expression',label:'踢出我的足球',text:'发展自己的特点，寻找适合的球队。'}];
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const quality=p=>positionRating({position:p.index,attributes:p.attributes});
const clone=value=>structuredClone(value);
const YOUTH=[{title:'灯亮之前',opponent:'河岸青年队',text:'第一次合练。从接应和跑位开始，让教练认识你的足球。',style:'balanced',boost:0},{title:'有人在等你的传球',opponent:'城南青年队',text:'队友开始认识你的习惯。试着把一次接应变成真正的机会。',style:'counter',boost:2},{title:'把球留下来',opponent:'港口青年队',text:'对手会主动逼抢。选择自己的处理方式，没有规定的正确踢法。',style:'press',boost:3},{title:'这次，为自己上场',opponent:'联合青年队',text:'毕业评估。四场比赛共同构成评价，一次失误不会结束你的道路。',style:'balanced',boost:4}];

function remember(j,title,text,kind='story',extra={}){j.memories=[...(j.memories??[]),{id:`${kind}:${j.memories?.length??0}:${j.played}`,title,text,kind,chapter:j.stage,...extra}].slice(-80)}
function addEvent(j,key){if(!j.pending&&!j.resolved.includes(key))j.pending=key}
export function initializeJourney(player,season,wish='home'){
  const p=clone(player),s=clone(season);p.id=`career:${s.seed}:${p.position}:${encodeURIComponent(p.name)}`;p.age=17;
  for(const key of Object.keys(p.attributes))p.attributes[key]=Math.max(35,p.attributes[key]-12);
  p.attributes=ensureRatings(p.attributes);
  p.journey={version:1,stage:'academy',wish:JOURNEY_WISHES.some(w=>w.id===wish)?wish:'home',homeTeamId:s.teamId,played:0,trust:36,focus:'balanced',approach:'balanced',pending:'arrival',resolved:[],choices:[],youthResults:[],memories:[],trainingUsed:[],clubGames:0,clubs:[s.teamId],lastFeedback:null};
  s.playerData[p.id]={id:p.id,name:p.name,number:p.number,position:p.index,teamId:s.teamId,age:p.age,potential:p.potential,attributes:clone(p.attributes),appearance:clone(p.appearance),academy:true,lastAgedStartYear:s.calendar.startYear,honors:[],awardHistory:[],retired:false,traits:[]};
  const partner=generateProspect(s.playerData,s.teamId,p.index===5?3:5,s.calendar.startYear,19);partner.name='林泽';partner.age=17;partner.academy=true;s.playerData[partner.id]=partner;
  const rival=generateProspect(s.playerData,s.teamId,p.index,s.calendar.startYear,21);rival.name='周宁';rival.age=17;rival.academy=true;s.playerData[rival.id]=rival;
  p.journey.cast={coach:'陈教练',partnerId:partner.id,rivalId:rival.id};
  remember(p.journey,'第一盏球场灯',`${teamName(s,s.teamId)}青训。${p.name}，17岁，第一次来到这座球场。`,'origin',{scene:sceneIdentity(p,s)});prepareSeason(s,p);return {season:s,player:p};
}
export function youthFixture(p){const j=p.journey,index=Math.min(j.youthResults.length,3),base=YOUTH[index];return {...base,index,trial:j.approach==='trial'&&index===2,title:j.approach==='trial'&&index===2?'第一次成人合练':base.title,opponent:j.approach==='trial'&&index===2?'一线队轮换阵容':base.opponent,boost:base.boost+(j.approach==='trial'&&index===2?7:0)}}
export function createYouthMatch(p,s,difficulty=1,duration=180){
  const f=youthFixture(p),j=p.journey,attrs=Array.from({length:12},(_,id)=>ensureRatings({shooting:54+(id%6===5?8:0),passing:57,defense:54,shielding:54,speed:60,firstTouch:56,endurance:65,aerial:54}));
  for(let id=6;id<12;id++)for(const key of Object.keys(attrs[id]))attrs[id][key]+=f.boost;
  attrs[p.index]=clone(p.attributes);const partnerIndex=p.index===5?3:5;attrs[partnerIndex]=Object.fromEntries(Object.entries(s.playerData[j.cast.partnerId].attributes).map(([key,v])=>[key,clamp(v-12,35,72)]));
  const ids=Array(12).fill(null);ids[p.index]=p.id;ids[partnerIndex]=j.cast.partnerId;
  const m=new Match({difficulty,duration,teams:[`${teamName(s,s.teamId)} U18`,f.opponent],careerIndex:p.index,careerNumber:p.number,careerLook:p.appearance,careerAttributes:p.attributes,careerStyle:p.style,playerAttributes:attrs,playerIds:ids,styles:['balanced',f.style],round:f.index});
  m.colors=[getTeam(s.teamId).color??'#85c9ed','#d2a66e'];m.journeyYouth=true;m.journeyFixture=f;m.journeyIntro=f.title;return m;
}
export function finishYouthMatch(p,m){
  const next=clone(p),j=next.journey,stat=m.stats[m.careerIndex],rating=+playerRating(stat,m.score,p.position).toFixed(1),report=m.report();delete report.heat;
  const row={title:m.journeyFixture.title,opponent:m.teams[1],score:[...m.score],rating,goals:stat.goals,assists:stat.assists,passesCompleted:stat.passesCompleted,tackles:stat.tackles,report};j.youthResults.push(row);j.played++;next.trainingPoints++;
  const contribution=positionContribution(stat,p.position);j.trust=clamp(j.trust+(rating-6)*3+contribution);
  j.lastFeedback=stat.turnovers>=3?'受压时丢球偏多。下一次可以先观察接应，也可以练习护球。':contribution>0?`教练记下了你的${p.position==='forward'?'进攻贡献':p.position==='midfielder'?'传递和组织':'防守贡献'}。继续把这些动作稳定地踢出来。`:'教练还在观察你。保持跑位和接应，下一场仍然有机会。';
  remember(j,j.youthResults.length===1?'青训首场比赛':row.title,`${row.opponent} · ${row.score.join(' : ')} · 评分 ${rating}。${j.lastFeedback}`,'match',{report});
  if(j.youthResults.length===1)addEvent(j,'pressure');if(j.youthResults.length===2)addEvent(j,'trial');
  if(j.youthResults.length>=4){j.stage='contract';j.pending=null;remember(j,'灯亮之后，路向远方','评估已经结束。你可以选择第一份职业合同，或再踢一场青年热身。','milestone')}
  return next;
}
export function firstContractOffers(p,s){
  const j=p.journey,homeLeague=LEAGUES.find(l=>l.teams.some(t=>t.id===j.homeTeamId)),avg=j.youthResults.reduce((n,r)=>n+r.rating,0)/(j.youthResults.length||1),all=LEAGUES.flatMap(l=>l.teams.map(t=>({...t,leagueId:l.id,leagueName:l.name}))).filter(t=>t.strength<=1.02&&(s.squadIds[t.id]?.length??10)<12);
  const near=all.filter(t=>t.leagueId===homeLeague.id).sort((a,b)=>(j.wish==='expression'?Number(b.style==='balanced')-Number(a.style==='balanced'):0)||a.strength-b.strength)[0],abroad=all.filter(t=>t.leagueId!==homeLeague.id).sort((a,b)=>a.strength-b.strength||a.id.localeCompare(b.id))[0],challenge=all.filter(t=>t.id!==near?.id&&t.id!==abroad?.id).sort((a,b)=>b.strength-a.strength)[0];
  return (j.wish==='ambition'?[challenge,near,abroad]:[near,abroad,challenge]).filter(Boolean).map(t=>{const i=t.id===near?.id?0:t.id===abroad?.id?1:2;return {teamId:t.id,teamName:teamName(s,t.id),leagueId:t.leagueId,leagueName:t.leagueName,role:i===2&&avg<7?'培养对象':'轮换竞争者',title:['在熟悉的地方起步','去另一片球场','接受更强的竞争'][i],rationale:i===0?'愿意给年轻球员替补机会。你的青训搭档也将进入这支球队。':i===1?'换一个联赛重新开始，从适应新队友和节奏做起。':avg>=7?'青训的稳定表现赢得关注，首发仍需要在职业比赛中争取。':'球队愿意培养你，但同位置竞争更激烈。',strength:t.strength};});
}
function register(s,id,teamId){const p=s.playerData[id];p.teamId=teamId;p.academy=false;p.freeAgent=false;p.contractEndYear=s.calendar.startYear+2;p.squadRole='prospect';s.squadIds[teamId]=[...new Set([...(s.squadIds[teamId]??s.rosterIds[teamId]),id])];}
export function signFirstContract(p,s,teamId){
  const offer=firstContractOffers(p,s).find(o=>o.teamId===teamId);if(!offer||p.journey.stage!=='contract')throw new Error('请选择当前有效的职业合同');
  const next=clone(p),j=next.journey,world=createSeason(offer.leagueId,teamId,s.seed);world.playerData=clone(s.playerData);world.rosterIds=clone(s.rosterIds);world.squadIds=clone(s.squadIds);world.calendar={...s.calendar,dated:true};world.teamNames=clone(s.teamNames??{});register(world,p.id,teamId);const deal=careerDeal(p,s,teamId,'first');world.playerData[p.id].contractWage=deal.annualWage;j.contractFee=0;
  const recommended=firstContractOffers(p,s).find(o=>o.title==='在熟悉的地方起步')?.teamId??firstContractOffers(p,s)[0].teamId;register(world,j.cast.partnerId,recommended);
  const rivalTeam=LEAGUES.find(l=>l.id===offer.leagueId).teams.filter(t=>t.id!==teamId&&(world.squadIds[t.id]?.length??10)<12).sort((a,b)=>a.strength-b.strength)[0];register(world,j.cast.rivalId,rivalTeam.id);
  next.age=18;world.playerData[p.id].age=18;next.attributes.endurance=Math.min(99,next.attributes.endurance+2);world.playerData[p.id].attributes=clone(next.attributes);j.stage='professional';j.clubs=[teamId];j.clubGames=0;j.pending='first-contract';j.resolved=j.resolved.filter(key=>key!=='first-contract');j.contract={teamId,role:offer.role,years:2};j.partnerTeamId=recommended;j.rivalTeamId=rivalTeam.id;
  remember(j,'第一份职业合同',`${offer.teamName}。${offer.role}，两年合同。${offer.rationale}`,'milestone',{scene:sceneIdentity(next,world)});prepareSeason(world,next);return {season:world,player:next};
}
export function journeyOpportunity(p,s){
  if(!p?.journey||p.journey.stage!=='professional')return null;const j=p.journey,candidates=(s.squadIds[s.teamId]??s.rosterIds[s.teamId]).map(id=>s.playerData[id]).filter(q=>q.id!==p.id&&positionGroup(q.position)===positionGroup(p.index)&&!q.retired&&!q.freeAgent),rival=candidates.sort((a,b)=>positionRating(b)-positionRating(a))[0],gap=quality(p)-(rival?positionRating(rival,p.index):quality(p)),recent=(p.history??[]).slice(-4),form=recent.length?recent.reduce((n,r)=>n+r.rating,0)/recent.length:6,readiness=recoveryAt(s.playerData[p.id],nextCalendarFixture(s)?.date??s.calendar.currentDate??`${s.calendar.startYear}-08-01`).readiness;
  const starter=j.clubGames>=2&&readiness>.55&&(j.trust>=57||gap>=-4&&form>=6.7),minuteOn=starter?0:readiness<.55?70:j.clubGames<2?60:j.trust>=45?45:65;
  return {starter,minuteOn,role:starter?'首发机会':`替补 · 预计 ${minuteOn}′ 登场`,rival:rival?.name??'同位置队友',reason:readiness<.55?'身体尚未完全恢复。教练准备让你在后半场登场。':j.clubGames<2?'职业起步，先在下半场争取下一次机会。':starter?'近期贡献与训练表现赢得了这次首发。':`教练仍在比较你与${rival?.name??'同位置队友'}。下半场依然有证明自己的时间。`};
}
export function prepareJourneyLineup(s,p,opportunity){
  const all=(s.squadIds[s.teamId]??s.rosterIds[s.teamId]).map(id=>s.playerData[id]).filter(q=>q.id!==p.id&&!q.retired&&!q.freeAgent),used=new Set(),lineup=[];
  for(let slot=0;slot<6;slot++){if(opportunity.starter&&slot===p.index){lineup.push(p.id);used.add(p.id);continue}const q=all.filter(q=>!used.has(q.id)&&positionGroup(q.position)===positionGroup(slot)).sort((a,b)=>positionRating(b,slot)-positionRating(a,slot))[0];if(!q)throw new Error('球队缺少可用的位置球员');lineup.push(q.id);used.add(q.id)}
  s.rosterIds[s.teamId]=lineup;for(let i=0;i<6;i++)delete s.names?.[`${s.teamId}:${i}`];return lineup;
}
export function enterJourneyMatch(m,p,s,opportunity){
  m.playerTraits=m.playerIds.map(id=>s.playerData[id]?.traits??[]);m.pairChemistry=s.pairChemistry??{};m.journeyOpportunity=opportunity;if(opportunity.starter){m.journeyIntro='这一次，名字在首发名单里';return m}
  m.careerAttributes=null;m.careerStyle=null;m.careerLook=null;m.careerNumber=null;m.selected[0]=-1;m.state='playing';
  const until=m.duration*opportunity.minuteOn/90;let steps=0;
  while(m.time<until&&m.state==='playing'&&steps++<20000){m.wait=0;m.selected[0]=-1;m.step(.04)}
  const slot=m.active(p.index)?p.index:m.players.findIndex((q,id)=>q.t===0&&positionGroup(q.i)===positionGroup(p.index)&&m.active(id));
  if(slot<0)throw new Error('本场该位置已经被罚下，无法替补');
  m.substitutedOut={playerId:m.playerIds[slot],stats:clone(m.stats[slot]),index:slot,minuteOff:Math.round(m.time/m.duration*90),shirtNumber:m.playerNumbers[slot]};
  for(const shot of m.shotLog){shot.playerId=m.playerIds[shot.player];shot.shirtNumber=m.playerNumbers[shot.player]}for(const e of m.matchEvents){e.playerId=m.playerIds[e.player];e.shirtNumber=m.playerNumbers[e.player]}
  m.stats[slot]=Object.fromEntries(Object.keys(m.stats[slot]).map(key=>[key,0]));m.heat[slot]=m.heat[slot].map(row=>row.map(()=>0));m.playerIds[slot]=p.id;m.playerAttributes[slot]=clone(p.attributes);m.playerNumbers[slot]=p.number;m.careerIndex=slot;m.careerAttributes=clone(p.attributes);m.careerNumber=p.number;m.careerLook=p.appearance;m.careerStyle=p.style;m.selected[0]=slot;
  const body=m.players[slot];body.stamina=recoveryAt(s.playerData[p.id],nextCalendarFixture(s)?.date).readiness;body.cool=.1;body.aiKick=null;body.tackleRecovery=0;body.tackleTarget=null;body.tackleWindup=0;body.settle=0;
  m.wait=0;m.goalReplay=null;m.pendingShot=null;m.passRequest=null;m.requestFeedback=null;m.charge=0;m.objective={...m.objective,target:Math.max(1,Math.ceil(m.objective.target*(90-m.substitutedOut.minuteOff)/90))};m.journeyIntro=`${m.substitutedOut.minuteOff}′，轮到你了`;m.announce(`替补登场 · 当前比分 ${m.score.join(' : ')}`);return m;
}
export function journeyPlayerLines(m,s){
  const rows=m.stats.map((stat,index)=>({playerId:m.playerIds[index],teamId:index<6?s.teamId:nextCalendarFixture(s).pair.find(id=>id!==s.teamId),index:index%6,...clone(stat),started:!m.substitutedOut||index!==m.careerIndex,minuteOn:m.substitutedOut&&index===m.careerIndex?m.substitutedOut.minuteOff:0,minuteOff:90,minutesPlayed:Math.round(stat.playingSeconds/m.duration*90),shirtNumber:m.playerNumbers[index]}));
  if(m.substitutedOut){const out=m.substitutedOut;rows.push({playerId:out.playerId,teamId:s.teamId,index:out.index,...out.stats,started:true,minuteOn:0,minuteOff:out.minuteOff,minutesPlayed:Math.round(out.stats.playingSeconds/m.duration*90),shirtNumber:out.shirtNumber})}return rows;
}
export function finishJourneyMatch(p,s,stat,score,context={}){
  if(!p.journey)return p;const next=clone(p),j=next.journey,contribution=positionContribution(stat,p.position),rating=next.lastMatch?.rating??playerRating(stat,score,p.position);j.played++;j.clubGames++;j.trust=clamp(j.trust+clamp((rating-6)*3+contribution-(stat.reds?6:0),-7,8));
  const focus=j.focus==='balanced'?(p.position==='forward'?'offBall':p.position==='midfielder'?'passing':'positioning'):j.focus;
  if(j.clubGames%3===0&&next.attributes[focus]<next.potential){next.attributes[focus]++;next.trainingPoints++;j.lastGrowth={field:focus,amount:1}}
  j.lastFeedback=stat.reds?'这次犯规让球队少了一人。教练会观察你的防守时机，而不是否定整段表现。':stat.turnovers>=3?'受压处理还有空间。下一场可以试着提前寻找出口。':contribution>=1?`本场的${p.position==='forward'?'进攻贡献':p.position==='midfielder'?'组织贡献':'防守贡献'}被教练记下了。`:'贡献还不够稳定。教练会结合最近几场表现安排机会。';
  if(j.clubGames===1){remember(j,'职业首秀',`${context.opponent??'对手'} · ${score.join(' : ')} · ${next.lastMatch?.minutes??90} 分钟 · 评分 ${rating}`,'milestone');addEvent(j,'debut')}
  else if(!j.resolved.includes('partnership')&&j.clubGames>=3&&stat.passesCompleted>=3)addEvent(j,'partnership');
  else if((stat.turnovers>=3||rating<6)&&j.clubGames>=3)addEvent(j,'setback');
  else if(j.clubGames>=5&&j.trust>=52)addEvent(j,'identity');
  if(context.opponentId&&(j.clubs.slice(0,-1).includes(context.opponentId)||j.homeTeamId===context.opponentId||[j.cast.partnerId,j.cast.rivalId].some(id=>s.squadIds?.[context.opponentId]?.includes(id))))addEvent(j,'reunion');
  if(!j.firstStart&&context.started){j.firstStart=true;remember(j,'第一次进入首发名单',`${teamName(s,s.teamId)} · ${context.opponent??'对手'}。你的名字第一次出现在职业首发阵容里。`,'milestone')}
  if(context.champion)remember(j,'一起站上最高处',`${teamName(s,s.teamId)}夺冠。你亲自参加了这段征程。`,'milestone');
  if(contribution>=3)remember(j,'这一场，值得留下',`${context.opponent??'对手'} · ${score.join(' : ')} · ${stat.goals??0} 进球 / ${stat.assists??0} 助攻 · 评分 ${rating}`,'match');
  const oldIds=new Set(p.journey.memories.map(row=>row.id));j.memories=j.memories.map(row=>oldIds.has(row.id)?row:{...row,scene:sceneIdentity(next,s)});
  return next;
}
export function journeyEvent(p,s){
  const j=p.journey,partner=s.playerData[j.cast.partnerId]?.name??'青训搭档',events={
    arrival:{speaker:j.cast.coach,title:'让我认识你的足球',text:`${p.name}，先踢。你可以从熟悉的特点出发，也可以试着改变。`,choices:[['express','用自己的长处争取机会','重点发展位置优势。'],['team','先成为可靠的队友','练习接应与受压处理。']]},
    pressure:{speaker:j.cast.coach,title:'接球前，你看见了什么？',text:j.lastFeedback,choices:[['quick','练习更早出球','下一次训练重点：停球和传球。'],['protect','练习把球留下','下一次训练重点：护球和力量。'],['express','继续发挥我的优势','保持当前方向，靠比赛证明。']]},
    trial:{speaker:j.cast.coach,title:'有一场成人合练',text:'一线队愿意让你参加合练。身体对抗会更强，普通青年比赛也仍然有价值。',choices:[['trial','参加一线队合练','下一场对手更强；表现进入评估。'],['stay','继续青年比赛','下一场维持青年赛节奏。']]},
    'first-contract':{speaker:'新球队主教练',title:'合同给你机会，比赛留下答案',text:`${teamName(s,s.teamId)}准备先让你在下半场登场。你希望怎样争取位置？`,choices:[['team','先适应球队','从配合、接应和稳定贡献开始。'],['express','让教练看见我的特点','继续发展位置优势。']]},
    debut:{speaker:j.cast.coach,title:'我看了你的职业首秀',text:`${j.lastFeedback} 记住，第一场只是开始。`,choices:[['team','把下一次接应踢好','训练方向：停球。'],['express','争取更大的作用','训练方向：位置优势。']]},
    partnership:{speaker:partner,title:'有人开始理解你的跑位',text:'最近几场，你开始完成更多传递。可以培养熟悉的配合，也可以寻找新的接应方式。',choices:[['connect','练习快速配合','队友与训练更偏向快速传递。'],['carry','练习持球创造空间','训练方向：盘带。']]},
    setback:{speaker:'主教练',title:'下一场，怎样回应？',text:j.lastFeedback,choices:[['quick','先练受压处理','训练方向：冷静。'],['protect','加强身体与控球','训练方向：护球。'],['express','继续用比赛证明','保留当前踢法，机会仍然开放。']]},
    identity:{speaker:'主教练',title:'我开始知道怎样使用你',text:'你的近期贡献赢得了更多信任。未来的路，依然由你选择。',choices:[['loyal','在这里站稳','优先留队与本联赛的发展。'],['ambition','挑战更高的水平','休赛期优先展示更强球队。'],['loan','寻找更多上场时间','休赛期优先展示租借机会。']]},
    reunion:{speaker:partner,title:'还是那片球场，已经不同的你',text:'你刚与旧队或青训同期球员完成一场交手。结果已经写入比赛档案，这段关系还会继续。',choices:[['loyal','记住一起踢球的人','把这次重逢留进生涯记忆。'],['ambition','继续走自己的路','保留经历，追求下一次挑战。']]}
  };return events[j.pending]??null;
}
export function chooseJourneyEvent(p,s,choice){
  const event=journeyEvent(p,s),item=event?.choices.find(c=>c[0]===choice);if(!item)return p;const next=clone(p),j=next.journey,key=j.pending;j.resolved.push(key);j.pending=null;j.choices=[...j.choices,{key,choice,played:j.played}].slice(-80);
  const main=p.position==='forward'?'shooting':p.position==='midfielder'?'passing':'defense';
  const focus={express:main,team:'firstTouch',quick:key==='setback'?'composure':'passing',protect:'shielding',connect:'passing',carry:'dribbling'}[choice];if(focus){j.focus=focus;next.trainingFocus=focus}
  if(choice==='trial'||choice==='stay')j.approach=choice;if(choice==='connect')j.connection=true;if(choice==='loyal')j.wish='home';if(choice==='ambition')j.wish='ambition';if(choice==='loan')j.seekLoan=true;
  remember(j,event.title,`${event.text} 你选择：${item[1]}。`,'story',{scene:sceneIdentity(next,s)});return next;
}
export function trainJourney(p,field){
  if(!['firstTouch','passing','shielding','dribbling','acceleration','composure','defense','shooting'].includes(field))return p;const next=clone(p),j=next.journey,round=`${j.stage}:${j.played}`;if(j.trainingUsed.includes(round))return p;
  j.trainingUsed=[...j.trainingUsed,round].slice(-80);j.focus=field;next.trainingFocus=field;const amount=next.attributes[field]<next.potential?1:0;next.attributes[field]+=amount;j.lastGrowth={field,amount};return next;
}
export function validJourney(j){return j===undefined||j&&j.version===1&&['academy','contract','professional'].includes(j.stage)&&JOURNEY_WISHES.some(w=>w.id===j.wish)&&Number.isFinite(j.trust)&&j.trust>=0&&j.trust<=100&&Number.isInteger(j.played)&&j.played>=0&&Number.isInteger(j.clubGames)&&j.clubGames>=0&&Array.isArray(j.youthResults)&&j.youthResults.length<=6&&Array.isArray(j.memories)&&j.memories.length<=80&&Array.isArray(j.resolved)&&j.resolved.length<=80&&Array.isArray(j.choices)&&j.choices.length<=80&&Array.isArray(j.trainingUsed)&&j.trainingUsed.length<=80&&Array.isArray(j.clubs)&&j.clubs.length<=100&&!!getTeam(j.homeTeamId)&&j.clubs.every(id=>!!getTeam(id))&&typeof j.cast?.partnerId==='string'&&typeof j.cast?.rivalId==='string'&&typeof j.cast?.coach==='string'&&j.memories.every(r=>typeof r.title==='string'&&typeof r.text==='string'&&validSceneIdentity(r.scene))}
