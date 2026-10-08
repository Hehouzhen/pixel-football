import assert from 'node:assert/strict';
import {FIELD,Match} from './engine.mjs';

const make=(field,value)=>new Match({playerAttributes:Array.from({length:12},()=>({[field]:value}))});
const settle=value=>{const match=make('firstTouch',value);match.ball={x:0,y:0,z:0,vx:0,vy:0,vz:0,owner:null,lock:0,last:1,kind:'pass',source:null};match.takeBall(5);return match.players[5].settle};
assert.ok(settle(99)<settle(1),'first touch should shorten the receiver settle delay');

const stamina=value=>{const match=make('endurance',value);match.state='playing';match.wait=0;match.selected[0]=5;match.players[5].stamina=.5;match.step(.016,[{x:1,sprint:true},{}]);return match.players[5].stamina};
assert.ok(stamina(99)>stamina(1),'higher endurance should reduce sprint stamina drain');

const heading=value=>{const match=make('aerial',value),player=match.players[5];match.ball={x:player.x,y:player.y,z:20,vx:0,vy:0,vz:0,owner:null,lock:0,last:1,kind:'cross',source:null};assert.ok(match.aerial(5));return Math.hypot(match.ball.vx,match.ball.vy)};
assert.ok(heading(99)>heading(1),'aerial rating should improve heading power');
console.log('PASS: first touch, endurance and aerial skills affect live match outcomes.');
