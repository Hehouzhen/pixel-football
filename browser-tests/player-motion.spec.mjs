import {test,expect} from '@playwright/test';
import {build} from 'esbuild';

test('turn and ground kick frames render with the real release position',async({page})=>{
 const bundle=await build({stdin:{contents:"export {drawSprite,spritePose,onSpriteReady} from './player-sprite.mjs';export {bodyPose,strikePose,advanceBodyFacing} from './player-motion.mjs';export {Match} from './engine.mjs';export {draw} from './pitch.mjs';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'MotionReview',loader:{'.png':'dataurl'}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(()=>new Promise(resolve=>MotionReview.onSpriteReady(resolve)));
 await page.evaluate(()=>{
  document.body.innerHTML='<canvas width="1100" height="760" style="width:1100px;image-rendering:pixelated"></canvas>';
  const ctx=document.querySelector('canvas').getContext('2d');ctx.fillStyle='#182934';ctx.fillRect(0,0,1100,760);ctx.font='14px monospace';
  for(const [j,kind] of ['pass','shot','cross','rear','turn'].entries()){
   ctx.fillStyle='#ead6a0';ctx.fillText(kind.toUpperCase(),8,40+j*145);
   for(let i=0;i<6;i++){
    ctx.save();ctx.translate(130+i*158,112+j*145);ctx.scale(2,2);
    const age=[0,.02,.045,.08,.12,.16][i],m=new MotionReview.Match(),p=m.players[5];p.x=0;p.y=0;p.dx=1;p.dy=0;p.bodyAngle=0;
    m.ball.x=kind==='rear'?0:11;m.ball.y=kind==='rear'?-4:7;m.release(5,kind==='rear'?0:400,kind==='rear'?-400:0,0,kind==='rear'?'shot':kind);p.kickPower=kind==='shot'?1:.4;
    if(kind==='turn'){delete p.kickAt;p.dx=-.3;p.dy=-.95;for(let t=0;t<age;t+=.01)MotionReview.advanceBodyFacing(p,.01,t)}
    const face=MotionReview.bodyPose(p,age),[row,col]=kind==='turn'?[1,i]:MotionReview.spritePose(p,age),strike=kind==='turn'?null:MotionReview.strikePose(p,age);
    MotionReview.drawSprite(ctx,{x:0,y:0,size:44,row,col,back:face.back,flip:face.flip,rearTurn:face.rearTurn,scaleX:face.scaleX,strike,backNumber:27,kit:'#77bafd',skin:'#ebbd89',hair:'#302b24',shoes:'#f0b15c',look:{studio:1}});
    if(kind!=='turn'){ctx.fillStyle='#f4edcf';ctx.fillRect(m.ball.x+m.ball.vx*age-3,m.ball.y+m.ball.vy*age-3,6,6)}
    ctx.restore();
   }
  }
 });
 expect(errors).toEqual([]);await page.locator('canvas').screenshot({path:'test-results/player-motion-contacts.png'});
 await page.evaluate(()=>{
  document.body.innerHTML='<canvas width="960" height="600" style="display:block;width:100%;max-width:960px;image-rendering:pixelated"></canvas>';
  const m=new MotionReview.Match(),p=m.players[5];m.state='playing';m.time=1;m.wait=0;m.players.forEach(q=>{q.stationary=true;q.cool=10});p.x=500;p.y=300;p.dx=1;p.dy=0;p.bodyAngle=0;m.selected[0]=5;m.ball.owner=5;m.ball.x=511;m.ball.y=307;m.release(5,500,0,0,'shot');p.kickPower=.9;
  MotionReview.draw(document.querySelector('canvas').getContext('2d'),m);
 });
 await page.locator('canvas').screenshot({path:'test-results/player-motion-pitch-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('canvas').screenshot({path:'test-results/player-motion-pitch-mobile.png'});expect(errors).toEqual([]);

});
