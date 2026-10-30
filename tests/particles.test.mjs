import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildImageParticles,buildTextParticles,particleState} from '../src/effects/particles/particles.ts';
import {createEffectRegistry} from '../src/effects/index.ts';
import {registerParticleEffects} from '../src/effects/particles/index.ts';

test('seeded particle tables are reproducible and directions shape target schedules',()=>{
 const a=buildImageParticles(320,640,360,0,'ltr');
 assert.deepEqual(a,buildImageParticles(320,640,360,0,'ltr'));
 assert.notDeepEqual(a,buildImageParticles(320,640,360,1,'ltr'));
 assert.notDeepEqual(a,buildImageParticles(320,640,360,0,'center'));
});
test('text targets come only from opaque glyph raster cells',()=>{
 const pixels=new Uint8ClampedArray(16*16*4);pixels[(4*16+6)*4+3]=255;pixels[(10*16+12)*4+3]=255;
 const particles=buildTextParticles(pixels,16,16,1,0,100);
 assert.deepEqual(particles.map(p=>[p.tx,p.ty]),[[6,4],[12,10]]);
});
test('particle state is a pure function of absolute progress in any seek order',()=>{
 const particle=buildImageParticles(1,640,360,0,'ltr')[0];
 const expected=[0,.3,.6,1].map(p=>particleState(particle,p,'in'));
 for(const i of [3,1,2,0,1]) assert.deepEqual(particleState(particle,[0,.3,.6,1][i],'in'),expected[i]);
 assert.equal(expected[3].alpha,0);
});
test('registered particle effects reject missing required assets',async()=>{
 const registry=createEffectRegistry();registerParticleEffects(registry);
 for(const id of ['particle-text-dissolve','particle-image-reveal']){
  const effect=registry.create({id:`videoml/${id}`,version:'1',parameters:{},startFrame:0,endFrame:120});
  await assert.rejects(Promise.resolve().then(()=>effect.mount({}, {width:640,height:360,fps:30,seed:0,assets:{}})),/asset/i);
 }
});

for(const kind of ['text','image']) test(`disposing a ${kind} effect cancels unresolved asset loading`,async()=>{
 let rejectAsset,entered;const started=new Promise(r=>entered=r),pending=new Promise((_,r)=>rejectAsset=r),previousFont=globalThis.FontFace;
 const fonts={add(){throw Error('late mutation')},delete(){}};
 class FakeFont {load(){entered();return pending}}
 globalThis.FontFace=FakeFont;
 function makeElement(tag){return {style:{},append(){},replaceChildren(){},set src(_value){},decode(){entered();return pending},getContext(){return null}};}
 const doc={fonts,createElement:makeElement};let cleared=0;const host={ownerDocument:doc,append(){},replaceChildren(){cleared++}};
 const registry=createEffectRegistry();registerParticleEffects(registry);const id=kind==='text'?'particle-text-dissolve':'particle-image-reveal';const effect=registry.create({id:`videoml/${id}`,version:'1',parameters:{},startFrame:0,endFrame:120});
 try {const mount=effect.mount(host,{width:640,height:360,fps:30,seed:0,assets:{font:'data:font/woff2;base64,AA==',image:'data:image/svg+xml;base64,AA=='}});await started;effect.cancel();await assert.rejects(mount,/disposed/);effect.dispose();rejectAsset(Error('late rejection'));await new Promise(r=>setTimeout(r,0));assert.equal(cleared,1);} finally {globalThis.FontFace=previousFont;}
});

test('parameter validation rejects unknown directions and density before mounting',()=>{
 const registry=createEffectRegistry();registerParticleEffects(registry);
 for(const [id,parameters] of [['particle-text-dissolve',{direction:'center'}],['particle-image-reveal',{density:'huge'}]]) assert.throws(()=>registry.create({id:`videoml/${id}`,version:'1',parameters,startFrame:0,endFrame:120}),/Invalid parameters/);
});

test('unresolved or active URL assets fail before any load',async()=>{
 const registry=createEffectRegistry();registerParticleEffects(registry);
 for(const source of ['https://example.com/a.png','file:///tmp/a','javascript:alert(1)','/relative/path']) {
  const effect=registry.create({id:'videoml/particle-image-reveal',version:'1',parameters:{},startFrame:0,endFrame:120});
  await assert.rejects(effect.mount({}, {width:640,height:360,fps:30,seed:0,assets:{image:source}}),/resolved.*asset/i);
 }
});

test('exit envelope holds and then fades or rises without seek history',async()=>{
 const {resolveEnvelope}=await import('../src/effects/particles/particles.ts');
 assert.deepEqual(resolveEnvelope(4,4,'none'),{progress:1,opacity:1,offset:0});
 assert.deepEqual(resolveEnvelope(3,4,'fade'),{progress:1,opacity:1,offset:0});
 const fade=resolveEnvelope(3.775,4,'fade');assert.ok(fade.opacity<1 && fade.opacity>0);assert.equal(fade.offset,0);
 const up=resolveEnvelope(3.775,4,'up');assert.equal(up.opacity,fade.opacity);assert.ok(up.offset<0);
 assert.deepEqual(resolveEnvelope(4,4,'up'),{progress:1,opacity:0,offset:-.04});
 assert.deepEqual(resolveEnvelope(3.775,4,'up'),up);
 assert.equal(resolveEnvelope(2,2,'fade').opacity,0);
});

test('particle descriptors accept only supported exit choices',()=>{
 const registry=createEffectRegistry();registerParticleEffects(registry);
 for(const id of ['particle-text-dissolve','particle-image-reveal']) {
  for(const exit of ['none','fade','up']) assert.ok(registry.create({id:`videoml/${id}`,version:'1',parameters:{exit},startFrame:0,endFrame:120}));
  assert.throws(()=>registry.create({id:`videoml/${id}`,version:'1',parameters:{exit:'spin'},startFrame:0,endFrame:120}),/Invalid parameters/);
 }
});

test('font face receives resolved bytes instead of an interpolated CSS URL',async()=>{
 const previousFont=globalThis.FontFace,previousFetch=globalThis.fetch;let received,enter;const started=new Promise(r=>enter=r),pending=new Promise(()=>{});
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer});
 globalThis.FontFace=class {constructor(_family,source){received=source}load(){enter();return pending}};
 const node={style:{},append(){},getContext(){return null}};const doc={fonts:{delete(){}},createElement(){return {...node}}};const host={ownerDocument:doc,append(){},replaceChildren(){}};
 const registry=createEffectRegistry();registerParticleEffects(registry);const effect=registry.create({id:'videoml/particle-text-dissolve',version:'1',parameters:{},startFrame:0,endFrame:120});
 try{const mount=effect.mount(host,{width:100,height:100,fps:30,seed:0,assets:{font:'data:font/woff2;base64,AQID'}});await started;assert.ok(received instanceof ArrayBuffer);effect.cancel();await assert.rejects(mount,/disposed/);effect.dispose();}finally{globalThis.FontFace=previousFont;globalThis.fetch=previousFetch;}
});
