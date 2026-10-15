import React from 'react';
import {profileFor} from './opponent-profiles.mjs';
import {matchChronicle} from './football-chronicle.mjs';
import {halftimeReview} from './football-chronicle.mjs';

export function FixtureStory({season,opponentId,competition='league',player}){const story=matchChronicle(season,opponentId,competition,player);return <section className="fixture-story"><h4>{story.title}</h4><p>{story.detail}</p></section>}

export function HalftimeReview({match}){const review=halftimeReview(match);return <section className="halftime-review" aria-label="上半场观察"><h3>45 分钟，留下了什么</h3><p className="halftime-score">{match.teams[0]} {match.score.join(' : ')} {match.teams[1]}</p><div className="halftime-numbers"><span>射门 <b>{match.shots.join(' : ')}</b></span><span>射正 <b>{match.onTarget.join(' : ')}</b></span><span>传球尝试 <b>{match.passes.join(' : ')}</b></span></div><p>{review.observation}</p>{match.opponentAdaptation&&<p><strong>对手调整：</strong>{match.opponentAdaptation.note}<small>{match.opponentAdaptation.evidence}</small></p>}<p className="scout-opening">下半场可以尝试：{review.advice}</p><small>{match.careerIndex!==null?'你可以调整进攻配合；全队阵型与职责由教练决定。':'可在下方调整阵型、职责和进攻配合；调整不会改变球员能力。'}</small></section>}

export function OpponentScout({opponent,style='balanced',season,competition='league',player}){const profile=profileFor(opponent?.id??'赤焰联队',opponent?.style??style),story=matchChronicle(season,opponent?.id,competition,player);return <section className="opponent-scout"><div><h3>{story.title}</h3><p>{story.detail}</p></div><h4>对手观察 · {profile.name}</h4><ul>{profile.strengths.map(line=><li key={line}>{line}</li>)}</ul><p className="scout-opening">可以尝试：{profile.weakness}</p><small>根据球队的比赛计划观察，临场调整仍可能改变场面。</small></section>}
