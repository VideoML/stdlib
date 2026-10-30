import { test } from 'node:test';
import assert from 'node:assert/strict';
import {getSharedDemo} from '../src/demos/index.ts';
test('seven legacy demo names resolve to shared implementations',()=>{
 for(const name of ['AnimeHarnessDemo','ThreeOrbit','LottieBadge','D3BarChart','P5Particles','TextEffects','MixAndMatchDemo']) {
  const component=getSharedDemo(name);
  assert.ok(typeof component==='function' || component?.$$typeof===Symbol.for('react.forward_ref'),name);
 }
 assert.equal(getSharedDemo('unknown'),undefined);
});

test('shared demo descriptors validate parameters before instantiation',async()=>{
 const {createEffectRegistry}=await import('../src/effects/index.ts');
 const {registerSharedDemos}=await import('../src/demos/index.ts');
 const registry=createEffectRegistry();registerSharedDemos(registry);
 const config={id:'videoml/demo/TextEffects',version:'1',parameters:{text:'Hello',effect:{effect:'fade_up'}},startFrame:0,endFrame:60};
 assert.ok(registry.create(config));
 assert.throws(()=>registry.create({...config,parameters:{text:17,effect:{effect:'fade_up'}}}),/Invalid parameters/);
 assert.throws(()=>registry.create({...config,id:'videoml/demo/missing'}),/Unknown effect/);
});
