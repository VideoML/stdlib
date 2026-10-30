import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(join(resolve(process.env.P10_DEPS_ROOT),'package.json'));
const {chromium}=require('playwright'),{build}=require('esbuild');const output=resolve(process.env.P10_OUTPUT);
const frames=[0,1,9,16,17,18,20,35,36,40,59,60,61,119];
test('curve, spin and hold render identically under random and partitioned seeks',async()=>{
 await mkdir(output,{recursive:true});const bundle=join(output,'fixture.js');await build({entryPoints:['tests/echo-smear-conformance-entry.ts'],outfile:bundle,bundle:true,platform:'browser',format:'iife',logLevel:'silent'});const source=await readFile(bundle,'utf8');
 const browser=await chromium.launch({executablePath:process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH});const requests=[];
 async function worker(){const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1}),page=await context.newPage();page.on('request',r=>{if(/^https?:/i.test(r.url()))requests.push(r.url())});await page.setContent('<!doctype html><style>html,body{margin:0}</style><div id="root"></div>');await page.addScriptTag({content:source});await page.evaluate(()=>window.fixture.mount(document.querySelector('#root'),{width:1280,height:720,fps:30,seed:0,assets:{}}));return {context,page};}
 async function digest(page,png){const data=await page.evaluate(async base64=>{const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const bytes=ctx.getImageData(0,0,canvas.width,canvas.height).data;let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text)},png.toString('base64'));return createHash('sha256').update(Buffer.from(data,'base64')).digest('hex');}
 const original=await worker();try{const baseline=new Map();for(const frame of frames){await original.page.evaluate(f=>window.fixture.seek(f),frame);const png=await original.page.screenshot();baseline.set(frame,await digest(original.page,png));await writeFile(join(output,`frame-${frame}.png`),png);}for(const order of [frames,[...frames].reverse(),[40,0,119,17,9,60,1,35,16,61,20,18,36,59]])for(const frame of order){await original.page.evaluate(f=>window.fixture.seek(f),frame);assert.equal(await digest(original.page,await original.page.screenshot()),baseline.get(frame),`frame ${frame}`);}
 for(const subset of [frames.filter((_,i)=>i%2===0),frames.filter((_,i)=>i%2===1)]){const w=await worker();try{for(const frame of subset){await w.page.evaluate(f=>window.fixture.seek(f),frame);assert.equal(await digest(w.page,await w.page.screenshot()),baseline.get(frame),`partition ${frame}`);}}finally{await w.page.evaluate(()=>window.fixture.dispose());await w.context.close();}}
 await original.page.evaluate(()=>window.fixture.dispose());assert.equal(await original.page.locator('#root').innerHTML(),'');assert.deepEqual(requests,[]);
 }finally{await original.context.close();await browser.close();}
});
