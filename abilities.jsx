import React from 'react';
import {ABILITY_GROUPS,ABILITY_LABELS,ABILITY_HELP,skillValue,positionRating} from './ratings.mjs';

export function AbilityProfile({attributes,position=5,onTrain,trainingPoints=0}){
  return <div className="ability-profile" aria-label="球员能力"><p className="ability-overall">位置综合 <strong>{positionRating({position,attributes})}</strong><span>比赛按具体能力计算</span></p>{ABILITY_GROUPS.filter(group=>group.label!=='门将'||position===0).map(group=><section className="ability-category" key={group.label}><h4>{group.label}</h4>{group.fields.map(key=>{const value=Math.round(skillValue(attributes,key));return <div className="ability-rating" key={key}><span title={ABILITY_HELP[key]}>{ABILITY_LABELS[key]}</span><meter min="1" max="99" value={value} aria-label={ABILITY_LABELS[key]}/><b>{value}</b>{onTrain&&<button type="button" aria-label={`训练${ABILITY_LABELS[key]}`} disabled={!trainingPoints||value>=99} onClick={()=>onTrain(key)}>+1</button>}</div>})}</section>)}</div>;
}
export function AbilityEditor({attributes,onChange}){
  return <div className="ability-editor-groups">{ABILITY_GROUPS.map(group=><fieldset key={group.label}><legend>{group.label}</legend>{group.fields.map(key=><label key={key} title={ABILITY_HELP[key]}>{ABILITY_LABELS[key]}<input aria-label={`编辑${ABILITY_LABELS[key]}`} type="number" min="1" max="99" step="1" value={attributes[key]} onChange={event=>onChange(key,event.target.value)}/></label>)}</fieldset>)}</div>;
}
