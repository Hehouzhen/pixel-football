const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export function celebrationPose(kind,phase,direction=1){
  const t=clamp(phase,0,1.55),dir=direction<0?-1:1;
  if(kind===1){
    if(t<.22)return {row:1,col:Math.floor(t*18)%6,dx:dir*t*65,dy:0,rotation:0,scaleX:1,scaleY:1,dust:false};
    const slide=clamp((t-.22)/1.05,0,1);
    return {row:slide>.85?3:2,col:slide>.85?3:Math.floor(t*12)%2+1,dx:dir*(14+46*(1-(1-slide)**2)),dy:slide>.85?7:11,rotation:slide>.85?0:-dir*.27,scaleX:1,scaleY:slide>.85?.82:.72,dust:slide<.85};
  }
  if(kind===2){
    if(t<.2)return {row:0,col:0,dx:0,dy:5,rotation:0,scaleX:1,scaleY:.88,dust:false};
    if(t<.84){const jump=(t-.2)/.64;return {row:3,col:jump<.5?2:4,dx:0,dy:-Math.sin(jump*Math.PI)*20,rotation:0,scaleX:1,scaleY:1,flip:jump>=.5,back:jump>.42&&jump<.72,dust:false}}
    if(t<1.03)return {row:0,col:0,dx:0,dy:4,rotation:0,scaleX:1,scaleY:.82,dust:true};
    return {row:3,col:3,dx:0,dy:0,rotation:0,scaleX:1,scaleY:1,dust:false};
  }
  if(t<.45)return {row:1,col:Math.floor(t*12)%6,dx:dir*t*45,dy:0,rotation:0,scaleX:1,scaleY:1,dust:false};
  return {row:3,col:t<.8?1:2,dx:dir*20,dy:0,rotation:0,scaleX:1,scaleY:1,dust:false};
}
