import type {EffectRegistry} from '../index.js';
import {agent,agentSchema} from './agent.js';
import {chart,arc,chartSchema,arcSchema} from './chart-arc.js';
import {asciiPass,asciiSchema} from './ascii-pass.js';
import {asciiTrail,trailSchema} from './ascii-trail.js';
export function registerCatalogC001(registry:EffectRegistry):void {
 for(const [name,schema,create] of [['agent-cursor',agentSchema,agent],['animated-bar-chart',chartSchema,chart],['arc-motion-path',arcSchema,arc],['ascii-trail-reveal',trailSchema,asciiTrail]] as const)registry.register({schemaVersion:1,id:`videoml/${name}`,version:'1',parametersSchema:schema},()=>true,p=>create(p));
 registry.register({schemaVersion:1,id:'videoml/ascii-render-pass',version:'1',parametersSchema:asciiSchema,sceneInputs:[{sceneIdParameter:'sourceSceneId',frameParameter:'sourceFrame'}]},()=>true,p=>asciiPass(p as any));
}
