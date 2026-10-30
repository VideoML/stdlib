import { createEffectRegistry, mountEffect, type EffectController, type EffectMountContext } from '../src/effects/index.js';
import { registerParticleEffects } from '../src/effects/particles/index.js';
import font from '../fixtures/particles/Geist-Latin.woff2';
import image from '../fixtures/particles/neutral-image.svg';
declare const EFFECT:'particle-text-dissolve'|'particle-image-reveal';
let controller:EffectController;
const registry=createEffectRegistry();registerParticleEffects(registry);
(window as any).fixture={
 mount(root:HTMLElement,context:EffectMountContext) {root.style.background='#101418';controller=mountEffect(root,registry,{id:`videoml/${EFFECT}`,version:'1',parameters:(window as any).__particleParameters??{},startFrame:0,endFrame:121},{...context,assets:(window as any).__particleAssets??{font,image}});},
 async seek(frame:number){await controller.seek(frame)},
 dispose(){controller.dispose()},
};
