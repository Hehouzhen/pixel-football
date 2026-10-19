import {test,expect} from '@playwright/test';
import {SAVE_DB_NAME,SAVE_DB_STORE,SAVE_KEY,makeCareerSlot,saveSaveData} from '../save-slots.mjs';
import {professionalFixture} from '../test-fixtures/identity-worlds.mjs';
import {prepareSeason} from '../league.mjs';

async function saved(page){
 return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{const request=indexedDB.open(database);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction(store,'readonly'),get=transaction.objectStore(store).get('slots');get.onsuccess=()=>{db.close();resolve((get.result?.save??get.result)?.slots?.[0]??null)};get.onerror=()=>reject(get.error)}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE});
}

test('a failed save keeps the settled result, retries the same state and advances only once',async({page})=>{
 let {season,player}=professionalFixture();prepareSeason(season,player);
 const store={setItem:(key,value)=>{store.value=value},getItem:()=>null};
 saveSaveData({version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]},store);
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:store.value});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();
 await page.evaluate(()=>{const originalSet=Storage.prototype.setItem,originalIdb=window.indexedDB;Storage.prototype.setItem=function(key,value){if(key==='pixel-pitch-saves-v2')throw new DOMException('quota','QuotaExceededError');return originalSet.call(this,key,value)};Object.defineProperty(window,'indexedDB',{configurable:true,value:null});window.__restoreStorage=()=>{Storage.prototype.setItem=originalSet;Object.defineProperty(window,'indexedDB',{configurable:true,value:originalIdb})}});
 await page.getByRole('region',{name:'生涯长期模拟'}).getByRole('button',{name:/长期模拟/}).click();
 await expect(page.getByRole('region',{name:'赛程与长期模拟'}).getByRole('status')).toContainText(/保存失败|尚未保存/,{timeout:30000});
 await expect(page.getByRole('button',{name:'重试保存 ↻'})).toBeVisible();
 const direct=page.getByRole('button',{name:'不进场模拟'});
 if(await direct.count())await expect(direct).toBeDisabled();
 await page.getByRole('button',{name:'重试保存 ↻'}).click();
 await expect(page.getByText(/保存失败|尚未保存/).first()).toBeVisible();
 await page.evaluate(()=>window.__restoreStorage());
 await page.getByRole('button',{name:'重试保存 ↻'}).click();
 await expect.poll(async()=>{const slot=await saved(page);return slot?.season?.week??0}).toBe(1);
 const savedSlot=await saved(page),ids=savedSlot.season.matchSettlements.map(row=>row.matchId);
 expect(new Set(ids).size).toBe(ids.length);
 expect(ids.length).toBeGreaterThan(0);
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();
 const reloaded=await saved(page);
 expect(reloaded.season.week).toBe(1);
});
