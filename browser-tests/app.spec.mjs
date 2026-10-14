import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
import {createSeason,leagueAwards,simulateWeek} from '../league.mjs';
import {startCup,cupNextMatch} from '../cup.mjs';
import {makeClubSlot,makeCareerSlot,SAVE_KEY,SAVE_DB_NAME,SAVE_DB_STORE,SAVE_DB_ARCHIVE_STORE,saveSaveData,exportBackup} from '../save-slots.mjs';
import {prepareSeason} from '../league.mjs';
import {archiveSeason} from '../history.mjs';
import {createCareerPlayer} from '../career.mjs';
import {buildFullSeason} from '../season-loop.test.mjs';
import {finances,offers} from '../transfers.mjs';
import {cashOffers,cashInboundOffers,inboundOffers} from '../transfers.mjs';
import {squadPlayers} from '../football-life.mjs';
import {teamName} from '../identity.mjs';
import {expandMatchJournal} from '../save-slots.mjs';

async function readIndexedSaveRecord(page){return page.evaluate(({database,store})=>new Promise((resolve,reject)=>{const opening=indexedDB.open(database);opening.onerror=()=>reject(opening.error);opening.onsuccess=()=>{const db=opening.result;let value=null;const transaction=db.transaction(store,'readonly'),request=transaction.objectStore(store).get('slots');request.onsuccess=()=>value=request.result??null;transaction.oncomplete=()=>{db.close();resolve(value)};transaction.onerror=()=>{db.close();reject(transaction.error)}}}),{database:SAVE_DB_NAME,store:SAVE_DB_STORE})}
async function readIndexedSave(page){const record=await readIndexedSaveRecord(page),data=record?.save??record;for(const slot of data?.slots??[])for(const state of [slot?.season,...Object.values(slot?.season?.world??{}),slot?.season?.cup])for(const result of state?.results??[])expandMatchJournal(result);return data}
async function finishSimulation(page){await expect(page.getByRole('heading',{name:'比赛模拟中心'})).toBeVisible();await page.getByRole('button',{name:'模拟至终场',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'赛果、事件和逐人数据已保存。'})).toBeVisible();await page.getByRole('button',{name:'返回比赛中心',exact:true}).first().click()}
async function readIndexedArchive(page,key){return page.evaluate(({database,store,key})=>new Promise((resolve,reject)=>{const opening=indexedDB.open(database);opening.onerror=()=>reject(opening.error);opening.onsuccess=()=>{const db=opening.result;let value=null;const transaction=db.transaction(store,'readonly'),request=transaction.objectStore(store).get(key);request.onsuccess=()=>value=request.result??null;transaction.oncomplete=()=>{db.close();resolve(value)};transaction.onerror=()=>{db.close();reject(transaction.error)}}}),{database:SAVE_DB_NAME,store:SAVE_DB_ARCHIVE_STORE,key})}

test('23 项能力分组编辑、能力列切换和保存恢复',async({page})=>{
  const season=createSeason('england','arsenal',17),id=season.rosterIds.arsenal[5];season.godMode=true;
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'总控制 ⚙'}).click();await page.getByRole('button',{name:'世界数据库 / God Mode'}).click();
  await page.getByLabel('搜索球员',{exact:true}).fill(id);await page.locator('.god-name').first().click();await expect(page.locator('.ability-editor-groups input')).toHaveCount(23);await page.getByLabel('编辑加速',{exact:true}).fill('88');await page.getByLabel('编辑冷静',{exact:true}).fill('91');await page.getByRole('button',{name:'保存球员',exact:true}).click();
  await expect.poll(async()=>((await readIndexedSave(page)).slots[0].season.playerData[id].attributes.acceleration)).toBe(88);await page.getByLabel('数据库能力组').selectOption('身体');await expect(page.getByRole('columnheader',{name:'加速',exact:true})).toBeVisible();
  await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();const saved=(await readIndexedSave(page)).slots[0].season.playerData[id];expect(saved.attributes.acceleration).toBe(88);expect(saved.attributes.composure).toBe(91);expect(saved.id).toBe(id);expect(errors).toEqual([]);
});

test('事件模拟可暂停、调整战术、换人、观看播报并保存恢复',async({page})=>{
  const season=createSeason('england','arsenal',17),outId=season.rosterIds.arsenal[5],reserve=squadPlayers(season,'arsenal').find(p=>p.position===5&&p.id!==outId);
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:/模拟下一步/}).click();
  await expect(page.getByRole('heading',{name:'比赛模拟中心'})).toBeVisible();await page.getByRole('button',{name:'模拟至中场',exact:true}).click();await expect(page.getByRole('region',{name:'比赛模拟中心'})).toContainText('中场休息');
  expect((await readIndexedSave(page)).slots[0].season.week).toBe(0);
  await page.getByLabel('模拟本队战术').selectOption('counter');await page.getByLabel('模拟换下球员').selectOption(outId);await page.getByLabel('模拟换上球员').selectOption(reserve.id);await page.getByRole('button',{name:'确认换人',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'换人已生效'})).toBeVisible();
  await page.getByLabel('播报筛选').selectOption('all');await expect(page.getByRole('complementary',{name:'比赛事件播报'})).toContainText(reserve.name);
  mkdirSync('test-results',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'test-results/simulation-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'test-results/simulation-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await finishSimulation(page);const saved=(await readIndexedSave(page)).slots[0].season,result=saved.results.find(r=>r.home==='arsenal'||r.away==='arsenal');expect(saved.week).toBe(1);expect(saved.tactic).toBe('counter');expect(result.simulationVersion).toBe(3);expect(result.playerStats.length).toBeGreaterThanOrEqual(13);expect(result.playerStats.length).toBeLessThanOrEqual(18);expect(result.playerStats.find(p=>p.playerId===reserve.id).started).toBe(false);expect(result.journal.some(e=>e.type==='substitution')).toBe(true);expect(result.goalEvents).toHaveLength(result.score[0]+result.score[1]);expect(saved.players[reserve.id].appearances).toBe(1);
  await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'赛事数据'}).click();await page.getByLabel('统计球队').selectOption('arsenal');await page.getByRole('button',{name:/查看比赛详情/}).first().click();await page.getByText(/展开比赛事件/).click();await expect(page.locator('.saved-match-journal')).toContainText(reserve.name);expect(errors).toEqual([]);
});

test('欧冠中心入口、赛前对手和模拟结算一致',async({page})=>{
  const season=createSeason('england','arsenal',17);season.week=30;season.awards=leagueAwards(season);startCup(season);season.seenAwards=['league'];
  const pair=cupNextMatch(season);expect(pair).toBeTruthy();
  const opponent=teamName(season,pair.find(id=>id!==season.teamId)),before=season.cup.results.length;
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('region',{name:'欧冠入口'})).toContainText(opponent);
  await page.getByRole('region',{name:'欧冠入口'}).getByRole('button').click();
  await expect(page.locator('.next-step-bar')).toHaveCount(0);
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/europe-entry-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:'进入欧冠比赛 ▶',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText(opponent);
  await page.getByRole('dialog').getByRole('button',{name:'返回',exact:true}).click();
  await page.getByRole('button',{name:'模拟本场欧冠 ⏩',exact:true}).click();
  await finishSimulation(page);
  await expect.poll(async()=>((await readIndexedSave(page))?.slots[0].season.cup.results.length??0)).toBeGreaterThan(before);
  let saved=(await readIndexedSave(page)).slots[0].season;expect(saved.week).toBe(30);expect(saved.cup.results.some(r=>r.home===pair[0]&&r.away===pair[1]&&r.source==='simulated')).toBe(true);
  await page.getByRole('button',{name:'进入欧冠比赛 ▶',exact:true}).click();await page.getByRole('button',{name:'准备好了，开球 →'}).click();
  await expect(page.locator('.match-page')).toBeVisible();expect(errors).toEqual([]);
});

test('十人一线队首发、续约和模拟数据可保存恢复',async({page})=>{
  const season=createSeason('england','arsenal',17),starter=season.rosterIds.arsenal[5],reserve=squadPlayers(season,'arsenal').find(p=>p.position===5&&p.id!==starter);
  for(const p of squadPlayers(season,'arsenal'))p.contractEndYear=2029;
  const data={version:2,active:0,slots:[makeClubSlot(season),null,null]};
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:JSON.stringify(data)});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  const life=page.locator('.football-life');await expect(life.getByRole('heading',{name:'球队生活与合同'})).toBeVisible();
  for(const label of ['停球','体能','争顶'])await expect(page.locator('.player-stage .ability-bars').getByText(label,{exact:true})).toBeVisible();
  await life.getByLabel('首发位置 6',{exact:true}).selectOption(reserve.id);
  await expect(life.getByRole('status')).toContainText('首发名单已保存');
  await life.getByText('一线队合同与定位 · 10 人',{exact:true}).click();
  const row=life.locator(`[data-squad-player="${reserve.id}"]`);await expect(row.getByText('续约后：2030 年夏季到期')).toBeVisible();await row.getByRole('button',{name:'续约',exact:true}).click();
  await expect(life.getByRole('status')).toContainText('续约已保存');
  await page.getByRole('button',{name:/模拟下一步/}).click();
  await finishSimulation(page);
  await expect(page.getByText(/1 \/ 30 轮完成/)).toBeVisible();
  const saved=await readIndexedSave(page),s=saved.slots[0].season;expect(s.rosterIds.arsenal[5]).toBe(reserve.id);expect(s.players[reserve.id].appearances).toBe(1);expect(s.players[starter]).toBeUndefined();expect(s.financeLedger).toHaveLength(1);
  expect(s.playerData[reserve.id].contractEndYear).toBe(2030);
  await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();await expect(page.getByLabel('首发位置 6',{exact:true})).toHaveValue(reserve.id);
  await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/football-life-mobile.png',fullPage:true});expect(errors).toEqual([]);
});

test('求购总数包含现金报价，各报价还价输入独立',async({page})=>{
  const season=createSeason('england','arsenal',17);
  for(const p of squadPlayers(season,season.teamId))p.transferStatus='listed';
  const count=cashInboundOffers(season).length+inboundOffers(season).length;
  expect(count).toBeGreaterThan(1);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  const desk=page.locator('.transfer-panel');await desk.getByRole('button',{name:`收到的报价 · ${count}`,exact:true}).click();
  const inputs=desk.locator('.transfer-inbox article input,.cash-transfer-inbox article input');
  await expect(inputs).toHaveCount(count);await inputs.nth(0).fill('8.5');await expect(inputs.nth(1)).toHaveValue('');
  await inputs.nth(1).fill('12');await expect(inputs.nth(0)).toHaveValue('8.5');
  await inputs.nth(0).fill('-1');await expect(desk.locator('.transfer-inbox article').first().getByRole('button',{name:'提交还价',exact:true})).toBeDisabled();
});

test('现金引援谈判、加入一线队与安排首发',async({page})=>{
  const season=createSeason('england','arsenal',17),money=finances(season),target=cashOffers(season).find(o=>o.position===5&&o.allowed&&o.fee<=money.balance&&money.wages+o.wageExpectation<=money.wageCap),original=season.rosterIds.arsenal[5];
  expect(target).toBeTruthy();const data={version:2,active:0,slots:[makeClubSlot(season),null,null]};
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:JSON.stringify(data)});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  const desk=page.locator('.transfer-panel');await desk.getByRole('button',{name:'谈判签约',exact:true}).click();await desk.getByRole('button',{name:'现金购买',exact:true}).click();await desk.getByPlaceholder('姓名 / 球队').fill(target.name);await desk.locator(`[data-player-id="${target.id}"]`).getByRole('button',{name:'询价'}).click();
  await desk.getByRole('button',{name:'提交报价并开始谈判'}).click();await expect(desk.getByText(/交易完成/).first()).toBeVisible();
  await expect(page.getByText('一线队合同与定位 · 11 人',{exact:true})).toBeVisible();
  let saved=await readIndexedSave(page);expect(saved.slots[0].season.rosterIds.arsenal[5]).toBe(original);expect(saved.slots[0].season.playerData[target.id].teamId).toBe('arsenal');
  await page.getByLabel('首发位置 6',{exact:true}).selectOption(target.id);await expect(page.locator('.football-life').getByRole('status')).toContainText('首发名单已保存');
  await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();await expect(page.getByLabel('首发位置 6',{exact:true})).toHaveValue(target.id);
  mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/football-life-desktop.png',fullPage:true});
});

test('预览服务提供首页引用的品牌与美术资源',async({request})=>{
  for(const [path,type] of [['/art-direction.css','text/css'],['/home-polish.css','text/css'],['/brand.css','text/css'],['/pixel-pitch-logo-picked.png','image/png'],['/pixel-pitch-favicon-picked.png','image/png']]){
    const response=await request.get(path);
    expect(response.status(),`${path} should be available`).toBe(200);
    expect(response.headers()['content-type']).toContain(type);
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});

test('俱乐部创建、模拟、保存恢复及主要数据页面',async({page})=>{
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'你的足球世界'})).toBeVisible();

  await page.getByRole('button',{name:/新建俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部',exact:true})).toBeVisible();
  await page.getByLabel('开启自定义赛季挑战').check();await expect(page.locator('.challenge-setup')).toBeVisible();await page.getByLabel('目标联赛名次').selectOption('4');await page.getByLabel('至少提拔青训').fill('1');
  await page.getByRole('button',{name:'建立俱乐部赛季'}).click();
  await expect(page.locator('.challenge-progress')).toContainText('联赛前 4 名 · 青训提拔 1 人');
  const academy=page.locator('.academy-panel');await expect(academy.getByRole('heading',{name:'青训与俱乐部建设'})).toBeVisible();await expect(academy.getByText('青训名单 · 2/6')).toBeVisible();await academy.getByLabel('青训重点').selectOption('5');await academy.getByRole('button',{name:/升级设施/}).click();await expect(academy.locator('.academy-summary')).toContainText('2/3');
  await expect(page.getByRole('region',{name:'欧冠入口'})).toContainText(/(已获得|未获得)欧冠资格/);
  await page.getByRole('region',{name:'欧冠入口'}).getByRole('button').click();
  await expect(page.getByRole('button',{name:/进入欧冠比赛/})).toHaveCount(0);
  await expect(page.locator('.next-step-bar')).toHaveCount(0);
  await page.getByRole('button',{name:'返回赛季　←',exact:true}).click();
  await expect(page.getByRole('row')).toHaveCount(17);
  await expect(page.getByText(/联赛第 1 \/ 30 轮/).first()).toBeVisible();

  await page.getByRole('button',{name:/模拟下一步/}).click();
  await finishSimulation(page);
  await expect(page.getByText(/1 \/ 30 轮完成/)).toBeVisible({timeout:20000});
  await page.getByRole('button',{name:/阅读本场赛后新闻/}).click();
  await expect(page.getByText('赛后速报')).toBeVisible();
  await expect(page.getByText(/由系统模拟 · 不提供场上复盘/)).toBeVisible();
  await page.getByRole('button',{name:/返回赛季/}).click();
  await page.reload();
  await expect(page.getByRole('heading',{name:/Arsenal，继续征程/})).toBeVisible();
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部',exact:true})).toBeVisible();
  await expect(page.locator('.challenge-progress')).toContainText('0 / 1');
  await expect(page.getByText(/联赛第 2 \/ 30 轮/).first()).toBeVisible();

  await page.getByRole('button',{name:'赛事数据'}).click();
  await expect(page.getByRole('heading',{name:'找到你关心的表现'})).toBeVisible();
  const breadcrumb=page.getByRole('navigation',{name:'当前位置'});
  await expect(breadcrumb).toContainText('Arsenal');
  await expect(breadcrumb).toContainText('赛事数据');
  await breadcrumb.getByRole('button').nth(1).click();
  await expect(page.locator('.season-workspace > .mode-nav').getByRole('button',{name:'总览'})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'赛事数据'}).click();
  await expect(page.getByRole('table').first()).toBeVisible();
  await page.getByRole('button',{name:'按出场降序排序'}).click();
  await expect(page.locator('.stats-table th[aria-sort="descending"]')).toContainText('出场');
  const appearances=await page.locator('.stats-table tbody > tr:not(.stats-player-detail) td:nth-child(3)').allTextContents();
  expect(appearances.map(Number)).toEqual([...appearances].map(Number).sort((a,b)=>b-a));
  await page.getByRole('button',{name:'按出场升序排序'}).click();
  await expect(page.locator('.stats-table th[aria-sort="ascending"]')).toContainText('出场');
  await page.getByRole('button',{name:'球队表现'}).click();
  await page.getByRole('button',{name:'按球队降序排序'}).click();
  await expect(page.locator('.stats-table th[aria-sort="descending"]')).toContainText('球队');
  await page.getByRole('button',{name:'球员表现'}).click();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('统计球队').selectOption('arsenal');
  await page.getByRole('button',{name:/查看比赛详情/}).first().click();
  const matchDetail=page.getByRole('region',{name:'比赛详情'});
  await expect(matchDetail).toBeVisible();
  expect(await matchDetail.locator('.match-player-table tbody tr').count()).toBeGreaterThanOrEqual(12);
  await expect(matchDetail.getByText('双方球员逐场表现')).toBeVisible();
  await page.getByRole('button',{name:'防守表现'}).click();
  await expect(page.getByRole('heading',{name:'抢断榜'})).toBeVisible();
  await page.getByText('显示列').click();
  await page.getByRole('checkbox',{name:'扑救'}).check();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('pixel-pitch-stats-preferences')))).toMatchObject({view:'defense'});
  await page.reload();
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await page.getByRole('button',{name:'赛事数据'}).click();
  await expect(page.getByRole('button',{name:'防守表现'})).toHaveAttribute('aria-pressed','true');
  await page.getByText('显示列').click();
  await expect(page.getByRole('checkbox',{name:'扑救'})).toBeChecked();
  await page.getByRole('button',{name:'恢复默认视图'}).click();
  await expect(page.getByRole('button',{name:'射手榜'})).toHaveAttribute('aria-pressed','true');

  await page.getByRole('button',{name:'世界动态'}).click();
  await expect(page.getByRole('heading',{name:'全联赛球员世界'})).toBeVisible();
  await expect(page.getByText('80 支球队共同推进')).toBeVisible();

  await page.getByRole('button',{name:'欧洲冠军杯'}).click();
  await expect(page.getByText('20 支球队 · 4 组 · 每队 4 场小组赛 · 前两名晋级')).toBeVisible();

  await page.getByRole('button',{name:'历史排名'}).click();
  await expect(page.getByRole('heading',{name:'跨赛季历史排名'})).toBeVisible();

  await page.getByRole('button',{name:'总控制 ⚙'}).click();
  await page.getByRole('button',{name:'世界数据库 / God Mode'}).click();
  await expect(page.getByRole('heading',{name:'世界数据库'}).last()).toBeVisible();
  await expect(page.getByText(/802\s*\/\s*802\s*名球员/)).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('历史球员档案展示并筛选跨联赛逐场表现',async({page})=>{
  const season=createSeason('england','arsenal',907);simulateWeek(season);
  const archive=archiveSeason(season),targetMatch=season.world.spain.results[0],targetPlayer=targetMatch.playerStats[0];
  season.history=[{archive}];
  const storage={value:null,setItem(key,value){this.value=value}};saveSaveData({version:2,active:0,slots:[makeClubSlot(season),null,null]},storage);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:storage.value});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();
  await page.getByRole('button',{name:'历史排名'}).click();
  await page.getByPlaceholder('输入球员或球队').fill(targetPlayer.playerName);
  await page.locator(`.historical-leaders tr[data-player-id="${targetPlayer.playerId}"] .stats-player-link`).click();
  const matchLog=page.getByRole('region',{name:`${targetPlayer.playerName}逐场比赛`});
  await expect(matchLog).toBeVisible();
  await expect(matchLog.locator(`[data-match-id="${targetMatch.matchId}"]`)).toHaveCount(1);
  await matchLog.getByLabel('逐场记录赛事').selectOption('league');
  await expect(matchLog.locator('.career-dossier-match')).toHaveCount(1);
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('转会中心展示询价报告、完成谈判并恢复谈判记录',async({page})=>{
  const season=createSeason('england','arsenal',17),money=finances(season),target=offers(season).find(item=>item.position===5&&item.allowed&&item.fee<=money.balance&&money.wages-item.outgoingWage+item.wageExpectation<=money.wageCap);
  expect(target).toBeTruthy();
  const storage={value:null,setItem(key,value){this.value=value}};saveSaveData({version:2,active:0,slots:[makeClubSlot(season),null,null]},storage);
  await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value)},{key:SAVE_KEY,value:storage.value});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();
  await page.getByRole('button',{name:'球队与战术'}).click();
  await page.getByRole('heading',{name:'引援中心'}).scrollIntoViewIfNeeded();
  await page.locator('.transfer-panel').getByRole('button',{name:'谈判签约',exact:true}).click();
  await page.getByPlaceholder('姓名 / 球队').fill(target.name);
  await page.locator(`.transfer-offers article[data-player-id="${target.id}"]`).getByRole('button',{name:'询价'}).click();
  await expect(page.getByRole('heading',{name:/市场意向报告/})).toBeVisible();
  await expect(page.getByText(/卖方预期补偿/)).toBeVisible();
  await page.getByRole('button',{name:'提交报价并开始谈判'}).click();
  await expect(page.getByText(/谈判进度/)).toBeVisible();
  await page.getByRole('button',{name:/收到的报价/}).click();
  await expect(page.getByRole('heading',{name:'其他球队的求购'})).toBeVisible();
  await expect(page.locator('.transfer-inbox article')).toHaveCount(2);
  await page.locator('.transfer-bid-actions').first().getByRole('button',{name:'拒绝'}).click();
  await expect(page.getByText('已拒绝报价')).toBeVisible();
  await expect(page.locator('.header-note')).toContainText('已保存');
  const saved=await readIndexedSave(page);
  expect(saved.slots[0].season.negotiations).toHaveLength(1);
  expect(Object.keys(saved.slots[0].season.inboundResponses)).toHaveLength(1);
  await page.reload();
  const reloaded=await readIndexedSave(page);
  expect(reloaded.slots[0].season.negotiations).toHaveLength(1);
  expect(Object.keys(reloaded.slots[0].season.inboundResponses)).toHaveLength(1);
  await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  await expect(page.getByText(/谈判进度/)).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('阵容规划、球探报告与关注名单跨读档保留',async({page})=>{
  const season=createSeason('england','arsenal',71),target=cashOffers(season).find(item=>item.allowed);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeClubSlot(season),null,null]})});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  const desk=page.locator('.transfer-panel');await expect(desk.getByRole('heading',{name:'阵容规划'})).toBeVisible();
  await desk.getByRole('button',{name:'搜索与球探'}).click();await desk.getByPlaceholder('搜索全联赛球员').fill(target.name);
  const row=desk.locator('.transfer-scout .transfer-offers article').filter({hasText:target.name}).filter({hasText:teamName(season,target.from)}).first();
  await row.getByRole('button',{name:'加入关注'}).click();await row.getByRole('button',{name:'查看报告'}).click();
  await expect(desk.getByRole('heading',{name:`${target.name} · 球探报告`})).toBeVisible();
  await desk.getByRole('button',{name:'继续观察'}).click();
  await expect(desk.getByText(/已观察 1 次/)).toBeVisible();
  await expect.poll(async()=>{const saved=await readIndexedSave(page);return saved.slots[0].season.scoutingReports?.[target.id]?.level}).toBe(1);
  await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();await page.getByRole('button',{name:'球队与战术'}).click();
  await desk.getByRole('button',{name:'搜索与球探'}).click();
  await expect(desk.getByText('关注名单 · 最多三人并排比较')).toBeVisible();
  const saved=await readIndexedSave(page);expect(saved.slots[0].season.shortlist).toContain(target.id);
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
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
  await expect(page.getByRole('heading',{name:'俱乐部',exact:true})).toBeVisible();
  await expect(page.getByText('本赛季赛事已完成')).toBeVisible();
});

test('俱乐部与 MyCareer 的赛季总结、休赛期和新赛季开幕可恢复',async({page})=>{
  const season=buildFullSeason(),careerSeason=structuredClone(season),career=createCareerPlayer('赛季闭环球员',10,'forward');
  season.seenAwards=['league','europe'];careerSeason.seenAwards=['league','europe'];prepareSeason(careerSeason,career);
  const data={version:2,active:0,slots:[makeClubSlot(season),makeCareerSlot(careerSeason,career),null]},storage={value:null,setItem(key,value){this.value=value}};
  saveSaveData(data,storage);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:storage.value});
  await page.goto('/');await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByText(/SEASON REVIEW/)).toBeVisible();
  await page.getByRole('button',{name:/进入休赛期并生成新赛季/}).click();
  await expect(page.getByRole('heading',{name:'新赛季开幕'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.setViewportSize({width:1280,height:900});
  await expect(page.getByText(/休赛期动态/)).toBeVisible();
  await page.getByRole('button',{name:'首页'}).click();
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'新赛季开幕'})).toBeVisible();
  await page.getByRole('button',{name:/开始新赛季/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部',exact:true})).toBeVisible();
  await expect(page.locator('.club-heading .club-copy')).toContainText('第 1 / 30 轮');
  await page.getByRole('button',{name:'首页'}).click();
  await page.getByText('管理本地存档与备份').click();
  await page.getByRole('button',{name:'打开存档'}).nth(1).click();
  await expect(page.getByText(/SEASON REVIEW/)).toBeVisible();
  await expect(page.getByText('赛季答卷')).toBeVisible();
  await page.getByRole('button',{name:/留队并进入休赛期/}).click();
  await expect(page.getByRole('heading',{name:'新赛季开幕'})).toBeVisible();
  await page.getByRole('button',{name:'首页'}).click();
  await page.getByRole('button',{name:/继续生涯/}).click();
  await expect(page.getByRole('heading',{name:'新赛季开幕'})).toBeVisible();
  await page.getByRole('button',{name:/开始新赛季/}).click();
  await expect(page.getByRole('heading',{name:'MyCareer'})).toBeVisible();
  await expect(page.getByText(/NEXT MATCH \/ 第 1 轮/)).toBeVisible();
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
  const goal=page.getByLabel('本赛季个人目标');await expect(goal).toBeVisible();await goal.selectOption('goal-contributions');
  await expect(page.getByRole('region',{name:'欧冠入口'})).toContainText(/(已获得|未获得)欧冠资格/);
  await expect(page.getByText('QA 测试球员').first()).toBeVisible();
  await expect(page.locator('.header-note')).toContainText('已保存');
  const saved=await readIndexedSave(page);
  expect(saved.slots[0].mode).toBe('career');
  expect(saved.slots[0].player.name).toBe('QA 测试球员');
  expect(saved.slots[0].player.seasonGoal.goalId).toBe('goal-contributions');
  await page.reload();
  await expect(page.getByRole('heading',{name:/QA 测试球员，下一场见/})).toBeVisible();
  await page.getByRole('button',{name:/继续生涯/}).click();
  await expect(page.getByRole('heading',{name:'MyCareer'})).toBeVisible();
  await expect(page.getByText('QA 测试球员').first()).toBeVisible();
  await page.getByRole('button',{name:/模拟本场比赛/}).click();
  await finishSimulation(page);
  await expect(page.getByRole('heading',{name:'上一场表现 · 模拟'})).toBeVisible();
  await expect(page.getByText('第 2 / 30 轮')).toBeVisible();
  await page.getByRole('button',{name:'我的球员'}).click();
  const life=page.locator('.football-life');await expect(life.getByRole('heading',{name:'球队生活与合同'})).toBeVisible();await life.getByText('一线队合同与定位 · 10 人',{exact:true}).click();
  await expect(life.getByRole('button',{name:'续约',exact:true})).toHaveCount(1);await life.getByRole('button',{name:'续约',exact:true}).click();await expect(life.getByRole('status')).toContainText('续约已保存');
  const renewed=await readIndexedSave(page);expect(renewed.slots[0].season.playerData[renewed.slots[0].player.id].lifeHistory.at(-1).type).toBe('renewal');expect(renewed.slots[0].player.stats.appearances).toBe(1);
  expect(pageErrors).toEqual([]);
});

test('导入存档等待 IndexedDB 事务提交后才报告成功',async({page})=>{
  const season=createSeason('england','arsenal',20261011);season.history=[{seasonStartYear:2025,archive:{number:1,revision:1,seasonStartYear:2025,leagues:[],results:[]}}];const backup=exportBackup({version:2,active:0,slots:[makeClubSlot(season),null,null]});
  await page.goto('/');
  await page.getByText('管理本地存档与备份').click();
  await page.getByText('存档备份与导入').click();
  await page.locator('.backup-drawer input[type=file]').setInputFiles({name:'pixel-pitch-saves.json',mimeType:'application/json',buffer:Buffer.from(backup)});
  await expect(page.getByText('存档导入成功')).toBeVisible();
  await expect(page.locator('.header-note')).toContainText('已保存');
  const record=await readIndexedSaveRecord(page),saved=record.save;
  expect(record.storageVersion).toBe(1);
  expect(saved.slots[0].season.history[0].archive).toBeUndefined();
  expect(await readIndexedArchive(page,record.archiveRefs[0].key)).toMatchObject({number:1,seasonStartYear:2025});
  expect(saved.active).toBe(0);
  expect(saved.slots[0].season.teamId).toBe('arsenal');
});

test('旧版 IndexedDB 存档迁移为独立赛季档案，普通保存不重写历史',async({page})=>{
  const season=createSeason('england','arsenal',20261012),archive=archiveSeason(season),archivedPlayer={id:season.rosterIds.arsenal[5],name:'迁移验证球员',team:'Arsenal',teamId:'arsenal',seasonTeamId:'arsenal',index:5,appearances:12,goals:9,assists:0};
  archive.leagues.find(group=>group.leagueId==='england').players.push(archivedPlayer);
  season.history=[{league:'Premier League',team:'Arsenal',seasonStartYear:archive.seasonStartYear,archive}];
  const legacy={version:2,active:0,slots:[makeClubSlot(season),null,null]};
  await page.goto('/brand.css');
  await page.evaluate(async({database,store,legacy})=>{
    const db=await new Promise((resolve,reject)=>{const request=indexedDB.open(database,1);request.onupgradeneeded=()=>request.result.createObjectStore(store);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    await new Promise((resolve,reject)=>{const transaction=db.transaction(store,'readwrite');transaction.objectStore(store).put(legacy,'slots');transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error)});db.close();
  },{database:SAVE_DB_NAME,store:SAVE_DB_STORE,legacy});
  await page.goto('/');
  await expect.poll(async()=>Boolean((await readIndexedSaveRecord(page))?.storageVersion)).toBe(true);
  const stored=await readIndexedSaveRecord(page);
  expect(stored.storageVersion).toBe(1);
  expect(stored.save.slots[0].season.history[0].archive).toBeUndefined();
  expect(stored.archiveRefs).toHaveLength(1);
  await page.addInitScript(()=>{window.__archiveWrites=0;const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='season-archives')window.__archiveWrites++;return put.apply(this,args)}});
  await page.reload();
  await page.getByRole('button',{name:/继续俱乐部/}).click();
  await page.getByRole('button',{name:/模拟本场比赛/}).click();
  await finishSimulation(page);
  await expect(page.locator('.header-note')).toContainText('已保存');
  expect(await page.evaluate(()=>window.__archiveWrites)).toBe(0);
  await page.getByRole('button',{name:'历史排名'}).click();
  await expect(page.getByRole('heading',{name:'跨赛季历史排名'})).toBeVisible();
  await page.getByPlaceholder('输入球员或球队').fill('迁移验证球员');
  await expect(page.getByRole('button',{name:'迁移验证球员'})).toBeVisible();
});

test('小屏幕主要创建流程没有页面级横向溢出',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:/新建俱乐部/}).click();
  await expect(page.getByRole('heading',{name:'俱乐部',exact:true})).toBeVisible();
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
test('像素球员外观组合、正背面预览与存档恢复',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/新建 MyCareer/}).last().click();
  const studio=page.locator('.appearance-studio-v2');await studio.getByRole('button',{name:'脏辫',exact:true}).click();
  await studio.getByLabel('局部挑染').check();await studio.getByLabel('自选发色').fill('#864a98');
  await studio.getByRole('button',{name:'面容',exact:true}).click();await studio.getByRole('button',{name:'络腮胡',exact:true}).click();
  await studio.getByRole('button',{name:'装备',exact:true}).click();await studio.getByLabel('佩戴发带').check();
  await studio.getByRole('button',{name:'双侧',exact:true}).click();await studio.getByRole('button',{name:'高筒',exact:true}).click();
  await studio.getByLabel('自选配饰颜色').fill('#f4c64d');
  const front=await studio.locator('.as-preview canvas.pixel-player').evaluate(c=>c.toDataURL());
  await studio.getByRole('button',{name:'背面',exact:true}).click();
  const back=await studio.locator('.as-preview canvas.pixel-player').evaluate(c=>c.toDataURL());expect(front).not.toBe(back);
  await page.screenshot({path:'test-results/appearance-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await expect(studio.getByRole('button',{name:'高筒',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/appearance-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'开始职业生涯'}).click();await expect(page.locator('.header-note')).toContainText('已保存');
  const saved=await readIndexedSave(page),look=saved.slots[0].player.appearance;expect(look).toMatchObject({hairstyle:10,hair:'#864a98',headband:true,highlights:true,beard:3,wrist:'both',sockLength:'high'});
  await page.reload();await page.getByRole('button',{name:/继续生涯/}).click();await page.getByRole('button',{name:'我的球员'}).click();
  await page.locator('.player-customization .as-rail').getByRole('button',{name:'头发'}).click();
  await expect(page.locator('.player-customization .as-head-option[aria-pressed="true"]')).toHaveText('脏辫');
  await page.locator('.player-customization .as-rail').getByRole('button',{name:'装备'}).click();
  await expect(page.locator('.player-customization').getByLabel('佩戴发带')).toBeChecked();
  await page.locator('.player-customization').getByRole('button',{name:'试试一套新搭配'}).click();await expect(page.getByText('尚未保存 · 目前仅为预览')).toBeVisible();
  expect(errors).toEqual([]);
});
test('MyCareer 休赛期年龄成长、训练重点和青训名单保存',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const season=buildFullSeason(),career=createCareerPlayer('年度发展',10,'forward');prepareSeason(season,career);season.seenAwards=['league','europe'];
  const storage={value:null,setItem(key,value){this.value=value}};saveSaveData({version:2,active:0,slots:[makeCareerSlot(season,career),null,null]},storage);
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:storage.value});await page.goto('/');await page.getByRole('button',{name:/继续生涯/}).click();
  await page.getByLabel('休赛期训练重点').selectOption('shooting');await expect(page.getByLabel('休赛期训练重点')).toHaveValue('shooting');
  expect(await page.getByRole('button',{name:/^训练/}).count()).toBeLessThanOrEqual(1);
  await page.getByRole('button',{name:/留队并进入休赛期/}).click();await expect(page.getByRole('heading',{name:'你的年度发展'})).toBeVisible();
  const saved=await readIndexedSave(page);expect(saved.slots[0].player.age).toBe(19);expect(saved.slots[0].player.developmentHistory).toHaveLength(1);expect(saved.slots[0].season.worldOffseason.youthIntake).toHaveLength(80);
  await page.reload();await page.getByRole('button',{name:/继续生涯/}).click();await expect(page.getByRole('heading',{name:'你的年度发展'})).toBeVisible();
  expect((await readIndexedSave(page)).slots[0].player.age).toBe(19);expect(errors).toEqual([]);
});
test('长期模拟逐场保存、可停止并保留轮换计划',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:/新建俱乐部/}).last().click();await page.getByRole('button',{name:'建立俱乐部赛季'}).click();
 const panel=page.getByRole('region',{name:'赛程与长期模拟'});await panel.getByText('身体恢复与未来五场安排',{exact:true}).click();await expect(panel.locator('.rotation-fixture')).toHaveCount(5);await panel.getByRole('button',{name:'采用恢复建议'}).first().click();await expect(panel.getByText('已保存本场首发计划').first()).toBeVisible();
 await panel.getByLabel('遇到新诉求或资金不足暂停').uncheck();await panel.getByLabel('长期模拟目标').selectOption('5');await panel.getByRole('button',{name:'开始长期模拟'}).click();await expect(page.getByRole('dialog',{name:'长期模拟进行中'})).toBeVisible();await expect(panel.getByRole('status')).toContainText('已模拟 5 场',{timeout:60000});
 const saved=await readIndexedSave(page),season=saved.slots[0].season;expect(season.week).toBeGreaterThanOrEqual(3);expect(season.results.filter(r=>[r.home,r.away].includes(season.teamId)).length+season.cup.results.filter(r=>[r.home,r.away].includes(season.teamId)).length).toBe(5);expect(Object.keys(season.rotationPlans).length).toBe(1);expect(Object.values(season.playerData).some(p=>p.recovery)).toBe(true);
 await panel.getByLabel('长期模拟目标').selectOption('10');await panel.getByRole('button',{name:'开始长期模拟'}).click();await page.getByRole('button',{name:'停止长期模拟'}).click();await expect(page.getByRole('dialog',{name:'长期模拟进行中'})).toHaveCount(0);await expect(panel.getByRole('status')).toContainText('已按你的要求停止');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:'test-results/season-preparation-mobile.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:/继续俱乐部/}).click();expect((await readIndexedSave(page)).slots[0].season.week).toBeGreaterThanOrEqual(season.week);expect(errors).toEqual([]);
});
