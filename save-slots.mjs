import {LEAGUES} from './league.mjs';

export const SAVE_KEY='pixel-pitch-saves-v2';
export const LEGACY_KEY='pixel-pitch-season-v1';

function validSeason(season){return !!season&&LEAGUES.some(league=>league.id===season.leagueId&&league.teams.some(team=>team.id===season.teamId))&&Number.isInteger(season.week)&&season.week>=0&&season.week<=10&&Array.isArray(season.results)&&!!season.players}
function blank(){return {version:2,active:null,slots:[null,null,null]}}

export function loadSaveData(storage=localStorage){
  try{
    const saved=JSON.parse(storage.getItem(SAVE_KEY));
    if(saved?.version===2&&Array.isArray(saved.slots)){
      const slots=Array.from({length:3},(_,index)=>{const slot=saved.slots[index];return slot?.mode==='club'&&validSeason(slot.season)?slot:null});
      const active=Number.isInteger(saved.active)&&slots[saved.active]?saved.active:null;
      return {version:2,active,slots};
    }
    const legacy=JSON.parse(storage.getItem(LEGACY_KEY));
    if(validSeason(legacy)){
      const now=Date.now(),data={version:2,active:0,slots:[makeClubSlot(legacy,1,180,now),null,null]};
      storage.setItem(SAVE_KEY,JSON.stringify(data));
      return data;
    }
  }catch{}
  return blank();
}

export function makeClubSlot(season,difficulty=1,duration=180,now=Date.now()){return {mode:'club',season,difficulty,duration,createdAt:now,updatedAt:now}}
export function saveSaveData(data,storage=localStorage){storage.setItem(SAVE_KEY,JSON.stringify(data))}
