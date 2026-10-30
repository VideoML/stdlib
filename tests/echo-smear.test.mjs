import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bakeTrajectory,echoesAt,createTrajectoryCache} from '../src/effects/echo-smear/trajectory.ts';
const source=t=>({x:100*t,y:80*Math.sin(Math.PI*t),rotation:Math.PI*t,scale:1,opacity:1});
test('baked curved spinning paths reproduce past poses independently of seek order',()=>{
 const track=bakeTrajectory({duration:2,fps:30,subframes:8},source);
 const options={length:100,threshold:1,countMult:1,maxEchoes:60,edgeSpacing:1.5,width:100,height:50};
 const times=[.25,.5,1,1.5];const expected=times.map(t=>echoesAt(track,t,options));
 for(const i of [3,0,2,1,3])assert.deepEqual(echoesAt(track,times[i],options),expected[i]);
 assert.ok(expected[1].length>0);assert.ok(expected[1][0].y>0);assert.ok(expected[1][0].rotation>0);
 assert.ok(expected[1][0].x < source(.5).x);
});
test('a paused object produces no echoes',()=>{
 const track=bakeTrajectory({duration:2,fps:30,subframes:8},t=>source(Math.min(t,.5)));
 assert.equal(echoesAt(track,1,{length:100,threshold:1,countMult:1,maxEchoes:60,edgeSpacing:1.5,width:100,height:50}).length,0);
});
test('oversized or invalid tracks fail before invoking the sampler',()=>{
 let calls=0;assert.throws(()=>bakeTrajectory({duration:10000,fps:120,subframes:8},()=>{calls++;return source(0)}),/limit/i);assert.equal(calls,0);
 assert.throws(()=>bakeTrajectory({duration:NaN,fps:30,subframes:8},source),/invalid/i);
});
test('a parameter edit invalidates the cached trajectory',()=>{
 const cache=createTrajectoryCache();let count=0;const build=()=>{count++;return bakeTrajectory({duration:1,fps:30,subframes:2},source)};
 const first=cache.get({amplitude:4,nested:{speed:2}},build);assert.equal(cache.get({nested:{speed:2},amplitude:4},build),first);assert.notEqual(cache.get({amplitude:5,nested:{speed:2}},build),first);assert.equal(count,2);
});

test('final non-integral sample time resolves the exact endpoint',()=>{
 const track=bakeTrajectory({duration:.105,fps:30,subframes:2},t=>({x:t,y:0,rotation:0,scale:1,opacity:1}));
 assert.equal(track.at(.105).x,.105);assert.ok(Math.abs(track.at(.1).x-.1)<1e-12);
});

test('spinning around a noncentral measure point produces bounded echoes',()=>{
 const track=bakeTrajectory({duration:1,fps:30,subframes:8},t=>({x:0,y:0,rotation:t*12,scale:1,opacity:1}));
 const options={length:100,threshold:.1,countMult:1,maxEchoes:12,edgeSpacing:1,width:120,height:60,measurePoint:[0,0]};
 assert.ok(echoesAt(track,.5,options).length>0);assert.ok(echoesAt(track,.5,options).length<=12);
});

test('registry exposes animated echo effect and rejects invalid motion',async()=>{
 const {registerEchoSmear}=await import('../src/effects/echo-smear/index.ts');const {createEffectRegistry}=await import('../src/effects/index.ts');const registry=createEffectRegistry();registerEchoSmear(registry);
 assert.ok(registry.create({id:'videoml/echo-smear',version:'1',parameters:{},startFrame:0,endFrame:120}));
 assert.throws(()=>registry.create({id:'videoml/echo-smear',version:'1',parameters:{maxEchoes:1000},startFrame:0,endFrame:120}),/Invalid parameters/);
});

test('cubic keyframes curve, spin and hold before moving again',async()=>{
 const {sampleKeyframes}=await import('../src/effects/echo-smear/index.ts');const frames=[{time:0,x:0,y:0,rotation:0,control1:[0,100],control2:[100,100]},{time:1,x:100,y:0,rotation:Math.PI,hold:true},{time:2,x:200,y:0,rotation:2*Math.PI}];
 const mid=sampleKeyframes(frames,.5);assert.equal(mid.x,50);assert.equal(mid.y,75);assert.equal(mid.rotation,Math.PI/2);assert.equal(sampleKeyframes(frames,1.5).x,100);assert.equal(sampleKeyframes(frames,2).x,200);
});

test('replacing motion rebakes before next seek and disposal prevents further drawing',async()=>{
 const {createEchoSmear}=await import('../src/effects/echo-smear/index.ts');let calls=0,draws=0,cleared=0;
 const canvas=()=>({width:0,height:0,getContext(){return {clearRect(){},drawImage(){},save(){},restore(){},globalCompositeOperation:'source-over'}}});const root={ownerDocument:{createElement:canvas},append(){},replaceChildren(){cleared++}};
 const motion=distance=>({durationSec:1,revision:{distance},sample:t=>{calls++;return {x:t*distance,y:0,rotation:0,scale:1,opacity:1}},draw(){draws++}});
 const effect=createEchoSmear(motion(100),{threshold:0});effect.mount(root,{width:640,height:360,fps:30,seed:0,assets:{}});const original=calls;await effect.seek(5);assert.equal(calls,original);effect.updateMotion(motion(200));await effect.seek(5);assert.ok(calls>original);const last=draws;effect.cancel();effect.dispose();await assert.rejects(effect.seek(6),/disposed/);assert.equal(draws,last);assert.equal(cleared,1);
});

test('non-default duration scales the default motion instead of rejecting it',async()=>{
 const {registerEchoSmear}=await import('../src/effects/echo-smear/index.ts');const {createEffectRegistry}=await import('../src/effects/index.ts');const registry=createEffectRegistry();registerEchoSmear(registry);
 assert.ok(registry.create({id:'videoml/echo-smear',version:'1',parameters:{durationSec:2},startFrame:0,endFrame:60}));
});

test('oversized canvases are rejected before any canvas is created',async()=>{
 const {createEchoSmear}=await import('../src/effects/echo-smear/index.ts');let created=0;const effect=createEchoSmear({durationSec:1,revision:{},sample:source,draw(){}});
 const root={ownerDocument:{createElement(){created++;return {}}},append(){}};
 assert.throws(()=>effect.mount(root,{width:4096,height:4096,fps:30,seed:0,assets:{}}),/memory limit/);assert.equal(created,0);
});

test('continuous full-turn rotations preserve spin through angle wrap boundaries',()=>{
 const track=bakeTrajectory({duration:1,fps:30,subframes:8},t=>({x:0,y:0,rotation:4*Math.PI*t,scale:1,opacity:1}));
 assert.ok(Math.abs(track.at(.25).rotation-Math.PI)<1e-12);assert.ok(Math.abs(track.at(.75).rotation-3*Math.PI)<1e-12);
 const opts={length:100,threshold:.1,countMult:1,maxEchoes:60,edgeSpacing:1,width:100,height:100,measurePoint:[0,0]};
 for(const t of [.249,.251,.499,.501])assert.ok(echoesAt(track,t,opts).length>0);
});

test('direct effect seeks reject invalid absolute frames',async()=>{
 const {createEchoSmear}=await import('../src/effects/echo-smear/index.ts');const effect=createEchoSmear({durationSec:1,revision:{},sample:source,draw(){}});
 for(const frame of [-1,.5,Infinity])await assert.rejects(effect.seek(frame),/frame/i);
});

test('off-grid held keyframe remains frozen until its exact jump boundary',async()=>{
 const {sampleKeyframes}=await import('../src/effects/echo-smear/index.ts');
 const frames=[{time:0,x:0,y:0,hold:true},{time:.517,x:100,y:0},{time:1,x:200,y:0}];
 const track=bakeTrajectory({duration:1,fps:30,subframes:8,discontinuities:[.517]},t=>sampleKeyframes(frames,t));
 assert.equal(track.at(.5169).x,0);assert.equal(track.at(.517).x,100);assert.ok(track.at(.518).x>100);
});

test('DOM transforms preserve skew and individual transforms and reject invalid values',async()=>{
 const {resolveTransform}=await import('../src/effects/echo-smear/dom.ts');
 const combined=resolveTransform('matrix(1, 0.5, 0.25, 1, 7, 9)','10px 20px','90deg','2 1',[100,50]);
 assert.ok(Math.abs(combined.matrix[4]-1)<1e-10);assert.ok(Math.abs(combined.matrix[5]-34)<1e-10);
 assert.equal(resolveTransform('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,3,4,0,1)','none','none','none',[10,10]).threeDimensional,true);
 assert.throws(()=>resolveTransform('bogus','none','none','none',[10,10]),/transform/i);
});

test('SVG clone-local references are rewritten without changing external references',async()=>{
 const {rewriteReference}=await import('../src/effects/echo-smear/dom.ts');const ids=new Map([['grad','echo-1-grad'],['shape','echo-1-shape']]);
 assert.equal(rewriteReference('url(#grad)',ids),'url(#echo-1-grad)');assert.equal(rewriteReference('#shape',ids),'#echo-1-shape');assert.equal(rewriteReference('url(https://example.com/a)',ids),'url(https://example.com/a)');
});

test('DOM bake cancellation aborts sampler and synchronously restores target state',async()=>{
 const {attachDomEchoSmear}=await import('../src/effects/echo-smear/dom.ts');let started,restores=0,aborted=false;const waiting=new Promise(r=>started=r);
 const target={querySelectorAll(){return []},parentNode:{},ownerSVGElement:null};
 const driver={duration:1,fps:30,capture(){return {time:.25,state:'original'}},restore(state){assert.equal(state,'original');restores++},seek(_time,signal){started();signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{})}};
 const handle=attachDomEchoSmear([target],driver,{});await waiting;handle.dispose();await assert.rejects(handle.ready,/disposed/);assert.ok(aborted);assert.ok(restores>=1);
});

test('DOM adapter rejects target and sampling budgets before sampling',async()=>{
 const {attachDomEchoSmear}=await import('../src/effects/echo-smear/dom.ts');let calls=0;const driver={duration:30,fps:120,capture(){return {time:0,state:null}},restore(){},async seek(){calls++}};const target={querySelectorAll(){return []},parentNode:{},ownerSVGElement:null};
 assert.throws(()=>attachDomEchoSmear(Array(9).fill(target),driver,{}),/limit/i);assert.equal(calls,0);
});

test('an abandoned sampler cannot publish ghosts after late settlement',async()=>{
 const {attachDomEchoSmear}=await import('../src/effects/echo-smear/dom.ts');let started,resolveSeek,restored=0,created=0;const waiting=new Promise(r=>started=r);
 const target={querySelectorAll(){return []},parentNode:{insertBefore(){created++}},ownerSVGElement:null};
 const driver={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){restored++},seek(){started();return new Promise(r=>resolveSeek=r)}};
 const handle=attachDomEchoSmear([target],driver,{});await waiting;handle.cancel();await assert.rejects(handle.ready,/disposed/);resolveSeek();await new Promise(r=>setTimeout(r,0));assert.equal(created,0);assert.ok(restored>0);
});

test('sample count limits include explicit discontinuity knots before sampling',()=>{
 let calls=0;const knots=Array.from({length:100},(_,i)=>(i+1)/101);
 assert.throws(()=>bakeTrajectory({duration:30,fps:120,subframes:8,discontinuities:knots},()=>{calls++;return source(0)}),/limit/i);assert.equal(calls,0);
});

test('SVG clone references preserve definitions under per-clone IDs',async()=>{
 const {rewriteCloneReferences}=await import('../src/effects/echo-smear/dom.ts');
 function node(values,children=[]){return {values,children,get attributes(){return Object.entries(this.values).map(([name,value])=>({name,value}))},getAttribute(k){return this.values[k]??null},setAttribute(k,v){this.values[k]=v},removeAttribute(k){delete this.values[k]},querySelectorAll(){return this.children}}}
 const grad=node({id:'paint'}),shape=node({id:'shape'}),use=node({href:'#shape',fill:'url(#paint)','clip-path':'url(#clip)'}),root=node({id:'root'},[grad,shape,use]);
 rewriteCloneReferences(root,'ghost');assert.equal(grad.values.id,'ghost-paint');assert.equal(shape.values.id,'ghost-shape');assert.equal(use.values.href,'#ghost-shape');assert.equal(use.values.fill,'url(#ghost-paint)');assert.equal(use.values['clip-path'],'url(#clip)');
});

test('canvas and video freeze to inert pixels and tainted media fail explicitly',async()=>{
 const {freezeDomTarget}=await import('../src/effects/echo-smear/dom.ts');let tainted=false,draws=0;
 const style=()=>({cssText:'',setProperty(){},removeProperty(){}}),clone=tag=>({localName:tag,style:style(),querySelectorAll(){return []}}),doc={defaultView:{getComputedStyle(){return {length:0,item(){},getPropertyValue(){return ''},getPropertyPriority(){return ''}}}},createElement(tag){if(tag==='canvas')return {width:0,height:0,getContext(){return {drawImage(){draws++}}},toDataURL(){if(tainted)throw Error('tainted');return 'data:image/png;base64,AA=='}};return clone(tag)}};
 function media(tag){return {localName:tag,ownerDocument:doc,width:32,height:32,videoWidth:32,videoHeight:32,readyState:2,querySelectorAll(){return []},cloneNode(){return clone(tag)}}}
 for(const tag of ['canvas','video']){const image=freezeDomTarget(media(tag));assert.equal(image.localName,'img');assert.equal(image.src,'data:image/png;base64,AA==');}assert.equal(draws,2);
 tainted=true;assert.throws(()=>freezeDomTarget(media('canvas')),/tainted/i);const unavailable=media('video');unavailable.readyState=0;assert.throws(()=>freezeDomTarget(unavailable),/unavailable/i);
});

test('oversized frozen media fails within the shared snapshot budget',async()=>{
 const {freezeDomTarget}=await import('../src/effects/echo-smear/dom.ts');const style=()=>({cssText:'',setProperty(){},removeProperty(){}});const clone=tag=>({localName:tag,style:style(),querySelectorAll(){return []}});const doc={defaultView:{getComputedStyle(){return {length:0,item(){},getPropertyValue(){return ''},getPropertyPriority(){return ''}}}},createElement(tag){if(tag==='canvas')return {width:0,height:0,getContext(){return {drawImage(){}}},toDataURL(){return 'data:image/png;base64,'+'A'.repeat(500)}};return clone(tag)}};const canvas={localName:'canvas',ownerDocument:doc,width:32,height:32,querySelectorAll(){return []},cloneNode(){return clone('canvas')}};
 assert.throws(()=>freezeDomTarget(canvas,{used:0,limit:128}),/memory limit/i);
});

test('DOM update cannot restart sampling after disposal during its wait',async()=>{
 const {attachDomEchoSmear}=await import('../src/effects/echo-smear/dom.ts');let started,nextCalls=0,groups=0;const waiting=new Promise(r=>started=r),target={querySelectorAll(){return []},parentNode:{insertBefore(){groups++}},ownerSVGElement:null};
 const old={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){},seek(){started();return new Promise(()=>{})}};
 const next={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){},seek(){nextCalls++;throw Error('unexpected post-dispose seek')}};
 const handle=attachDomEchoSmear([target],old,{});await waiting;const update=handle.update(next,'new');handle.dispose();await assert.rejects(update,/disposed/i);assert.equal(nextCalls,0);assert.equal(groups,0);
});

test('competing DOM updates fence the stale update before it samples',async()=>{
 const {attachDomEchoSmear}=await import('../src/effects/echo-smear/dom.ts');let started,firstCalls=0,secondCalls=0,groups=0;const waiting=new Promise(r=>started=r),target={querySelectorAll(){return []},parentNode:{insertBefore(){groups++}},ownerSVGElement:null};
 const old={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){},seek(){started();return new Promise(()=>{})}};
 const first={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){},seek(){firstCalls++;throw Error('stale sampled')}};
 const second={duration:1,fps:30,capture(){return {time:0,state:0}},restore(){},seek(){secondCalls++;throw Error('latest sampled')}};
 const handle=attachDomEchoSmear([target],old,{});await waiting;const a=handle.update(first,'first'),b=handle.update(second,'second');await assert.rejects(a,/superseded/i);await assert.rejects(b,/latest sampled/i);assert.equal(firstCalls,0);assert.equal(secondCalls,1);assert.equal(groups,0);handle.dispose();
});
