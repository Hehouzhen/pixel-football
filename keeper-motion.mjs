export function keeperVisual(player,time,ball,attackDirection){
  const facing=Math.abs(ball.x-player.x)>8?ball.x-player.x:attackDirection;
  const flip=facing<0,side=player.diveSide??1;
  const saveAge=time-(player.saveAt??-10),diveAge=time-(player.diveAt??-10);
  if(saveAge>=0&&saveAge<.42)return {flip,side,pose:player.saveKind==='parry'&&saveAge<.22?'reach':saveAge<.3?'catch':'land',dy:side*3};
  if(diveAge>=0&&diveAge<.43)return {flip,side,pose:diveAge<.09?'load':diveAge<.3?'reach':'land',dy:side*(diveAge<.09?0:5)};
  if(ball.kind==='shot'&&ball.last!==player.t)return {flip,side,pose:'load',dy:0};
  return {flip,side,pose:Math.hypot(player.vx??0,player.vy??0)>15?'shuffle':'idle',dy:0};
}
