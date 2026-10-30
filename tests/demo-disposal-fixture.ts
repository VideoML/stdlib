import { createDemoEffect } from '../src/demos/index.js';
const effect=createDemoEffect('TextEffects',{text:'Cancel me',effect:{effect:'fade',unit:'words'}});
(window as any).probe={mount(root:HTMLElement){effect.mount(root,{width:320,height:180,fps:30,seed:0,assets:{}})},seek(){return effect.seek(1)},cancel(){effect.cancel?.()},dispose(){effect.dispose()}};
