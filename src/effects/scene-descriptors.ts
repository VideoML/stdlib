export type SceneInputPair=Readonly<{sceneIdParameter:string;frameParameter:string}>;
export type SceneInputDescriptor=Readonly<{id:string;version:string;sceneInputs:ReadonlyArray<SceneInputPair>}>;

/** Shared data-only catalog, available without running effect factories. */
export const builtinSceneInputDescriptors:ReadonlyArray<SceneInputDescriptor>=Object.freeze([
  ...['particle-text-dissolve','particle-image-reveal','echo-smear'].map(id=>Object.freeze({id:`videoml/${id}`,version:'1',sceneInputs:Object.freeze([])})),
  Object.freeze({id:'videoml/scene-snapshot',version:'1',sceneInputs:Object.freeze([Object.freeze({sceneIdParameter:'sourceSceneId',frameParameter:'sourceFrame'})])}),
]);
const parameter=/^[A-Za-z_$][A-Za-z0-9_$]*$/;
export function validateSceneInputPairs(value:unknown):SceneInputPair[] {
  if(!Array.isArray(value)||value.length>4)throw new Error('SCENE_CAPTURE_INVALID: scene inputs');
  const pairs=new Set<string>();
  return value.map(pair=>{
    if(!pair||typeof pair!=='object'||Array.isArray(pair)||Object.getPrototypeOf(pair)!==Object.prototype||Object.keys(pair).length!==2||typeof pair.sceneIdParameter!=='string'||typeof pair.frameParameter!=='string'||![pair.sceneIdParameter,pair.frameParameter].every((x:string)=>parameter.test(x)&&!['__proto__','prototype','constructor'].includes(x)))throw new Error('SCENE_CAPTURE_INVALID: parameter key');
    const signature=JSON.stringify([pair.sceneIdParameter,pair.frameParameter]);
    if(pairs.has(signature))throw new Error('SCENE_CAPTURE_INVALID: duplicate pair');
    pairs.add(signature);return {sceneIdParameter:pair.sceneIdParameter,frameParameter:pair.frameParameter};
  });
}
export function validateCustomSceneDescriptors(value:unknown):SceneInputDescriptor[] {
  if(!Array.isArray(value)||value.length>256)throw new Error('SCENE_CAPTURE_INVALID: custom effects');
  const keys=new Set<string>();
  return value.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.getPrototypeOf(item)!==Object.prototype||Object.keys(item).some(k=>!['id','version','sceneInputs'].includes(k))||typeof item.id!=='string'||!/^[A-Za-z][A-Za-z0-9_./-]{0,127}$/.test(item.id)||typeof item.version!=='string'||!item.version||item.version.length>128)throw new Error('SCENE_CAPTURE_INVALID: effect descriptor');
    const key=JSON.stringify([item.id,item.version]);
    if(keys.has(key)||builtinSceneInputDescriptors.some(x=>x.id===item.id))throw new Error('SCENE_CAPTURE_INVALID: duplicate effect');
    keys.add(key);return {id:item.id,version:item.version,sceneInputs:validateSceneInputPairs(item.sceneInputs)};
  });
}
