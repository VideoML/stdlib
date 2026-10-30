import type { EffectRegistry } from '../effects/index.js';
import { createDemoEffect } from './index.js';

const number = {type:'number'};
const color = {type:'string',minLength:1};
const bool = {type:'boolean'};
const dimensions={videoWidth:number,videoHeight:number,frame:{type:'integer',minimum:0},fps:{type:'number',exclusiveMinimum:0},startFrame:{type:'integer',minimum:0},seed:{type:'integer',minimum:0,maximum:4294967295}};
const named:Record<string,Record<string,unknown>>={
  AnimeHarnessDemo:{accent:color,surface:color,showBackground:bool},
  ThreeOrbit:{cubeSize:{type:'number',exclusiveMinimum:0},overscanX:number,focusX:number},
  LottieBadge:{size:{type:'number',exclusiveMinimum:0},animationData:{type:'object'},path:{type:'string'},loop:bool},
  D3BarChart:{valuesA:{type:'array',items:number},valuesB:{type:'array',items:number},padding:number,barRadius:number,accent:color,muted:color,showBackground:bool},
  P5Particles:{particleCount:{type:'integer',minimum:0},radius:number,overscanX:number,focusX:number,focusY:number,sunOffsetX:number,sunOffsetY:number,backgroundDarken:number},
  TextEffects:{text:{type:'string'},effect:{type:'object',properties:{effect:{enum:['fade','slide','shimmer','fade_up','fade_down','slide_left','slide_right','pop','scale_in']},unit:{enum:['chars','words','lines']}},required:['effect']},fontSize:number,color:color,align:{enum:['left','center','right']}},
  MixAndMatchDemo:{},
};
/** Register trusted descriptor schemas and frame-driven implementations. */
export function registerSharedDemos(registry:EffectRegistry):void {
  for(const [name,properties] of Object.entries(named)) {
    const parametersSchema={type:'object',properties:{...dimensions,...properties},...(name==='TextEffects'?{required:['text','effect']}:{})};
    registry.register({schemaVersion:1,id:`videoml/demo/${name}`,version:'1',parametersSchema},()=>true,parameters=>createDemoEffect(name,parameters));
  }
}
