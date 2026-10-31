// Hyperframes source: 28181602fe2d9ffa38474a6e8155a89909a7b8aa, Apache-2.0.
import gsapModule from 'gsap';
import motionPathModule from 'gsap/dist/MotionPathPlugin.js';
import type {EffectInstance} from '../index.js';
import {animated_bar_chart,arc_motion_path} from './templates.js';

const gsap=(gsapModule as any).gsap ?? gsapModule;
const MotionPathPlugin=(motionPathModule as any).MotionPathPlugin ?? motionPathModule;
const color={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
export const chartSchema={type:'object',additionalProperties:false,properties:{title:{type:'string',maxLength:120},description:{type:'string',maxLength:200},value:{type:'string',maxLength:40},accent:color,bars:{type:'array',minItems:7,maxItems:7,items:{type:'number',minimum:0,maximum:100}}}};
export const arcSchema={type:'object',additionalProperties:false,properties:{title:{type:'string',maxLength:120},firstLabel:{type:'string',maxLength:80},secondLabel:{type:'string',maxLength:80},accent:color}};

type Params=Record<string,unknown>;
function scoped(root:HTMLElement,html:string):ShadowRoot {const host=root.ownerDocument.createElement('div');Object.assign(host.style,{width:'100%',height:'100%',display:'grid',placeItems:'center'});root.append(host);const shadow=host.attachShadow({mode:'open'});shadow.innerHTML=html;return shadow;}
function local(frame:number,start:number,fps:number):number{return Math.max(0,(frame-start)/fps);}
export function chart(params:Params):EffectInstance {let timeline:any,context:any;return {
 mount(root,ctx){context=ctx;const shadow=scoped(root,animated_bar_chart);const element=shadow.querySelector<HTMLElement>('.hf-catalog-animated-bar-chart')!;
  element.querySelector('h3')!.textContent=String(params.title??'Animated Bar Chart');element.querySelector('p')!.textContent=String(params.description??'A compact data card with deterministic bar growth and value callouts.');element.querySelector('strong')!.textContent=String(params.value??'+42%');
  if(params.accent){element.style.setProperty('--hf-accent',String(params.accent));element.style.setProperty('--hf-l1',`color-mix(in srgb, ${String(params.accent)} 72%, transparent)`);element.style.setProperty('--hf-l2',`color-mix(in srgb, ${String(params.accent)} 45%, transparent)`);}if(params.bars)shadow.querySelectorAll<HTMLElement>('.bar').forEach((bar,i)=>bar.style.setProperty('--h',`${(params.bars as number[])[i]}%`));
  timeline=gsap.timeline({paused:true});timeline.fromTo(element,{'--hf-grow':0,'--hf-dash':900},{'--hf-grow':1,'--hf-dash':0,duration:1.2,ease:'power3.out'},0);timeline.seek(0,false);
 },async seek(frame){timeline.seek(local(frame,context.timing.startFrame,context.fps),false);},dispose(){timeline?.kill();}};}
export function arc(params:Params):EffectInstance {let timeline:any,context:any;return {
 mount(root,ctx){context=ctx;const shadow=scoped(root,arc_motion_path);const element=shadow.querySelector<HTMLElement>('.hf-advanced-arc-motion-path')!;const a=shadow.querySelector<SVGPathElement>('#arc-motion-path-path-a')!,b=shadow.querySelector<SVGPathElement>('#arc-motion-path-path-b')!;
  element.querySelector('.core')!.textContent=String(params.title??'Arc Motion Path');const ca=shadow.querySelector<HTMLElement>('.chip-a')!,cb=shadow.querySelector<HTMLElement>('.chip-b')!;ca.lastChild!.textContent=String(params.firstLabel??'Plan');cb.lastChild!.textContent=String(params.secondLabel??'Render');if(params.accent)element.style.setProperty('--accent',String(params.accent));
  gsap.registerPlugin(MotionPathPlugin);timeline=gsap.timeline({paused:true});timeline.to(ca,{motionPath:{path:a,align:a,alignOrigin:[.5,.5],autoRotate:true},duration:2.4,ease:'power1.inOut'},0);timeline.to(cb,{motionPath:{path:b,align:b,alignOrigin:[.5,.5],autoRotate:true,start:.1,end:.92},duration:2.1,ease:'sine.inOut'},.25);timeline.seek(0,false);
 },async seek(frame){timeline.seek(local(frame,context.timing.startFrame,context.fps),false);},dispose(){timeline?.kill();}};}
