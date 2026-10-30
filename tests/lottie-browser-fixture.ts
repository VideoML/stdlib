import { createEffectRegistry, mountEffect, type EffectController } from '../src/effects/index.js';
import { registerSharedDemos } from '../src/demos/index.js';
const registry=createEffectRegistry();registerSharedDemos(registry);
let controller:EffectController | null=null;
(window as any).seekLottie=async(frame:number,fps:number,loop:boolean)=>{
  controller?.dispose();
  const root=document.querySelector('#root') as HTMLElement;
  controller=mountEffect(root,registry,{id:'videoml/demo/LottieBadge',version:'1',parameters:{loop},startFrame:0,endFrame:10000},{width:320,height:180,fps,seed:0,assets:{}});
  await controller.seek(frame);
};
(window as any).disposeLottie=()=>controller?.dispose();
