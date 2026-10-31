/** Shader definitions from Hyperframes 28181602fe2d9ffa38474a6e8155a89909a7b8aa, Apache-2.0. */
import {getFragSource} from './upstream/registry.js';
export const shaderNames=['domain-warp','ridged-burn','whip-pan','sdf-iris','ripple-waves','gravitational-lens','cinematic-zoom','chromatic-split','glitch','swirl-vortex','thermal-distortion','flash-through-white','cross-warp-morph','light-leak'] as const;
export type ApprovedShader=typeof shaderNames[number];
export type TransitionOptions={accent?:readonly [number,number,number];dark?:readonly [number,number,number];bright?:readonly [number,number,number];backgroundColor?:string};
export function validateTransitionOptions(input:unknown):Required<Omit<TransitionOptions,'backgroundColor'>> & Pick<TransitionOptions,'backgroundColor'> {
 if(!input || typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)throw new Error('TRANSITION_INVALID: options must be a plain object');
 const value=input as Record<string,unknown>;if(Object.keys(value).some(key=>!['accent','dark','bright','backgroundColor'].includes(key)))throw new Error('TRANSITION_INVALID: unknown option');
 const color=(key:string,defaultValue:[number,number,number]):[number,number,number]=>{const candidate=value[key]??defaultValue;if(!Array.isArray(candidate)||candidate.length!==3||!candidate.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1))throw new Error(`TRANSITION_INVALID: ${key} must be an RGB triple`);return [...candidate] as [number,number,number];};
 const background=value.backgroundColor;if(background!==undefined&&(typeof background!=='string'||!/^#[0-9a-fA-F]{6}$/.test(background)))throw new Error('TRANSITION_INVALID: backgroundColor must be #RRGGBB');
 return {accent:color('accent',[1,.6,.2]),dark:color('dark',[.4,.15,0]),bright:color('bright',[1,.85,.5]),...(background===undefined?{}:{backgroundColor:background as string})};
}
export function transitionEasedProgress(progress:number,ease?:(value:number)=>number):number {if(!Number.isFinite(progress)||progress<0||progress>1)throw new Error('TRANSITION_INVALID: progress');if(progress===0||progress===1)return progress;const value=ease?ease(progress):progress;if(!Number.isFinite(value))throw new Error('TRANSITION_INVALID: easing result');return Math.max(0,Math.min(1,value));}
export function shaderFragment(name:ApprovedShader):string {if(!shaderNames.includes(name))throw new Error('TRANSITION_INVALID: unknown shader');return getFragSource(name);}
