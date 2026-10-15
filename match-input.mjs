export function handlePassInput(match,towardPointer=false,onSuccess=()=>{},intent='feet'){
  if(!match||match.state!=='playing'||match.shootoutMode)return;
  if(match.penalty){match.announce('点球时请使用射门操作');return;}
  if(match.careerIndex!==null&&match.ball.owner!==match.careerIndex){
    if(match.requestPass(0,intent))onSuccess();
    return;
  }
  const id=match.selected[0];
  if(match.ball.owner!==id&&match.careerIndex===null){const holder=match.players[match.ball.owner];match.announce(holder?.t===0?(holder.i===0?'门将正在准备出球 · 跑位接应':'按 Q 接管持球队友后再传球'):holder?'对方持球 · 按 Q 切人参与防守':'足球尚未被控制 · 靠近接应');return;}
  if(id!==null&&match.players[id]?.t===0){
    const target=towardPointer?match.pointer:null;
    if(match.kick(id,false,.4,target,intent==='through'?'through':false))onSuccess();
    else match.announce(match.actionHint('pass'));
  }
}
