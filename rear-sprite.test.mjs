import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rearPose,rearFacing,drawRearNumber} from './rear-sprite.mjs';

test('rear walking keeps a planted foot, alternates limbs, and differs from running',()=>{
 const walk=Array.from({length:6},(_,i)=>rearPose(4,i)),run=Array.from({length:6},(_,i)=>rearPose(1,i));
 assert(walk.every(p=>p.lift===0||p.otherLift===0));assert(walk.some(p=>p.arm<0)&&walk.some(p=>p.arm>0));
 assert(Math.max(...walk.map(p=>p.lift))<Math.max(...run.map(p=>p.lift)));assert.equal(rearPose(0,0).arm,0);assert(rearPose(3,4).raised>0);assert(rearPose(2,4).kick>0);
});

test('rear facing holds through the direction boundary without repeated flips',()=>{
 const player={dy:-.8};assert(rearFacing(player));for(const dy of [-.64,-.5,-.36,-.6]){player.dy=dy;assert(rearFacing(player))}player.dy=-.3;assert.equal(rearFacing(player),false);player.dy=-.5;assert.equal(rearFacing(player),false);
});

test('shirt numbers use integer pixel cells for single and double digits',()=>{
 for(const number of [1,10,27,99]){const cells=[],ctx={fillRect:(...cell)=>cells.push(cell)};drawRearNumber(ctx,number,32,37,1);assert(cells.length>0);assert(cells.every(cell=>cell.every(Number.isInteger)));assert(cells.every(([x,y])=>x>=28&&x<=35&&y>=37&&y<=41))}
});
