import {standings} from './league.mjs';

export function createClubChallenge(season,{targetPosition=4,requiredPromotions=0}={}){
  if(!Number.isInteger(targetPosition)||targetPosition<1||targetPosition>16||!Number.isInteger(requiredPromotions)||requiredPromotions<0||requiredPromotions>3)throw new Error('挑战目标无效');
  return {version:1,targetPosition,requiredPromotions,academyBaseline:season.academy?.graduates?.length??0,results:[]};
}

export function settleClubChallenge(season){
  const challenge=season.challenge;if(!challenge)return null;
  const year=season.calendar?.startYear??2026+(season.history?.length??0),existing=challenge.results?.find(row=>row.year===year);if(existing)return existing;
  const rank=standings(season).findIndex(row=>row.id===season.teamId)+1,promotions=Math.max(0,(season.academy?.graduates?.length??0)-(challenge.academyBaseline??0)),result={year,rank,promotions,targetPosition:challenge.targetPosition,requiredPromotions:challenge.requiredPromotions,completed:rank<=challenge.targetPosition&&promotions>=challenge.requiredPromotions};
  challenge.results=[...(challenge.results??[]),result].slice(-100);return result;
}

export function carryClubChallenge(oldSeason,newSeason){
  if(!oldSeason.challenge)return null;
  return {...structuredClone(oldSeason.challenge),academyBaseline:oldSeason.academy?.graduates?.length??0};
}

export function challengeProgress(season){
  const challenge=season?.challenge;if(!challenge)return null;
  const rank=standings(season).findIndex(row=>row.id===season.teamId)+1,promotions=Math.max(0,(season.academy?.graduates?.length??0)-(challenge.academyBaseline??0));
  return {rank,targetPosition:challenge.targetPosition,promotions,requiredPromotions:challenge.requiredPromotions};
}
