import {test,expect} from '@playwright/test';
import {createSeason,prepareSeason} from '../league.mjs';
import {createCareerPlayer} from '../career.mjs';
import {makeClubSlot,makeCareerSlot,SAVE_KEY} from '../save-slots.mjs';

for(const mode of ['club','career'])test(`${mode} 比赛控制提示和实际按键入口保持一致`,async({page})=>{
  const season=createSeason('england','arsenal',17),player=createCareerPlayer('要球测试球员',27,'defender');
  if(mode==='career')prepareSeason(season,player);
  const slot=mode==='career'?makeCareerSlot(season,player):makeClubSlot(season),errors=[];
  await page.addInitScript(({key,value})=>{localStorage.setItem(key,value);localStorage.setItem('pixel-pitch-focus','false')},{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[slot,null,null]})});
  page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:mode==='career'?/继续生涯/:/继续俱乐部/}).click();
  await page.getByRole('button',{name:/开始首秀/}).click();await expect(page.locator('.prematch-dialog')).toBeVisible();
  if(mode==='club')await expect(page.locator('.prematch-dialog')).toContainText('跟随持球队友');
  await page.getByRole('button',{name:'准备好了，开球 →'}).click();await page.getByRole('button',{name:'跳过动画 ▶'}).click();
  await expect(page.locator('.shot-context')).toBeVisible();
  await expect(page.locator('.control-strip')).toContainText(mode==='career'?'身前要球':'直塞到身前');
  await page.keyboard.press('r');
  await page.screenshot({path:`test-results/attacking-${mode}-desktop.png`,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:/R · (身前要球|直塞)/}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/attacking-${mode}-mobile.png`,fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('canvas').focus();
  if(mode==='club'){
    await expect(page.locator('.control-strip')).toContainText('切人 / 接管持球人');
    await page.keyboard.press('q');await page.keyboard.press('Space');await page.keyboard.press('Escape');
  }else{
    await expect(page.locator('.match-context')).toContainText('27号');await page.keyboard.press('Space');
    await expect(page.locator('.shot-context')).toContainText(/要球|队友已出球|对方持球|足球尚未被控制/);
    await page.keyboard.press('q');await expect(page.locator('.match-context')).toContainText('27号');await page.keyboard.press('Escape');
  }
  await expect(page.getByRole('heading',{name:'喘口气，再上场'})).toBeVisible();expect(errors).toEqual([]);
});
