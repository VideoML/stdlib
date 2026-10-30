/** Immutable, bounded pose sampling adapted from Hyperframes echo-smear (Apache-2.0). */
export type Pose = Readonly<{x:number;y:number;rotation:number;scale:number;opacity:number}>;
export type BakeOptions = Readonly<{duration:number;fps:number;subframes:number;discontinuities?:readonly number[]}>;
export type EchoOptions = Readonly<{length:number;threshold:number;countMult:number;maxEchoes:number;edgeSpacing:number;width:number;height:number;measurePoint?:readonly [number,number]}>;
export type Trajectory = Readonly<{duration:number;fps:number;sampleRate:number;count:number;at(time:number):Pose}>;
const maxSamples=28801, maxDuration=30, maxFps=120, maxSubframes=8;
function validPose(p:Pose):boolean {return !!p && [p.x,p.y,p.rotation,p.scale,p.opacity].every(Number.isFinite) && p.scale>=0 && p.opacity>=0 && p.opacity<=1;}
/** Construct a bounded sample grid including both sides of declared jumps. */
export function trajectorySampleTimes(config:BakeOptions):number[] {
 const {duration,fps,subframes}=config;if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(fps)||fps<=0||!Number.isInteger(subframes)||subframes<1)throw new Error('Invalid trajectory configuration');
 if(duration>maxDuration||fps>maxFps||subframes>maxSubframes)throw new Error('Trajectory limit exceeded');
 const sampleRate=fps*subframes,gridCount=Math.ceil(duration*sampleRate)+1,knots=config.discontinuities??[];
 if(!Array.isArray(knots)||knots.some(t=>!Number.isFinite(t)||t<=0||t>=duration))throw new Error('Invalid trajectory discontinuity');
 if(gridCount+2*knots.length>maxSamples)throw new Error('Trajectory sample limit exceeded');
 const previousFloat=(value:number)=>{const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,value);view.setBigUint64(0,view.getBigUint64(0)-1n);return view.getFloat64(0)};
 const times:number[]=[];for(let i=0;i<gridCount;i++)times.push(Math.min(i/sampleRate,duration));for(const time of knots)times.push(previousFloat(time),time);times.sort((a,b)=>a-b);
 return times.filter((time,index)=>index===0||time!==times[index-1]);
}
/** Sample a finalized motion function without retaining a mutable caller-owned array. */
export function bakeTrajectory(config:BakeOptions,sample:(time:number)=>Pose):Trajectory {
 if(typeof sample!=='function')throw new Error('Invalid trajectory sampler');
 const {duration,fps,subframes}=config,sampleRate=fps*subframes,unique=trajectorySampleTimes(config),count=unique.length,data=new Float64Array(count*5);
 for(let i=0;i<count;i++){const pose=sample(unique[i]);if(!validPose(pose))throw new Error('Invalid sampled pose');data.set([pose.x,pose.y,pose.rotation,pose.scale,pose.opacity],i*5);}
 const at=(time:number):Pose=>{if(!Number.isFinite(time))throw new Error('Invalid trajectory time');const clamped=Math.max(0,Math.min(duration,time));let low=0,high=count-1;while(low<high){const middle=Math.ceil((low+high)/2);if(unique[middle]<=clamped)low=middle;else high=middle-1;}const i=low,j=Math.min(i+1,count-1),start=unique[i],end=unique[j],u=end>start?(clamped-start)/(end-start):0;const v=(k:number)=>data[i*5+k]+(data[j*5+k]-data[i*5+k])*u;return {x:v(0),y:v(1),rotation:v(2),scale:v(3),opacity:v(4)};};
 return Object.freeze({duration,fps,sampleRate,count,at});
}
function point(p:Pose,width:number,height:number,x:number,y:number):readonly [number,number]{const dx=(x-.5)*width*p.scale,dy=(y-.5)*height*p.scale,c=Math.cos(p.rotation),s=Math.sin(p.rotation);return [p.x+dx*c-dy*s,p.y+dx*s+dy*c];}
function distance(a:readonly [number,number],b:readonly [number,number]):number{return Math.hypot(a[0]-b[0],a[1]-b[1]);}
/** Return time-offset poses, gated by motion and bounded by the requested copy limit. */
export function echoesAt(track:Trajectory,time:number,options:EchoOptions):Pose[] {
 const {length,threshold,countMult,maxEchoes,edgeSpacing,width,height}=options;
 if(![time,length,threshold,countMult,maxEchoes,edgeSpacing,width,height].every(Number.isFinite)||time<0||length<0||length>1000||threshold<0||countMult<0||!Number.isInteger(maxEchoes)||maxEchoes<0||maxEchoes>60||edgeSpacing<0||width<=0||height<=0)throw new Error('Invalid echo options');
 const measure=options.measurePoint??[.5,.5];if(measure.length!==2||!measure.every(Number.isFinite)||measure.some(v=>v<0||v>1))throw new Error('Invalid measure point');
 const now=track.at(time),previous=track.at(time-1/(2*track.fps));const move=distance(point(now,width,height,...measure),point(previous,width,height,...measure));
 let count=move>threshold/2?Math.round(move*length/100*countMult):0;
 if(count>0 && edgeSpacing>0){const past=track.at(time-length/(100*track.fps));let extent=0;for(const [x,y] of [[0,0],[0,1],[1,0],[1,1]]) extent=Math.max(extent,distance(point(now,width,height,x,y),point(past,width,height,x,y)));count=Math.max(count,Math.ceil(extent/edgeSpacing));}
 count=Math.min(count,maxEchoes);const result:Pose[]=[];for(let i=1;i<=count;i++)result.push(track.at(time-(i*length)/(100*track.fps*count)));return result;
}
function canonical(value:unknown):string {if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;if(typeof value==='object'){const object=value as Record<string,unknown>;return `{${Object.keys(object).sort().map(k=>`${JSON.stringify(k)}:${canonical(object[k])}`).join(',')}}`;}throw new Error('Invalid trajectory parameters');}
/** Cache one trajectory by its complete immutable parameter description and sampler identity. */
export function createTrajectoryCache(){let lastKey:string|undefined,lastBuilder:(()=>Trajectory)|undefined,lastTrack:Trajectory|undefined;return {get(parameters:unknown,builder:()=>Trajectory):Trajectory {const key=canonical(parameters);if(key!==lastKey||builder!==lastBuilder||!lastTrack){const track=builder();lastKey=key;lastBuilder=builder;lastTrack=track;}return lastTrack;},clear(){lastKey=undefined;lastBuilder=undefined;lastTrack=undefined;}};}
