export const LEAGUES = [
  {id:'coast',name:'海岸联赛',teams:[
    {id:'bay',name:'蓝湾 FC',color:'#77bafd',strength:1.00},
    {id:'flame',name:'赤焰联队',color:'#fa8c76',strength:1.04},
    {id:'tide',name:'潮汐竞技',color:'#9be5d2',strength:.96},
    {id:'iron',name:'铁桥城',color:'#f7bd76',strength:1.08},
    {id:'north',name:'北岸星',color:'#b1a1f3',strength:.91},
    {id:'forest',name:'森谷队',color:'#c7e478',strength:1.02}]},
  {id:'metro',name:'都会联赛',teams:[
    {id:'orbit',name:'环城 FC',color:'#86c8f5',strength:1.05},
    {id:'dawn',name:'破晓联队',color:'#f6aa85',strength:.98},
    {id:'stone',name:'磐石竞技',color:'#b6bbd8',strength:1.08},
    {id:'pulse',name:'脉冲城',color:'#e4da76',strength:1.02},
    {id:'silver',name:'银港队',color:'#a3e4e6',strength:.94},
    {id:'summit',name:'峰线 FC',color:'#d9a6f5',strength:1.00}]}
];
const surnames=['林','周','陈','江','叶','余','许','沈','陆','宋','何','夏','曹','邱','顾','唐','韩','郑'];
const given=['川','澄','航','野','岚','锐','鸣','辰','越','朗','凯','尧','珂','隽','宁','凡','硕','昕'];
export function roster(teamId){const index=LEAGUES.flatMap(l=>l.teams).findIndex(t=>t.id===teamId);return Array.from({length:6},(_,i)=>`${surnames[(index*5+i*3)%surnames.length]}${given[(index*7+i*5)%given.length]}`)}
export function fixtures(league){const ids=league.teams.map(t=>t.id),rounds=[];for(let round=0;round<ids.length-1;round++){const games=[];for(let j=0;j<ids.length/2;j++){const a=ids[j],b=ids[ids.length-1-j];games.push(round%2?[b,a]:[a,b])}rounds.push(games);ids.splice(1,0,ids.pop())}return [...rounds,...rounds.map(games=>games.map(([a,b])=>[b,a]))]}
export function createSeason(leagueId,teamId){const league=LEAGUES.find(l=>l.id===leagueId),team=league?.teams.find(t=>t.id===teamId);if(!team)throw new Error('Unknown league or team');return {leagueId,teamId,week:0,tactic:'balanced',results:[],players:{}}}
export function currentFixture(season){const league=LEAGUES.find(l=>l.id===season.leagueId);return fixtures(league)[season.week]?.find(pair=>pair.includes(season.teamId))}
function dice(seed){let x=Math.sin(seed*127.1+78.3)*43758.5453;return x-Math.floor(x)}
function simulate(a,b,week,league){const ta=league.teams.find(t=>t.id===a),tb=league.teams.find(t=>t.id===b),seed=week*79+league.teams.indexOf(ta)*19+league.teams.indexOf(tb)*37;return [Math.max(0,Math.round(1.15+(ta.strength-tb.strength)*3+(dice(seed)-.5)*3)),Math.max(0,Math.round(.95+(tb.strength-ta.strength)*3+(dice(seed+1)-.5)*3))]}
function addPlayer(season,teamId,index,stat){const key=`${teamId}:${index}`;const current=season.players[key]??{goals:0,assists:0,shots:0,headers:0,bicycles:0,yellows:0,reds:0};for(const field of Object.keys(current))current[field]+=(stat[field]??0);season.players[key]=current}
export function completeWeek(season,score,matchStats){const league=LEAGUES.find(l=>l.id===season.leagueId),weekFixtures=fixtures(league)[season.week];if(!weekFixtures||!Array.isArray(score)||score.length!==2)throw new Error('No match to complete');const mine=currentFixture(season),opponent=mine.find(id=>id!==season.teamId);for(const [home,away] of weekFixtures){const own=home===season.teamId||away===season.teamId;const result=own?(home===season.teamId?score:[score[1],score[0]]):simulate(home,away,season.week,league);season.results.push({week:season.week,home,away,score:result});if(own){for(let i=0;i<6;i++){addPlayer(season,season.teamId,i,matchStats[i]);addPlayer(season,opponent,i,matchStats[i+6])}}else{for(let side=0;side<2;side++)for(let goal=0;goal<result[side];goal++){const teamId=side===0?home:away,scorer=1+((goal+season.week+side*2)%5);addPlayer(season,teamId,scorer,{goals:1,shots:2});addPlayer(season,teamId,1+((scorer+1)%5),{assists:1})}}}season.week++;return season}
export function standings(season){const league=LEAGUES.find(l=>l.id===season.leagueId),rows=league.teams.map(t=>({id:t.id,name:t.name,played:0,win:0,draw:0,loss:0,for:0,against:0,points:0}));for(const {home,away,score:[h,a]} of season.results){const x=rows.find(r=>r.id===home),y=rows.find(r=>r.id===away);x.played++;y.played++;x.for+=h;x.against+=a;y.for+=a;y.against+=h;if(h>a){x.win++;y.loss++;x.points+=3}else if(a>h){y.win++;x.loss++;y.points+=3}else{x.draw++;y.draw++;x.points++;y.points++}}return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for)}
export function leaders(season){const league=LEAGUES.find(l=>l.id===season.leagueId);return Object.entries(season.players).map(([id,stats])=>{const [teamId,index]=id.split(':');return {name:roster(teamId)[+index],team:league.teams.find(t=>t.id===teamId).name,...stats}}).sort((a,b)=>b.goals-a.goals||b.assists-a.assists).slice(0,8)}
