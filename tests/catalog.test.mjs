import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalog, mergeCatalog, validateSourceSets, validatePacketCoverage } from '../scripts/import-hyperframes-catalog.mjs';
test('detects orphan and missing registry entries instead of omitting them', () => {
  assert.throws(() => validateSourceSets([{kind:'component',name:'listed'}], { component:['orphan'], block:[], example:[] }), /orphan|missing/i);
  assert.doesNotThrow(() => validateSourceSets([{kind:'component',name:'listed'}], { component:['listed'], block:[], example:[] }));
});
test('packet mapping requires exactly one packet for every registry path', () => {
  const paths=['registry/components/a', 'registry/components/b'];
  assert.throws(() => validatePacketCoverage(paths, [{id:'x',paths:['registry/components/a']}]), /missing/i);
  assert.throws(() => validatePacketCoverage(paths, [{id:'x',paths},{id:'y',paths:['registry/components/a']}]), /duplicate/i);
  assert.throws(() => validatePacketCoverage(paths, [{id:'x',paths:[...paths,'registry/components/c']}]), /unknown/i);
  assert.doesNotThrow(() => validatePacketCoverage(paths, [{id:'x',paths}]));
});

import { readFileSync, existsSync } from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../catalog/manifest.json', import.meta.url)));
const map=JSON.parse(readFileSync(new URL('../catalog/packet-map.json', import.meta.url)));
test('manifest has exhaustive unique identities, packet mappings and auditable planned provenance', () => {
  assert.deepEqual(manifest.counts, {registry:456, shaders:14, total:470, verified:manifest.entries.filter(e=>e.status==='verified').length});
  assert.equal(manifest.entries.length,470);
  assert.equal(new Set(manifest.entries.map(e=>e.id)).size,470);
  assert.equal(map.packets.length,92);
  const registry = manifest.entries.filter(e => e.kind !== 'shader');
  const owners = validatePacketCoverage(registry.map(e=>e.upstream.path),map.packets);
  for (const e of manifest.entries) {
    assert.equal(e.id, `${e.kind}/${e.name}`);
    assert.equal(e.upstream.commit,manifest.upstream.commit);
    assert.ok(e.upstream.license && e.upstream.licenseBasis && e.upstream.notices.includes('LICENSE'));
    assert.ok(e.upstream.assetRights);
    assert.ok(['planned','implemented','verified'].includes(e.status));
    if (e.status === 'verified') { assert.ok(e.fixtures.length); assert.ok(e.parameterSchema && Object.keys(e.parameterSchema).length); }
    assert.equal(e.packet,e.kind === 'shader' ? 'videoml-5491a0' : owners.get(e.upstream.path));
  }
});
test('pinned checkout reproduces manifest and notice paths', {skip: !process.env.HYPERFRAMES_SOURCE}, () => {
  const root=process.env.HYPERFRAMES_SOURCE;
  assert.deepEqual(mergeCatalog(buildCatalog(root,map),manifest), manifest);
  for (const entry of manifest.entries) for (const notice of entry.upstream.notices) assert.ok(existsSync(`${root}/${notice}`),notice);
});

test('regeneration preserves implementation metadata and rejects provenance drift', {skip: !process.env.HYPERFRAMES_SOURCE}, () => {
  const temp = mkdtempSync(join(tmpdir(),'videoml-catalog-'));
  const target = join(temp,'manifest.json');
  const promoted = structuredClone(manifest);
  promoted.entries[0].status = 'verified';
  promoted.entries[0].parameterSchema = {type:'object',properties:{}};
  promoted.entries[0].fixtures = ['fixtures/example.json'];
  promoted.entries[0].upstream.assetRights = 'Local fixture license reviewed';
  promoted.counts.verified = promoted.entries.filter(e=>e.status==='verified').length;
  writeFileSync(target,JSON.stringify(promoted,null,2)+'\n');
  const invoke = (...args) => spawnSync(process.execPath,['scripts/import-hyperframes-catalog.mjs','--upstream',process.env.HYPERFRAMES_SOURCE,'--manifest',target,...args],{encoding:'utf8'});
  let result=invoke('--check'); assert.equal(result.status,0,result.stderr);
  result=invoke(); assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(target)),promoted);
  promoted.entries[0].upstream.path='registry/components/tampered';
  writeFileSync(target,JSON.stringify(promoted,null,2)+'\n');
  result=invoke('--check'); assert.notEqual(result.status,0); assert.match(result.stderr,/drift/i);
  result=invoke(); assert.notEqual(result.status,0); assert.match(result.stderr,/drift/i);
});

test('verified entries require parameter schema, fixtures and accurate verified count', () => {
  const baseline = structuredClone(manifest); for (const e of baseline.entries) e.status='planned'; baseline.counts.verified=0;
  const candidate = structuredClone(baseline); candidate.entries[0].status='verified'; candidate.entries[0].parameterSchema=null; candidate.entries[0].fixtures=[];
  assert.throws(()=>mergeCatalog(baseline,candidate), /parameter|fixture/i);
  candidate.entries[0].parameterSchema={type:'object'};
  assert.throws(()=>mergeCatalog(baseline,candidate), /fixture/i);
  candidate.entries[0].fixtures=['fixtures/example.json'];
  assert.throws(()=>mergeCatalog(baseline,candidate), /count/i);
  candidate.counts.verified=1;
  assert.equal(mergeCatalog(baseline,candidate).counts.verified,1);
});

test('shader inventory includes unquoted keys without executing source',async()=>{const {shaderNames}=await import('../scripts/import-hyperframes-catalog.mjs');const source=`const shaders: Record<string, ShaderDef> = { "domain-warp": { frag: "value, {" }, glitch: { frag: "x" } };`;assert.deepEqual(shaderNames(source),['domain-warp','glitch']);});
