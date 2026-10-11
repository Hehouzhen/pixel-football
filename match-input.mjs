export function handlePassInput(match,towardPointer=false,onSuccess=()=>{}){
  if(!match||match.state!=='playing'||match.shootoutMode)return;
  if(match.careerIndex!==null&&match.ball.owner!==match.careerIndex){
    if(match.requestPass())onSuccess();
    return;
  }
  const id=match.ball.owner;
  if(id!==null&&match.players[id]?.t===0){
    const target=towardPointer?match.pointer:null;
    if(match.kick(id,false,.4,target))onSuccess();
    else match.announce(match.actionHint('pass'));
  }
}
