const DAY=86400000;
export function leagueDate(year,round){const base=new Date(Date.UTC(year,7,15));base.setUTCDate(base.getUTCDate()+(6-base.getUTCDay()+7)%7);return new Date(+base+(round+Math.floor(round/4)+(round>=15?2:0))*7*DAY).toISOString().slice(0,10)}
const cupAfter=[2,5,8,11,14,17,19,21,23,30];
function baseFixtureDate(season,competition='league',round=0,phase='league'){
 const year=season.calendar?.startYear??2026;if(competition==='league')return leagueDate(year,round);
 if(season.formatVersion!==2){const rounds=((season.leagueTeamIds?.length??8)-1)*2,offset=phase==='league'?round:phase==='semi'?4:5;return new Date(Date.parse(leagueDate(year,rounds))+offset*7*DAY).toISOString().slice(0,10)}
 const day=phase==='league'?round:phase==='quarterfinal'?5+round:phase==='semi'?7+round:9,after=cupAfter[day]??30;
 return new Date(Date.parse(leagueDate(year,Math.max(0,after-1)))+(phase==='final'?7:4)*DAY).toISOString().slice(0,10);
}
export const daysBetween=(a,b)=>Math.max(0,Math.round((Date.parse(b)-Date.parse(a))/DAY));
export function fixtureKey(event){return `${event.date??''}:${event.competition}:${event.round}:${event.pair.join(':')}`}

export function fixtureDate(season,competition='league',round=0,phase='league'){
 let date=baseFixtureDate(season,competition,round,phase);
 for(const pause of season.calendar?.internationalBreaks??[]){if(date>=pause.start)date=new Date(Date.parse(date)+pause.days*DAY).toISOString().slice(0,10)}
 const current=season.calendar?.currentDate,upcoming=competition==='league'?round>=season.week:phase===season.cup?.phase&&round>=(season.cup?.round??0);
 if(current&&season.calendar?.internationalBreaks?.length&&upcoming){const earliest=new Date(Date.parse(current)+2*DAY).toISOString().slice(0,10);if(date<earliest)date=earliest}
 return date;
}
