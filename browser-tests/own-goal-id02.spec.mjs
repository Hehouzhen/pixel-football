import {test,expect} from '@playwright/test';
import {createSeason,prepareSeason,createMatchRecord,addPlayer,fixtures} from '../league.mjs';
import {getLeague,getTeam} from '../clubs.mjs';
import {createCareerPlayer,finishCareerMatch} from '../career.mjs';
import {Match,FIELD} from '../engine.mjs';
import {makeCareerSlot,SAVE_KEY,SAVE_DB_NAME,SAVE_DB_STORE} from '../save-slots.mjs';
import {teamName} from '../identity.mjs';

async function saved(page){return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{const open=indexedDB.open(database);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(store,'readonly'),get=tx.objectStore(store).get('slots');get.onsuccess=()=>{db.close();resolve(get.result?.save??get.result)};get.onerror=()=>reject(get.error)}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE})}

function seed(){
 const season=createSeason('england','arsenal',31);
 let player=createCareerPlayer('乌龙测试',10,'midfielder');prepareSeason(season,player);
 const rounds=fixtures(getLeague(season.leagueId)),week=rounds.findIndex(round=>round.some(pair=>pair[0]===season.teamId)),pair=rounds[week].find(pair=>pair.includes(season.teamId)),[home,away]=pair;
 const ids=[...season.rosterIds[home],...season.rosterIds[away]];
 const m=new Match({duration:120,teams:[teamName(season,home),teamName(season,away)],teamIds:[home,away],playerIds:ids,playerNames:ids.map(id=>season.playerData[id]?.name??id),playerNumbers:ids.map(id=>season.playerData[id]?.number??1),playerLooks:ids.map(()=>({})),playerAttributes:ids.map(id=>season.playerData[id]?.attributes??{})});
 m.practice=true;m.half=2;m.time=60;m.lastStriker=5;
 m.ball={x:FIELD.right-1,y:FIELD.center,z:0,vx:200,vy:0,vz:0,owner:null,lock:0,last:0,kind:'pass',source:5,sourcePlayerId:ids[5]};
 m.goal(1);
 const report=m.report(),record=createMatchRecord(season,{home,away,score:m.score,matchStats:m.stats,report,userTeamId:season.teamId}),stats={shots:m.shots,onTarget:m.onTarget,passes:m.passes,passesCompleted:[0,0],crosses:m.crosses,tackles:m.tackles,fouls:m.fouls,yellows:m.yellows,reds:m.reds,saves:m.saves};
 season.results.push({week,home,away,score:[...m.score],stats,source:'played',...record,report});
 for(const row of record.playerStats)addPlayer(season,row.teamId,row.index,row,{competition:'league',round:1,score:row.teamId===home?[...m.score]:[m.score[1],m.score[0]]});
 season.week=week+1;
 player=finishCareerMatch(player,{playingSeconds:180},m.score,120,{competition:'league',season:1,opponent:teamName(season,away),report,source:'played'});
 prepareSeason(season,player);
 return {season,player,actorId:ids[5],actorName:report.events.find(e=>e.type==='goal').playerName,homeName:getTeam(home).name,awayName:getTeam(away).name};
}

test('a generated own goal keeps the beneficiary team, actor identity, report and saved state after reload',async({page})=>{
 const {season,player,actorId,actorName,homeName,awayName}=seed();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
 await page.addInitScript(({key,data})=>!localStorage.getItem(key)&&localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();
 await page.getByRole('button',{name:'赛程与杯赛'}).click();
 await page.locator('.schedule-entry').filter({hasText:'查看详情'}).first().getByRole('button',{name:'查看详情'}).click();
 const scorers=page.locator('.result-scorers');
 await expect(scorers).toContainText(awayName);
 await expect(scorers).toContainText(actorName);
 await expect(scorers).toContainText('（乌龙球）');
 await expect(scorers).not.toContainText(homeName);
 await expect.poll(async()=>{const slot=(await saved(page)).slots[0];return slot.season.results[0].playerStats.find(row=>row.playerId===actorId)?.goals}).toBe(0);
 await page.getByRole('button',{name:'表现数据'}).click();
 await page.getByLabel('对比球员一').selectOption(actorId);
 await expect(page.locator('.comparison-row').filter({hasText:'进球'}).first().locator('b').first()).toHaveText('0');
 await page.getByRole('button',{name:'总览'}).click();
 await page.getByRole('button',{name:/查看复盘/}).first().click();
 const dialog=page.getByRole('dialog',{name:'比赛复盘'});
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('h2')).toContainText('0 : 1');
 await expect(dialog.locator('.goal-summary')).toContainText(awayName);
 await expect(dialog.locator('.goal-summary')).toContainText('（乌龙球');
 await expect(dialog.locator('.goal-summary')).toContainText(actorName);
 await page.screenshot({path:'test-results/own-goal-desktop.png',fullPage:true});
 await dialog.getByRole('button',{name:/关闭复盘/}).click();
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();
 await page.getByRole('button',{name:'赛程与杯赛'}).click();
 await page.locator('.schedule-entry').filter({hasText:'查看详情'}).first().getByRole('button',{name:'查看详情'}).click();
 await expect(page.locator('.result-scorers')).toContainText('（乌龙球）');
 await expect.poll(async()=>{const slot=(await saved(page)).slots[0];return slot.season.results[0].report.events.find(e=>e.ownGoal===true)?.team}).toBe(1);
 expect(errors).toEqual([]);
});


