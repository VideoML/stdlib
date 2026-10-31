import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEffectRegistry,mountEffect} from '../../src/effects/index.js';

test('placement is copied and frozen while seeks remain absolute',async()=>{
 const registry=createEffectRegistry(),seen=[],timings=[];let timing;
 registry.register({schemaVersion:1,id:'test/placement',version:'1',parametersSchema:{type:'object',additionalProperties:false}},()=>true,()=>({mount(_root,context){timing=context.timing;timings.push(timing)},async seek(frame){seen.push(frame)},dispose(){}}));
 const root={style:{},replaceChildren(){},querySelectorAll(){return []}};
 const config={id:'test/placement',version:'1',parameters:{},startFrame:7,endFrame:13};
 const supplied={startFrame:0,endFrame:999};const context={width:100,height:100,fps:24,seed:0,assets:{},timing:supplied};
 const controller=mountEffect(root,registry,config,context);
 const other=mountEffect({style:{},replaceChildren(){},querySelectorAll(){return []}},registry,config,context);
 assert.notEqual(timings[0],timings[1]);assert.deepEqual(timings[0],timings[1]);other.dispose();supplied.startFrame=55;supplied.endFrame=56;
 assert.deepEqual(timing,{startFrame:7,endFrame:13});assert.ok(Object.isFrozen(timing));
 config.startFrame=0;config.endFrame=99;
 for(const [frame,visibility] of [[6,'hidden'],[7,''],[12,''],[13,'hidden'],[7,''],[6,'hidden']]){await controller.seek(frame);assert.equal(root.style.visibility,visibility)}
 assert.deepEqual(seen,[6,7,12,13,7,6]);controller.dispose();
});

test('placement-relative sampling agrees across independently mounted partitions at 24 and 30 fps',async()=>{
 for(const fps of [24,30]){
  const startFrame=Math.floor(.31*fps),endFrame=Math.ceil(.54*fps),frames=[0,startFrame-1,startFrame,startFrame+1,endFrame-1,endFrame,endFrame+1];
  const registry=createEffectRegistry(),samples=[];
  const make=()=>{let timing;return {mount(_root,context){if(!context.timing)throw Error('EFFECT_TIMING_UNAVAILABLE');timing=context.timing},async seek(frame){samples.push({frame,localSeconds:(frame-timing.startFrame)/fps})},dispose(){}}};
  assert.throws(()=>make().mount({}, {width:100,height:100,fps,seed:0,assets:{}}),/EFFECT_TIMING_UNAVAILABLE/);
  registry.register({schemaVersion:1,id:'test/relative',version:'1',parametersSchema:{type:'object'}},()=>true,make);
  const context={width:100,height:100,fps,seed:0,assets:{}},config={id:'test/relative',version:'1',parameters:{},startFrame,endFrame};
  const mount=()=>mountEffect({style:{},replaceChildren(){},querySelectorAll(){return []}},registry,config,context);
  const full=mount();config.startFrame=0;config.endFrame=99;for(const frame of frames)await full.seek(frame);full.dispose();const expected=samples.splice(0);
  config.startFrame=startFrame;config.endFrame=endFrame;
  for(const partition of [frames.filter((_,i)=>i%2===0),frames.filter((_,i)=>i%2===1)]){const controller=mount();config.startFrame=0;config.endFrame=99;for(const frame of partition)await controller.seek(frame);controller.dispose();config.startFrame=startFrame;config.endFrame=endFrame;}
  const byFrame=new Map(samples.map(sample=>[sample.frame,sample.localSeconds]));assert.deepEqual(expected.map(({frame,localSeconds})=>[frame,localSeconds]),frames.map(frame=>[frame,byFrame.get(frame)]));
 }
});
