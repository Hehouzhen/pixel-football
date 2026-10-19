import {getTeam} from './clubs.mjs';
import {positionRating} from './ratings.mjs';

// Amounts are in millions of euros; past transaction amounts never revalue.
const valueBands=[[45,.1],[55,.6],[60,1.5],[65,4],[70,9],[75,20],[80,40],[85,70],[90,115],[95,175],[99,220]];
const wageBands=[[45,.25],[55,.55],[60,.9],[65,1.35],[70,1.9],[75,2.7],[80,3.8],[85,5.6],[90,7.8],[95,10.8],[99,13.5]];
const interpolate=(bands,value)=>{const i=bands.findIndex(([rating])=>rating>=value);if(i<=0)return bands[0][1];const [low,a]=bands[i-1],[high,b]=bands[i];return a+(b-a)*(value-low)/(high-low)};
const roleFactor={prospect:.72,rotation:1,starter:1.08};

export function marketValue(player={}){
  const q=positionRating(player),age=player.age??25,potential=player.potential??q;
  const ageFactor=interpolate([[16,.9],[18,1.02],[21,1.1],[24,1.15],[27,1.15],[30,1],[33,.78],[36,.55],[40,.35]],age);
  const upside=1+Math.min(16,Math.max(0,potential-q))*.008;
  const rows=(player.history??[]).slice(-12),form=rows.length>=4?Math.max(.92,Math.min(1.08,1+(rows.reduce((n,r)=>n+(r.rating??6),0)/rows.length-6.5)*.05)):1;
  return +Math.min(260,Math.max(.08,interpolate(valueBands,q)*ageFactor*upside*form)).toFixed(2);
}
export function wageExpectation(player={}){return +(interpolate(wageBands,positionRating(player))*(roleFactor[player.squadRole]??1)).toFixed(1)}
export const money=amount=>`€${Number(amount??0)>=1?Number(amount).toFixed(2)+'m':Math.round(Number(amount??0)*1000)+'k'}`;
export function careerDeal(player,season,teamId,kind='transfer'){
  const row=season.playerData?.[player.id]??player,year=season.calendar?.startYear??2026,years=Math.max(0,(row.contractEndYear??year+1)-year);
  const estimate=marketValue({...row,...player}),free=kind==='return'||kind==='first'||row.freeAgent||years===0;
  const asking=free?0:+(estimate*(years>=2?1.12:.8)*(kind==='loan'?.08:1)).toFixed(2);
  const funds=season.worldFunds?.[teamId]??(16+(getTeam(teamId)?.strength??1)*18);
  return {marketValue:estimate,askingPrice:asking,fee:asking,affordable:asking<=funds,annualWage:row.contractWage??wageExpectation({...row,...player}),years:kind==='loan'?1:2};
}
