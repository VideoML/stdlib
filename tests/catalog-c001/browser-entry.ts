import {createEffectRegistry,mountEffect} from '@videoml/stdlib/effects';
import {registerCatalogC001} from '@videoml/stdlib/effects/catalog-c001';
const registry=createEffectRegistry();registerCatalogC001(registry);
const controllers=new Map<string,ReturnType<typeof mountEffect>>();
const closes=new Map<string,number>();
(window as any).c001={
 closeCount(key:string){return closes.get(key)??0},
 async mount(key:string,id:string,parameters:Record<string,unknown>,bitmap?:Blob){
  if(controllers.has(key))throw Error('duplicate key');
  const width=bitmap?320:640,height=bitmap?240:360;
  const root=document.createElement('div');root.id=key;Object.assign(root.style,{width:`${width}px`,height:`${height}px`,position:'absolute',left:key==='first'?'0px':'640px',top:'0px',overflow:'hidden',background:'#fdfdfd'});document.body.append(root);
  closes.set(key,0);let closed=false;const sceneSnapshots=bitmap?{async capture(request:{signal:AbortSignal}){const image=await createImageBitmap(bitmap);if(request.signal.aborted){image.close();throw Error('cancelled');}return{bitmap:image,close(){if(closed)throw Error('double close');closed=true;closes.set(key,(closes.get(key)??0)+1);image.close();}};}}:undefined;
  const effect=mountEffect(root,registry,{id:`videoml/${id}`,version:'1',parameters,startFrame:0,endFrame:120},{width,height,fps:30,seed:0,assets:{},sceneSnapshots});controllers.set(key,effect);await effect.seek(0);
 },async seek(key:string,frame:number){const effect=controllers.get(key);if(!effect)throw Error('missing key');await effect.seek(frame)},async dispose(key:string){const effect=controllers.get(key);if(!effect)throw Error('missing key');await effect.dispose();controllers.delete(key);document.getElementById(key)?.remove();},
};
