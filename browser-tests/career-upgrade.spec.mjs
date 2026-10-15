import {test,expect} from '@playwright/test';
import {createSeason} from '../league.mjs';
import {createCareerPlayer} from '../career.mjs';
import {initializeJourney,firstContractOffers,signFirstContract} from '../career-journey.mjs';
import {SAVE_KEY,makeCareerSlot} from '../save-slots.mjs';

test('生涯数据直接可达，身价合同、签约动画和漫画在桌面手机可用',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));let {season,player}=initializeJourney(createCareerPlayer('林川',27,'midfielder'),createSeason('england','arsenal',41));player.journey.stage='contract';({season,player}=signFirstContract(player,season,firstContractOffers(player,season)[0].teamId));
  await page.addInitScript(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key:SAVE_KEY,data:{version:2,active:0,slots:[makeCareerSlot(season,player,1,120),null,null]}});await page.goto('/');await page.getByRole('button',{name:/继续生涯/}).click();
  await expect(page.getByText('合同已保存。',{exact:false})).toBeVisible();await page.getByRole('button',{name:'数据中心',exact:true}).click();await expect(page.getByRole('heading',{name:'联赛积分榜'})).toBeVisible();await page.getByRole('button',{name:'联赛与欧洲',exact:true}).click();await expect(page.locator('.stats-quick-views')).toBeVisible();await page.getByRole('button',{name:'合同与身价',exact:true}).click();await expect(page.getByRole('heading',{name:'身价与合同'})).toBeVisible();await page.getByRole('button',{name:'暂停场景动画'}).click();await page.screenshot({path:'test-results/career-value-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'走过的路',exact:true}).click();await expect(page.getByRole('heading',{name:'第一盏灯',exact:true})).toBeVisible();await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.getByRole('heading',{name:'球衣上的名字',exact:true})).toBeVisible();await page.screenshot({path:'test-results/career-comic-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'数据中心',exact:true}).click();await page.screenshot({path:'test-results/career-data-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'赛程与赛果',exact:true}).click();await expect(page.getByText('第 1 轮',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
