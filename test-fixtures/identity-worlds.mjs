import {createSeason,prepareSeason} from '../league.mjs';
import {createCareerPlayer,finishCareerMatch} from '../career.mjs';
import {chooseNation} from '../national-team.mjs';
import {openNationalWindow,respondNationalCallup} from '../international-career.mjs';
import {initializeJourney,createYouthMatch,finishYouthMatch,firstContractOffers,signFirstContract} from '../career-journey.mjs';
import {movePlayer} from '../football-life.mjs';
export function classicFixture(){const season=createSeason('england','arsenal',31),player=createCareerPlayer('同一人',27,'midfielder',{skin:'#9d704e',hair:'#d6d6ce',hairstyle:3});prepareSeason(season,player);return {season,player}}
export function professionalFixture(){let {season,player}=initializeJourney(createCareerPlayer('同一人',27,'midfielder',{skin:'#9d704e',hair:'#d6d6ce',hairstyle:3}),createSeason('england','arsenal',31));for(let i=0;i<4;i++){const m=createYouthMatch(player,season,1,120);m.stats[player.index].playingSeconds=120;player=finishYouthMatch(player,m)}return signFirstContract(player,season,firstContractOffers(player,season)[0].teamId)}
export function nationalFixture(){let {season,player}=classicFixture();player=chooseNation(player,'chn');player.attributes=Object.fromEntries(Object.keys(player.attributes).map(k=>[k,85]));for(let i=0;i<8;i++)player=finishCareerMatch(player,{playingSeconds:180,goals:1},[2,0],180,{competition:'league',opponent:'固定考察样本',season:1});prepareSeason(season,player);season.week=5;player=respondNationalCallup(openNationalWindow(player,season),season,true);return {season,player}}
// Generated scenarios are fixed-seed test data, not copies of the user's browser saves.
export function identityFixtures(){
 const classic=classicFixture(),custom=classicFixture();custom.player.name='用户定制';custom.player.appearance.hairstyle=1;prepareSeason(custom.season,custom.player);
 const transferred=classicFixture(),id=transferred.season.rosterIds.chelsea[5];movePlayer(transferred.season,id,'arsenal',{salary:1,years:3,fee:0});
 const namesakes=classicFixture();namesakes.season.playerData[namesakes.season.rosterIds.chelsea[5]].name='同一人';
 const legacy=classicFixture();legacy.player.history=[{competition:'league',season:1,opponent:'旧对手',score:[1,0],report:{events:[{type:'goal',player:5,team:0,minute:20}]}}];
 const damaged=classicFixture();damaged.season.rosterIds.arsenal[0]='missing-player';
 return {classic,professional:professionalFixture(),custom,transferred,national:nationalFixture(),namesakes,legacy,damaged};
}
