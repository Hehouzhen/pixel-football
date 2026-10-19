import {test,expect} from '@playwright/test';
import {SAVE_DB_NAME,SAVE_DB_STORE,SAVE_KEY,makeCareerSlot} from '../save-slots.mjs';
import {prepareSeason} from '../league.mjs';
import {chooseNation} from '../national-team.mjs';
import {professionalFixture} from '../test-fixtures/identity-worlds.mjs';

async function saved(page){return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{const request=indexedDB.open(database);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction(store,'readonly'),get=transaction.objectStore(store).get('slots');get.onsuccess=()=>{db.close();resolve((get.result?.save??get.result)?.slots?.[0]??null)};get.onerror=()=>reject(get.error)}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE})}

function fixture(){
 let {season,player}=professionalFixture();player=chooseNation(player,'chn');prepareSeason(season,player);
 const id=player.id;
 season.playerData[id].name='主档名字';
 season.playerData[id].appearance={skin:'#805b48',hair:'#302b24',hairstyle:2};
 season.playerData[id].attributes.shooting=91;
 const stale=structuredClone(player);stale.name='旧副本名';stale.appearance={skin:'#ebbd89',hair:'#302b24'};stale.attributes.shooting=70;
 return {season,player:stale,id,look:{skin:'#805b48',hair:'#302b24',hairstyle:2}};
}

test('a newer canonical profile wins on load and personalization edits the same person through reload and national page',async({page})=>{
 const {season,player,id,look}=fixture(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();
 await expect.poll(async()=>{const slot=await saved(page);return slot?.player?.name}).toBe('主档名字');
 let slot=await saved(page);
 expect(slot.player.attributes.shooting).toBe(91);
 expect(slot.season.playerData[id].name).toBe('主档名字');
 expect(slot.player.appearance).toMatchObject(look);
 expect(slot.season.playerData[id].appearance).toEqual(slot.player.appearance);
 await page.getByRole('button',{name:'我的足球',exact:true}).click();
 await expect(page.getByLabel('昵称')).toHaveValue('主档名字');
 await page.getByLabel('昵称').fill('编辑后名字');
 await page.getByRole('button',{name:'保存个性化'}).click();
 await expect.poll(async()=>{const next=await saved(page);return [next.player.name,next.season.playerData[id].name]}).toEqual(['编辑后名字','编辑后名字']);
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();
 await expect(page.getByRole('button',{name:'国家队征程'})).toBeVisible();
 await page.getByRole('button',{name:'国家队征程'}).click();
 await expect(page.getByText('编辑后名字').first()).toBeVisible();
 slot=await saved(page);
 expect(slot.player.name).toBe('编辑后名字');
 expect(slot.season.playerData[id].name).toBe('编辑后名字');
 expect(slot.player.appearance).toMatchObject(look);
 expect(slot.season.playerData[id].appearance).toEqual(slot.player.appearance);
 await page.getByRole('button',{name:'返回俱乐部生涯'}).click();
 const start=page.getByRole('button',{name:/直接进入替补登场|首发上场/}).first();
 await expect(start).toBeVisible();
 await start.click();
 const skip=page.getByRole('button',{name:'跳过动画 ▶'});
 if(await skip.isVisible().catch(()=>false))await skip.click();
 await expect(page.locator('.match-page')).toBeVisible();
 expect(errors).toEqual([]);
});

test('an occupied shirt number is resolved with the real teammate and the result survives reload',async({page})=>{
 let {season,player}=professionalFixture();prepareSeason(season,player);
 const id=player.id,mateId=season.squadIds[season.teamId].find(other=>other!==id&&season.playerData[other]?.number===6);
 expect(mateId).toBeTruthy();
 const mate=season.playerData[mateId].name,errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();
 await page.getByRole('button',{name:'我的足球',exact:true}).click();
 await page.getByLabel('球衣号码').fill('6');
 await page.getByRole('button',{name:'保存个性化'}).click();
 await expect(page.getByText(/改穿 2 号/)).toBeVisible();
 await expect.poll(async()=>{const slot=await saved(page);return {career:slot.player.number,canonical:slot.season.playerData[id].number,mate:slot.season.playerData[mateId].number}}).toEqual({career:6,canonical:6,mate:2});
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();
 await page.getByRole('button',{name:'我的足球',exact:true}).click();
 await expect(page.getByLabel('球衣号码')).toHaveValue('6');
 const names=await saved(page);
 expect(names.season.playerData[mateId].name).toBe(mate);
 expect(names.season.playerData[mateId].number).toBe(2);
 expect(errors).toEqual([]);
});
