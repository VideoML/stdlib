import {trajectorySampleTimes} from './trajectory.js';
/** DOM echo-smear adapter adapted from Hyperframes echo-smear (Apache-2.0). */
export type Matrix2D=readonly [number,number,number,number,number,number];
const identity:Matrix2D=[1,0,0,1,0,0];
function multiply(a:Matrix2D,b:Matrix2D):Matrix2D{return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function cssLength(value:string|undefined,reference:number):number {if(value===undefined)return 0;if(!/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|%)?$/.test(value))throw new Error('Unsupported individual transform length');const n=parseFloat(value);return value.endsWith('%')?n*reference/100:n;}
/** Combine 2D CSS transform and individual translate/rotate/scale; preserve a 3D matrix for nearest sampling. */
export function resolveTransform(transform:string,translate:string,rotate:string,scale:string,box:readonly [number,number]):{matrix:Matrix2D;threeDimensional:boolean;matrix3d?:string} {
 let base:Matrix2D=identity,threeDimensional=false,matrix3d:string|undefined;
 if(transform && transform!=='none'){const m=/^matrix\(([^)]+)\)$/.exec(transform),m3=/^matrix3d\(([^)]+)\)$/.exec(transform),values=(m??m3)?.[1].split(',').map(Number);if(!values||values.some(v=>!Number.isFinite(v))||values.length!==(m?6:16))throw new Error('Unsupported computed transform');if(m)base=values as unknown as Matrix2D;else{base=[values[0],values[1],values[4],values[5],values[12],values[13]];threeDimensional=true;matrix3d=transform;}}
 let individual:Matrix2D=identity;
 if(translate&&translate!=='none'){const parts=translate.trim().split(/\s+/);if(parts.length>2)throw new Error('Unsupported 3D individual translate');individual=multiply(individual,[1,0,0,1,cssLength(parts[0],box[0]),cssLength(parts[1],box[1])]);}
 if(rotate&&rotate!=='none'){const match=/^(?:z\s+)?(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|rad|turn|grad)$/.exec(rotate);if(!match)throw new Error('Unsupported individual rotation');const angle=Number(match[1])*({deg:Math.PI/180,rad:1,turn:2*Math.PI,grad:Math.PI/200}[match[2]]!);individual=multiply(individual,[Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0]);}
 if(scale&&scale!=='none'){const parts=scale.trim().split(/\s+/);if(parts.length>2)throw new Error('Unsupported 3D individual scale');const read=(v:string)=>{if(!/^-?(?:\d+(?:\.\d+)?|\.\d+)%?$/.test(v))throw new Error('Unsupported individual scale');return parseFloat(v)/(v.endsWith('%')?100:1)};const x=read(parts[0]),y=parts[1]?read(parts[1]):x;individual=multiply(individual,[x,0,0,y,0,0]);}
 if(threeDimensional && matrix3d && individual.some((value,index)=>value!==identity[index])) matrix3d=`matrix(${individual.join(',')}) ${matrix3d}`;
 return {matrix:multiply(individual,base),threeDimensional,matrix3d};
}
/** Rewrite only references to IDs owned by a cloned subtree. */
export function rewriteReference(value:string,ids:ReadonlyMap<string,string>):string {
 const hash=/^#([^\s]+)$/.exec(value);if(hash&&ids.has(hash[1]))return `#${ids.get(hash[1])}`;
 return value.replace(/url\(\s*(["']?)#([^\s)'"\"]+)\1\s*\)/g,(original,quote,id)=>ids.has(id)?`url(${quote}#${ids.get(id)}${quote})`:original);
}

export type DomEchoDriver={duration:number;fps:number;discontinuities?:readonly number[];capture():{time:number;state:unknown};restore(state:unknown):void;seek(seconds:number,signal:AbortSignal):void|Promise<void>};
export type DomEchoOptions={length?:number;threshold?:number;countMult?:number;maxEchoes?:number;edgeSpacing?:number;measurePoint?:readonly [number,number];subframes?:number;operator?:'maximum'|'normal'};
export type DomEchoHandle={readonly ready:Promise<void>;readonly revision:unknown;seek(frame:number):Promise<void>;update(driver:DomEchoDriver,revision:unknown):Promise<void>;cancel():void;dispose():void};
type Snapshot={matrix:Matrix2D;matrix3d?:string;opacity:number;filter:string;clipPath:string;origin:string;visibility:string;box:readonly [number,number,number,number]};
type Track={target:Element;template:Element;times:number[];samples:Snapshot[];group?:HTMLElement;perspective?:string;clones:Element[]};
const maxDomSamples=65536,maxDomTargets=8,maxCloneNodes=4096,maxSnapshotChars=16*1024*1024,maxCloneBytes=32*1024*1024;
const originalDisplay=new WeakMap<Element,string>();
export type FreezeBudget={used:number;limit:number};
function consumeBudget(budget:FreezeBudget,amount:number){budget.used+=amount;if(budget.used>budget.limit)throw new Error('DOM echo snapshot memory limit exceeded');}
let cloneSequence=0;
export function rewriteCloneReferences(root:Element,prefix:string):void {
 const nodes=[root,...Array.from(root.querySelectorAll('*'))],ids=new Map<string,string>();for(const node of nodes){const id=node.getAttribute('id');if(id)ids.set(id,`${prefix}-${id}`);}
 for(const node of nodes){const id=node.getAttribute('id');if(id)node.setAttribute('id',ids.get(id)!);for(const attr of Array.from(node.attributes)){if(attr.name==='id')continue;if(/^on/i.test(attr.name)||['data-start','data-duration','data-track-index'].includes(attr.name)){node.removeAttribute(attr.name);continue;}const next=rewriteReference(attr.value,ids);if(next!==attr.value)node.setAttribute(attr.name,next);}}
}
/** Snapshot styles and replace canvas/video with inert pixels; tainted or unavailable frames fail. */
export function freezeDomTarget(source:Element,budget:FreezeBudget={used:0,limit:maxSnapshotChars}):Element {
 const doc=source.ownerDocument,view=doc.defaultView;if(!view)throw new Error('Target document has no window');
 const originals=[source,...Array.from(source.querySelectorAll('*'))];consumeBudget(budget,source.textContent?.length??0);for(const original of originals)for(const attribute of Array.from(original.attributes??[]))consumeBudget(budget,attribute.name.length+attribute.value.length);
 let copy=source.cloneNode(true) as Element;const copies=[copy,...Array.from(copy.querySelectorAll('*'))];
 for(let i=0;i<originals.length;i++){const original=originals[i],clone=copies[i],style=view.getComputedStyle(original),declaration=(clone as HTMLElement).style;if(!declaration)throw new Error('Unsupported target element');for(let j=0;j<style.length;j++){const name=style.item(j);const value=style.getPropertyValue(name);consumeBudget(budget,name.length+value.length);declaration.setProperty(name,value,style.getPropertyPriority(name));}
  const tag=original.localName.toLowerCase();const parentVisibility=original.parentElement?view.getComputedStyle(original.parentElement).visibility:'visible';if(style.visibility===parentVisibility)declaration.removeProperty('visibility');
  declaration.setProperty('animation','none','important');declaration.setProperty('transition','none','important');
  if(tag==='input') (clone as HTMLInputElement).value=(original as HTMLInputElement).value;
  if(tag==='textarea') (clone as HTMLTextAreaElement).value=(original as HTMLTextAreaElement).value;
  if(tag==='select') (clone as HTMLSelectElement).value=(original as HTMLSelectElement).value;
  if(tag==='script'||tag==='style'||tag==='iframe'||tag==='audio'){const blank=doc.createElement('span');blank.style.cssText=declaration.cssText;if(clone===copy)copy=blank;else clone.replaceWith(blank);continue;}
  if(tag==='canvas'||tag==='video'){const media=original as HTMLCanvasElement|HTMLVideoElement,width=tag==='canvas'?(media as HTMLCanvasElement).width:(media as HTMLVideoElement).videoWidth,height=tag==='canvas'?(media as HTMLCanvasElement).height:(media as HTMLVideoElement).videoHeight;if(!width||!height||(tag==='video'&&(media as HTMLVideoElement).readyState<2))throw new Error('Media frame unavailable');if(width*height>4194304)throw new Error('Media frame memory limit exceeded');const raster=doc.createElement('canvas');raster.width=width;raster.height=height;const ctx=raster.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable');let data:string;try{ctx.drawImage(media,0,0);data=raster.toDataURL('image/png');}catch{throw new Error('Media frame is tainted or unavailable');}consumeBudget(budget,data.length);const image=doc.createElement('img');image.alt='';image.src=data;image.style.cssText=declaration.cssText;if(clone===copy)copy=image;else clone.replaceWith(image);}
 }
 return copy;
}
function snapshot(target:Element):Snapshot {
 const view=target.ownerDocument.defaultView;if(!view)throw new Error('Target document has no window');const style=view.getComputedStyle(target),html=target as HTMLElement;
 const width=html.offsetWidth||parseFloat(target.getAttribute('width')||'')||parseFloat(style.width)||0,height=html.offsetHeight||parseFloat(target.getAttribute('height')||'')||parseFloat(style.height)||0;if(!(width>0&&height>0))throw new Error('Target has no measurable box');
 const resolved=resolveTransform(style.transform,style.translate,style.rotate,style.scale,[width,height]),opacity=Number(style.opacity);if(!Number.isFinite(opacity))throw new Error('Invalid target opacity');
 const left=Number.isFinite(html.offsetLeft)?html.offsetLeft:(parseFloat(style.left)||0),top=Number.isFinite(html.offsetTop)?html.offsetTop:(parseFloat(style.top)||0);
 const parentVisibility=target.parentElement?view.getComputedStyle(target.parentElement).visibility:'visible';
 return {matrix:resolved.matrix,matrix3d:resolved.matrix3d,opacity,filter:style.filter,clipPath:style.clipPath,origin:style.transformOrigin,visibility:style.visibility===parentVisibility?'':style.visibility,box:[left,top,width,height]};
}
function sampled(track:Track,time:number):Snapshot {
 const times=track.times,n=times.length;let low=0,high=n-1;while(low<high){const mid=Math.ceil((low+high)/2);if(times[mid]<=time)low=mid;else high=mid-1;}const i=low,j=Math.min(n-1,i+1),a=track.samples[i],b=track.samples[j],u=times[j]===times[i]?0:Math.max(0,Math.min(1,(time-times[i])/(times[j]-times[i]))),nearest=u<.5?a:b;
 const matrix=a.matrix.map((v,k)=>v+(b.matrix[k]-v)*u) as unknown as Matrix2D;return {...nearest,matrix,opacity:a.opacity+(b.opacity-a.opacity)*u};
}
function point(p:Snapshot,x:number,y:number):readonly [number,number]{const [,,w,h]=p.box,o=p.origin.split(/\s+/).map(parseFloat),ox=Number.isFinite(o[0])?o[0]:w/2,oy=Number.isFinite(o[1])?o[1]:h/2,dx=x*w-ox,dy=y*h-oy,m=p.matrix;return [ox+m[0]*dx+m[2]*dy+m[4],oy+m[1]*dx+m[3]*dy+m[5]];}
function shift(a:readonly [number,number],b:readonly [number,number]):number{return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function copiesAt(track:Track,time:number,fps:number,options:Required<Omit<DomEchoOptions,'measurePoint'>> & {measurePoint:readonly [number,number]}):number {
 const now=sampled(track,time),previous=sampled(track,Math.max(0,time-1/(2*fps))),move=shift(point(now,...options.measurePoint),point(previous,...options.measurePoint));let count=move>options.threshold/2?Math.round(move*options.length/100*options.countMult):0;
 if(count>0&&options.edgeSpacing>0){const old=sampled(track,Math.max(0,time-options.length/(100*fps)));let extent=0;for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]])extent=Math.max(extent,shift(point(now,x,y),point(old,x,y)));count=Math.max(count,Math.ceil(extent/options.edgeSpacing));}return Math.min(count,options.maxEchoes);
}

function validate(targets:readonly Element[],driver:DomEchoDriver,options:DomEchoOptions):Required<Omit<DomEchoOptions,'measurePoint'>> & {measurePoint:readonly [number,number]} {
 const resolved={length:options.length??100,threshold:options.threshold??40,countMult:options.countMult??1,maxEchoes:options.maxEchoes??60,edgeSpacing:options.edgeSpacing??1.5,measurePoint:options.measurePoint??[.5,.5] as const,subframes:options.subframes??8,operator:options.operator??'maximum'};
 if(!targets.length||targets.length>maxDomTargets||new Set(targets).size!==targets.length)throw new Error('DOM echo target limit exceeded or duplicated');
 if(!Number.isFinite(driver.duration)||driver.duration<=0||driver.duration>30||!Number.isFinite(driver.fps)||driver.fps<=0||driver.fps>120||!Number.isInteger(resolved.subframes)||resolved.subframes<1||resolved.subframes>8)throw new Error('DOM echo trajectory limit exceeded');
 const samples=trajectorySampleTimes({duration:driver.duration,fps:driver.fps,subframes:resolved.subframes,discontinuities:driver.discontinuities}).length;if(samples*targets.length>maxDomSamples)throw new Error('DOM echo sample limit exceeded');
 if(![resolved.length,resolved.threshold,resolved.countMult,resolved.maxEchoes,resolved.edgeSpacing].every(Number.isFinite)||resolved.length<0||resolved.length>1000||resolved.threshold<0||resolved.countMult<0||!Number.isInteger(resolved.maxEchoes)||resolved.maxEchoes<0||resolved.maxEchoes>60||resolved.edgeSpacing<0||!['maximum','normal'].includes(resolved.operator)||resolved.measurePoint.length!==2||resolved.measurePoint.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid DOM echo options');
 let nodes=0;for(const target of targets){if(!target.parentNode||(target as SVGElement).ownerSVGElement)throw new Error('DOM echo target must be attached; use the root SVG element');nodes+=1+target.querySelectorAll('*').length;}if(nodes*resolved.maxEchoes>maxCloneNodes)throw new Error('DOM echo clone limit exceeded');return resolved;
}
function abortable<T>(work:void|Promise<T>,signal:AbortSignal):Promise<T|void> {
 if(signal.aborted)return Promise.reject(new Error('Echo disposed'));
 return new Promise((resolve,reject)=>{const abort=()=>{signal.removeEventListener('abort',abort);reject(new Error('Echo disposed'));};signal.addEventListener('abort',abort,{once:true});Promise.resolve(work).then(value=>{signal.removeEventListener('abort',abort);resolve(value)},error=>{signal.removeEventListener('abort',abort);reject(error)});});
}
/** Attach time-offset snapshots to existing HTML or root SVG targets. The driver owns and restores target state. */
export function attachDomEchoSmear(targets:readonly Element[],initialDriver:DomEchoDriver,options:DomEchoOptions={},initialRevision:unknown=null):DomEchoHandle {
 let resolved=validate(targets,initialDriver,options),driver=initialDriver,controller=new AbortController(),disposed=false,revision:unknown=initialRevision,tracks:Track[]=[],saved=driver.capture(),generation=0,queue:Promise<unknown>=Promise.resolve();
 if(!Number.isFinite(saved.time)||saved.time<0||saved.time>driver.duration)throw new Error('Invalid saved playhead');
 function removeGroups(){for(const track of tracks)track.group?.remove();tracks=[];}
 function restore(){driver.restore(saved.state);}
 async function seekDriver(time:number,signal:AbortSignal){await abortable(driver.seek(time,signal),signal);}
 async function bake(epoch:number,signal:AbortSignal):Promise<void> {
  const times=trajectorySampleTimes({duration:driver.duration,fps:driver.fps,subframes:resolved.subframes,discontinuities:driver.discontinuities}),local:Track[]=[],budget:FreezeBudget={used:0,limit:maxSnapshotChars};let chars=0;
  try {
   await seekDriver(saved.time,signal);if(signal.aborted||epoch!==generation)throw new Error('Echo disposed');
   for(const target of targets)local.push({target,template:freezeDomTarget(target,budget),times:[],samples:[],clones:[]});
   for(const time of times){await seekDriver(time,signal);if(signal.aborted||epoch!==generation)throw new Error('Echo disposed');for(const track of local){const item=snapshot(track.target);chars+=item.filter.length+item.clipPath.length+item.origin.length+(item.matrix3d?.length??0);if(chars>maxSnapshotChars)throw new Error('DOM echo snapshot memory limit exceeded');track.times.push(time);track.samples.push(item);}}
  } finally {restore();}
  if(signal.aborted||epoch!==generation)throw new Error('Echo disposed');
  if(budget.used*2*resolved.maxEchoes>maxCloneBytes)throw new Error('DOM echo clone memory limit exceeded');
  tracks=local;
  try {for(const track of local){let peak=0;for(const time of track.times)peak=Math.max(peak,copiesAt(track,time,driver.fps,resolved));if(!peak)continue;const doc=track.target.ownerDocument,group=doc.createElement('div');group.setAttribute('data-videoml-echo-group','');group.style.cssText='position:absolute;left:0;top:0;width:0;height:0;isolation:isolate;pointer-events:none;';const z=doc.defaultView!.getComputedStyle(track.target).zIndex;if(z&&z!=='auto')group.style.zIndex=z;const parent=track.target.parentElement,perspective=parent?doc.defaultView!.getComputedStyle(parent).perspective:'none';track.perspective=perspective&&perspective!=='none'?`perspective(${perspective}) `:'';
    for(let i=0;i<peak;i++){const clone=track.template.cloneNode(true) as Element;rewriteCloneReferences(clone,`videoml-echo-${cloneSequence++}`);clone.setAttribute('aria-hidden','true');const style=(clone as HTMLElement).style;style.position='absolute';style.margin='0';style.boxSizing='border-box';style.translate='none';style.rotate='none';style.scale='none';style.mixBlendMode=resolved.operator==='maximum'?'lighten':'normal';originalDisplay.set(clone,style.display);style.display='none';style.visibility='hidden';for(const image of [clone,...Array.from(clone.querySelectorAll('img'))])if(image.localName.toLowerCase()==='img')await abortable((image as HTMLImageElement).decode(),signal);if(signal.aborted||epoch!==generation)throw new Error('Echo disposed');track.clones.push(clone);}for(let i=track.clones.length-1;i>=0;i--)group.append(track.clones[i]);track.target.parentNode!.insertBefore(group,track.target);track.group=group;}
   tracks=local;
  }catch(error){for(const track of local)track.group?.remove();if(tracks===local)tracks=[];throw error;}
 }
 let ready=bake(generation,controller.signal);void ready.catch(()=>{});
 function render(time:number){for(const track of tracks){if(!track.group)continue;const count=copiesAt(track,time,driver.fps,resolved),now=sampled(track,time);track.group.style.visibility=now.visibility;for(let i=0;i<track.clones.length;i++){const style=(track.clones[i] as HTMLElement).style;if(i>=count){style.display='none';style.visibility='hidden';continue;}style.display=originalDisplay.get(track.clones[i])??'';const past=sampled(track,Math.max(0,time-(i+1)*resolved.length/(100*driver.fps*count)));style.left=`${now.box[0]}px`;style.top=`${now.box[1]}px`;style.width=`${now.box[2]}px`;style.height=`${now.box[3]}px`;style.transform=(track.perspective??'')+(past.matrix3d??`matrix(${past.matrix.join(',')})`);style.transformOrigin=past.origin;style.filter=past.filter;style.clipPath=past.clipPath;style.opacity=String(past.opacity);style.visibility='inherit';}}}
 return {
  get ready(){return ready;},get revision(){return revision;},
  seek(frame){if(disposed)return Promise.reject(new Error('Echo disposed'));if(!Number.isSafeInteger(frame)||frame<0)return Promise.reject(new Error('Frame must be a nonnegative integer'));const epoch=generation,signal=controller.signal;const next=queue.then(async()=>{await ready;if(disposed||epoch!==generation)throw new Error('Echo disposed');const time=Math.min(frame/driver.fps,driver.duration);await seekDriver(time,signal);if(disposed||epoch!==generation)throw new Error('Echo disposed');render(time);});queue=next.catch(()=>{});return next;},
  async update(nextDriver,nextRevision){if(disposed)throw new Error('Echo disposed');const nextOptions=validate(targets,nextDriver,options);controller.abort();const epoch=++generation;await Promise.allSettled([ready,queue]);if(disposed)throw new Error('Echo disposed');if(epoch!==generation)throw new Error('Echo update superseded');removeGroups();restore();driver=nextDriver;resolved=nextOptions;saved=driver.capture();if(!Number.isFinite(saved.time)||saved.time<0||saved.time>driver.duration)throw new Error('Invalid saved playhead');revision=nextRevision;controller=new AbortController();ready=bake(generation,controller.signal);void ready.catch(()=>{});queue=Promise.resolve();await ready;},
  cancel(){if(disposed)return;disposed=true;generation++;controller.abort();try{removeGroups()}finally{restore()}},
  dispose(){this.cancel()},
 };
}
