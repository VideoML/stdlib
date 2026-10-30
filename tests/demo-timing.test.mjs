import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveLottieFrame} from '../src/demos/engines/lottie-timing.ts';
test('maps project time to asset frames and wraps or clamps deterministically',()=>{
 assert.equal(resolveLottieFrame(15,30,60,120,true),30);
 assert.equal(resolveLottieFrame(75,30,60,120,true),30);
 assert.equal(resolveLottieFrame(75,30,60,120,false),119);
 assert.equal(resolveLottieFrame(1,60,24,24,false),0);
 assert.equal(resolveLottieFrame(60,60,24,24,false),23);
});
