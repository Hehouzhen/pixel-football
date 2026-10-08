import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {createSeason,leagueAwards} from '../league.mjs';
import {startCup} from '../cup.mjs';
import {makeClubSlot,SAVE_KEY,saveSaveData} from '../save-slots.mjs';
import {buildFullSeason} from '../season-loop.test.mjs';

test('俱乐部创建、模拟、保存恢复及主要数据页面',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'你的足球世界'})).toBeVisible();

  await page.getByRole('button',{name:/新建俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部'})).toBeVisible();
  await page.getByRole('button',{name:'建立俱乐部赛季'}).click();
  await expect(page.getByRole('row')).toHaveCount(17);
  await expect(page.getByText(/联赛第 1 \/ 30 轮/).first()).toBeVisible();

  await page.getByRole('button',{name:/模拟下一步/}).click();
  await expect(page.getByText(/1 \/ 30 轮完成/)).toBeVisible({timeout:20000});
  await page.getByRole('button',{name:/阅读本场赛后新闻/}).click();
  await expect(page.getByText('赛后速报')).toBeVisible();
  await expect(page.getByText(/由系统模拟 · 不提供场上复盘/)).toBeVisible();
  await page.getByRole('button',{name:/返回赛季/}).click();
  await page.reload();
  await expect(page.getByRole('heading',{name:/Arsenal，继续征程/})).toBeVisible();
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部'})).toBeVisible();
  await expect(page.getByText(/联赛第 2 \/ 30 轮/).first()).toBeVisible();

  await page.getByRole('button',{name:'赛事数据'}).click();
  await expect(page.getByRole('heading',{name:'找到你关心的表现'})).toBeVisible();
  await expect(page.getByRole('table').first()).toBeVisible();

  await page.getByRole('button',{name:'世界动态'}).click();
  await expect(page.getByRole('heading',{name:'全联赛球员世界'})).toBeVisible();
  await expect(page.getByText('80 支球队共同推进')).toBeVisible();

  await page.getByRole('button',{name:'欧洲冠军杯'}).click();
  await expect(page.getByText(/联赛结束后，五大联赛各取前四名参加 20 队欧冠/)).toBeVisible();

  await page.getByRole('button',{name:'历史排名'}).click();
  await expect(page.getByRole('heading',{name:'跨赛季历史排名'})).toBeVisible();

  await page.getByRole('button',{name:'总控制 ⚙'}).click();
  await page.getByRole('button',{name:'世界数据库 / God Mode'}).click();
  await expect(page.getByRole('heading',{name:'世界数据库'}).last()).toBeVisible();
  await expect(page.getByText('480  /  480  名球员')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('完整联赛与欧冠颁奖流程可打开并适配窄屏',async({page})=>{
  const season=createSeason('england','arsenal',20261008);
  season.week=30;
  season.awards=leagueAwards(season);
  startCup(season);
  season.cup.phase='complete';
  season.cup.champion=season.cup.teams[0];
  season.seenAwards=[];
  const save={version:2,active:0,slots:[makeClubSlot(season),null,null]};
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify(save)});
  await page.goto('/');
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'联赛年度颁奖典礼'})).toBeVisible();
  await expect(page.getByText('联赛最佳阵容')).toBeVisible();
  mkdirSync('test-results',{recursive:true});
  await page.waitForTimeout(1600);
  await page.screenshot({path:'test-results/league-awards-desktop.png',fullPage:true});
  await page.getByRole('button',{name:/继续赛季/}).click();
  await expect(page.getByRole('heading',{name:'欧洲足球年度颁奖典礼'})).toBeVisible();
  await expect(page.getByText(/联赛 \+ .*欧冠 = .*球/).first()).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.waitForTimeout(1600);
  await page.screenshot({path:'test-results/europe-awards-mobile.png',fullPage:true});
});

test('6MB 完整赛季可压缩保存、重载并继续流程',async({page})=>{
  const season=buildFullSeason(),data={version:2,active:0,slots:[makeClubSlot(season),null,null]},storage={value:null,setItem(key,value){this.value=value}};
  saveSaveData(data,storage);
  expect(storage.value.length).toBeLessThan(5*1024*1024);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:storage.value});
  await page.goto('/');
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'联赛年度颁奖典礼'})).toBeVisible();
  await page.getByRole('button',{name:/继续赛季/}).click();
  await expect(page.getByRole('heading',{name:'欧洲足球年度颁奖典礼'})).toBeVisible();
  await page.getByRole('button',{name:/继续赛季/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部'})).toBeVisible();
  await expect(page.getByText('本赛季赛事已完成')).toBeVisible();
});

test('MyCareer 创建后刷新仍能恢复球员档案',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'你的足球世界'})).toBeVisible();
  await page.getByRole('button',{name:/新建 MyCareer/}).last().click();
  await expect(page.getByRole('heading',{name:'创建你的球员'})).toBeVisible();
  await page.getByLabel('球员姓名').fill('QA 测试球员');
  await page.getByRole('button',{name:'开始职业生涯'}).click();
  await expect(page.getByText('QA 测试球员').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:/QA 测试球员，下一场见/})).toBeVisible();
  await page.getByRole('button',{name:/继续生涯/}).click();
  await expect(page.getByRole('heading',{name:'MyCareer'})).toBeVisible();
  await expect(page.getByText('QA 测试球员').first()).toBeVisible();
  await page.getByRole('button',{name:/模拟本场比赛/}).click();
  await expect(page.getByRole('heading',{name:'上一场表现 · 模拟'})).toBeVisible();
  await expect(page.getByText('第 2 / 30 轮')).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('小屏幕主要创建流程没有页面级横向溢出',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:/新建俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'首页'}).click();
  await page.getByRole('button',{name:/新建 MyCareer/}).last().click();
  await expect(page.getByRole('heading',{name:'创建你的球员'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('渲染异常被页面级兜底捕获',async({page})=>{
  await page.goto('/');
  const result=await build({
    entryPoints:['browser-tests/error-boundary-fixture.jsx'],
    bundle:true,
    write:false,
    format:'iife',
    platform:'browser'
  });
  await page.addScriptTag({content:Buffer.from(result.outputFiles[0].contents).toString()});
  await expect(page.locator('#error-boundary-fixture [role="alert"] h1')).toHaveText('页面遇到问题');
  await expect(page.locator('#error-boundary-fixture button')).toHaveText('重新载入页面');
});
