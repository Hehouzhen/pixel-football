import {test,expect} from '@playwright/test';
import {SAVE_DB_NAME,SAVE_DB_STORE,SAVE_KEY,makeCareerSlot} from '../save-slots.mjs';
import {createSeason,prepareSeason} from '../league.mjs';
import {createCareerPlayer} from '../career.mjs';

async function savedPlayer(page){return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{const request=indexedDB.open(database);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction(store,'readonly'),get=transaction.objectStore(store).get('slots');get.onsuccess=()=>{db.close();resolve((get.result?.save??get.result)?.slots?.[0]?.player??null)};get.onerror=()=>reject(get.error)}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE})}

test('MyCareer 外观在编辑器、动作帧和存档中一致',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await page.getByRole('button',{name:/新建 MyCareer/}).click();await page.getByRole('button',{name:'球员',exact:true}).click();
  await expect(page.locator('.as-head-option')).toHaveCount(24);
  await page.getByRole('button',{name:'波浪长发',exact:true}).click();
  await page.getByRole('button',{name:'面容',exact:true}).click();
  await page.getByRole('button',{name:'下巴胡',exact:true}).click();
  await page.getByRole('button',{name:'舒展眉',exact:true}).click();
  await page.getByRole('button',{name:'装备',exact:true}).click();
  await page.getByRole('button',{name:'宽发带',exact:true}).click();
  await page.getByRole('button',{name:'双侧',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/appearance-create-mobile-live.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'愿望',exact:true}).click();await page.getByRole('button',{name:'开始职业生涯'}).click();
  await expect.poll(async()=>savedPlayer(page)).toMatchObject({appearance:{studio:1,hairstyle:23,beard:7,brows:5,bandStyle:1,headband:true,wrist:'both'}});
  await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();
  await expect(page.locator('.journey-scene')).toBeVisible();
  await page.getByRole('button',{name:'我的足球',exact:true}).click();
  await expect(page.locator('.player-customization .appearance-studio-v2')).toBeVisible();
  await page.locator('.player-customization .as-rail').getByRole('button',{name:'头发'}).click();
  await expect(page.locator('.player-customization .as-head-option[aria-pressed="true"]')).toHaveText('波浪长发');
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('旧生涯存档可在新编辑器修改并保存外观',async({page})=>{
  const season=createSeason('england','arsenal'),player=createCareerPlayer('旧档球员',10,'forward',{skin:'#ebbd89',hair:'#302b24',hairstyle:2});prepareSeason(season,player);
  await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player),null,null]}});
  await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();await page.getByRole('button',{name:'我的球员'}).click();
  await expect(page.locator('.player-customization .appearance-studio-v2')).toBeVisible();
  await page.locator('.player-customization .as-rail').getByRole('button',{name:'面容'}).click();
  await page.locator('.player-customization').getByRole('button',{name:'短圆胡'}).click();
  await page.getByRole('button',{name:'保存个性化'}).click();
  await expect.poll(async()=>savedPlayer(page)).toMatchObject({name:'旧档球员',appearance:{studio:1,hairstyle:2,beard:5}});
});
