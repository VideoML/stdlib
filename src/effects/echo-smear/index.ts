import type {EffectInstance, EffectMountContext, EffectRegistry} from '../index.js';
import {bakeTrajectory,createTrajectoryCache,echoesAt,type EchoOptions,type Pose} from './trajectory.js';
export {bakeTrajectory,createTrajectoryCache,echoesAt} from './trajectory.js';
export {attachDomEchoSmear} from './dom.js';
export type {DomEchoDriver,DomEchoHandle,DomEchoOptions} from './dom.js';
export type {Pose,Trajectory,EchoOptions} from './trajectory.js';
export type Keyframe={time:number;x:number;y:number;rotation?:number;scale?:number;opacity?:number;hold?:boolean;control1?:[number,number];control2?:[number,number]};
export type EchoParameters={durationSec?:number;subframes?:number;length?:number;threshold?:number;countMult?:number;maxEchoes?:number;edgeSpacing?:number;width?:number;height?:number;color?:string;operator?:'maximum'|'normal';measurePoint?:[number,number];keyframes?:Keyframe[]};
const defaultFrames:Keyframe[]=[{time:0,x:170,y:370,rotation:0,control1:[300,40],control2:[720,50]},{time:.55,x:1030,y:360,rotation:6.28,hold:true},{time:1.2,x:1030,y:360,rotation:6.28,control1:[1100,600],control2:[600,120]},{time:2,x:400,y:510,rotation:12.56,hold:true},{time:4,x:400,y:510,rotation:12.56}];
const mix=(a:number,b:number,u:number)=>a+(b-a)*u;
function snapshotFrames(frames:Keyframe[],duration:number):Keyframe[]{
 const data=structuredClone(frames);if(data.length<2||data.length>256||data[0].time!==0||data.at(-1)!.time>duration)throw new Error('Invalid keyframe sequence');
 for(let i=0;i<data.length;i++){const f=data[i];if(![f.time,f.x,f.y,f.rotation??0,f.scale??1,f.opacity??1,...(f.control1??[]),...(f.control2??[])].every(Number.isFinite)||f.time<0||(i>0&&f.time<=data[i-1].time)||(f.scale??1)<0||(f.opacity??1)<0||(f.opacity??1)>1||(!!f.control1!==!!f.control2))throw new Error('Invalid keyframe sequence');}return data;
}
/** Resolve a cubic or held keyframe segment without a running animation clock. */
export function sampleKeyframes(frames:readonly Keyframe[],time:number):Pose {
 let i=0;while(i<frames.length-2&&time>=frames[i+1].time)i++;const a=frames[i],b=frames[i+1],u=Math.max(0,Math.min(1,(time-a.time)/(b.time-a.time))),t=a.hold&&u<1?0:u;
 const curve=(v0:number,v1:number,v2:number,v3:number)=>((1-t)**3*v0+3*(1-t)**2*t*v1+3*(1-t)*t*t*v2+t**3*v3);
 return {x:a.control1&&a.control2?curve(a.x,a.control1[0],a.control2[0],b.x):mix(a.x,b.x,t),y:a.control1&&a.control2?curve(a.y,a.control1[1],a.control2[1],b.y):mix(a.y,b.y,t),rotation:mix(a.rotation??0,b.rotation??0,t),scale:mix(a.scale??1,b.scale??1,t),opacity:mix(a.opacity??1,b.opacity??1,t)};
}
/** A trusted caller supplies a pure motion sampler and draws its target at each recorded pose. */
export type EchoMotion={durationSec:number;revision:unknown;discontinuities?:readonly number[];sample:(seconds:number)=>Pose;draw:(context:CanvasRenderingContext2D,pose:Pose)=>void};
export type MutableEchoEffect=EffectInstance & {updateMotion(motion:EchoMotion):void};
/** Build an echo effect around a finalized motion, rebaking when that motion is replaced. */
export function createEchoSmear(motion:EchoMotion,partial:Partial<EchoOptions> & {subframes?:number;operator?:'maximum'|'normal'}={}):MutableEchoEffect {
 let current=motion,dead=false,cleaned=false,root:HTMLElement,canvas:HTMLCanvasElement,context:EffectMountContext,layer:HTMLCanvasElement;const cache=createTrajectoryCache();const subframes=partial.subframes??8,operator=partial.operator??'maximum';
 const options:EchoOptions={length:partial.length??100,threshold:partial.threshold??40,countMult:partial.countMult??1,maxEchoes:partial.maxEchoes??60,edgeSpacing:partial.edgeSpacing??1.5,width:partial.width??100,height:partial.height??60,measurePoint:partial.measurePoint};
 function bake(){return bakeTrajectory({duration:current.durationSec,fps:context.fps,subframes,discontinuities:current.discontinuities},current.sample)}
 return {
  mount(host,settings){if(!Number.isSafeInteger(settings.width)||!Number.isSafeInteger(settings.height)||settings.width<1||settings.height<1||settings.width>4096||settings.height>4096||settings.width*settings.height>4194304)throw new Error('Echo canvas memory limit exceeded');root=host;context=settings;canvas=host.ownerDocument.createElement('canvas');layer=host.ownerDocument.createElement('canvas');canvas.width=layer.width=settings.width;canvas.height=layer.height=settings.height;root.append(canvas);cache.get({revision:current.revision,duration:current.durationSec,fps:settings.fps,subframes,discontinuities:current.discontinuities??[]},bake);},
  async seek(frame){if(!Number.isSafeInteger(frame)||frame<0)throw new Error('Frame must be a nonnegative integer');if(dead)throw new Error('Effect disposed');const track=cache.get({revision:current.revision,duration:current.durationSec,fps:context.fps,subframes,discontinuities:current.discontinuities??[]},bake),ctx=canvas.getContext('2d'),echo=layer.getContext('2d');if(!ctx||!echo)throw new Error('Canvas 2D is unavailable');const time=frame/context.fps,poses=echoesAt(track,time,options);ctx.clearRect(0,0,canvas.width,canvas.height);echo.clearRect(0,0,layer.width,layer.height);echo.globalCompositeOperation=operator==='normal'?'source-over':'lighten';for(const pose of poses){echo.save();try{current.draw(echo,pose);}finally{echo.restore();}}echo.globalCompositeOperation='source-over';ctx.drawImage(layer,0,0);ctx.save();try{current.draw(ctx,track.at(time));}finally{ctx.restore();}},
  updateMotion(next){if(dead)throw new Error('Effect disposed');current=next;cache.clear();},
  cancel(){dead=true;},dispose(){if(cleaned)return;cleaned=true;dead=true;cache.clear();root.replaceChildren();},
 };
}
const keyframeSchema={type:'object',properties:{time:{type:'number',minimum:0},x:{type:'number'},y:{type:'number'},rotation:{type:'number'},scale:{type:'number',minimum:0},opacity:{type:'number',minimum:0,maximum:1},hold:{type:'boolean'},control1:{type:'array',items:{type:'number'},minItems:2,maxItems:2},control2:{type:'array',items:{type:'number'},minItems:2,maxItems:2}},required:['time','x','y'],additionalProperties:false};
export const echoSmearSchema={type:'object',properties:{durationSec:{type:'number',exclusiveMinimum:0,maximum:30},subframes:{type:'integer',minimum:1,maximum:8},length:{type:'number',minimum:0,maximum:1000},threshold:{type:'number',minimum:0},countMult:{type:'number',minimum:0},maxEchoes:{type:'integer',minimum:0,maximum:60},edgeSpacing:{type:'number',minimum:0},width:{type:'number',exclusiveMinimum:0,maximum:4096},height:{type:'number',exclusiveMinimum:0,maximum:4096},color:{type:'string',pattern:'^#[0-9a-fA-F]{6}$'},operator:{enum:['maximum','normal']},measurePoint:{type:'array',items:{type:'number',minimum:0,maximum:1},minItems:2,maxItems:2},keyframes:{type:'array',minItems:2,maxItems:256,items:keyframeSchema}},additionalProperties:false};
/** Register the versioned, keyframe-driven echo example. */
export function registerEchoSmear(registry:EffectRegistry):void {
 registry.register({schemaVersion:1,id:'videoml/echo-smear',version:'1',parametersSchema:echoSmearSchema},()=>true,(raw)=>{
  const params=structuredClone(raw) as EchoParameters,duration=params.durationSec??4,frames=snapshotFrames(params.keyframes??defaultFrames.map(frame=>({...frame,time:frame.time*duration/4})),duration),width=params.width??120,height=params.height??72,color=params.color??'#71f5a7';
  const motion:EchoMotion={durationSec:duration,revision:frames,discontinuities:frames.flatMap((f,i)=>f.hold&&i+1<frames.length&&frames[i+1].time<duration?[frames[i+1].time]:[]),sample:(t)=>sampleKeyframes(frames,t),draw:(ctx,pose)=>{ctx.save();ctx.globalAlpha=pose.opacity;ctx.translate(pose.x,pose.y);ctx.rotate(pose.rotation);ctx.scale(pose.scale,pose.scale);ctx.fillStyle=color;ctx.fillRect(-width/2,-height/2,width,height);ctx.restore();}};
  return createEchoSmear(motion,{...params,width,height});
 });
}
