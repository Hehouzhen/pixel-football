import {cupNextMatch} from './cup.mjs';
import {currentFixture,seasonRounds} from './league.mjs';

const cupDates=[
  {after:2,label:'小组赛'},
  {after:5,label:'小组赛'},
  {after:8,label:'小组赛'},
  {after:11,label:'小组赛'},
  {after:14,label:'小组赛'},
  {after:17,label:'八强首回合'},
  {after:19,label:'八强次回合'},
  {after:21,label:'半决赛首回合'},
  {after:23,label:'半决赛次回合'},
  {after:30,label:'决赛'},
];

function completedCupDates(cup){
  if(!cup)return 0;
  if(cup.phase==='complete')return 10;
  if(cup.phase==='league')return Math.min(4,cup.round);
  if(cup.formatVersion!==2)return 0;
  if(cup.phase==='quarterfinal')return 5+cup.round;
  if(cup.phase==='semi')return 7+cup.round;
  return 9;
}

export function nextCalendarFixture(season){
  if(!season)return null;
  const rounds=seasonRounds(season),cup=season.cup;
  if(season.formatVersion!==2){
    if(season.week<rounds)return {competition:'league',pair:currentFixture(season),round:season.week,event:season.week};
    const pair=cupNextMatch(season);return pair?{competition:'cup',pair,round:cup.round,event:rounds+cup.round}:null;
  }
  const cupDay=completedCupDates(cup),nextCup=cup&&cupNextMatch(season);
  if(cup?.formatVersion!==2&&season.week<rounds)return {competition:'league',pair:currentFixture(season),round:season.week,event:season.week};
  if(nextCup){
    const entry=cupDates[cupDay];
    if(entry&&season.week>=entry.after)return {competition:'cup',pair:nextCup,round:cup.round,event:season.week+cupDay,label:entry.label};
  }
  const nextRound=season.week;
  if(nextRound<rounds)return {competition:'league',pair:currentFixture(season),round:nextRound,event:nextRound+cupDay};
  if(nextCup)return {competition:'cup',pair:nextCup,round:cup.round,event:season.week+cupDay,label:'欧洲冠军杯决赛'};
  return null;
}
