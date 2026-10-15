import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {createSeason,prepareSeason} from '../league.mjs';
import {createCareerPlayer} from '../career.mjs';
import {makeCareerSlot,makeClubSlot,SAVE_KEY} from '../save-slots.mjs';

test('模拟上半场最后一次事件为战术调整时仍自动进入中场休息',async({page})=>{
 const bundle=await build({entryPoints:['src.jsx'],bundle:true,write:false,loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'simulation-boundary',setup(builder){builder.onLoad({filter:/[\\/]simulation\.mjs$/},args=>({contents:readFileSync(args.path,'utf8').replace('this.clock=0;this.half=1','this.clock=2699;this.half=1').replace('this.attackChannels=[[0,0,0],[0,0,0]]','this.attackChannels=[[0,6,0],[0,0,0]]'),loader:'js'}))}}]});
 await page.route('**/app.js?*',route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));const season=createSeason('england','arsenal',41);await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
 await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:/模拟下一步/}).click();const review=page.getByRole('region',{name:'模拟中场观察'});await expect(review).toBeVisible();await expect(review).toContainText('加强中路保护');await page.waitForTimeout(400);await expect(review).toBeVisible();await page.getByRole('button',{name:'继续模拟',exact:true}).click();await expect(review).toHaveCount(0);
});

for(const careerMode of [false,true])test(`中场休息冻结比赛并可调整后继续：${careerMode?'MyCareer':'快速比赛'}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Only this in-memory test bundle shortens the match; production duration is unchanged.
 const bundle=await build({entryPoints:['src.jsx'],bundle:true,write:false,loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'short-test-match',setup(builder){builder.onLoad({filter:/[\\/]engine\.mjs$/},args=>({contents:readFileSync(args.path,'utf8').replace('Object.assign(this,{difficulty,duration','duration=4;Object.assign(this,{difficulty,duration'),loader:'js'}))}}]});
 await page.route('**/app.js?*',route=>route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text}));
 if(careerMode){const season=createSeason('england','arsenal',17),player=createCareerPlayer('中场球员',27,'midfielder');prepareSeason(season,player);await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeCareerSlot(season,player),null,null]})})}
 await page.goto('/');await page.getByRole('button',{name:careerMode?/继续生涯/:'快速比赛',exact:!careerMode}).click();await page.getByRole('button',{name:careerMode?/开始首秀/:/^开球/}).click();await page.getByRole('button',{name:'准备好了，开球 →'}).click();await page.getByRole('button',{name:'跳过动画 ▶'}).click();
 const review=page.getByRole('region',{name:'上半场观察'});await expect(review).toBeVisible();await expect(review).toContainText('向前传递');const stats=await review.innerText();await page.waitForTimeout(350);expect(await review.innerText()).toBe(stats);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/chronicle-halftime-${careerMode?'career':'quick'}-mobile.png`,fullPage:true});
 const board=page.locator('.start-card .tactical-room');await board.locator('summary').click();if(careerMode)await expect(board.getByRole('button',{name:'1—2—2',exact:true})).toBeDisabled();else await board.getByRole('button',{name:'1—2—2',exact:true}).click();await page.getByRole('button',{name:/进入下半场/}).click();await expect(review).toHaveCount(0);await expect(page.locator('.shot-context')).toBeVisible();expect(errors).toEqual([]);
});

test('三套精细场景可放映、暂停和逐帧检查，桌面手机均可用',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'足球纪事',exact:true}).click();
 for(const [button,type,at] of [['夜场入场','tunnel','5'],['合同签约','contract','3'],['冠军捧杯','award','7']]){
  await page.getByRole('button',{name:button,exact:true}).click();const scene=page.locator('.cinematic-scene');await expect(scene).toHaveAttribute('data-ready','true');await scene.getByRole('slider').fill(at);await expect(scene.getByRole('button',{name:'播放场景动画'})).toBeEnabled();await page.screenshot({path:`test-results/chronicle-${type}-desktop.png`,fullPage:true});
  const paused=await scene.getByRole('slider').inputValue();await page.waitForTimeout(180);expect(await scene.getByRole('slider').inputValue()).toBe(paused);
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/chronicle-${type}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});
 }expect(errors).toEqual([]);
});
test('比赛入场动画保持计时冻结，跳过后正常开赛',async({page})=>{await page.goto('/');await page.getByRole('button',{name:'快速比赛',exact:true}).click();await page.getByRole('button',{name:/^开球/}).click();await page.getByRole('button',{name:'准备好了，开球 →'}).click();await expect(page.locator('.cinematic-cover')).toBeVisible();await expect(page.locator('.cinematic-cover')).toHaveAttribute('data-ready','true');await expect(page.locator('.shot-context')).toHaveCount(0);await page.getByRole('button',{name:'跳过动画 ▶'}).click();await expect(page.locator('.shot-context')).toBeVisible();await expect(page.locator('.cinematic-cover')).toHaveCount(0)});
