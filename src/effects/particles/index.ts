import type {EffectInstance, EffectMountContext, EffectRegistry} from '../index.js';
import {createCancellation} from '../cancellation.js';
import {buildImageParticles,buildTextParticles,particleState,resolveEnvelope,type Particle} from './particles.js';

type Density='low'|'med'|'high';
type Accent='green'|'blue'|'violet';
type Parameters={text?:string; density?:Density; direction?:string; accent?:Accent; fontAsset?:string; imageAsset?:string; exit?:'none'|'fade'|'up'; durationSec?:number};
const colors:Record<Accent,string>={green:'#71f5a7',blue:'#61a8ff',violet:'#c5a3ff'};
const imageCounts:Record<Density,number>={low:320,med:640,high:1100};
const textCounts:Record<Density,number>={low:900,med:1700,high:2800};
let particleFontSequence=0;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function asset(context:EffectMountContext,key:string):string {
 const value=context.assets[key];if(typeof value!=='string'||!value.trim()) throw new Error(`Missing asset: ${key}`);
 let parsed:URL;try {parsed=new URL(value);} catch {throw new Error(`Expected a resolved blob or data asset: ${key}`);}
 if(parsed.protocol!=='blob:' && parsed.protocol!=='data:') throw new Error(`Expected a resolved blob or data asset: ${key}`);return value;
}
function createParticleEffect(kind:'text'|'image',params:Parameters):EffectInstance {
 const cancellation=createCancellation();const abort=new AbortController();const family=`VideoMLParticleFont${particleFontSequence++}`;let dead=false,root:HTMLElement,stage:HTMLElement,canvas:HTMLCanvasElement,textRaster:HTMLCanvasElement,layer:HTMLElement,context:EffectMountContext,rows:Particle[]=[],face:FontFace|undefined;
 const density=params.density??'med',accent=params.accent??'green';
 return {
  async mount(host,options) {
   root=host;context=options;const name=kind==='text'?(params.fontAsset??'font'):(params.imageAsset??'image');const source=asset(options,name);
   const doc=host.ownerDocument;stage=doc.createElement('div');Object.assign(stage.style,{position:'relative',width:`${options.width}px`,height:`${options.height}px`,overflow:'hidden'});
   layer=doc.createElement('div');Object.assign(layer.style,{position:'absolute',inset:'0',display:'grid',placeItems:'center'});
   canvas=doc.createElement('canvas');canvas.width=options.width;canvas.height=options.height;Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
   stage.append(layer,canvas);root.append(stage);
   if(kind==='text') {
    const response=await cancellation.wait(fetch(source,{signal:abort.signal}));if(!response.ok) throw new Error('Unable to read font asset');const bytes=await cancellation.wait(response.arrayBuffer());if(dead)return;face=new FontFace(family,bytes,{weight:'600'});await cancellation.wait(face.load());if(dead) return;doc.fonts.add(face);
    const text=params.text??'Dissolve',off=doc.createElement('canvas');off.width=canvas.width;off.height=canvas.height;const ctx=off.getContext('2d',{willReadFrequently:true});if(!ctx) throw new Error('Canvas 2D is unavailable');
    let size=Math.round(canvas.height*.3);ctx.font=`600 ${size}px ${family}`;const measured=ctx.measureText(text).width||1;if(measured>canvas.width*.86){size=Math.max(8,Math.floor(size*canvas.width*.86/measured));ctx.font=`600 ${size}px ${family}`;}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=colors[accent];ctx.fillText(text,canvas.width/2,canvas.height/2);textRaster=off;
    rows=buildTextParticles(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height,Math.max(2,Math.round(Math.min(canvas.width,canvas.height)/260)),options.seed,textCounts[density]);
   } else {
    const image=doc.createElement('img');image.alt='';image.src=source;Object.assign(image.style,{width:'100%',height:'100%',objectFit:'cover'});layer.append(image);await cancellation.wait(image.decode());if(dead)return;
    rows=buildImageParticles(imageCounts[density],canvas.width,canvas.height,options.seed,params.direction==='center'?'center':'ltr');
   }
  },
  async seek(frame) {
   if(dead) throw new Error('Effect disposed');const ctx=canvas.getContext('2d');if(!ctx) throw new Error('Canvas 2D is unavailable');const envelope=resolveEnvelope(frame/context.fps,params.durationSec??4,params.exit??'none'),p=envelope.progress,out=kind==='text'&&params.direction==='out';ctx.clearRect(0,0,canvas.width,canvas.height);if(kind==='text'){const front=Math.round(clamp((p-.2)/.7)*canvas.width);ctx.save();ctx.beginPath();ctx.rect(out?front:0,0,out?canvas.width-front:front,canvas.height);ctx.clip();ctx.drawImage(textRaster,0,0);ctx.restore();}ctx.fillStyle=colors[accent];
   for(const row of rows){const state=particleState(row,p,out?'out':'in');if(state.alpha<=.002)continue;ctx.globalAlpha=state.alpha;ctx.beginPath();ctx.arc(state.x,state.y,state.radius,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;stage.style.opacity=String(envelope.opacity);stage.style.transform=`translateY(${envelope.offset*context.height}px)`;
   if(kind==='image') {const front=clamp((p-.22)/.74),direction=params.direction??'ltr';layer.style.opacity=String(clamp((p-.18)/.42));layer.style.clipPath=direction==='center'?`circle(${front*75}% at 50% 50%)`:`inset(0 ${100-front*100}% 0 0)`;}
  },
  cancel(){dead=true;cancellation.cancel();abort.abort();},
  dispose(){dead=true;cancellation.cancel();abort.abort();if(face) root.ownerDocument.fonts.delete(face);root.replaceChildren();},
 };
}
const common={density:{enum:['low','med','high']},accent:{enum:['green','blue','violet']},exit:{enum:['none','fade','up']},durationSec:{type:'number',exclusiveMinimum:0}};
/** Register the two versioned particle effects. */
export function registerParticleEffects(registry:EffectRegistry):void {
 for(const kind of ['text','image'] as const){const name=kind==='text'?'particle-text-dissolve':'particle-image-reveal';const properties=kind==='text'?{...common,text:{type:'string',minLength:1},direction:{enum:['in','out']},fontAsset:{type:'string',minLength:1}}:{...common,direction:{enum:['ltr','center']},imageAsset:{type:'string',minLength:1}};registry.register({schemaVersion:1,id:`videoml/${name}`,version:'1',parametersSchema:{type:'object',properties,additionalProperties:false}},()=>true,p=>createParticleEffect(kind,p as Parameters));}
}
