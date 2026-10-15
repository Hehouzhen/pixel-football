import {getTeam} from './clubs.mjs';
import {positionRating} from './ratings.mjs';

// Amounts are in millions of euros; past transaction amounts never revalue.
export function marketValue(player={}){
  const q=positionRating(player),age=player.age??25,potential=player.potential??q;
  const ageFactor=age<21?1.1:age<27?1.2:age<30?1:age<33?.68:.38;
  const upside=1+Math.max(0,potential-q)*.012;
  const rows=(player.history??[]).slice(-12),form=rows.length>=4?Math.max(.85,Math.min(1.18,1+(rows.reduce((n,r)=>n+(r.rating??6),0)/rows.length-6.5)*.07)):1;
  return +Math.max(.08,.10*Math.exp((q-45)*.16)*ageFactor*upside*form).toFixed(2);
}
export const money=amount=>`€${Number(amount??0)>=1?Number(amount).toFixed(2)+'m':Math.round(Number(amount??0)*1000)+'k'}`;
export function careerDeal(player,season,teamId,kind='transfer'){
  const row=season.playerData?.[player.id]??player,year=season.calendar?.startYear??2026,years=Math.max(0,(row.contractEndYear??year+1)-year);
  const estimate=marketValue({...row,...player}),free=kind==='return'||kind==='first'||row.freeAgent||years===0;
  const asking=free?0:+(estimate*(years>=2?1.12:.8)*(kind==='loan'?.08:1)).toFixed(2);
  const funds=season.worldFunds?.[teamId]??(16+(getTeam(teamId)?.strength??1)*18);
  return {marketValue:estimate,askingPrice:asking,fee:asking,affordable:asking<=funds,annualWage:row.contractWage??+Math.max(.03,estimate*.08).toFixed(2),years:kind==='loan'?1:2};
}
