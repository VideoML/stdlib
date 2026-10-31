import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';

// Point C001_DEPS_ROOT at an existing consumer with esbuild and Playwright.
test('C001 instances keep independent seeks, disposal and owned snapshots',async()=>{
 const root=process.env.C001_DEPS_ROOT,executablePath=process.env.VIDEOML_CHROMIUM_EXECUTABLE_PATH;
 assert.ok(root&&executablePath,'C001_DEPS_ROOT and VIDEOML_CHROMIUM_EXECUTABLE_PATH are required');
 const require=createRequire(join(resolve(root),'package.json')),{chromium}=require('playwright'),esbuild=require('esbuild');
 const temp=await mkdtemp(join(tmpdir(),'videoml-c001-test-'));let browser;
 try {
  const bundle=join(temp,'bundle.js');await esbuild.build({entryPoints:[resolve('tests/catalog-c001/browser-entry.ts')],bundle:true,platform:'browser',format:'iife',target:'es2022',nodePaths:[join(resolve(root),'node_modules')],outfile:bundle});
  const bitmap=(await readFile(resolve('fixtures/catalog-c001/authored-snapshot.png'))).toString('base64');
  browser=await chromium.launch({executablePath,headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}});await page.route('**/*',route=>route.abort());await page.setContent('<style>html,body{margin:0}</style>');await page.addScriptTag({path:bundle});
  const cases=[['agent-cursor',{agent_name:'First'},{agent_name:'Second'}],['animated-bar-chart',{title:'First'},{title:'Second'}],['arc-motion-path',{firstLabel:'First'},{firstLabel:'Second'}],['ascii-trail-reveal',{label:'First'},{label:'Second'}],['ascii-render-pass',{sourceSceneId:'source',sourceFrame:75,accent:'green'},{sourceSceneId:'source',sourceFrame:75,accent:'violet'}]];
  for(const [id,a,b] of cases){await page.evaluate(async({id,a,b,bitmap})=>{const blob=id==='ascii-render-pass'?new Blob([Uint8Array.from(atob(bitmap),c=>c.charCodeAt(0))],{type:'image/png'}):undefined;await window.c001.mount('first',id,a,blob);await window.c001.mount('second',id,b,blob);await window.c001.seek('first',60);await window.c001.seek('second',60)},{id,a,b,bitmap});const digest=async selector=>createHash('sha256').update(await page.locator(selector).screenshot()).digest('hex');const before=await digest('#second');await page.evaluate(()=>window.c001.seek('first',15));assert.equal(await digest('#second'),before,`${id}: first seek modified second`);await page.evaluate(()=>window.c001.dispose('first'));assert.equal(await digest('#second'),before,`${id}: first disposal modified second`);await page.evaluate(()=>window.c001.seek('second',30));await page.evaluate(()=>window.c001.dispose('second'));if(id==='ascii-render-pass')assert.deepEqual(await page.evaluate(()=>[window.c001.closeCount('first'),window.c001.closeCount('second')]),[1,1]);}
 } finally {await browser?.close();await rm(temp,{recursive:true,force:true});}
});
