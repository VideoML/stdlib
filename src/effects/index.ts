import { createCancellation } from "./cancellation.js";
import Ajv2020Module from "ajv/dist/2020.js";
export type EffectMountContext = { width:number; height:number; fps:number; seed:number; assets:Readonly<Record<string, unknown>>; readonly timing?:Readonly<{startFrame:number;endFrame:number}> };
export type EffectInstance = { mount(root:HTMLElement, context:EffectMountContext):void | Promise<void>; seek(frame:number):Promise<void>; cancel?():void; dispose():void };
export type EffectDescriptor = { schemaVersion:1; id:string; version:string; parametersSchema:Record<string,unknown>; description?:string };
export type EffectConfig = { id:string; version:string; parameters:Record<string,unknown>; startFrame:number; endFrame:number };
export type EffectController = { seek(frame:number):Promise<void>; pause():void; dispose():void };
export type ParameterValidator = (parameters:Record<string,unknown>) => boolean;
type Registration = { descriptor:EffectDescriptor; validate:ParameterValidator; validateSchema:ParameterValidator; create:(parameters:Record<string,unknown>)=>EffectInstance };
const isRecord = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
const validFrame = (frame:number) => Number.isSafeInteger(frame) && frame >= 0;
export function createEffectRegistry() {
  const entries = new Map<string,Registration>();
  const Ajv2020 = (Ajv2020Module as any).default ?? Ajv2020Module;
  const ajv = new Ajv2020({strict:true, allErrors:true});
  const key = (id:string,version:string) => JSON.stringify([id,version]);
  return {
    register(descriptor:EffectDescriptor, validate:ParameterValidator, create:Registration['create']):void {
      if (!isRecord(descriptor) || Object.keys(descriptor).some(k=>!['schemaVersion','id','version','parametersSchema','description'].includes(k)) || descriptor.schemaVersion!==1 || typeof descriptor.id!=='string' || !descriptor.id || typeof descriptor.version!=='string' || !descriptor.version || (descriptor.description!==undefined && (typeof descriptor.description!=='string' || !descriptor.description)) || !isRecord(descriptor.parametersSchema) || typeof validate!=='function' || typeof create!=='function') throw new Error('Invalid effect registration');
      const id=key(descriptor.id,descriptor.version); if(entries.has(id)) throw new Error(`Duplicate effect ${descriptor.id}@${descriptor.version}`);
      const validateSchema = ajv.compile(descriptor.parametersSchema) as ParameterValidator;
      entries.set(id,{descriptor,validate,validateSchema,create});
    },
    create(config:EffectConfig):EffectInstance {
      if (!isRecord(config) || Object.keys(config).some(k=>!['id','version','parameters','startFrame','endFrame'].includes(k)) || typeof config.id!=='string' || !config.id || typeof config.version!=='string' || !config.version || !isRecord(config.parameters) || !validFrame(config.startFrame) || !validFrame(config.endFrame) || config.endFrame < config.startFrame) throw new Error('Invalid effect configuration');
      const entry=entries.get(key(config.id,config.version)); if(!entry) throw new Error(`Unknown effect ${config.id}@${config.version}`);
      if(!entry.validateSchema(config.parameters) || !entry.validate(config.parameters)) throw new Error(`Invalid parameters for ${config.id}@${config.version}`);
      return entry.create(config.parameters);
    },
  };
}
export type EffectRegistry = ReturnType<typeof createEffectRegistry>;
export function mountEffect(root:HTMLElement, registry:EffectRegistry, config:EffectConfig, context:EffectMountContext):EffectController {
  if (!Number.isFinite(context.width) || context.width<=0 || !Number.isFinite(context.height) || context.height<=0 || !Number.isFinite(context.fps) || context.fps<=0 || !Number.isInteger(context.seed) || context.seed<0 || context.seed>0xffffffff || !isRecord(context.assets)) throw new Error('Invalid effect mount context');
  const {startFrame,endFrame}=config;
  const effect=registry.create({...config,startFrame,endFrame});
  const timing=Object.freeze({startFrame,endFrame});
  let disposed=false, cleaned=false, pending=0, mountFailed=false;
  const cancellation=createCancellation();
  let mountError:unknown;
  const cleanup=(suppressError=false)=>{
    if(cleaned || pending!==0 || (!disposed && !mountFailed)) return;
    cleaned=true;
    try { effect.dispose(); } catch(error) { if(!suppressError) throw error; }
    finally { root.replaceChildren(); }
  };
  let result:void | Promise<void>;
  try { result=effect.mount(root,{...context,timing}); }
  catch(error) { mountFailed=true; try { cleanup(true); } catch {} throw error; }
  const asynchronous = !!result && typeof (result as Promise<void>).then === 'function';
  if (asynchronous) pending++;
  const mountReady=Promise.resolve(result).then(
    ()=>{ if(asynchronous) pending--; cleanup(true); },
    error=>{ mountFailed=true; mountError=error; if(asynchronous) pending--; cleanup(true); },
  );
  let queue=mountReady;
  return {
    seek(frame) {
      if(!validFrame(frame)) return Promise.reject(new Error('Frame must be a nonnegative integer'));
      if(disposed) return Promise.reject(new Error('Effect disposed'));
      pending++;
      const work=queue.then(async()=>{
        if(disposed) throw new Error('Effect disposed');
        if(mountFailed) throw mountError;
        root.style.visibility=frame>=startFrame && frame<endFrame ? '' : 'hidden';
        await effect.seek(frame);
        if (typeof document !== 'undefined') {
          await cancellation.wait(document.fonts?.ready);
          await cancellation.wait(Promise.all(Array.from(root.querySelectorAll('img')).map(image=>image.decode())));
        }
        if(disposed) throw new Error('Effect disposed');
      }).finally(()=>{pending--;cleanup(true);});
      queue=work.catch(()=>{});
      return work;
    },
    pause() {},
    dispose() { if(disposed) return; disposed=true; cancellation.cancel(); try { effect.cancel?.(); } finally { cleanup(); } },
  };
}
