export const SCENE_LENGTH={academy:8,tunnel:10,contract:9,award:11};
export const sceneKind=kind=>['award','team'].includes(kind)?'award':kind==='origin'?'academy':['season','tunnel'].includes(kind)?'tunnel':'contract';
export const ease=(time,start,end)=>{const v=Math.max(0,Math.min(1,(time-start)/(end-start)));return v*v*(3-2*v)};
export function sceneFrame(kind,time){
 const type=sceneKind(kind),t=Math.max(0,Math.min(SCENE_LENGTH[type],time));
 if(type==='contract')return {type,t,phase:t<1.4?'落座':t<4?'签署合同':t<6?'握手确认':'球衣合影',sign:ease(t,1.5,3.7),shake:ease(t,4,4.7)*(1-ease(t,5.5,6)),shirt:ease(t,6,7),zoom:1+ease(t,1.2,2)*.035-ease(t,5.8,6.5)*.035};
 if(type==='award')return {type,t,phase:t<2.6?'接过奖杯':t<5.7?'共同举杯':'这一刻，属于我们',lift:ease(t,2.8,5.4),confetti:ease(t,5.8,7),zoom:1+ease(t,2.5,5.5)*.055};
 return {type,t,phase:type==='academy'?(t<3?'第一盏球场灯':'把下一脚传好'):t<3?'通道里的脚步':t<6?'准备走上球场':'属于你的比赛',walk:ease(t,0,3),exit:ease(t,6,10),zoom:1+ease(t,3,5)*.13-ease(t,6,9)*.08};
}
