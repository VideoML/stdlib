import { createEffectRegistry, mountEffect, type EffectController, type EffectMountContext } from '../src/effects/index.js';
import { registerSharedDemos } from '../src/demos/index.js';
declare const DEMO:string;
let controller:EffectController;
const registry=createEffectRegistry();registerSharedDemos(registry);
const parameters=DEMO==='TextEffects' ? {text:'Shared frame effects',effect:{effect:'fade_up',unit:'words',durationFrames:24,staggerFrames:4}} : {};
(window as any).fixture={
  mount(root:HTMLElement,context:EffectMountContext) { root.style.background='#101418'; controller=mountEffect(root,registry,{id:`videoml/demo/${DEMO}`,version:'1',parameters,startFrame:0,endFrame:30},context); },
  async seek(frame:number) { await controller.seek(frame); },
  dispose() { controller.dispose(); },
};
