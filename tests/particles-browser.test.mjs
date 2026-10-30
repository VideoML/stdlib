import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(join(resolve(process.env.P09_DEPS_ROOT),'package.json'));
const {chromium}=require('playwright');const {build}=require('esbuild');
const output=resolve(process.env.P09_OUTPUT);const binary=process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH;
const frames=[0,1,42,83,84,119];
for(const [effect,direction] of [['particle-text-dissolve','in'],['particle-text-dissolve','out'],['particle-image-reveal','ltr'],['particle-image-reveal','center']]) test(`${effect} ${direction} has deterministic offline frame seeks`,async()=>{
 const label=`${effect}-${direction}`,folder=join(output,label),bundle=join(folder,'fixture.js');await mkdir(folder,{recursive:true});
 await build({entryPoints:['tests/particles-conformance-entry.ts'],outfile:bundle,bundle:true,platform:'browser',format:'iife',define:{EFFECT:JSON.stringify(effect)},loader:{'.woff2':'dataurl','.svg':'dataurl'},logLevel:'silent'});
 const source=await readFile(bundle,'utf8'),browser=await chromium.launch({executablePath:binary});let requests=[];
 async function worker(parameters={direction}){const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});const page=await context.newPage();page.on('request',r=>{if(/^https?:/i.test(r.url())) requests.push(r.url())});await page.setContent('<!doctype html><style>html,body{margin:0}</style><div id="root"></div>');await page.addScriptTag({content:source});await page.evaluate(parameters=>{window.__particleParameters=parameters;window.fixture.mount(document.querySelector('#root'),{width:1280,height:720,fps:30,seed:0,assets:{}})},parameters);return {context,page};}
 async function digest(page,png){const data=await page.evaluate(async base64=>{const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text)},png.toString('base64'));return createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');}
 const w=await worker();try {
  const baseline=new Map();for(const frame of frames){await w.page.evaluate(f=>window.fixture.seek(f),frame);const png=await w.page.screenshot();baseline.set(frame,await digest(w.page,png));await writeFile(join(folder,`frame-${frame}.png`),png);}
  for(const order of [frames,[...frames].reverse(),[42,0,119,1,84,83]])for(const frame of order){await w.page.evaluate(f=>window.fixture.seek(f),frame);assert.equal(await digest(w.page,await w.page.screenshot()),baseline.get(frame),`frame ${frame}`);}
  for(const group of [frames.filter((_,i)=>i%2===0),frames.filter((_,i)=>i%2===1)]){const partition=await worker();try{for(const frame of group){await partition.page.evaluate(f=>window.fixture.seek(f),frame);const capture=await partition.page.screenshot();const actual=await digest(partition.page,capture);if(actual!==baseline.get(frame))await writeFile(join(folder,`partition-diff-${frame}.png`),capture);assert.equal(actual,baseline.get(frame),`partition frame ${frame}`);}}finally{await partition.page.evaluate(()=>window.fixture.dispose());await partition.context.close();}}
  for(const exit of ['fade','up']){const e=await worker({direction,exit});try{for(const frame of [106,107,119,120]){await e.page.evaluate(f=>window.fixture.seek(f),frame);const state=await e.page.evaluate(()=>({opacity:Number(document.querySelector('#root>div').style.opacity),transform:document.querySelector('#root>div').style.transform}));if(frame===106)assert.equal(state.opacity,1);if(frame===120)assert.equal(state.opacity,0);if(exit==='up'&&frame===120)assert.match(state.transform,/-28\.8px/);if(exit==='fade')assert.match(state.transform,/0px/);await writeFile(join(folder,`${exit}-frame-${frame}.png`),await e.page.screenshot());}}finally{await e.page.evaluate(()=>window.fixture.dispose());await e.context.close();}}
  assert.deepEqual(requests,[],'no network requests');await w.page.evaluate(()=>window.fixture.dispose());
 } finally {await w.context.close();await browser.close();}
});

test('browser rejects missing assets and releases stalled loaders without late mutations',async()=>{
 const folder=join(output,'lifecycle');await mkdir(folder,{recursive:true});const browser=await chromium.launch({executablePath:binary});
 try {for(const [effect,kind] of [['particle-text-dissolve','font'],['particle-image-reveal','image']]){
  const bundle=join(folder,`${kind}.js`);await build({entryPoints:['tests/particles-conformance-entry.ts'],outfile:bundle,bundle:true,platform:'browser',format:'iife',define:{EFFECT:JSON.stringify(effect)},loader:{'.woff2':'dataurl','.svg':'dataurl'},logLevel:'silent'});
  const source=await readFile(bundle,'utf8');
  for(const mode of ['missing','stalled']){const page=await browser.newPage();const requests=[];page.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url())});await page.setContent('<div id="root"></div>');await page.addScriptTag({content:source});
   await page.evaluate(({mode,kind})=>{window.errors=[];window.addEventListener('unhandledrejection',e=>window.errors.push(String(e.reason)));if(mode==='missing')window.__particleAssets={};else{let reject;const pending=new Promise((_,r)=>reject=r);window.rejectAsset=reject;if(kind==='font')FontFace.prototype.load=function(){window.started=true;return pending};else HTMLImageElement.prototype.decode=function(){window.started=true;return pending};}window.fixture.mount(document.querySelector('#root'),{width:640,height:360,fps:30,seed:0,assets:{}});window.result=window.fixture.seek(1).then(()=> 'resolved',e=>e.message);},{mode,kind});
   if(mode==='stalled'){await page.waitForFunction(()=>window.started===true);await page.evaluate(()=>window.fixture.dispose());assert.match(await page.evaluate(()=>window.result),/disposed/);await page.evaluate(async()=>{window.rejectAsset(Error('late'));await new Promise(r=>setTimeout(r,30))});}else {assert.match(await page.evaluate(()=>window.result),/missing asset/i);await page.evaluate(()=>window.fixture.dispose());}
   assert.equal(await page.locator('#root').innerHTML(),'');assert.deepEqual(await page.evaluate(()=>window.errors),[]);assert.deepEqual(requests,[]);await page.close();
  }
 }}finally{await browser.close()}
});
