import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const deps=process.env.P06_DEPS_ROOT;
if(!deps || !process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH) throw Error('Set P06_DEPS_ROOT and VIDEOML_CHROMIUM_EXECUTABLE_PATH');
const require=createRequire(join(resolve(deps),'package.json'));
const {build}=require('esbuild');const {chromium}=require('playwright');
test('Lottie maps unequal frame rates and non-looping frames to the same visible output',async()=>{
 const out=join(mkdtempSync(join(tmpdir(),'videoml-lottie-')),'fixture.js');
 await build({entryPoints:['tests/lottie-browser-fixture.ts'],outfile:out,bundle:true,platform:'browser',format:'iife',logLevel:'silent'});
 const browser=await chromium.launch({executablePath:process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH});
 try {
  const page=await browser.newPage({viewport:{width:320,height:180}});await page.setContent('<!doctype html><style>html,body{margin:0}</style><div id="root"></div>');await page.addScriptTag({path:out});
  const frame=async(f,fps,loop)=>{await page.evaluate(([a,b,c])=>window.seekLottie(a,b,c),[f,fps,loop]);return page.screenshot();};
  assert.deepEqual(await frame(30,60,true),await frame(15,30,true));
  assert.deepEqual(await frame(180,60,false),await frame(59,30,false));
  await page.evaluate(()=>window.disposeLottie());
 } finally {await browser.close();}
});
