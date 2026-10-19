import {resolveWorldPlayer} from './world-player-identity.mjs';
import {recoveryAt,recordRecovery} from './recovery.mjs';
import {nextCalendarFixture} from './calendar.mjs';
import {fixtureDate} from './schedule.mjs';

export const NATIONAL_ROLES=['考察新人','轮换成员','主力竞争者','稳定主力','核心球员'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const nationalWindowId=(year,index)=>`${year}:window:${index}`;
export function nationalProgress(player){
 const state=player.nationalCareer,rows=state?.history??[],recent=rows.slice(-5),minutes=recent.reduce((n,r)=>n+r.minutes,0),average=minutes?recent.reduce((n,r)=>n+r.rating*r.minutes,0)/minutes:null;
 if(state?.progress)return {...state.progress,average};
 // Legacy records earn a conservative starting role without inventing past windows.
 return {tier:rows.length>=6?2:rows.length?1:0,trust:40,poorWindows:0,windows:[],events:[],feedback:'教练会结合最近几次国家队表现，逐步确认你的角色。',returnToClub:null,average};
}
export function nationalRoleSelection(player,gap){
 const progress=nationalProgress(player),recent=(player.nationalCareer?.history??[]).slice(-5),minutes=recent.reduce((n,r)=>n+r.minutes,0),buffer=progress.tier>=2&&minutes>=90?clamp(((progress.average??6.5)-6.5)*Math.min(1,minutes/270),-.8,1.5):0;
 const starter=gap+buffer>=10||progress.tier>=2&&gap+buffer>=3||progress.tier>=3&&progress.poorWindows<2&&gap+buffer>=0;
 return {buffer,role:starter?'starter':'substitute',progress};
}
export function addNationalMoment(player,event){
 const state=player.nationalCareer;if(!state)return;
 state.progress??=nationalProgress(player);const events=state.progress.events;
 if(events.some(e=>e.id===event.id))return;
 events.push({...event,seen:false});if(events.length>100)events.splice(0,events.length-100);
}
export function markNationalMoment(player,id){const p=structuredClone(player),event=p.nationalCareer?.progress?.events.find(e=>e.id===id);if(event)event.seen=true;return p}
export function finishNationalWindow(player,season,t,index){
 const w=t.windows[index],key=nationalWindowId(t.year,index),state=player.nationalCareer;
 state.progress??=nationalProgress(player);const progress=state.progress;
 if(progress.windows.some(row=>row.id===key))return;
 const rows=state.history.filter(r=>r.windowId===key),minutes=rows.reduce((n,r)=>n+r.minutes,0),average=minutes?rows.reduce((n,r)=>n+r.rating*r.minutes,0)/minutes:null,previous=progress.tier;
 if(minutes>=30){progress.poorWindows=average<6.3?progress.poorWindows+1:0;progress.trust=clamp(progress.trust+clamp((average-6.5)*5,-7,8),0,100)}
 const recent=state.history.slice(-5),total=recent.reduce((n,r)=>n+r.minutes,0),form=total?recent.reduce((n,r)=>n+r.rating*r.minutes,0)/total:6.5,good=state.history.filter(r=>r.minutes>=15&&r.rating>=7).length;
 const target=state.caps>=12&&progress.trust>=65&&good>=7&&form>=7.2&&progress.windows.filter(w=>w.minutes>0).length>=3?4:state.caps>=6&&progress.trust>=52&&state.starts>=3&&form>=7?3:state.caps>=3&&good>=2&&form>=6.8?2:state.caps?1:0;
 if(minutes>=30&&average<6.3&&progress.poorWindows>=2)progress.tier=Math.max(1,progress.tier-1);else if(minutes>0&&target>progress.tier)progress.tier++;
 const feedback=progress.tier>previous?`最近几次国家队表现让你从${NATIONAL_ROLES[previous]}成为${NATIONAL_ROLES[progress.tier]}。下一次名单会给你更多首发竞争空间。`:progress.tier<previous?'连续两个窗口的表现需要改善。本期调整你的角色，之前的贡献仍保留在档案中。':progress.poorWindows===1?'这次发挥低于预期，教练先给出提醒；一次低谷不会立刻抹去你的国家队地位。':minutes>0?`本期出场${minutes}分钟，平均评分${average.toFixed(1)}。教练将继续观察你在下一次窗口的稳定性。`:w.status==='declined'?'已尊重你本期留在俱乐部的决定，下一次征召重新评估。':'本期未形成出场样本，角色保留；继续争取俱乐部比赛机会。';
 progress.feedback=feedback;progress.windows.push({id:key,year:t.year,index,minutes,average,tier:progress.tier,feedback});
 const last=rows.at(-1),next=nextCalendarFixture(season),returnDate=last?.date??w.startDate??next?.date??fixtureDate(season,'league',season.week);
 progress.returnToClub={id:key,year:t.year,week:season.week,minutes,date:returnDate,nextDate:next?.date??returnDate,text:minutes?`结束本期${minutes}分钟国家队比赛，返回俱乐部。教练会根据实际恢复情况安排下一场出场。`:'本期没有新增国家队比赛负荷，回到俱乐部继续争取机会。'};
 addNationalMoment(player,{id:key+':return',kind:'return',year:t.year,title:'回到熟悉的更衣室',text:progress.returnToClub.text+' '+feedback,date:returnDate,teamId:season.teamId});
}
export function reserveNationalBreak(season,player){
 const s=structuredClone(season),year=s.calendar?.startYear??2026+(s.history?.length??0),t=player.nationalCareer?.seasons.find(t=>t.year===year),index=t&&[0,1,2,3].find(i=>t.windows[i]&&!t.windows[i].complete),w=t?.windows[index];
 if(!w)return s;
 const id=nationalWindowId(year,index),existing=s.calendar?.internationalBreaks?.find(b=>b.id===id);
 if(existing){w.startDate??=existing.start;return s}
 const event=nextCalendarFixture(s),start=event?.date??fixtureDate(s,'league',s.week),days=index===3&&t.kind!=='friendly'?25:7;
 s.calendar={...(s.calendar??{}),startYear:year,internationalBreaks:[...(s.calendar?.internationalBreaks??[]),{id,start,days}]};w.startDate=start;
 for(const world of Object.values(s.world??{}))world.calendar={...(world.calendar??{}),startYear:year,internationalBreaks:structuredClone(s.calendar.internationalBreaks)};
 return s;
}
export function nationalClubReturn(player,season){
 const item=nationalProgress(player).returnToClub;if(!item)return null;
 const event=nextCalendarFixture(season),identity=season.playerData?.[player.id],recovery=identity&&event?recoveryAt(identity,event.date):{readiness:1,fatigue:0,restDays:null};
 const currentYear=season.calendar?.startYear??2026+(season.history?.length??0),active=currentYear===item.year&&(season.week===item.week),rotate=active&&item.minutes>=90&&recovery.fatigue>=14;
 return {...item,...recovery,active,rotate,message:rotate?'国家队比赛后尚有负荷，教练计划让你从替补开始恢复。':active&&item.minutes?'身体已恢复到可以竞争正常出场的水平，首发仍由俱乐部表现决定。':'本期国家队负荷已恢复，按正常俱乐部竞争安排出场。'};
}
export function nationalExposure(player,year){
 const rows=(player.nationalCareer?.history??[]).filter(r=>r.year===year&&r.minutes>0),major=rows.filter(r=>(r.importance??(r.id.includes(':ko')?1.5:r.id.includes(':finals')?1:.2))>=1),minutes=major.reduce((n,r)=>n+r.minutes,0),points=major.reduce((n,r)=>n+Math.max(0,r.rating-6.8)*(r.minutes/90)*(r.importance??1),0),eligible=major.length>=3&&minutes>=180;
 return {year,appearances:rows.length,minutes:rows.reduce((n,r)=>n+r.minutes,0),majorAppearances:major.length,majorMinutes:minutes,attention:eligible?+Math.min(2.5,points/4).toFixed(2):0,awardBonus:eligible?+Math.min(6,points*.5).toFixed(2):0};
}
export function applyNationalEffects(season,player,nationalLines=null,match=null){
 const s=structuredClone(season),state=player.nationalCareer,identity=s.playerData?.[player.id];if(!state||!identity)return s;
 const known=new Set((s.nationalMatchLoads??[]));
 if(nationalLines&&match&&!known.has(match.nationalFixture.id)){
  const view={...s,playerData:{...s.playerData,...(s.nationalWorld?.players??{})}};
  recordRecovery(view,{matchId:match.nationalFixture.id,date:match.nationalFixture.date,duration:match.duration,competition:'national',playerStats:nationalLines.map(line=>({...line,teamId:resolveWorldPlayer(s,line.playerId)?.teamId,minutesPlayed:line.minutes}))});s.calendar=view.calendar;known.add(match.nationalFixture.id);
  for(const line of nationalLines){const identity=resolveWorldPlayer(s,line.playerId);if(identity)identity.nationalEvidence=nationalExposure({nationalCareer:{history:identity.internationalStats?.history??[]}},s.calendar?.startYear??2026)}
 }

 for(const row of state.history){if(row.year!==(s.calendar?.startYear??2026+(s.history?.length??0))||!row.date||known.has(row.id))continue;
 recordRecovery(s,{matchId:row.id,date:row.date,duration:90,competition:'national',playerStats:[{playerId:player.id,minutesPlayed:row.minutes,playingSeconds:row.minutes,distance:row.distance??0}]});known.add(row.id)}
 s.nationalMatchLoads=[...known];const returned=state.progress?.returnToClub;if(returned?.year===(s.calendar?.startYear??2026)&&returned.week===s.week)returned.nextDate=nextCalendarFixture(s)?.date??returned.nextDate;identity.nationalEvidence=nationalExposure(player,s.calendar?.startYear??2026+(s.history?.length??0));return s;
}
export function validNationalProgress(value){
 if(value===undefined)return true;
 const object=v=>v&&typeof v==='object'&&!Array.isArray(v),text=v=>typeof v==='string'&&v.length<=600,date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
 return object(value)&&Number.isInteger(value.tier)&&value.tier>=0&&value.tier<5&&Number.isFinite(value.trust)&&value.trust>=0&&value.trust<=100&&Number.isInteger(value.poorWindows)&&value.poorWindows>=0&&text(value.feedback)&&Array.isArray(value.windows)&&value.windows.length<=500&&new Set(value.windows.map(w=>w?.id)).size===value.windows.length&&value.windows.every(w=>object(w)&&text(w.id)&&Number.isInteger(w.year)&&Number.isInteger(w.index)&&w.index>=0&&w.index<=3&&Number.isFinite(w.minutes)&&w.minutes>=0&&(w.average===null||Number.isFinite(w.average)&&w.average>=4&&w.average<=10)&&Number.isInteger(w.tier)&&w.tier>=0&&w.tier<5&&text(w.feedback))&&Array.isArray(value.events)&&value.events.length<=100&&new Set(value.events.map(e=>e?.id)).size===value.events.length&&value.events.every(e=>object(e)&&text(e.id)&&['callup','starter','debut','goal','qualified','eliminated','return'].includes(e.kind)&&Number.isInteger(e.year)&&text(e.title)&&text(e.text)&&typeof e.seen==='boolean'&&(e.date===undefined||date(e.date)))&&(value.returnToClub===null||object(value.returnToClub)&&text(value.returnToClub.id)&&Number.isInteger(value.returnToClub.year)&&Number.isInteger(value.returnToClub.week)&&value.returnToClub.week>=0&&value.returnToClub.week<=30&&Number.isFinite(value.returnToClub.minutes)&&value.returnToClub.minutes>=0&&date(value.returnToClub.date)&&date(value.returnToClub.nextDate)&&text(value.returnToClub.text));
}
export function validNationalCalendar(calendar,loads){
 const breaks=calendar?.internationalBreaks;if(breaks!==undefined&&(!Array.isArray(breaks)||breaks.length>4||new Set(breaks.map(b=>b?.id)).size!==breaks.length||breaks.some(b=>!b||typeof b.id!=='string'||!/^\d{4}:window:[0-3]$/.test(b.id)||!/^\d{4}-\d{2}-\d{2}$/.test(b.start)||!Number.isFinite(Date.parse(b.start))||![7,25].includes(b.days))))return false;
 return loads===undefined||Array.isArray(loads)&&loads.length<=100&&new Set(loads).size===loads.length&&loads.every(id=>typeof id==='string'&&id.length<160);
}
export function validNationalEvidence(value){return value===undefined||!!value&&typeof value==='object'&&!Array.isArray(value)&&Number.isInteger(value.year)&&value.year>=1900&&value.year<=9999&&['appearances','minutes','majorAppearances','majorMinutes'].every(k=>Number.isInteger(value[k])&&value[k]>=0&&value[k]<100000)&&Number.isFinite(value.attention)&&value.attention>=0&&value.attention<=2.5&&Number.isFinite(value.awardBonus)&&value.awardBonus>=0&&value.awardBonus<=6}
