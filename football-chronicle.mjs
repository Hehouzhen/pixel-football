import {validAppearance} from './appearance.mjs';
import {getTeam} from './clubs.mjs';
import {fixtureDate} from './schedule.mjs';

export function halftimeReview(match){const total=match.attackChannels.reduce((a,b)=>a+b,0),peak=Math.max(...match.attackChannels),lane=match.attackChannels.indexOf(peak),dominated=total>=4&&peak/total>=.65;return {observation:dominated?`上半场 ${peak}/${total} 次向前传递经过${['上侧边路','中路','下侧边路'][lane]}。`:total?`上半场记录到 ${total} 次向前传递，尚未明显集中在单一通道。`:'向前传递样本较少，先观察接应与出球空间。',advice:match.opponentAdaptation?.type==='screen'?'先回做再转移，寻找另一侧接应；避免反复强传同一条线路。':match.opponentAdaptation?.type==='wide'?'保护禁区远点；夺球后观察对手边路压上留下的空间。':match.shots[0]===0?'增加持球人附近的短传接应，先创造一次清晰的射门机会。':match.score[0]<match.score[1]?'寻找向前跑动与直塞的配合，同时留住球后的保护。':'继续观察空当与体力，保持至少一名队友在球后接应。'}}

export function validSceneIdentity(value){return value===undefined||!!value&&typeof value.player?.name==='string'&&value.player.name.length<=120&&Number.isInteger(value.player.number)&&value.player.number>=1&&value.player.number<=99&&validAppearance(value.player.appearance)&&!!getTeam(value.team?.id)&&typeof value.team.name==='string'&&value.team.name.length<=120&&/^#[0-9a-f]{6}$/i.test(value.team.color)&&/^#[0-9a-f]{6}$/i.test(value.team.secondary)&&Number.isInteger(value.year)&&value.year>=1900&&value.year<=9999}
export function sceneIdentity(player,season){const team=getTeam(season.teamId);return {player:{id:player.id,name:player.name,number:player.number,appearance:structuredClone(player.appearance??{})},team:{id:season.teamId,name:season.teamNames?.[season.teamId]??team.name,color:team.color,secondary:team.secondary},year:season.calendar?.startYear??2026}}
export function matchChronicle(season,opponentId,competition='league',player=null){
 if(!season)return {title:'新的比赛，新的机会',detail:'观察对手的站位，找到适合自己的办法。'};
 const own=season.teamId,rows=[...(season.results??[]),...(season.cup?.results??[])],last=rows.filter(r=>(r.home===own&&r.away===opponentId)||(r.away===own&&r.home===opponentId)).sort((a,b)=>fixtureDate(season,a.competition??(a.phase?'cup':'league'),a.round??a.week??0,a.phase).localeCompare(fixtureDate(season,b.competition??(b.phase?'cup':'league'),b.round??b.week??0,b.phase))).at(-1),oldClub=player?.journey?.clubs?.slice(0,-1).includes(opponentId)||player?.journey?.homeTeamId===opponentId,oldMate=[player?.journey?.cast?.partnerId,player?.journey?.cast?.rivalId].some(id=>id&&season.squadIds?.[opponentId]?.includes(id)),lastScore=last&&(last.home===own?last.score:[...last.score].reverse()).join(' : ');
 if(competition==='cup'&&season.cup?.phase==='final')return {title:'今晚，争取属于我们的奖杯',detail:oldClub||oldMate?'熟悉的人与球场，也将见证这场决赛。结果由你们在场上的表现决定。':'这是决赛。比赛结果将写入球队与球员的赛季记录。'};
 if(oldClub||oldMate)return {title:oldClub?'重返熟悉的球场':'熟悉的人，新的对手',detail:last?`上次交锋 ${lastScore}。这一次的结果仍由比赛决定。`:'青训与职业路上的关系，将在这场比赛继续。'};
 if(competition==='cup'&&season.cup?.phase==='semi')return {title:'距离决赛，还有这一场',detail:'比赛结果将写入球队与球员的赛季记录。'};
 if(last)return {title:'再次交锋',detail:`上次：${last.home===own?'主场':'客场'} ${lastScore}。带着新的办法回到球场。`};
 return {title:'把这一场踢好',detail:'球队的排名与球员的机会，会随着实际比赛继续变化。'};
}
