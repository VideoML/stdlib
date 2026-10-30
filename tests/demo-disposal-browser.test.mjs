import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const require=createRequire(join(resolve(process.env.P06_PLAYWRIGHT_ROOT),'package.json'));
const {chromium}=require('playwright');
const {build}=createRequire(join(resolve(process.env.P06_DEPS_ROOT),'package.json'))('esbuild');
for(const kind of ['font','image']) test(`direct demo cancellation releases stalled ${kind} readiness`,async()=>{
 const outfile=join(mkdtempSync(join(tmpdir(),'p06-dispose-')),'fixture.js');
 await build({entryPoints:['tests/demo-disposal-fixture.ts'],outfile,bundle:true,platform:'browser',format:'iife',logLevel:'silent'});
 const browser=await chromium.launch({executablePath:process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH});
 try {
  const page=await browser.newPage();await page.setContent('<div id="root"></div>');await page.addScriptTag({path:outfile});
  await page.evaluate(kind=>{
   let reject;const stalled=new Promise((_,r)=>reject=r);window.rejectAsset=reject;window.unhandled=[];window.addEventListener('unhandledrejection',e=>window.unhandled.push(String(e.reason)));
   if(kind==='font') Object.defineProperty(document.fonts,'ready',{get(){window.entered=true;return stalled}});
   else {Object.defineProperty(document.fonts,'ready',{get(){const img=document.createElement('img');document.querySelector('#root').firstElementChild.append(img);return Promise.resolve()}});HTMLImageElement.prototype.decode=function(){window.entered=true;return stalled};}
   window.probe.mount(document.querySelector('#root'));window.result=window.probe.seek().then(()=> 'resolved',e=>e.message);
  },kind);
  await page.waitForFunction(()=>window.entered===true);await page.evaluate(()=>{window.probe.cancel();window.probe.dispose()});
  assert.match(await page.evaluate(()=>window.result),/disposed/);
  assert.equal(await page.locator('#root').innerHTML(),'');
  await page.evaluate(async()=>{window.rejectAsset(Error('late failure'));await new Promise(r=>setTimeout(r,50))});
  assert.deepEqual(await page.evaluate(()=>window.unhandled),[]);assert.equal(await page.locator('#root').innerHTML(),'');
 } finally {await browser.close()}
});
