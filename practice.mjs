import {Match,FIELD,clamp} from './engine.mjs';

export const PRACTICE_SCENARIOS={solo:'单刀',side:'侧面射门',receive:'接球快射',cross:'传中抢点'};

export class PracticeMatch extends Match {
  constructor({scenario='solo',difficulty=1,side=-1,range=130,defender=false,assist=true}={}){
    super({difficulty,duration:300,teams:['训练球员','训练防守'],careerIndex:5,careerNumber:10});
    this.practice=true;this.options={scenario,difficulty,side,range,defender,assist};this.attempts=[];
    this.practiceIds=[0,5,6,...(['receive','cross'].includes(scenario)?[3]:[]),...(scenario==='receive'&&defender?[11]:[])];
    this.resetAttempt();
  }
  active(id){return super.active(id)&&(!this.practiceIds||this.practiceIds.includes(id))}
  resetAttempt(){
    if(this.attempts.length>=10)return false;
    this.half=1;this.time=0;this.reset(0);this.players.forEach(p=>p.stamina=1);this.kickoffId=null;this.wait=0;this.state='playing';this.age=0;this.fed=false;this.startShot=this.shotLog.length;this.shotFeedback=null;this.shotFeedbackTime=0;this.lastPasser=null;this.lastStriker=null;
    const {scenario,range,side}=this.options,p=this.players[5];p.x=FIELD.right-range;p.y=FIELD.center+(scenario==='side'?side*80:0);
    this.ball={x:p.x+11,y:p.y,z:0,vx:0,vy:0,vz:0,owner:5,lock:0,last:0,kind:null,source:null};
    if(['receive','cross'].includes(scenario)){const feeder=this.players[3];feeder.x=p.x-(scenario==='cross'?80:140);feeder.y=FIELD.center+side*(scenario==='cross'?145:65);feeder.stationary=true;this.ball.owner=3;this.ball.x=feeder.x+11;this.ball.y=feeder.y}
    if(this.options.defender){this.players[11].x=p.x+30;this.players[11].y=p.y+55}
    this.announce(`${PRACTICE_SCENARIOS[scenario]} · 第 ${this.attempts.length+1}/10 次`);
  }
  completeAttempt(outcome){
    if(this.state==='ended')return;
    this.resolveShot(outcome);const shot=this.shotLog.length>this.startShot?this.shotLog.at(-1):null;
    this.attempts.push({outcome:shot?.outcome??outcome,shotId:shot?.id??null});this.state='ended';this.wait=0;this.pendingShot=null;this.charge=0;
  }
  report(){const report=super.report();return {...report,practice:true,shots:report.shots.map(s=>({...s,attempt:this.attempts.findIndex(a=>a.shotId===s.id)+1||this.attempts.length+1}))}}
  foul(id,victim){this.fouls[this.players[id].t]++;this.stats[id].fouls++;this.eventRecord('foul',id,{attempt:this.attempts.length+1});this.completeAttempt('foul')}
  goal(team){super.goal(team);this.completeAttempt(team===0?'goal':'lost')}
  restart(team,x,y,label,wait){if(this.practice)this.completeAttempt(this.shotLog.length>this.startShot?'wide':'lost');else super.restart(team,x,y,label,wait)}
  step(dt,inputs=[{},{}]){
    if(this.state!=='playing')return;dt=clamp(dt,0,.04);if(dt>.016){const count=Math.ceil(dt/.016);for(let i=0;i<count;i++)this.step(dt/count,inputs);return}
    this.age+=dt;
    if(!this.fed&&['receive','cross'].includes(this.options.scenario)&&this.age>=.6){this.fed=true;if(this.ball.owner===3){if(this.options.scenario==='cross')this.cross(3);else this.kick(3,false,.4,5,true)}}
    super.step(dt,inputs);
    const shot=this.shotLog.length>this.startShot?this.shotLog.at(-1):null;
    if(shot&&shot.outcome!=='pending')this.completeAttempt(shot.outcome);
    else if(this.ball.owner!==null&&this.players[this.ball.owner].t===1)this.completeAttempt('lost');
    else if(this.age>=12)this.completeAttempt('whistle');
  }
}
