import {createEffectRegistry,mountEffect,type EffectController,type EffectMountContext} from '../src/effects/index.js';
import {registerEchoSmear} from '../src/effects/echo-smear/index.js';
import parameters from '../fixtures/echo-smear/curved-spin-pause.json';
let controller:EffectController;const registry=createEffectRegistry();registerEchoSmear(registry);
(window as any).fixture={mount(root:HTMLElement,context:EffectMountContext){root.style.background='#101418';controller=mountEffect(root,registry,{id:'videoml/echo-smear',version:'1',parameters,startFrame:0,endFrame:120},context)},async seek(frame:number){await controller.seek(frame)},dispose(){controller.dispose()}};
