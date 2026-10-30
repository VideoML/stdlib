import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { EffectInstance, EffectMountContext } from '../effects/index.js';
import { createCancellation } from '../effects/cancellation.js';
import { AnimeHarnessDemoComponent } from './AnimeHarnessDemo.js';
import { ThreeOrbitComponent } from './ThreeOrbit.js';
import { D3BarChartComponent } from './D3BarChartComponent.js';
import { LottieBadgeComponent } from './LottieBadgeComponent.js';
import { P5ParticlesComponent } from './P5ParticlesComponent.js';
import { TextEffectsComponent } from './TextEffectsComponent.js';
import { MixAndMatchDemoComponent } from './MixAndMatchDemoComponent.js';
import { FramerMotionDemoComponent } from './FramerMotionDemoComponent.js';
export { AnimeHarnessDemoComponent, ThreeOrbitComponent, D3BarChartComponent, LottieBadgeComponent, P5ParticlesComponent, TextEffectsComponent, MixAndMatchDemoComponent, FramerMotionDemoComponent };
const demos:Record<string, React.ComponentType<any>>={AnimeHarnessDemo:AnimeHarnessDemoComponent, ThreeOrbit:ThreeOrbitComponent, D3BarChart:D3BarChartComponent, LottieBadge:LottieBadgeComponent, P5Particles:P5ParticlesComponent, TextEffects:TextEffectsComponent, MixAndMatchDemo:MixAndMatchDemoComponent, FramerMotionDemo:FramerMotionDemoComponent};
export function getSharedDemo(name:string):React.ComponentType<any> | undefined { return demos[name]; }
/** Shared class component, exposed through the VideoML frame lifecycle. */
export function createDemoEffect(name:string, props:Record<string,unknown> = {}):EffectInstance {
  const Component=demos[name]; if(!Component) throw new Error(`Unknown shared demo ${name}`);
  let reactRoot:Root|null=null, context:EffectMountContext, host:HTMLElement;
  let originalStyle:{width:string;height:string;position:string;fontFamily:string};
  const ref=React.createRef<any>();
  const cancellation=createCancellation();
  return {
    mount(root,options) {host=root;context=options;originalStyle={width:root.style.width,height:root.style.height,position:root.style.position,fontFamily:root.style.fontFamily};root.style.fontFamily="var(--font-body, ui-sans-serif, system-ui, sans-serif)";root.style.width=`${options.width}px`;root.style.height=`${options.height}px`;root.style.position="relative";reactRoot=createRoot(root);},
    async seek(frame) {
      if(!reactRoot) throw new Error('Demo disposed');
      flushSync(()=>reactRoot!.render(React.createElement(Component,{...props,frame,fps:context.fps,videoWidth:context.width,videoHeight:context.height,seed:context.seed,ref})));
      if(ref.current?.ready) await ref.current.ready;
      await ref.current?.seekFrame?.(frame,context.fps);
      await cancellation.wait(document.fonts?.ready);
      await cancellation.wait(Promise.all(Array.from(host.querySelectorAll('img')).map(image=>image.decode())));
    },
    cancel(){cancellation.cancel();ref.current?.cancel?.();},
    dispose(){cancellation.cancel();reactRoot?.unmount();reactRoot=null;if(host && originalStyle) Object.assign(host.style,originalStyle);},
  };
}

export type { AnimeHarnessDemoProps } from './AnimeHarnessDemo.js';
export type { ThreeOrbitProps } from './ThreeOrbit.js';
export type { D3BarChartProps } from './D3BarChartComponent.js';
export type { LottieBadgeProps } from './LottieBadgeComponent.js';
export type { P5ParticlesProps } from './P5ParticlesComponent.js';
export type { TextEffectsProps } from './TextEffectsComponent.js';
export type { MixAndMatchDemoProps } from './MixAndMatchDemoComponent.js';
export type { FramerMotionDemoProps } from './FramerMotionDemoComponent.js';
export { registerSharedDemos } from './registry.js';
