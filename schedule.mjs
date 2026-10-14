const DAY=86400000;
export function leagueDate(year,round){const base=new Date(Date.UTC(year,7,15));base.setUTCDate(base.getUTCDate()+(6-base.getUTCDay()+7)%7);return new Date(+base+(round+Math.floor(round/4)+(round>=15?2:0))*7*DAY).toISOString().slice(0,10)}
const cupAfter=[2,5,8,11,14,17,19,21,23,30];
export function fixtureDate(season,competition='league',round=0,phase='league'){
 const year=season.calendar?.startYear??2026;if(competition==='league')return leagueDate(year,round);
 if(season.formatVersion!==2){const rounds=((season.leagueTeamIds?.length??8)-1)*2,offset=phase==='league'?round:phase==='semi'?4:5;return new Date(Date.parse(leagueDate(year,rounds))+offset*7*DAY).toISOString().slice(0,10)}
 const day=phase==='league'?round:phase==='quarterfinal'?5+round:phase==='semi'?7+round:9,after=cupAfter[day]??30;
 return new Date(Date.parse(leagueDate(year,Math.max(0,after-1)))+(phase==='final'?7:4)*DAY).toISOString().slice(0,10);
}
export const daysBetween=(a,b)=>Math.max(0,Math.round((Date.parse(b)-Date.parse(a))/DAY));
export function fixtureKey(event){return `${event.date??''}:${event.competition}:${event.round}:${event.pair.join(':')}`}
