// Run the existing action engine with both sides controlled by AI.
export function enterLiveSimulation(match){
  match.selected[0]=-1;
  match.charge=0;match.pendingShot=null;match.pendingPass=null;match.passRequest=null;
  match.journeySimulated=true;
}
export function takeOverSimulation(match){
  match.selected[0]=match.careerIndex??(match.ball.owner!==null&&match.players[match.ball.owner]?.t===0?match.ball.owner:match.available(0));
}
export function simulateMatchWithoutEntry(match,maxSteps=30000){
  match.interactiveHalftime=false;match.state='playing';match.selected[0]=-1;
  let steps=0;
  while(match.state==='playing'&&steps++<maxSteps){match.wait=0;match.selected[0]=-1;match.step(.04,[{},{}])}
  if(match.state!=='ended')throw new Error('模拟未能完成');
  match.journeySimulated=true;match.selected[0]=match.careerIndex??match.available(0);
  return match;
}
export function stepLiveSimulation(match,dt,{speed=1,target=null}={}){
  const budget=target===null?Math.min(.04,dt)*speed:4;
  let left=budget;
  while(left>0&&match.state==='playing'){
    match.selected[0]=-1;
    const step=Math.min(.016,left);match.step(step,[{},{}]);left-=step;
    if(target!==null&&match.time>=target){if(match.state==='playing')match.state='paused';break}
  }
}
