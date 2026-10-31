import test from 'node:test';
import assert from 'node:assert/strict';
import {asciiPass} from '../../src/effects/catalog-c001/ascii-pass.ts';
function fakeCanvas(){const context={fillRect(){},drawImage(){},getImageData(){return {data:new Uint8ClampedArray(4*4*4).fill(200)}},fillText(){}};return {width:0,height:0,style:{},getContext(){return context}};}
test('exit followed by start resets opacity and translation before an early return',async()=>{
 let visible,closed=0;const root={ownerDocument:{createElement(tag){if(tag==='div')return {style:{},append(){}};const canvas=fakeCanvas();visible??=canvas;return canvas;}},append(){}};
 const effect=asciiPass({sourceSceneId:'source',sourceFrame:0,exit:'up'});
 await effect.mount(root,{width:4,height:4,fps:30,seed:0,assets:{},timing:{startFrame:30,endFrame:150},sceneSnapshots:{async capture(){return {bitmap:{width:4,height:4},close(){closed++;}};}}});
 assert.equal(closed,0);await effect.seek(149);assert.notEqual(visible.style.opacity,'1');assert.notEqual(visible.style.transform,'');const progress=((119/30)-(4-.45))/.45;assert.ok(Math.abs(Number(visible.style.opacity)-(1-progress**3))<1e-10);
 await effect.seek(30);assert.equal(visible.style.opacity,'1');assert.equal(visible.style.transform,'');
 await effect.seek(45);assert.equal(visible.style.opacity,'1');assert.equal(visible.style.transform,'');effect.dispose();assert.equal(closed,1);
});
test('mismatched snapshot dimensions fail closed and close the handle',async()=>{
 let closed=0;const root={ownerDocument:{createElement(tag){return tag==='div'?{style:{},append(){}}:fakeCanvas()}},append(){}};const effect=asciiPass({sourceSceneId:'source',sourceFrame:0});
 await assert.rejects(effect.mount(root,{width:4,height:4,fps:30,seed:0,assets:{},timing:{startFrame:0,endFrame:120},sceneSnapshots:{async capture(){return {bitmap:{width:3,height:4},close(){closed++;}};}}}),/bitmap dimensions/);
 assert.equal(closed,1);effect.dispose();assert.equal(closed,1);
});
test('cancellation closes a late snapshot and never retains it',async()=>{
 let resolve,closed=0,started;const entered=new Promise(r=>started=r);
 const root={ownerDocument:{createElement(tag){return tag==='div'?{style:{},append(){}}:fakeCanvas()}},append(){}};
 const effect=asciiPass({sourceSceneId:'source',sourceFrame:0});
 const mounting=effect.mount(root,{width:4,height:4,fps:30,seed:0,assets:{},timing:{startFrame:0,endFrame:120},sceneSnapshots:{capture(){started();return new Promise(r=>resolve=r);}}});
 await entered;effect.cancel();await assert.rejects(mounting,/SCENE_CAPTURE_CANCELLED/);
 resolve({bitmap:{width:4,height:4},close(){closed++;}});await new Promise(r=>setImmediate(r));
 assert.equal(closed,1);effect.dispose();assert.equal(closed,1);
});
