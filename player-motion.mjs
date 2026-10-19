const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));

export function advanceBodyFacing(p,dt,time){
 const age=time-(p.kickAt??-10),locked=age>=0&&age<.18&&['pass','shot','cross'].includes(p.kickType)&&Number.isFinite(p.kickDx);
 const target=Math.atan2(locked?p.kickDy:p.dy??0,locked?p.kickDx:p.dx??1),current=p.bodyAngle??target,diff=angleDelta(current,target);
 p.bodyAngle=current+clamp(diff,-22*dt,22*dt);p.bodyTurn=clamp(diff,-1,1);
}

export function bodyPose(p,time){
 const age=time-(p.kickAt??-10),locked=age>=0&&age<.18&&['pass','shot','cross'].includes(p.kickType)&&Number.isFinite(p.kickDx),angle=locked?Math.atan2(p.kickDy,p.kickDx):p.bodyAngle??Math.atan2(p.dy??0,p.dx??1),dx=Math.cos(angle),dy=Math.sin(angle);
 if(dy<-.65)p.renderBack=true;else if(dy>-.35)p.renderBack=false;
 if(dx<-.2)p.renderFlip=true;else if(dx>.2)p.renderFlip=false;
 return {back:p.renderBack??false,flip:p.renderFlip??false,rearTurn:dx,scaleX:locked?1:1-Math.min(.12,Math.abs(p.bodyTurn??0)*.12)};
}

export function strikePose(p,time){
 const age=time-(p.kickAt??-10);if(age<0||age>=.24||!['pass','shot','cross'].includes(p.kickType)||!Number.isFinite(p.kickOriginX))return null;
 const contact=p.kickType==='shot'&&p.kickPower>=.75?.075:.045,follow=clamp((age-contact)/(.24-contact),0,1),dx=p.kickDx,dy=p.kickDy;
 return {age,dx,dy,x:p.x+p.kickOriginX-p.kickPlayerX-dx*5+dx*follow*4,y:p.y+p.kickOriginY-p.kickPlayerY-dy*5+dy*follow*4,follow};
}

export function drawStrikeFeet(ctx,{x,y,size,strike,skin='#ebbd89',shoes='#f47b28',look={}}){
 const scale=size/44,edge='#171b1c',sock=look.sockColor??'#182d49';
 const box=(a,b,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(a),Math.round(b),Math.round(w),Math.round(h))};
 const limb=(ax,ay,bx,by,width,c)=>{const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));for(const [w,color] of [[width+2,edge],[width,c]])for(let i=0;i<=steps;i++)box(ax+(bx-ax)*i/steps-w/2,ay+(by-ay)*i/steps-w/2,w,w,color)};
 const side=strike.dx<0?-1:1,hipY=y,plantX=x-side*4*scale,plantY=y+7*scale;
 limb(x-side*3*scale,hipY,plantX,plantY,3*scale,sock);box(plantX-3*scale,plantY-1*scale,6*scale,3*scale,edge);box(plantX-2*scale,plantY,4*scale,1*scale,shoes);
 const kneeX=(x+strike.x)/2,kneeY=(hipY+strike.y)/2-2*scale;
 limb(x+side*3*scale,hipY,kneeX,kneeY,3*scale,skin);limb(kneeX,kneeY,strike.x,strike.y,3*scale,sock);
 box(strike.x-3*scale,strike.y-2*scale,6*scale,4*scale,edge);box(strike.x-2*scale,strike.y-1*scale,4*scale,2*scale,shoes);
}
