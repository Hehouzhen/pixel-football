import {profileFor,chooseAdaptation} from './opponent-profiles.mjs';
import {teamSetup,simulationRole,dutyFor} from './team-tactics.mjs';
import {TACTIC_NAMES} from './tactics.mjs';
import {recoveryAt} from './recovery.mjs';
import {fixtureDate} from './schedule.mjs';
import {ensureRatings,skillValue,duelChance,passChance,positionRating} from './ratings.mjs';
import {getTeam} from './clubs.mjs';
import {CLEAR_WEATHER} from './weather.mjs';
import {hasTrait,chemistryBonus,initialTraits} from './player-context.mjs';

export const SIMULATION_VERSION=4;
export const ADVANCED_STAT_FIELDS=['xG','xA','dribbles','dribblesCompleted','aerialDuels','aerialWon','keeperSpills','goalsConceded'];
export const SIM_STAT_FIELDS=['goals','assists','shots','shotsOnTarget','passes','passesCompleted','crosses','crossesCompleted','tackles','tackleAttempts','interceptions','keyPasses','saves','goalsConceded','fouls','yellows','reds','blocks','turnovers','headers','headerGoals','penaltyGoals','forwardPasses','touches','playingSeconds','distance','carryDistance','possession','xG','xA','dribbles','dribblesCompleted','aerialDuels','aerialWon','keeperSpills'];
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const hash=text=>{let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0};
const group=i=>i===0?0:i<=2?1:i<=4?3:5;
const important=new Set(['goal','save','miss','block','yellow','red','substitution','penalty','halftime','fulltime','header']);

export class EventMatch {
  constructor({season,home,away,week=0,competition='league',duration=180,weather=CLEAR_WEATHER,recordEvents=true,managedSide=null}){
    this.home=home;this.away=away;this.week=week;this.competition=competition;this.duration=duration;this.weather=weather;this.recordEvents=recordEvents;
    this.managedSide=managedSide;this.coachStages=[0,0];
    this.randomState=hash(`${season.seed??0}:${competition}:${week}:${home}:${away}`)||1;
    this.clock=0;this.half=1;this.done=false;this.score=[0,0];this.events=[];this.highlights=[];this.goalEvents=[];this.serial=0;this.side=0;this.zone=1;this.lane=1;this.lastPass=null;this.setPiece=null;this.substitutions=[0,0];
    this.teams=[home,away];this.names=Object.fromEntries(this.teams.map(id=>[id,season.teamNames?.[id]??getTeam(id)?.name??id]));
    this.chemistry=season.pairChemistry??{};
    this.profiles=this.teams.map(id=>id===season.teamId?null:profileFor(id,getTeam(id)?.style));this.attackChannels=[[0,0,0],[0,0,0]];this.adaptations=[null,null];
    this.tactics=this.teams.map(id=>id===season.teamId?season.tactic??'balanced':this.profiles[this.teams.indexOf(id)]?.style??'balanced');
    this.teamSetups=this.teams.map((id,side)=>teamSetup(id===season.teamId?season.teamSetup:this.profiles[side]?.setup,this.tactics[side]));
    this.players=new Map();this.lineups=this.teams.map(id=>[...(season.rosterIds?.[id]??[])]);
    this.active=this.lineups.map(ids=>[...ids]);
    this.bench=this.teams.map((id,side)=>(season.squadIds?.[id]??this.lineups[side]).filter(pid=>!this.lineups[side].includes(pid)));
    for(let side=0;side<2;side++)for(const id of [...this.lineups[side],...this.bench[side]]){
      const source=season.playerData[id],index=this.lineups[side].indexOf(id);
      this.players.set(id,{id,name:source.name,teamId:this.teams[side],side,index:index<0?source.position:index,position:source.position,number:source.number,traits:source.traits??initialTraits(source),attributes:ensureRatings({...source.attributes}),stamina:recoveryAt(source,fixtureDate(season,competition,competition==='cup'?season.cup.round:week,season.cup?.phase)).readiness,active:index>=0,used:index>=0,started:index>=0,minuteOn:0,minuteOff:90,stats:Object.fromEntries(SIM_STAT_FIELDS.map(key=>[key,0]))});
    }
    this.holder=this.active[0][3];this.emit('kickoff',this.players.get(this.holder),'比赛开始',1);
  }
  random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296}
  skill(player,key){return skillValue(player.attributes,key)*(.76+.24*player.stamina)}
  available(side,outfield=false){return this.active[side].map(id=>this.players.get(id)).filter(p=>p?.active&&(!outfield||p.index!==0))}
  role(player){return simulationRole(this.teamSetups[player.side],player.index)}
  urgency(side){if(this.clock<4200)return 0;return this.score[side]<this.score[1-side]?1:this.score[side]>this.score[1-side]&&this.tactics[side]!=='press'?-1:0}
  choose(players,weight=()=>1){if(!players.length)return null;const weights=players.map(p=>Math.max(.01,weight(p))),total=weights.reduce((a,b)=>a+b,0);let roll=this.random()*total;for(let i=0;i<players.length;i++){roll-=weights[i];if(roll<0)return players[i]}return players.at(-1)}
  emit(type,player,text,importance=important.has(type)?1:0,extra={}){
    const event={id:this.serial++,type,time:Math.round(this.clock),minute:Math.min(90,Math.floor(this.clock/60)),teamId:player?.teamId??null,playerId:player?.id??null,playerName:player?.name??null,zone:this.zone,lane:this.lane,text,importance,score:[...this.score],...extra};
    this.lastEvent=event;if(this.recordEvents)this.events.push(event);if(importance)this.highlights.push(event);return event;
  }
  takePossession(side,player=null){this.side=side;this.zone=clamp(3-this.zone,0,3);const next=player??this.choose(this.available(side,true),p=>p.index<=2?1.5:1);this.holder=next?.id??this.available(side)[0]?.id;this.lastPass=null;this.setPiece=null}
  setTactic(side,tactic){if(this.done||![0,1].includes(side)||!Object.hasOwn(TACTIC_NAMES,tactic))return false;this.tactics[side]=tactic;this.emit('tactic',this.players.get(this.active[side][3]),`战术调整：${TACTIC_NAMES[tactic]}`,1);return true}
  substitute(side,outId,inId){
    const outgoing=this.players.get(outId),incoming=this.players.get(inId),slot=this.active[side]?.indexOf(outId);
    const emergency=outgoing?.index!==0&&incoming?.position===0&&!this.available(side).some(p=>p.index===0);
    if(this.done||slot<0||!outgoing?.active||!incoming||incoming.side!==side||incoming.used||this.substitutions[side]>=3||!emergency&&group(incoming.position)!==group(slot))return false;
    outgoing.active=false;outgoing.minuteOff=Math.floor(this.clock/60);incoming.active=true;incoming.used=true;incoming.started=false;incoming.index=emergency?0:slot;incoming.minuteOn=Math.floor(this.clock/60);this.active[side][emergency?0:slot]=inId;this.substitutions[side]++;
    if(this.holder===outId)this.holder=inId;if(this.lastPass?.id===outId)this.lastPass=null;
    this.emit('substitution',incoming,`${incoming.name} 替下 ${outgoing.name}`,1,{outId});return true;
  }
  coach(side){
    if(side===this.managedSide||this.substitutions[side]>=3)return;
    const available=this.available(side),reserves=this.bench[side].map(id=>this.players.get(id)).filter(p=>!p.used);
    if(!available.some(p=>p.index===0)){const keeper=reserves.find(p=>p.position===0),outgoing=[...available].sort((a,b)=>positionRating(a)-positionRating(b))[0];if(keeper&&outgoing){this.substitute(side,outgoing.id,keeper.id);return}}
    const stage=this.clock>=4800?2:this.clock>=3900?1:0;if(stage<=this.coachStages[side])return;this.coachStages[side]=stage;
    const options=[];for(const outgoing of available)for(const incoming of reserves)if(outgoing.stamina<.8&&group(outgoing.index)===group(incoming.position)){
      const gain=positionRating(incoming,outgoing.index)-positionRating(outgoing,outgoing.index)*(.76+.24*outgoing.stamina),role=this.urgency(side)>0&&outgoing.index>=3?2:this.urgency(side)<0&&outgoing.index<=2?2:0;
      if(gain>2)options.push({outgoing,incoming,value:gain+(1-outgoing.stamina)*15+role});
    }
    options.sort((a,b)=>b.value-a.value);if(options[0])this.substitute(side,options[0].outgoing.id,options[0].incoming.id);
  }
  step(){
    if(this.done)return null;
    const boundary=this.half===1?2700:5400,urgency=this.urgency(this.side),dt=Math.min(boundary-this.clock,(this.tactics[this.side]==='counter'?17:this.tactics[this.side]==='possession'?27:23)-urgency*5+this.random()*15);
    this.clock+=dt;
    for(const p of this.players.values())if(p.active){const work=this.tactics[p.side]==='press'?hasTrait(p,'press')?1.26:1.2:1,drain=dt/5400*(p.index===0?.1:dutyFor(this.teamSetups[p.side],p.index)==='engine'?.50:.44)*work*(1-(p.attributes.endurance-60)*.006);p.stamina=clamp(p.stamina-drain,.05,1);p.stats.playingSeconds+=dt/5400*this.duration;}
    if(this.clock>=5400){this.done=true;this.emit('fulltime',null,'全场比赛结束',2);return this.lastEvent}
    this.coach(0);this.coach(1);
    let player=this.players.get(this.holder);if(!player?.active){player=this.choose(this.available(this.side,true));if(!player){this.done=true;this.emit('fulltime',null,'比赛结束：一方无法继续比赛',2);return this.lastEvent}this.holder=player.id}
    player.stats.possession+=dt/5400*this.duration;player.stats.touches++;
    const defenders=this.available(1-this.side,true),defender=this.choose(defenders,p=>(.3+(this.role(p)<=2?1.4:.6)*(this.skill(p,'positioning')+this.skill(p,'marking'))/120)*(hasTrait(p,'cover')&&this.zone>=2?1.15:1));
    const numerical=this.available(this.side,true).length-defenders.length;
    const pressure=clamp(.3+this.zone*.075+(this.teamSetups[1-this.side].formation==='1-2-2'?(this.zone>=2?-.055:.035):0)+(this.tactics[1-this.side]==='press'?.13:0)+(this.adaptations[1-this.side]?.type==='screen'&&this.adaptations[1-this.side].channel===this.lane?.055:0)+(this.urgency(1-this.side)>0?.08:0)+(defender?(this.skill(defender,'marking')-60)*.003+(hasTrait(defender,'press')&&this.tactics[1-this.side]==='press'?.02:0):0)-numerical*.08,.08,.85);
    if(this.setPiece==='penalty'){this.setPiece=null;this.shoot(player,0,defender,'penalty')}
    else if(this.setPiece==='corner'){this.setPiece=null;this.pass(player,defender,pressure,'cross')}
    else if(this.setPiece==='free-kick'){this.setPiece=null;this.lastPass=null;if(this.zone>=2&&this.random()<.25)this.shoot(player,.1,defender);else this.pass(player,defender,.1)}
    else if(player.index===0)this.pass(player,defender,pressure);
    else {
      const options=[{kind:'pass',value:2.3+(this.tactics[this.side]==='possession'?1.2:0)+(this.role(player)===3?.25:0)+(this.skill(player,'passing')-60)*.014},{kind:'dribble',value:.55+(this.skill(player,'dribbling')-60)*.02+(this.tactics[this.side]==='counter'?.35:0)},{kind:'shot',value:this.zone===3?(this.role(player)===5?2.1:this.role(player)>=3?1.8:.55):this.zone===2?(this.role(player)<=2?.12:.3)+(this.skill(player,'longShots')-60)*.007:.005},{kind:'cross',value:this.zone>=2&&this.lane!==1?.5+(this.profiles[this.side]?.pattern==='wide'||this.adaptations[this.side]?.type==='wide'?.3:0)+(this.skill(player,'crossing')-60)*.012:.01}];
      if(this.zone===0)options[0].value+=1;
      if(urgency<0)options[0].value+=.5;options[2].value*=1+urgency*.2;
      if(hasTrait(player,'quickPass')&&pressure>.4)options[0].value+=.35;
      if(hasTrait(player,'earlyCross')&&this.zone>=2&&this.lane!==1)options[3].value+=.3;
      if(hasTrait(player,'holdUp')&&pressure>.4)options[1].value+=.2;
      if(hasTrait(player,'composed')&&pressure>.5)options[2].value*=.9;
      const judgment=this.skill(player,'decisions');
      options[0].value+=(judgment-60)*pressure*.025;
      options[1].value-=(judgment-60)*pressure*.015;
      options[2].value*=this.zone<3?clamp(1-(judgment-60)*.008,.6,1.5):clamp(1+(judgment-60)*.008,.6,1.5);
      const action=this.choose(options,o=>Math.max(.005,o.value));
      if(action.kind==='shot')this.shoot(player,pressure,defender);else if(action.kind==='dribble')this.dribble(player,defender,pressure);else this.pass(player,defender,pressure,action.kind);
    }
    if(this.clock>=boundary){
      if(this.half===1){if(this.setPiece==='penalty')this.shoot(this.players.get(this.holder),0,defender,'penalty');this.emit('halftime',null,'上半场结束',2);for(let side=0;side<2;side++)if(this.profiles[side]){const passes=this.available(side).reduce((n,p)=>n+p.stats.passesCompleted,0),shots=this.available(side).reduce((n,p)=>n+p.stats.shots,0);this.adaptations[side]=chooseAdaptation(this.attackChannels[1-side],passes,shots);if(this.adaptations[side])this.emit('tactic',this.players.get(this.active[side][3]),this.adaptations[side].note,1)}this.half=2;for(const p of this.players.values())p.stamina=clamp(p.stamina+.1);this.side=1;this.zone=1;this.lane=1;this.holder=this.available(1,true).find(p=>p.index>=3)?.id??this.available(1)[0]?.id;this.lastPass=null;this.setPiece=null}
      else {this.done=true;this.emit('fulltime',null,'全场比赛结束',2)}
    }
    return this.lastEvent;
  }
  pass(player,defender,pressure,kind='pass'){
    const side=this.side,long=kind==='cross'||this.random()<(this.tactics[side]==='counter'?.3:this.tactics[side]==='possession'?.04:.12)+this.urgency(side)*.04,field=kind==='cross'?'crossing':long?'longPassing':'passing';
    const teammates=this.available(side,true).filter(p=>p.id!==player.id),receiver=this.choose(teammates,p=>(this.role(p)===5&&this.zone>=2?2.4:this.role(p)>=3?1.6:this.zone>=2?.45:.8)*(.6+this.skill(p,'offBall')/100)*(hasTrait(p,'forwardRun')&&this.zone>=2?1.18:1)*(1+chemistryBonus(this.chemistry,player.id,p.id)));
    if(!receiver){this.shoot(player,pressure,defender);return}
    const advance=kind==='cross'?1:this.random()<(this.tactics[side]==='counter'?.7:this.tactics[side]==='possession'?.38:.52)+this.urgency(side)*.1?1:this.random()<.18?-1:0,newZone=clamp(this.zone+advance,0,3),distance=long?2:advance>0?1:.25;
    player.stats.passes++;if(kind==='cross')player.stats.crosses++;
    const passing=this.skill(player,field)+(.5-pressure)*3+(this.skill(player,'composure')-60)*pressure*.25;
    const laneDanger=defender?(this.skill(defender,'positioning')-60)*.002:0;
    const connection=chemistryBonus(this.chemistry,player.id,receiver.id);
    if(this.random()>passChance(passing,60,distance/3,pressure)-laneDanger-(this.weather.passPenalty??0)+connection+(hasTrait(player,'composed')&&pressure>.5?.012:0)){
      player.stats.turnovers++;if(defender&&this.random()<.7){defender.stats.interceptions++;this.emit('interception',defender,`${defender.name} 截断 ${player.name} 的${long?'长传':'传球'}`,0,{targetId:player.id})}else this.emit('pass-failed',player,`${player.name} 传球出了边线`);
      this.takePossession(1-side,defender);return;
    }
    if(kind==='cross'){
      receiver.stats.aerialDuels++;if(defender)defender.stats.aerialDuels++;
      const attack=this.skill(receiver,'aerial')*.65+this.skill(receiver,'strength')*.35,defense=defender?this.skill(defender,'aerial')*.65+this.skill(defender,'strength')*.35:40;
      if(this.random()>duelChance(attack,defense,.3)){player.stats.turnovers++;if(defender){defender.stats.aerialWon++;this.emit('clearance',defender,`${defender.name} 争顶解围`)}this.takePossession(1-side,defender);return}receiver.stats.aerialWon++;
    }else if(this.random()>passChance(60,this.skill(receiver,'firstTouch'),long?.7:.2,pressure)-(this.weather.firstTouchPenalty??0)*.5){
      receiver.stats.turnovers++;this.emit('bad-touch',receiver,`${receiver.name} 接球调整失误，被对手夺走球权`);this.takePossession(1-side,defender);return;
    }
    player.stats.passesCompleted++;if(advance>0)player.stats.forwardPasses++;if(kind==='cross')player.stats.crossesCompleted++;
    if(advance>0)this.attackChannels[side][this.lane]++;this.zone=newZone;this.lane=kind==='cross'?1:clamp(this.lane+(this.random()<.4?(this.random()<.5?-1:1):0),0,2);this.holder=receiver.id;this.lastPass={id:player.id,time:this.clock};receiver.stats.touches++;
    this.emit('pass',player,`${player.name}${hasTrait(player,'quickPass')&&pressure>.4?' 一脚出球，':''}${kind==='cross'?' 传中找到 ':long?' 长传交给 ':' 传给 '}${receiver.name}`,0,{targetId:receiver.id});
    if(kind==='cross')this.shoot(receiver,pressure,defender,'header');
  }
  dribble(player,defender,pressure){
    player.stats.dribbles++;if(defender)defender.stats.tackleAttempts++;
    const attack=this.skill(player,'dribbling')*.4+this.skill(player,'acceleration')*.2+this.skill(player,'shielding')*.25+this.skill(player,'strength')*.15+(hasTrait(player,'holdUp')&&pressure>.4?2:0);
    const defense=defender?this.skill(defender,'defense')*.4+this.skill(defender,'marking')*.25+this.skill(defender,'positioning')*.2+this.skill(defender,'strength')*.15+(hasTrait(defender,'riskyTackle')?2:0):40;
    if(defender&&this.random()<.045+Math.max(0,attack-defense)*.0005+(hasTrait(defender,'riskyTackle')?.025:0)){
      defender.stats.fouls++;const penalty=this.zone===3&&this.random()<.4,card=this.random();
      this.emit('foul',defender,`${defender.name} 对 ${player.name} 犯规`,1,{targetId:player.id});
      if(card<.015||card<.18&&defender.stats.yellows){if(card>=.015)defender.stats.yellows++;defender.stats.reds++;defender.active=false;defender.minuteOff=Math.floor(this.clock/60);this.emit('red',defender,`${defender.name} 被罚下`,2)}else if(card<.18){defender.stats.yellows++;this.emit('yellow',defender,`${defender.name} 被出示黄牌`,1)}
      this.lastPass=null;if(penalty){this.setPiece='penalty';this.holder=this.choose(this.available(this.side,true),p=>this.skill(p,'shooting'))?.id;this.emit('penalty',player,'裁判判罚点球',2)}else {this.setPiece='free-kick';this.emit('free-kick',player,'进攻方获得任意球',1)}return;
    }
    if(this.random()<duelChance(attack,defense,.35-pressure*.3)){
      player.stats.dribblesCompleted++;const progress=this.random()<.55+(this.skill(player,'speed')-60)*.002;this.zone=clamp(this.zone+(progress?1:0),0,3);player.stats.carryDistance+=progress?18:7;player.stats.distance+=progress?18:7;
      this.emit('dribble',player,`${player.name} 带球突破${defender?' '+defender.name:''}`);
    }else{player.stats.turnovers++;if(defender){defender.stats.tackles++;this.emit('tackle',defender,`${defender.name} 抢断 ${player.name}`,0,{targetId:player.id})}this.takePossession(1-this.side,defender)}
  }
  shoot(player,pressure,defender,kind='normal'){
    const side=this.side,keeper=this.available(1-side).find(p=>p.index===0)??this.available(1-side)[0],oneOnOne=kind!=='penalty'&&this.zone===3&&this.random()<clamp(.15+(this.skill(player,'offBall')-(defender?this.skill(defender,'marking'):50))*.006,.03,.55);
    const base=kind==='penalty'?.76:this.zone<=1?.035:this.zone===2?.09:this.lane!==1?.16:oneOnOne?.43:.30;
    const quality=clamp(base*(1-pressure*.3)*(1-(this.weather.goalPenalty??0)*.4),.015,.85),shooting=this.skill(player,kind==='header'?'aerial':this.zone<3?'longShots':'shooting');
    player.stats.shots++;player.stats.xG+=quality;if(kind==='header')player.stats.headers++;
    const passer=kind!=='penalty'&&this.lastPass&&this.clock-this.lastPass.time<70&&this.lastPass.id!==player.id?this.players.get(this.lastPass.id):null;if(passer){passer.stats.keyPasses++;passer.stats.xA+=quality}
    const extra={xG:+quality.toFixed(3),shotType:kind,oneOnOne};
    if(kind!=='penalty'&&defender&&this.random()<clamp(.09+(this.skill(defender,'positioning')-this.skill(player,'offBall'))*.002,.02,.2)){
      defender.stats.blocks++;this.emit('block',player,`${player.name} 的射门被 ${defender.name} 封堵`,1,extra);if(this.random()<.35){this.setPiece='corner';this.lastPass=null;this.zone=3;this.emit('corner',player,'进攻方获得角球',1)}else this.takePossession(1-side,defender);return;
    }
    const onTarget=kind==='penalty'?.9:clamp(.57+(shooting-60)*.003+(this.skill(player,'composure')-60)*pressure*.0018-(this.zone<3?.08:0)-(kind==='header'?.04:0)+(hasTrait(player,'composed')&&pressure>.5?.015:0),.2,.88);
    if(this.random()>onTarget){this.emit('miss',player,`${player.name}${kind==='header'?' 头球':' 射门'}偏出`,1,extra);this.zone=3;this.takePossession(1-side,keeper);return}
    player.stats.shotsOnTarget++;
    const keeping=keeper?(this.skill(keeper,'reflexes')*.45+this.skill(keeper,'keeperPositioning')*.35+this.skill(keeper,oneOnOne?'oneOnOne':'handling')*.2):15;
    const goalChance=clamp(quality/onTarget*Math.exp((shooting-65)*.014-(keeping-65)*.012),.015,.94);
    if(this.random()<goalChance){
      this.score[side]++;player.stats.goals++;if(kind==='header')player.stats.headerGoals++;if(kind==='penalty')player.stats.penaltyGoals++;if(passer)passer.stats.assists++;
      if(keeper)keeper.stats.goalsConceded++;
      const goal={minute:Math.max(1,Math.min(90,Math.floor(this.clock/60))),teamId:player.teamId,scorerId:player.id,scorerName:player.name,...(passer?{assistId:passer.id,assistName:passer.name}:{})};this.goalEvents.push(goal);
      this.emit('goal',player,`${player.name}${kind==='penalty'?' 点球':kind==='header'?' 头球':''}进球！${passer?' 助攻：'+passer.name:''}`,2,extra);this.zone=2;this.takePossession(1-side);return;
    }
    if(keeper)keeper.stats.saves++;
    const spill=keeper&&this.random()<clamp(.2+(60-this.skill(keeper,'handling'))*.004+(this.weather.type==='rain'?.07:0),.025,.45);
    if(spill){keeper.stats.keeperSpills++;this.emit('save',keeper,`${keeper.name} 扑出 ${player.name} 的射门，门前继续争夺`,1,extra);this.lastPass=null;
      const runner=this.choose(this.available(side,true),p=>(this.skill(p,'offBall')*.6+this.skill(p,'acceleration')*.4)*(this.role(p)===5?2.2:this.role(p)>=3?1:.45));
      if(runner&&this.random()<duelChance(this.skill(runner,'offBall'),defender?this.skill(defender,'positioning'):40,-.35)){this.holder=runner.id;this.zone=3;this.emit('rebound',runner,`${runner.name} 争到落点`,1)}else {this.zone=3;this.takePossession(1-side,defender??keeper)}
    }else{this.emit('save',keeper,`${keeper?.name??'门将'} 扑救 ${player.name} 的射门`,1,extra);this.zone=3;this.takePossession(1-side,keeper)}
  }
  run(){let count=0;while(!this.done&&count++<1000)this.step();if(!this.done)throw new Error('比赛模拟未能结束');return this.result()}
  result(){
    const playerStats=[...this.players.values()].filter(p=>p.used).map(p=>({playerId:p.id,playerName:p.name,teamId:p.teamId,index:p.index,shirtNumber:p.number,started:p.started,minuteOn:p.minuteOn,minuteOff:p.minuteOff,minutesPlayed:Math.round(p.stats.playingSeconds/this.duration*90),...Object.fromEntries(Object.entries(p.stats).map(([key,value])=>[key,Math.round(value*10000)/10000]))}));
    const mapping={shots:'shots',onTarget:'shotsOnTarget',passes:'passes',passesCompleted:'passesCompleted',crosses:'crosses',tackles:'tackles',fouls:'fouls',yellows:'yellows',reds:'reds',saves:'saves',xG:'xG',possession:'possession'},stats={};
    for(const [key,field] of Object.entries(mapping))stats[key]=this.teams.map(id=>+playerStats.filter(p=>p.teamId===id).reduce((n,p)=>n+(p[field]??0),0).toFixed(4));
    return {home:this.home,away:this.away,score:[...this.score],stats,weather:this.weather,duration:this.duration,playerStats,goalEvents:[...this.goalEvents],simulationVersion:SIMULATION_VERSION,journal:this.recordEvents?[...this.events]:[...this.highlights],tactics:[...this.tactics],teamSetups:structuredClone(this.teamSetups)};
  }
}
