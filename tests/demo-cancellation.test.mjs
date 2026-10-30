import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEffectRegistry,mountEffect} from '../src/effects/index.ts';
import {DrawWaiters} from '../src/demos/engines/draw-waiters.ts';
test('pending draw rejects on cancellation or draw failure',async()=>{
 const w=new DrawWaiters();let pending=w.next();w.fail(Error('draw failed'));await assert.rejects(pending,/draw failed/);await assert.rejects(w.next(),/draw failed/);
 const v=new DrawWaiters();pending=v.next();v.fail(Error('disposed'));await assert.rejects(pending,/disposed/);
});
test('controller cancellation breaks pending seek before disposal',async()=>{
 let disposed=0, started;const running=new Promise(resolve=>started=resolve);const w=new DrawWaiters();
 const registry=createEffectRegistry();registry.register({schemaVersion:1,id:'test',version:'1',parametersSchema:{}},()=>true,()=>({mount(){},async seek(){started();await w.next()},cancel(){w.fail(Error('cancelled'))},dispose(){disposed++}}));
 const root={style:{},replaceChildren(){}};const c=mountEffect(root,registry,{id:'test',version:'1',parameters:{},startFrame:0,endFrame:2},{width:10,height:10,fps:30,seed:0,assets:{}});
 const seek=c.seek(1);await running;c.dispose();await assert.rejects(seek,/cancelled|disposed/);assert.equal(disposed,1);
});
test('cancelled draw does not wait for a stalled redraw promise',async()=>{
 const w=new DrawWaiters();const stalled=new Promise(()=>{});const draw=w.next();const seek=Promise.all([stalled,draw]);
 w.fail(Error('disposed'));await assert.rejects(seek,/disposed/);
});

test('disposing a pending initialization releases each animation engine',async()=>{
 const {LottieBase}=await import('../src/demos/engines/LottieBase.tsx');
 const {AnimeJsBase}=await import('../src/demos/engines/AnimeJsBase.tsx');
 for(const Base of [LottieBase,AnimeJsBase]) {
  const instance=new (class extends Base {})({});
  let cleaned=0, started;
  const running=new Promise(resolve=>started=resolve);
  if(Base===LottieBase) instance.animation={destroy(){cleaned++}};
  else instance.timeline={pause(){cleaned++}};
  const registry=createEffectRegistry();
  registry.register({schemaVersion:1,id:'engine',version:'1',parametersSchema:{}},()=>true,()=>({
   mount(){}, async seek(){started();await instance.ready},
   cancel(){instance.cancel();instance.cancel()}, dispose(){instance.componentWillUnmount()},
  }));
  const root={style:{},replaceChildren(){}};
  const controller=mountEffect(root,registry,{id:'engine',version:'1',parameters:{},startFrame:0,endFrame:2},{width:10,height:10,fps:30,seed:0,assets:{}});
  const seek=controller.seek(1);await running;controller.dispose();
  await assert.rejects(seek,/disposed/);
  assert.equal(cleaned,1);
 }
});

test('anime layout seeks without autoplay and releases its timeline on unmount',async()=>{
 const {AnimeHarnessDemoComponent}=await import('../src/demos/AnimeHarnessDemo.tsx');
 const component=new AnimeHarnessDemoComponent({});
 const host={dataset:{},querySelectorAll(){return [{},{},{},{}]}};
 let options, sought, pauses=0, reverts=0;
 const layout={revert(){reverts++},record(){},update(change,params){options=params;change({root:host});return {seek(ms){sought=ms},pause(){pauses++}}}};
 const wrapper=component.buildTimeline({anime:{createLayout(){return layout},stagger(){return 0}},root:{querySelector(){return host}},fps:30,width:10,height:10});
 component.timeline=wrapper;
 wrapper.seek(200);
 assert.equal(options.autoplay,false);
 assert.equal(sought,200);
 component.componentWillUnmount();
 assert.equal(pauses,1);
 assert.equal(reverts,2);
 await assert.rejects(component.ready,/disposed/);
});

for(const stalledAsset of ['font','image']) test(`disposing a seek cancels stalled ${stalledAsset} readiness`,async()=>{
 let rejectAsset, started, disposed=0, clears=0;
 const waiting=new Promise(resolve=>started=resolve);
 const stalled=new Promise((_,reject)=>rejectAsset=reject);
 const previousDocument=globalThis.document;
 const image={decode(){started();return stalled}};
 const root={style:{},querySelectorAll(){return [image]},replaceChildren(){clears++}};
 globalThis.document={fonts:{get ready(){if(stalledAsset==='font'){started();return stalled}return Promise.resolve()}}};
 const registry=createEffectRegistry();registry.register({schemaVersion:1,id:'asset',version:'1',parametersSchema:{}},()=>true,()=>({mount(){},async seek(){},dispose(){disposed++}}));
 try {
  const controller=mountEffect(root,registry,{id:'asset',version:'1',parameters:{},startFrame:0,endFrame:2},{width:10,height:10,fps:30,seed:0,assets:{}});
  const seek=controller.seek(1);await waiting;controller.dispose();
  await assert.rejects(Promise.race([seek,new Promise((_,reject)=>setTimeout(()=>reject(Error('cancellation timed out')),200))]),/disposed/);
  assert.equal(disposed,1);assert.equal(clears,1);
  rejectAsset(Error('late asset failure'));await new Promise(resolve=>setTimeout(resolve,0));assert.equal(clears,1);
 } finally {globalThis.document=previousDocument}
});
