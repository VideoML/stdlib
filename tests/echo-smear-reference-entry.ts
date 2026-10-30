import {attachDomEchoSmear,type DomEchoDriver,type DomEchoHandle} from '../src/effects/echo-smear/index.js';
let current=0,target:HTMLElement,handle:DomEchoHandle|undefined,timeline:any;
function apply(t:number){current=t;target.style.transform=`matrix(1,0,0,1,${300*t},0)`;target.style.opacity=String(.35+.2*t);}
(window as any).referenceFixture={
 async mount(root:HTMLElement,mode:'adapter'|'upstream'){
  root.style.cssText='position:relative;width:640px;height:360px;background:#17202a;overflow:hidden';target=document.createElement('div');target.textContent='Echo';target.style.cssText='position:absolute;left:80px;top:120px;width:140px;height:80px;font:600 32px sans-serif;color:white;background:linear-gradient(90deg,#ff4f64 50%,#52b9ef 50%);';root.append(target);apply(0);
  if(mode==='adapter'){const driver:DomEchoDriver={duration:2,fps:30,capture(){return {time:current,state:current}},restore(state){apply(state as number)},async seek(time,signal){if(signal.aborted)throw Error('aborted');apply(time)}};handle=attachDomEchoSmear([target],driver,{threshold:0,maxEchoes:8,length:100,edgeSpacing:1.5,operator:'maximum'},'reference');await handle.ready;}
  else{let onUpdate:(()=>void)|undefined;timeline={duration(){return 2},time(value?:number,suppress=false){if(value===undefined)return current;apply(value);if(!suppress)onUpdate?.();return this},to(_target:unknown,options:{onUpdate:()=>void}){onUpdate=options.onUpdate;return this}};(window as any).attachEchoSmear(target,timeline,{fps:30,threshold:0,maxEchoes:8,length:100,edgeSpacing:1.5,operator:'maximum'});}
 },async seek(frame:number){if(handle)await handle.seek(frame);else timeline.time(frame/30,false)},dispose(){handle?.dispose()}
};
