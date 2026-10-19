import {test,expect} from '@playwright/test';
import {createSeason} from '../league.mjs';
import {createCareerPlayer} from '../career.mjs';
import {initializeJourney} from '../career-journey.mjs';
import {SAVE_KEY,SAVE_DB_NAME,SAVE_DB_STORE,makeCareerSlot} from '../save-slots.mjs';

async function stored(page){return page.evaluate(({database,store,key})=>new Promise((resolve,reject)=>{const fallback=()=>JSON.parse(localStorage.getItem(key)).slots[0],open=indexedDB.open(database);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result;if(!db.objectStoreNames.contains(store)){db.close();resolve(fallback());return}const get=db.transaction(store).objectStore(store).get('slots');get.onerror=()=>reject(get.error);get.onsuccess=()=>{db.close();resolve(get.result?(get.result?.save??get.result).slots[0]:fallback())}}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE,key:SAVE_KEY})}

test('first academy match has a simulation window, halftime and one saved result',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const {season,player}=initializeJourney(createCareerPlayer('模拟青训',27,'midfielder'),createSeason('england','arsenal',41));
  await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});
  await page.goto('/');await page.getByRole('button',{name:/继续生涯/}).click();
  await page.getByRole('button',{name:'进入模拟观赛',exact:true}).click();const window=page.getByRole('region',{name:'本场模拟窗口'});
  await expect(window).toBeVisible();await window.getByRole('button',{name:'暂停模拟',exact:true}).click();
  await page.screenshot({path:'test-results/live-simulation-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/live-simulation-mobile.png',fullPage:true});
  await window.getByRole('button',{name:'模拟至中场'}).click();await expect(window).toContainText('中场休息');
  expect((await stored(page)).player.journey.youthResults).toHaveLength(0);
  await window.getByRole('button',{name:'模拟至终场',exact:true}).click();await expect(window).toContainText('本场已结束');
  await expect.poll(async()=>(await stored(page)).player.journey.youthResults.length).toBe(1);
  const slot=await stored(page);expect(slot.player.stats.appearances).toBe(0);expect(slot.season.week).toBe(0);
  await page.getByRole('button',{name:/回到成长旅程/}).click();expect((await stored(page)).player.journey.youthResults).toHaveLength(1);
  await page.reload();await page.getByRole('button',{name:/继续生涯/}).click();expect((await stored(page)).player.journey.youthResults).toHaveLength(1);expect(errors).toEqual([]);
});

test('training can be completed from its optional simulation window',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'训练场',exact:true}).click();
  await page.getByRole('button',{name:/开始练习/}).click();await page.getByRole('button',{name:'打开模拟窗口',exact:true}).click();
  const window=page.getByRole('region',{name:'本场模拟窗口'});await expect(window).toBeVisible();
  await window.getByRole('button',{name:'模拟本次训练',exact:true}).click();await expect(window).toContainText('本场已结束');
  await expect(page.locator('.overlay .start-card button').filter({hasText:'再试一次'})).toBeVisible();expect(errors).toEqual([]);
});


test('academy can be simulated without entering the playable match',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const {season,player}=initializeJourney(createCareerPlayer('跳过上场',27,'midfielder'),createSeason('england','arsenal',42));
  await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});
  await page.goto('/');await page.getByRole('button',{name:/继续生涯/}).click();await page.getByRole('button',{name:'不进场模拟',exact:true}).click();
  await expect(page.locator('.postmatch-modal')).toBeVisible();await expect(page.getByRole('button',{name:/回到成长旅程/})).toBeVisible();
  const slot=await stored(page);expect(slot.player.journey.youthResults).toHaveLength(1);expect(slot.player.stats.appearances).toBe(0);expect(slot.season.week).toBe(0);expect(errors).toEqual([]);
});
