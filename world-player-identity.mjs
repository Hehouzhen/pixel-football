import {resolveWorldPlayer} from './player-registry.mjs';
export {resolveWorldPlayer} from './player-registry.mjs';
import {prospectName} from './player-names.mjs';
import {validAppearance} from './appearance.mjs';
import {LEAGUES,getTeam} from './clubs.mjs';
import {ensureRatings,positionRating,ABILITIES} from './ratings.mjs';
import {advanceSeasonAges} from './aging.mjs';
import {INTERNATIONAL_TEAMS,internationalTeam,nationalYear,nationalRandom} from './national-countries.mjs';
const group=i=>i===0?0:i<3?1:i<5?3:5;
const hash=text=>{let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0};
const emptyStats=()=>({caps:0,starts:0,goals:0,assists:0,minutes:0,ratingTotal:0,history:[]});
export function clubLabel(player,season=null){return player.freeAgent?'自由球员':season?.teamNames?.[player.teamId]??getTeam(player.teamId)?.name??player.clubName??'其他联赛'}
export function assignPlayerNation(player){
 if(player.nationId!==undefined){if(!internationalTeam(player.nationId))throw new Error('球员代表国家无效');return}
 const seed=hash(player.id),origin=String(player.id).split(':')[1],league=LEAGUES.find(l=>l.teams.some(t=>t.id===origin)),domestic={england:'eng',spain:'esp',germany:'ger',italy:'ita',france:'fra'}[league?.id],choices=['chn','arg','fra','jpn','mar','nzl'];
 player.nationId=domestic&&seed%100<35?domestic:seed%100<67?choices[hash(player.id+':nation')%choices.length]:INTERNATIONAL_TEAMS[hash(player.id+':world')%INTERNATIONAL_TEAMS.length].id;
 player.nationalitySource='game-generated';
}
function legacyPlayer(id,year){
 const match=/^national:([a-z]{3}):([0-5])(:reserve)?$/.exec(id);if(!match)return null;
 const nation=internationalTeam(match[1]);if(!nation)return null;const r=nationalRandom(nation.id),names=['门将','右后卫','左后卫','组织中场','边路中场','中锋'];let attributes;
 for(let i=0;i<=+match[2];i++)attributes=ensureRatings(Object.fromEntries([...ABILITIES,'goalkeeping'].map(k=>[k,Math.round(Math.max(30,Math.min(94,nation.rating+(r()-.5)*12)))])));
 const index=+match[2];return {id,name:`${nation.name}·${names[index]}${match[3]?'替补':''}`,number:[1,2,3,8,7,9][index]+(match[3]?10:0),position:index,attributes,nationId:nation.id,nationalitySource:'legacy-national',clubName:'其他联赛',age:24,lastAgedStartYear:year,potential:Math.min(99,nation.rating+4),retired:false,appearance:{},internationalStats:emptyStats()};
}
function careerIdentity(season,career){
 const p=season.playerData?.[career?.id];if(!p||!career.international)return;
 p.nationId=career.international.nationId;p.nationalitySource='player-choice';
 const national=career.nationalCareer;if(national)p.internationalStats={caps:national.caps,starts:national.starts,goals:national.goals,assists:national.assists,minutes:national.minutes,ratingTotal:national.ratingTotal,history:national.history.slice(-60).map(({report,...r})=>({...r,nationId:p.nationId}))};
}
export function ensureNationalWorld(season,career=null){
 for(const p of Object.values(season.playerData??{}))assignPlayerNation(p);
 careerIdentity(season,career);
 if(!season.nationalWorld&&!career?.international)return season;
 const world=season.nationalWorld??={version:1,players:{},squads:{},processedMatches:[]},year=nationalYear(season);
 // Preserve referenced legacy people as themselves; never relabel old reports as club players.
 for(const row of career?.nationalCareer?.history??[]){const ids=[...(row.report?.playerIds??[]),...(row.report?.substitutions??[]).map(s=>s.playerId)];for(const id of ids){if(!resolveWorldPlayer(season,id)){const p=legacyPlayer(id,year);if(p)world.players[id]=p}}}
 advanceSeasonAges({calendar:{startYear:year},playerData:world.players});
 for(const p of Object.values(world.players))if(p.age>=40)p.retired=true;
 if(career?.international)ensureNationPool(season,career.international.nationId,career.id);
 return season;
}
const nameParts={chn:[['张昊辰','李子谦','王景川','陈宇航','赵云帆','林泽远'],['']],arg:[['Mateo','Tomas','Nicolas','Lucas','Santiago'],['Acosta','Farias','Ledesma','Soria','Molina']],fra:[['Hugo','Mathis','Louis','Jules','Theo'],['Morel','Renaud','Laurent','Garnier','Perrin']],jpn:[['Haruto','Ren','Yuto','Sota','Daichi'],['Mizuno','Takeda','Aoyama','Kuroda','Ishida']],mar:[['Yassine','Amine','Ilyas','Mehdi','Adam'],['Bennani','El Amrani','Idrissi','Berrada','Alaoui']],nzl:[['Liam','Noah','Finn','Ethan','James'],['Walker','Fraser','Reid','Bennett','Clarke']]};
function generateInternationalPlayer(season,nation,index){
 const world=season.nationalWorld,year=nationalYear(season);let serial=0,id;do{id=`world:${nation.id}:${index}:y${year}:${serial++}`}while(resolveWorldPlayer(season,id));
 const seed=hash(id),r=nationalRandom(id),bank=nameParts[nation.id]??[['Alex','Leo','Sam','Nico','Max'],['Vale','Reed','Costa','Marin','Silva']],used=new Set([...Object.values(season.playerData??{}),...Object.values(world.players)].map(p=>p.name));let name;if(nation.id==='chn')name=prospectName(null,seed,used);else{const [first,last]=bank;for(let n=0;n<first.length*last.length*(first.length+1);n++){const k=(seed%(first.length*last.length*(first.length+1))+n)%(first.length*last.length*(first.length+1)),a=first[k%first.length],b=last[Math.floor(k/first.length)%last.length],middle=Math.floor(k/(first.length*last.length)),candidate=middle?`${a} ${first[middle-1]} ${b}`:`${a} ${b}`;if(!used.has(candidate)){name=candidate;break}}name??=prospectName('england',seed,used)}
 const p={id,name,number:index===0?1:index+5,position:index,nationId:nation.id,nationalitySource:'game-generated',clubName:'其他联赛',age:21+seed%12,lastAgedStartYear:year,potential:Math.min(99,nation.rating+6),retired:false,appearance:{skin:['#ebbd89','#d3a179','#9d704e'][seed%3],hair:'#302b24',hairstyle:seed%4},attributes:ensureRatings(Object.fromEntries([...ABILITIES,'goalkeeping'].map(k=>[k,Math.round(Math.max(30,Math.min(94,nation.rating+(r()-.5)*12)))]))),internationalStats:emptyStats()};world.players[id]=p;return p;
}
function candidates(season,nationId,exclude){return [...Object.values(season.playerData??{}),...Object.values(season.nationalWorld.players)].filter(p=>p.nationId===nationId&&!p.retired&&p.id!==exclude)}
function ensureNationPool(season,nationId,exclude){const nation=internationalTeam(nationId);for(const [position,need] of [[0,1],[1,3],[3,3],[5,2]]){let pool=candidates(season,nationId,exclude);while(pool.filter(p=>group(p.position)===position).length<need){generateInternationalPlayer(season,nation,position);pool=candidates(season,nationId,exclude)}}}
export function nationalRoster(season,nationId,{career=null,selection=null,key=null,freeze=false}={}){
 if(!freeze){const copy=structuredClone(season);return nationalRoster(copy,nationId,{career,selection,key,freeze:true})}
 ensureNationalWorld(season,career);season.nationalWorld??={version:1,players:{},squads:{},processedMatches:[]};const world=season.nationalWorld,nation=internationalTeam(nationId);if(!nation)throw new Error('国家队无效');
 const snapshotKey=key?`${key}:${nationId}`:null;let snapshot=snapshotKey&&world.squads[snapshotKey];
 if(!snapshot){ensureNationPool(season,nationId,career?.id);
  const used=new Set(),slots=[0,1,2,3,4,5,1,3,5],members=slots.map((slot,index)=>{const p=candidates(season,nationId,career?.id).filter(p=>!used.has(p.id)&&group(p.position)===group(slot)).sort((a,b)=>positionRating(b,slot)-positionRating(a,slot)||a.id.localeCompare(b.id))[0];used.add(p.id);return {playerId:p.id,slot,starter:index<6,number:[1,2,3,8,7,9,12,14,19][index]}});
  if(career?.international?.nationId===nationId&&selection?.selected){const index=selection.role==='starter'?career.index:6+[1,3,5].indexOf(career.index);members[index]={playerId:career.id,slot:career.index,starter:selection.role==='starter',number:career.number};}
  const numbers=new Set();for(const member of [...members.filter(m=>m.playerId===career?.id),...members.filter(m=>m.playerId!==career?.id)]){if(numbers.has(member.number))member.number=Array.from({length:99},(_,i)=>i+1).find(n=>!numbers.has(n)&&!members.some(m=>m!==member&&m.number===n));numbers.add(member.number)}
  snapshot={nationId,year:nationalYear(season),members};if(freeze&&snapshotKey)world.squads[snapshotKey]=snapshot;
 }
 return snapshot.members.map(member=>{const p=resolveWorldPlayer(season,member.playerId);if(!p)throw new Error('国家队球员身份缺失');return {...p,id:p.id,index:member.slot,number:member.number,clubNumber:p.number,club:clubLabel(p,season),starter:member.starter,mine:p.id===career?.id,role:['门将','后卫','后卫','中场','中场','前锋'][member.slot],rating:positionRating(p,member.slot)}});
}
export function internationalPlayerStats(match){
 const report=match.report(),rows=report.stats.map((stat,index)=>({playerId:report.playerIds[index],nationId:match.nationalSides[Math.floor(index/6)],slot:index%6,started:!(match.substitutedOut&&index===match.careerIndex),minutes:Math.min(90,Math.round(stat.playingSeconds/match.duration*90)),...stat}));
 if(match.substitutedOut){const out=match.substitutedOut;rows.push({playerId:out.playerId,nationId:match.nationalSides[0],slot:out.index,started:true,minutes:out.minuteOff,...out.stats})}
 return rows;
}
export function recordWorldNationalMatch(season,career,match,ratingFor){
 ensureNationalWorld(season,career);const world=season.nationalWorld,f=match.nationalFixture;if(!f||world.processedMatches.includes(f.id))return [];
 const lines=internationalPlayerStats(match),records=[];
 for(const line of lines){const p=resolveWorldPlayer(season,line.playerId);if(!p||line.minutes<=0)continue;const side=match.nationalSides.indexOf(line.nationId),score=side===0?[...match.score]:[...match.score].reverse(),importance=career.nationalCareer?.history.find(r=>r.id===f.id)?.importance??(f.knockout?1.5:f.id.includes(':finals')?1:.4),rating=ratingFor(line,score,p.position===0?'keeper':p.position<3?'defender':p.position<5?'midfielder':'forward');
  const row={id:f.id,year:nationalYear(season),nationId:line.nationId,opponentId:match.nationalSides[1-side],opponent:match.teams[1-side],date:f.date,score,minutes:line.minutes,goals:line.goals??0,assists:line.assists??0,rating:+rating.toFixed(1),started:line.started,importance,source:match.journeySimulated?'simulated':'played'};
  if(p.id!==career.id){const stats=p.internationalStats??=emptyStats();stats.caps++;stats.starts+=row.started?1:0;stats.goals+=row.goals;stats.assists+=row.assists;stats.minutes+=row.minutes;stats.ratingTotal+=row.rating;stats.history=[...stats.history,row].slice(-60)}records.push({...row,playerId:p.id});
 }
 world.processedMatches.push(f.id);return lines;
}
export function validInternationalStats(stats){
 if(stats===undefined)return true;return !!stats&&typeof stats==='object'&&!Array.isArray(stats)&&['caps','starts','goals','assists','minutes'].every(k=>Number.isInteger(stats[k])&&stats[k]>=0&&stats[k]<=1000000)&&Number.isFinite(stats.ratingTotal)&&stats.ratingTotal>=0&&Array.isArray(stats.history)&&stats.history.length<=60&&stats.history.length<=stats.caps&&new Set(stats.history.map(r=>r?.id)).size===stats.history.length&&stats.history.every(r=>r&&typeof r.id==='string'&&r.id.length<160&&Number.isInteger(r.year)&&r.year>=1900&&r.year<=9999&&Number.isInteger(r.minutes)&&r.minutes>0&&r.minutes<=90&&Number.isInteger(r.goals)&&r.goals>=0&&Number.isInteger(r.assists)&&r.assists>=0&&Number.isFinite(r.rating)&&r.rating>=4&&r.rating<=10&&Array.isArray(r.score)&&r.score.length===2&&r.score.every(n=>Number.isInteger(n)&&n>=0&&n<100)&&typeof r.started==='boolean');
}
export function validWorldNationalIdentity(season){
 const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);if(season.playerData!==undefined&&!object(season.playerData))return false;const world=season.nationalWorld,club=Object.values(season.playerData??{});if(club.some(p=>!object(p)||p.nationId!==undefined&&!internationalTeam(p.nationId)||!validInternationalStats(p.internationalStats)))return false;
 if(world===undefined)return true;
 if(!object(world)||world.version!==1||!object(world.players)||!object(world.squads)||!Array.isArray(world.processedMatches)||world.processedMatches.length>5000||new Set(world.processedMatches).size!==world.processedMatches.length||world.processedMatches.some(id=>typeof id!=='string'||id.length>160)||Object.keys(world.players).length>20000||Object.keys(world.squads).length>5000)return false;
 if(Object.entries(world.players).some(([id,p])=>!p||p.id!==id||id.split(':')[1]!==p.nationId||season.playerData?.[id]||!/^(national|world):[a-z]{3}:[0-5](?::reserve|:y\d{4}:\d+)?$/.test(id)||!internationalTeam(p.nationId)||typeof p.name!=='string'||p.name.length>100||!Number.isInteger(p.age)||p.age<15||p.age>130||!Number.isInteger(p.position)||p.position<0||p.position>5||typeof p.retired!=='boolean'||!Number.isInteger(p.number)||p.number<1||p.number>99||!validAppearance(p.appearance)||!p.attributes||ABILITIES.some(k=>!Number.isInteger(p.attributes[k])||p.attributes[k]<1||p.attributes[k]>99)||!validInternationalStats(p.internationalStats)))return false;
 return Object.entries(world.squads).every(([key,s])=>key.length<160&&s&&internationalTeam(s.nationId)&&Number.isInteger(s.year)&&Array.isArray(s.members)&&s.members.length===9&&s.members.every(m=>object(m)&&typeof m.playerId==='string')&&new Set(s.members.map(m=>m.playerId)).size===9&&new Set(s.members.map(m=>m.number)).size===9&&s.members.every((m,i)=>{const p=resolveWorldPlayer(season,m.playerId);return p&&p.nationId===s.nationId&&Number.isInteger(m.slot)&&m.slot>=0&&m.slot<6&&m.starter===(i<6)&&Number.isInteger(m.number)&&m.number>=1&&m.number<=99}));
}
