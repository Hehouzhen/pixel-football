import {test,expect} from '@playwright/test';
import {createCareerPlayer} from '../career.mjs';
import {createSeason,prepareSeason} from '../league.mjs';
import {initializeJourney} from '../career-journey.mjs';
import {makeCareerSlot,SAVE_KEY} from '../save-slots.mjs';

test('new career selects a nation and restores the national profile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:/新建 MyCareer/}).click();
 await page.getByRole('button',{name:'国家',exact:true}).click();await expect(page.getByRole('group',{name:'代表国家'}).getByRole('button')).toHaveCount(6);
 await page.getByRole('button',{name:'阿根廷',exact:true}).click();await expect(page.getByRole('button',{name:'阿根廷',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'test-results/national-selector-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/national-selector-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'愿望',exact:true}).click();await expect(page.locator('.national-inline')).toContainText('阿根廷');await page.getByRole('button',{name:'开始职业生涯'}).click();await page.getByRole('button',{name:'国家队',exact:true}).click();
 await expect(page.getByRole('heading',{name:'阿根廷国家队'})).toBeVisible();await expect(page.getByRole('heading',{name:'积累职业表现'})).toBeVisible();await expect(page.locator('.national-note').first()).toContainText('国家队出场与俱乐部统计分别保存');
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();await page.getByRole('button',{name:'国家队',exact:true}).click();await expect(page.getByRole('heading',{name:'阿根廷国家队'})).toBeVisible();expect(errors).toEqual([]);
});

for(const journey of [false,true])test(`legacy career nation selection preserves the club: journey=${journey}`,async({page})=>{
 let s=createSeason('england','arsenal',31),p=createCareerPlayer('旧档双线',27,'midfielder');if(journey)({season:s,player:p}=initializeJourney(p,s));prepareSeason(s,p);
 const data={version:2,active:0,slots:[makeCareerSlot(s,p),null,null]};await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify(data)});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();await page.getByRole('button',{name:'国家队',exact:true}).click();
 await page.getByRole('button',{name:'中国',exact:true}).click();await page.getByRole('button',{name:'保存代表国家'}).click();await expect(page.getByRole('heading',{name:'中国国家队'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/national-profile-${journey?'journey':'legacy'}-mobile.png`,fullPage:true});
 await page.reload();await page.getByRole('button',{name:'继续生涯'}).click();await page.getByRole('button',{name:'国家队',exact:true}).click();await expect(page.getByRole('heading',{name:'中国国家队'})).toBeVisible();await expect(page.getByRole('button',{name:'保存代表国家'})).toHaveCount(0);await expect(page.getByText('旧档双线 · 代表身份已保存')).toBeVisible();
});


test('failed nation persistence keeps the legacy selection retryable',async({page})=>{
 const {season:s,player:p}=initializeJourney(createCareerPlayer('保存测试',27,'midfielder'),createSeason('england','arsenal',31));prepareSeason(s,p);
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:SAVE_KEY,value:JSON.stringify({version:2,active:0,slots:[makeCareerSlot(s,p),null,null]})});
 await page.goto('/');await page.getByRole('button',{name:'继续生涯'}).click();await page.getByRole('button',{name:'国家队',exact:true}).click();
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.restoreNationSave=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(){throw new DOMException('full','QuotaExceededError')}});
 await page.getByRole('button',{name:'保存代表国家'}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByRole('button',{name:'保存代表国家'})).toBeEnabled();await expect(page.getByRole('heading',{name:'中国国家队'})).toHaveCount(0);
 await page.evaluate(()=>window.restoreNationSave());await page.getByRole('button',{name:'保存代表国家'}).click();await expect(page.getByRole('heading',{name:'中国国家队'})).toBeVisible();
});
