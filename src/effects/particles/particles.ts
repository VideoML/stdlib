/** Deterministic particle fields adapted from Hyperframes' Apache-2.0 particle primitives. */
export type Particle = {tx:number;ty:number;at:number;travel:number;fade:number;offset:number;ox:number;oy:number;radius:number;dim:number};
export type ParticleState = {x:number;y:number;alpha:number;radius:number};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function generator(seed:number) { let state=seed>>>0; return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;}; }
export function buildImageParticles(count:number,width:number,height:number,seed:number,direction:'ltr'|'center'):Particle[] {
 const next=generator((seed^0x50a71c1e)>>>0), min=Math.min(width,height), rows:Particle[]=[];
 for(let i=0;i<count;i++) {const x=next(),y=next();const key=direction==='center'?Math.min(1,Math.hypot(x-.5,y-.5)/.7071):x;const at=Math.min(.94,.24+.66*key+.04*next());const travel=.2+.12*next(),fade=.05+.04*next();const angle=direction==='center'?Math.atan2(y-.5,x-.5):Math.PI+(next()-.5)*Math.PI/2;rows.push({tx:x*width,ty:y*height,at,travel,fade,offset:(.06+.14*next())*min,ox:Math.cos(angle),oy:Math.sin(angle),radius:(.28+.62*next())*min/100,dim:.55+.45*next()});}
 return rows;
}
export function buildTextParticles(pixels:Uint8ClampedArray,width:number,height:number,step:number,seed:number,cap:number):Particle[] {
 const cells:{x:number;y:number}[]=[];for(let y=0;y<height;y+=step) for(let x=0;x<width;x+=step) if(pixels[(y*width+x)*4+3]>127) cells.push({x,y});
 let minX=Infinity,maxX=-Infinity;for(const cell of cells){minX=Math.min(minX,cell.x);maxX=Math.max(maxX,cell.x);} if(!cells.length){minX=0;maxX=1;}
 const next=generator((seed^0x9d1550f7)>>>0),span=Math.max(1,maxX-minX),min=Math.min(width,height),keep=Math.min(1,cap/Math.max(1,cells.length)), rows:Particle[]=[];
 for(const cell of cells) {if(next()>=keep || rows.length>=cap) continue;const at=Math.min(.9,.2+.62*((cell.x-minX)/span)+.05*next()),travel=.18+.1*next(),fade=.05+.04*next(),angle=next()*Math.PI*2;rows.push({tx:cell.x,ty:cell.y,at,travel,fade,offset:(.1+.22*next())*min,ox:Math.cos(angle),oy:Math.sin(angle),radius:(.26+.5*next())*(min/200)*step*.5,dim:.5+.5*next()});}
 return rows;
}
export function particleState(row:Particle,progress:number,direction:'in'|'out'):ParticleState {
 const p=clamp(progress),end=clamp((1-p)/.04);let alpha:number,dist:number;
 if(direction==='in'){const birth=Math.max(0,row.at-row.travel),u=clamp((p-birth)/(row.at-birth));const settled=clamp((p-row.at)/row.fade);alpha=clamp(u/.16)*(1-settled)*row.dim*end;dist=row.offset*Math.pow(1-u,3);}
 else {const v=clamp((p-row.at)/row.travel);alpha=clamp(v/.14)*(1-v)*row.dim*end;dist=row.offset*v*v;}
 return {x:row.tx+row.ox*dist,y:row.ty+row.oy*dist,alpha:alpha*.92,radius:row.radius};
}
/** Resolve a 2.8-second reveal and optional 0.45-second exit from absolute time. */
export function resolveEnvelope(seconds:number,durationSec:number,exit:'none'|'fade'|'up'):{progress:number;opacity:number;offset:number} {
 const exitBase=exit==='none'?0:.45,scale=Math.min(1,durationSec/(2.8+exitBase)),intro=2.8*scale,exitLength=exitBase*scale,exitStart=durationSec-exitLength;
 const progress=clamp(seconds/intro),departure=exitLength?(seconds>=durationSec?1:clamp((seconds-exitStart)/exitLength)):0,eased=departure**3;
 return {progress,opacity:1-eased,offset:exit==='up'?-.04*eased:0};
}
