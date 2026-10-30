import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const COMMIT = '28181602fe2d9ffa38474a6e8155a89909a7b8aa';
const KINDS = { component:'components', block:'blocks', example:'examples' };
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const sorted = values => [...values].sort();
export function validateSourceSets(items, directories) {
  const seen = new Set();
  for (const item of items) {
    if (!KINDS[item.kind] || !/^[a-z0-9][a-z0-9-]*$/.test(item.name)) throw new Error(`Invalid registry item: ${JSON.stringify(item)}`);
    const key = `${item.kind}/${item.name}`;
    if (seen.has(key)) throw new Error(`Duplicate registry item ${key}`);
    seen.add(key);
  }
  for (const kind of Object.keys(KINDS)) {
    const listed = new Set(items.filter(x => x.kind === kind).map(x => x.name));
    const dirs = new Set(directories[kind]);
    const missing = sorted([...listed].filter(x => !dirs.has(x)));
    const orphan = sorted([...dirs].filter(x => !listed.has(x)));
    if (missing.length || orphan.length) throw new Error(`${kind}: missing directories [${missing}]; orphan directories [${orphan}]`);
  }
}
export function validatePacketCoverage(paths, packets) {
  const expected = new Set(paths), owners = new Map();
  for (const packet of packets) for (const path of packet.paths) {
    if (!expected.has(path)) throw new Error(`Unknown packet path ${path}`);
    if (owners.has(path)) throw new Error(`Duplicate packet mapping ${path}`);
    owners.set(path, packet.id);
  }
  const missing = paths.filter(path => !owners.has(path));
  if (missing.length) throw new Error(`Missing packet mapping: ${missing.join(', ')}`);
  return owners;
}
function noticeFiles(root, relative = '') {
  const result = [];
  for (const ent of readdirSync(join(root, relative), {withFileTypes:true})) {
    const path = relative ? `${relative}/${ent.name}` : ent.name;
    if (ent.isDirectory()) result.push(...noticeFiles(root, path));
    else if (ent.isFile() && /(?:license|notice)/i.test(ent.name)) result.push(path);
  }
  return sorted(result);
}
function shaderNames(source) {
  const body = source.match(/const shaders: Record<string, ShaderDef> = \{([\s\S]*?)^\};/m)?.[1];
  if (!body) throw new Error('Cannot locate shader registry');
  const names = [...body.matchAll(/^  "([a-z0-9-]+)": \{/gm)].map(m=>m[1]);
  if (!names.length || new Set(names).size !== names.length) throw new Error('Empty or duplicate shader registry');
  return sorted(names);
}
export function buildCatalog(upstream, packetMap) {
  const head = execFileSync('git',['rev-parse','HEAD'],{cwd:upstream,encoding:'utf8'}).trim();
  if (head !== COMMIT) throw new Error(`Upstream revision ${head} does not match ${COMMIT}`);
  const dirty = execFileSync('git',['status','--porcelain','--untracked-files=all','--','registry','packages/shader-transitions/src/shaders/registry.ts','packages/shader-transitions/package.json','LICENSE'],{cwd:upstream,encoding:'utf8'});
  if (dirty.trim()) throw new Error('Pinned upstream catalog source contains uncommitted changes');
  const root = join(upstream, 'registry');
  const raw = json(join(root,'registry.json')).items;
  const items = raw.map(item => ({kind:item.type?.replace(/^hyperframes:/,''), name:item.name}));
  const directories = Object.fromEntries(Object.entries(KINDS).map(([kind,dir]) => [kind, readdirSync(join(root,dir),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name)]));
  validateSourceSets(items, directories);
  const paths = items.map(item=>`registry/${KINDS[item.kind]}/${item.name}`);
  const owners = validatePacketCoverage(paths, packetMap.packets);
  const entries = items.map(item => {
    const path = `registry/${KINDS[item.kind]}/${item.name}`;
    const metadata = json(join(upstream,path,'registry-item.json'));
    if (metadata.name !== item.name || metadata.type !== `hyperframes:${item.kind}`) throw new Error(`Metadata identity mismatch: ${path}`);
    const notices = noticeFiles(join(upstream,path)).map(n=>`${path}/${n}`);
    return { id:`${item.kind}/${item.name}`, kind:item.kind, name:item.name, title:metadata.title, description:metadata.description, category:metadata.family ?? item.kind, tags:metadata.tags ?? [], status:'planned', upstream:{commit:COMMIT,path,registryItem:`${path}/registry-item.json`, license:metadata.license ?? 'Apache-2.0', licenseBasis:metadata.license ? 'registry-item' : 'repository-license; third-party assets unreviewed', notices:['LICENSE',...notices], files:(metadata.files ?? []).map(f=>f.path), assetRights:'unreviewed; upstream files are references, not approved local fixtures'}, dependencies:{declared:{},review:'unreviewed'}, parameterSchema:null, fixtures:[], packet:owners.get(path) };
  });
  const shaderPath='packages/shader-transitions/src/shaders/registry.ts';
  const shaderPackage=json(join(upstream,'packages/shader-transitions/package.json'));
  for (const name of shaderNames(readFileSync(join(upstream,shaderPath),'utf8'))) entries.push({id:`shader/${name}`,kind:'shader',name,title:name,description:'Upstream shader transition; implementation and parameter review pending.',category:'shader-transition',tags:[],status:'planned',upstream:{commit:COMMIT,path:shaderPath,registryItem:null,license:'Apache-2.0',licenseBasis:'repository-license; third-party assets unreviewed',notices:['LICENSE'],files:[],assetRights:'unreviewed; no local fixtures'},dependencies:{declared:shaderPackage.dependencies ?? {},review:'declared ranges only; resolved versions unreviewed'},parameterSchema:null,fixtures:[],packet:'videoml-5491a0'});
  entries.sort((a,b)=>a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {schemaVersion:1, upstream:{repository:'https://github.com/heygen-com/hyperframes',commit:COMMIT,registry:'registry/registry.json', shaderRegistry:shaderPath}, counts:{registry:items.length,shaders:entries.length-items.length,total:entries.length,verified:0},entries};
}
// Keep upstream identity and source declarations immutable while retaining local work.
export function mergeCatalog(inventory, existing) {
  if (existing.schemaVersion !== inventory.schemaVersion || JSON.stringify(existing.upstream) !== JSON.stringify(inventory.upstream)) throw new Error('Upstream catalog provenance drift');
  if (!Array.isArray(existing.entries)) throw new Error('Invalid existing catalog entries');
  const old = new Map();
  for (const entry of existing.entries) {
    if (old.has(entry.id)) throw new Error(`Duplicate catalog id ${entry.id}`);
    old.set(entry.id, entry);
  }
  if (old.size !== inventory.entries.length) throw new Error('Upstream catalog identity drift: entry count changed');
  const entries = inventory.entries.map(source => {
    const current = old.get(source.id);
    if (!current) throw new Error(`Upstream catalog identity drift: ${source.id}`);
    for (const field of ['id','kind','name','packet']) {
      if (JSON.stringify(source[field]) !== JSON.stringify(current[field])) throw new Error(`Upstream provenance drift: ${source.id} ${field}`);
    }
    if (!current.upstream) throw new Error(`Upstream provenance drift: ${source.id} upstream`);
    const {assetRights: _sourceReview, ...sourceProvenance} = source.upstream;
    const {assetRights: _currentReview, ...currentProvenance} = current.upstream;
    if (JSON.stringify(sourceProvenance) !== JSON.stringify(currentProvenance)) throw new Error(`Upstream provenance drift: ${source.id} upstream`);
    if (typeof current.upstream.assetRights !== 'string' || !current.upstream.assetRights.trim()) throw new Error(`Missing asset rights review: ${source.id}`);
    if (!['planned','implemented','verified'].includes(current.status)) throw new Error(`Invalid status: ${source.id}`);
    if (!Array.isArray(current.fixtures) || current.fixtures.some(path => typeof path !== 'string' || !path.trim())) throw new Error(`Invalid fixtures: ${source.id}`);
    if (current.status === 'verified') {
      if (!current.parameterSchema || typeof current.parameterSchema !== 'object' || Array.isArray(current.parameterSchema) || !Object.keys(current.parameterSchema).length) throw new Error(`Verified entry requires a nonempty parameter schema: ${source.id}`);
      if (!current.fixtures.length) throw new Error(`Verified entry requires fixtures: ${source.id}`);
    }
    return current;
  });
  const counts = {...inventory.counts, verified:entries.filter(entry => entry.status === 'verified').length};
  if (JSON.stringify(existing.counts) !== JSON.stringify(counts)) throw new Error('Catalog count mismatch');
  return {...inventory,counts,entries};
}
function main() {
  const args=process.argv.slice(2); const i=args.indexOf('--upstream');
  if (i<0 || !args[i+1]) throw new Error('Usage: node scripts/import-hyperframes-catalog.mjs --upstream /path/to/pinned/hyperframes [--check]');
  const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const inventory=buildCatalog(resolve(args[i+1]),json(join(project,'catalog/packet-map.json')));
  const targetIndex=args.indexOf('--manifest');
  if (targetIndex >= 0 && !args[targetIndex+1]) throw new Error('--manifest requires a path');
  const target=targetIndex >= 0 ? resolve(args[targetIndex+1]) : join(project,'catalog/manifest.json');
  const result=existsSync(target) ? mergeCatalog(inventory,json(target)) : inventory;
  const output=JSON.stringify(result,null,2)+'\n';
  if (args.includes('--check')) { if (!existsSync(target) || readFileSync(target,'utf8')!==output) throw new Error('Manifest differs from pinned upstream or packet map'); }
  else writeFileSync(target,output);
  console.log(`Registry ${result.counts.registry}, shaders ${result.counts.shaders}, total ${result.counts.total}; verified ${result.counts.verified}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
