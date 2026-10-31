import test from 'node:test';
import assert from 'node:assert/strict';
import {createBuiltinEffectRegistry} from '../../src/effects/xml.ts';
import {builtinSceneInputDescriptors} from '../../src/effects/scene-descriptors.ts';
const registry=createBuiltinEffectRegistry();
const config=(id,parameters={})=>({id:`videoml/${id}`,version:'1',parameters,startFrame:10,endFrame:154});
test('all five C001 builtins accept valid data and reject unknown properties',()=>{
 for(const id of ['agent-cursor','animated-bar-chart','arc-motion-path','ascii-trail-reveal','ascii-render-pass']){
  const params=id==='ascii-render-pass'?{sourceSceneId:'source',sourceFrame:0}:{};
  assert.ok(registry.create(config(id,params)));
  assert.throws(()=>registry.create(config(id,{...params,unknown:true})));
 }
});
test('ASCII requires an authored snapshot and advertises its exact dependency',()=>{
 assert.throws(()=>registry.create(config('ascii-render-pass',{})));
 assert.throws(()=>registry.create(config('ascii-render-pass',{sourceSceneId:'source',sourceFrame:-1})));
 assert.deepEqual(builtinSceneInputDescriptors.find(x=>x.id==='videoml/ascii-render-pass').sceneInputs,[{sceneIdParameter:'sourceSceneId',frameParameter:'sourceFrame'}]);
});
test('schemas enforce effect-specific option and numeric limits',()=>{
 assert.throws(()=>registry.create(config('ascii-trail-reveal',{trail_width:'huge'})));
 assert.throws(()=>registry.create(config('agent-cursor',{targets:'unsafe markup'})));
 assert.throws(()=>registry.create(config('animated-bar-chart',{bars:[1,2]})));
});
