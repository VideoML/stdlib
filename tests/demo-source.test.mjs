import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const stdlib=resolve(import.meta.dirname,'..');
const babulus=process.env.BABULUS_SOURCE;
test('seven shared source modules and browser conformance fixture exist',()=>{
 for(const name of ['AnimeHarnessDemo','ThreeOrbit','LottieBadgeComponent','D3BarChartComponent','P5ParticlesComponent','TextEffectsComponent','MixAndMatchDemoComponent'])assert.ok(existsSync(resolve(stdlib,'src/demos',`${name}.tsx`)),name);
 assert.ok(existsSync(resolve(stdlib,'tests/demo-conformance-entry.ts')));
});
test('legacy Babulus names re-export the shared implementation', {skip:!babulus},()=>{
 for(const name of ['AnimeHarnessDemo','ThreeOrbit','LottieBadge','D3BarChart','P5Particles','MixAndMatchDemo']) assert.match(readFileSync(resolve(babulus,'packages/renderer/src/components/engines',`${name}Component.tsx`),'utf8'),/from '@videoml\/stdlib\/demos'/);
 assert.match(readFileSync(resolve(babulus,'packages/renderer/src/components/text/TextEffectsComponent.tsx'),'utf8'),/from '@videoml\/stdlib\/demos'/);
});
