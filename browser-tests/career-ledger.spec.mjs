import {test,expect} from '@playwright/test';
import {SAVE_KEY,makeCareerSlot,saveSaveData} from '../save-slots.mjs';
import {professionalFixture} from '../test-fixtures/identity-worlds.mjs';
import {currentFixture,completeWeek,orientStats,prepareSeason} from '../league.mjs';
import {simulateNextScheduled} from '../long-simulation.mjs';
import {archiveSeason} from '../history.mjs';
import {EventMatch} from '../simulation.mjs';

function savedCareer(){
 let {season,player}=professionalFixture();prepareSeason(season,player);
 const [home,away]=currentFixture(season),week=season.week,homeIsUser=home===season.teamId;
 const engine=new EventMatch({season,home,away,week,duration:120,managedSide:homeIsUser?0:1,recordEvents:false}),sim=engine.run(),score=homeIsUser?sim.score:[...sim.score].reverse();
 completeWeek(season,score,sim.playerStats,orientStats(sim.stats,homeIsUser),null,{playerStats:sim.playerStats,duration:120,source:'played'});
 for(let i=0;i<2;i++){const next=simulateNextScheduled(season,player,{duration:120});if(!next)break;season=next.season;player=next.career}
 const archive=archiveSeason(season);season.history=[{archive}];
 player.nationalCareer={version:1,seasons:[],history:[{id:'national:ctx',year:2026,competition:'世界杯预选赛',date:'2026-09-01',opponent:'巴西',score:[1,0],goals:1,assists:0,minutes:90,rating:7.5,started:true}],honors:[],caps:1,starts:1,goals:1,assists:0,minutes:90,ratingTotal:7.5};
 player.journey={...player.journey,youthResults:[{title:'青训首战',opponent:'U18 对手',score:[2,1],rating:7,goals:1,assists:0}]};
 player.retired=true;player.retiredYear=(season.calendar?.startYear??2026)+1;
 return {season,player};
}

test('a retired career opens a traceable dossier, expands a match and switches national/youth scopes',async({page})=>{
 const {season,player}=savedCareer(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const store={setItem:(key,value)=>{store.value=value},getItem:()=>null};
 saveSaveData({version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]},store);
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:store.value});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();
 await page.getByRole('button',{name:'查看历史球员排名 ↗'}).click();
 await expect(page.getByRole('heading',{name:'跨赛季历史排名'})).toBeVisible();
 await page.getByLabel('球员搜索').fill(player.name);
 await page.getByRole('button',{name:player.name}).first().click();
 const dossier=page.locator('.career-dossier').first();
 await expect(dossier.getByText('可追溯履历')).toBeVisible();
 await expect(dossier.getByRole('button',{name:'俱乐部'})).toHaveAttribute('aria-pressed','true');
 await expect(dossier.getByRole('heading',{name:'赛季与效力球队'})).toBeVisible();
 await expect(dossier.getByText('逐场比赛').first()).toBeVisible();
 await expect(dossier.locator('.career-dossier-ledger .career-dossier-match').first()).toBeVisible();
 await expect(dossier.locator('.career-dossier-ledger .career-dossier-match').first()).toHaveAttribute('data-match-id',/.+/);
 await dossier.locator('.career-ledger-match-details summary').first().click();
 await expect(dossier.getByText('出场分钟').first()).toBeVisible();
 await page.getByRole('button',{name:'国家队'}).first().click();
 await expect(dossier.getByText('巴西')).toBeVisible();
 await page.getByRole('button',{name:'青训'}).first().click();
 await expect(dossier.getByText('U18 对手')).toBeVisible();
 expect(errors).toEqual([]);
});
