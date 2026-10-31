import {captureSceneSnapshot,type EffectRegistry,type OwnedSceneSnapshot} from '../index.js';

/** Draw one fixed native snapshot of another authored scene. */
export function registerSceneSnapshot(registry:EffectRegistry):void {
  registry.register({
    schemaVersion:1,
    id:'videoml/scene-snapshot',
    version:'1',
    parametersSchema:{
      type:'object',additionalProperties:false,required:['sourceSceneId','sourceFrame'],
      properties:{sourceSceneId:{type:'string',minLength:1},sourceFrame:{type:'integer',minimum:0,maximum:Number.MAX_SAFE_INTEGER}},
    },
    sceneInputs:[{sceneIdParameter:'sourceSceneId',frameParameter:'sourceFrame'}],
  },()=>true,parameters=>{
    const abort=new AbortController();
    let handle:OwnedSceneSnapshot|undefined,disposed=false;
    return {
      async mount(root,context) {
        const acquired=await captureSceneSnapshot(context.sceneSnapshots,{
          sceneId:parameters.sourceSceneId as string,frame:parameters.sourceFrame as number,signal:abort.signal,
        });
        if(disposed){acquired.close();return;}
        handle=acquired;
        try {
          if(acquired.bitmap.width!==context.width||acquired.bitmap.height!==context.height)
            throw new Error('SCENE_CAPTURE_INVALID: composition dimensions');
          const canvas=root.ownerDocument.createElement('canvas');
          canvas.width=context.width;canvas.height=context.height;
          Object.assign(canvas.style,{width:'100%',height:'100%',display:'block'});
          const drawing=canvas.getContext('2d');
          if(!drawing)throw new Error('SCENE_CAPTURE_UNAVAILABLE: canvas 2D');
          drawing.drawImage(acquired.bitmap,0,0,context.width,context.height);
          root.append(canvas);
        } catch(error) {
          handle=undefined;acquired.close();throw error;
        }
      },
      async seek(){},
      cancel(){abort.abort();},
      dispose(){if(disposed)return;disposed=true;abort.abort();handle?.close();handle=undefined;},
    };
  });
}
