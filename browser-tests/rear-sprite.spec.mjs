import {test,expect} from '@playwright/test';
import {build} from 'esbuild';

test('rear player poses, hairstyles and readable numbers share the production renderer',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const bundle=await build({entryPoints:['player-sprite.mjs'],bundle:true,write:false,format:'iife',globalName:'RearSprites',loader:{'.png':'dataurl'}});
 await page.goto('/');await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>new Promise(resolve=>RearSprites.onSpriteReady(resolve)));
 const result=await page.evaluate(()=>{
  document.body.innerHTML='<canvas id="rear-review" width="960" height="750" style="width:960px;image-rendering:pixelated"></canvas>';
  const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle='#182934';ctx.fillRect(0,0,960,750);ctx.font='14px monospace';
  const rows=[['STAND',0],['WALK',4],['RUN',1],['ACTION',2],['HAIR',0]];
  rows.forEach(([label,row],j)=>{ctx.fillStyle='#ead6a0';ctx.fillText(label,12,40+j*145);for(let i=0;i<6;i++){
   RearSprites.drawSprite(ctx,{x:160+i*140,y:125+j*145,size:120,row,col:i,back:true,backNumber:27,kit:'#77bafd',skin:'#ebbd89',hair:'#302b24',shoes:'#f0b15c',look:{studio:1},hairstyle:j===4?[0,3,5,7,8,9][i]:0});
  }});
  const draw=flip=>{const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');RearSprites.drawSprite(x,{x:100,y:150,size:128,row:0,col:0,back:true,flip,backNumber:27,kit:'#77bafd'});return [...x.getImageData(92,109,16,10).data]};
  return {normal:draw(false),flipped:draw(true)};
 });
 expect(result.normal).toEqual(result.flipped);expect(result.normal.some(v=>v!==0)).toBe(true);expect(errors).toEqual([]);
 await page.locator('canvas').screenshot({path:'test-results/rear-player-poses.png'});
});
