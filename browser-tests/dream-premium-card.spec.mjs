import {test,expect} from '@playwright/test';
import {DREAM_PLAYERS,newDreamSave,openDreamDraw} from '../dream-team.mjs';

test('every 90+ card uses the premium face in the collection and player detail',async({page})=>{
  const premium=DREAM_PLAYERS.filter(player=>player.overall>=90);
  await page.goto('/');
  await page.getByRole('button',{name:/进入 Dream Squad/}).click();
  await page.getByRole('button',{name:'球员收藏',exact:true}).click();
  await page.getByRole('combobox',{name:'筛选卡牌状态'}).selectOption('all');
  const cards=page.locator('.dream-card-grid .dream-premium-card');
  await expect(cards).toHaveCount(premium.length);
  expect(await cards.evaluateAll(nodes=>nodes.map(node=>node.dataset.premiumCardId).sort())).toEqual(premium.map(player=>player.id).sort());
  await page.getByRole('textbox',{name:'搜索球员'}).fill('Pelé');
  await page.locator('.dream-card-grid .dream-player-card').click();
  await expect(page.locator('.dream-detail-player .dream-premium-card')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('a 90+ signing reveal shows the same premium card face',async({page})=>{
  const draw=openDreamDraw(newDreamSave(),1,()=>.01);
  await page.goto('/');
  await page.evaluate(state=>localStorage.setItem('pixel-pitch-dream-squad-v1',JSON.stringify(state)),draw);
  await page.reload();
  await page.getByRole('button',{name:/进入 Dream Squad/}).click();
  await page.getByRole('button',{name:'跳过登场'}).click();
  await expect(page.locator('.dream-reveal-portrait .dream-premium-card')).toBeVisible();
  await expect(page.locator('.dream-reveal-portrait .dream-premium-card')).toHaveAttribute('data-premium-card-id',draw.pendingDraw.rows[0].playerId);
});
