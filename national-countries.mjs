import {nationById} from './national-team.mjs';
// National strength profiles are game estimates; generated squads are fictional.
const regions={
 UEFA:'fra:法国:88,eng:英格兰:87,esp:西班牙:88,ger:德国:85,por:葡萄牙:86,ita:意大利:83,ned:荷兰:84,bel:比利时:82,cro:克罗地亚:81,sui:瑞士:79,den:丹麦:78,aut:奥地利:78,tur:土耳其:77,srb:塞尔维亚:76,ukr:乌克兰:76,pol:波兰:75,swe:瑞典:75,nor:挪威:76,sco:苏格兰:73,wal:威尔士:73,cze:捷克:75,hun:匈牙利:74,rou:罗马尼亚:73,gre:希腊:73,svk:斯洛伐克:73,slo:斯洛文尼亚:72,irl:爱尔兰:71,fin:芬兰:68,isl:冰岛:69,alb:阿尔巴尼亚:70,bih:波黑:70,geo:格鲁吉亚:72',
 AFC:'chn:中国:65,jpn:日本:79,kor:韩国:79,irn:伊朗:78,aus:澳大利亚:76,ksa:沙特阿拉伯:72,qat:卡塔尔:72,uzb:乌兹别克斯坦:71,irq:伊拉克:69,uae:阿联酋:68,jor:约旦:70,oma:阿曼:66,bhr:巴林:65,syr:叙利亚:64,tha:泰国:63,vie:越南:62,idn:印度尼西亚:62,mas:马来西亚:59,ind:印度:58,prk:朝鲜:63,ple:巴勒斯坦:62,lbn:黎巴嫩:61,tjk:塔吉克斯坦:62,kgz:吉尔吉斯斯坦:61',
 CAF:'mar:摩洛哥:79,sen:塞内加尔:79,nga:尼日利亚:78,egy:埃及:76,civ:科特迪瓦:78,alg:阿尔及利亚:76,tun:突尼斯:73,cmr:喀麦隆:75,gha:加纳:73,mli:马里:74,rsa:南非:71,cod:民主刚果:72,bfa:布基纳法索:70,gui:几内亚:70,gab:加蓬:68,ang:安哥拉:68,cpv:佛得角:69,zam:赞比亚:67,uga:乌干达:64,eqg:赤道几内亚:66,ben:贝宁:64,moz:莫桑比克:63,ken:肯尼亚:62,tan:坦桑尼亚:62',
 CONMEBOL:'arg:阿根廷:88,bra:巴西:87,uru:乌拉圭:82,col:哥伦比亚:82,ecu:厄瓜多尔:78,chi:智利:74,per:秘鲁:72,par:巴拉圭:75,ven:委内瑞拉:73,bol:玻利维亚:67',
 CONCACAF:'usa:美国:78,mex:墨西哥:78,can:加拿大:76,crc:哥斯达黎加:70,pan:巴拿马:71,jam:牙买加:69,hon:洪都拉斯:65,gua:危地马拉:63,hai:海地:64,slv:萨尔瓦多:61,tri:特立尼达和多巴哥:62,cur:库拉索:63,sur:苏里南:62,nic:尼加拉瓜:58,dom:多米尼加:57,cub:古巴:57',
 OFC:'nzl:新西兰:65,sol:所罗门群岛:50,fij:斐济:51,tah:塔希提:50,ncl:新喀里多尼亚:51,van:瓦努阿图:49,png:巴布亚新几内亚:48,sam:萨摩亚:40'
};
export const INTERNATIONAL_TEAMS=Object.entries(regions).flatMap(([confederation,rows])=>rows.split(',').map(row=>{const [id,name,value]=row.split(':');return {id,name,confederation,color:'#315781',secondary:'#eee6d1',...nationById(id),rating:+value,style:['balanced','press','counter'][id.charCodeAt(0)%3]}}));
export const internationalTeam=id=>INTERNATIONAL_TEAMS.find(n=>n.id===id);
export const nationalYear=s=>s.calendar?.startYear??2026+(s.history?.length??0);
export function nationalRandom(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return ()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
