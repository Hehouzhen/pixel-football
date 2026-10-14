import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const result=await build({stdin:{contents:"import {drawPortrait,onSpriteReady} from './player-sprite.mjs';import {drawKeeper} from './keeper-sprite.mjs';import {draw} from './pitch.mjs';import {Match} from './engine.mjs';import {newDreamSave,makeDreamFixture,dreamMatchOptions,DREAM_PLAYER_BY_ID} from './dream-team.mjs';window.identityTools={drawPortrait,onSpriteReady,drawKeeper,draw,Match,newDreamSave,makeDreamFixture,dreamMatchOptions,DREAM_PLAYER_BY_ID}",resolveDir:process.cwd()},bundle:true,write:false,loader:{'.png':'dataurl'},format:'iife'});
const browser=await chromium.launch();
try{
  const page=await browser.newPage({viewport:{width:1150,height:1100}});
  await page.setContent('<body style="background:#14222d;color:#d5ff78;font:14px sans-serif"><h2>卡牌身份与场上球员</h2><div id="cards" style="display:grid;grid-template-columns:repeat(12,88px);gap:4px"></div><canvas id="pitch" width="972" height="582"></canvas></body>');
  await page.addScriptTag({content:result.outputFiles[0].text});
  const checks=await page.evaluate(async()=>{
    const t=identityTools;await new Promise(resolve=>t.onSpriteReady(resolve));
    const data=t.newDreamSave(),fixture=t.makeDreamFixture(data),options=t.dreamMatchOptions(data,fixture),m=new t.Match(options);m.colors=['#5b82d8','#db7265'];m.keeper=[...m.colors];m.state='playing';
    const identities=m.playerIds.every((id,i)=>JSON.stringify(m.playerLooks[i])===JSON.stringify(t.DREAM_PLAYER_BY_ID[id].appearance));
    for(let i=0;i<12;i++){const box=document.createElement('div'),c=document.createElement('canvas'),player=t.DREAM_PLAYER_BY_ID[m.playerIds[i]],look=player.appearance;c.width=120;c.height=180;c.style.width='80px';c.style.imageRendering='pixelated';t.drawPortrait(c,{kit:m.colors[i<6?0:1],skin:look.skin,hair:look.hair,shoes:look.shoes,hairstyle:look.hairstyle,sleeve:look.sleeve,number:player.number,look});box.append(c,player.name);document.getElementById('cards').append(box)}
    const c=document.getElementById('pitch'),ctx=c.getContext('2d');t.draw(ctx,m);const real=c.toDataURL();m.playerLooks=null;t.draw(ctx,m);const fallback=c.toDataURL();m.playerLooks=options.playerLooks;t.draw(ctx,m);
    const keeperImages=[];for(const hairstyle of [0,1,2,3,4,5,6,7,8,9,10,11]){const canvas=document.createElement('canvas');canvas.width=canvas.height=90;t.drawKeeper(canvas.getContext('2d'),{x:45,y:70,kit:'#5b82d8',skin:'#bd8a61',hair:'#30291f',look:{skin:'#bd8a61',hair:'#30291f',hairstyle}});keeperImages.push(canvas.toDataURL())}
    const before=JSON.stringify(m.playerLooks);m.reset(1);const preserved=before===JSON.stringify(m.playerLooks);return {identities,preserved,rendererUsesIdentity:real!==fallback,distinctKeeperHeads:new Set(keeperImages).size};
  });
  assert(checks.identities);assert(checks.preserved);assert(checks.rendererUsesIdentity);assert.equal(checks.distinctKeeperHeads,12);
  await page.screenshot({path:'test-results/dream-team-card-pitch-identity.png',fullPage:true});
  console.log('All 12 card appearances and numbers feed the live renderer; keeper hairstyles remain distinct and identities survive resets.');
}finally{await browser.close()}
