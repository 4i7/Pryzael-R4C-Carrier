#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FROZEN_IDENTITY, FROZEN_PATH_BLOBS } from '../src/constants.mjs';
import { rendererImplementationSha256 } from '../src/condition-renderer.mjs';
import { buildFrozenManifestFromMaterial } from '../src/frozen-manifest.mjs';
import { loadFrozenMaterial, verifyFrozenIdentity } from '../src/frozen-source.mjs';
import { stableJson } from '../src/hash.mjs';

export function readFrozenGitIdentity(sourceRoot) {
  const source=resolve(sourceRoot); const git=(...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8'}).trim();
  const plugin=JSON.parse(readFileSync(resolve(source,'.codex-plugin/plugin.json'),'utf8'));
  return Object.freeze({repository:FROZEN_IDENTITY.repository,sourceCommit:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),canonicalSkillsTree:git('rev-parse','HEAD:skills'),pluginVersion:plugin.version});
}
export function buildFromFrozenCheckout(sourceRoot){const actualIdentity=readFrozenGitIdentity(sourceRoot);verifyFrozenIdentity(actualIdentity,FROZEN_IDENTITY);const materialByPath=loadFrozenMaterial(sourceRoot,{entries:FROZEN_PATH_BLOBS});return buildFrozenManifestFromMaterial({actualIdentity,expectedIdentity:FROZEN_IDENTITY,materialByPath,expectedPathBlobs:FROZEN_PATH_BLOBS,rendererImplementationSha256:rendererImplementationSha256(),rendererSourceVerification:true});}
function parseArgs(argv){const result={};for(let i=0;i<argv.length;i+=1){const arg=argv[i];if(arg==='--source'||arg==='--write'||arg==='--check'){if(!argv[i+1])throw new Error(`${arg} requires a value`);result[arg.slice(2)]=argv[++i];}else if(arg==='--print')result.print=true;else throw new Error(`unknown argument: ${arg}`);}if(!result.source)throw new Error('--source is required');return result;}
function main(){const args=parseArgs(process.argv.slice(2));const manifest=buildFromFrozenCheckout(args.source);const serialized=`${JSON.stringify(manifest,null,2)}\n`;if(args.write)writeFileSync(resolve(args.write),serialized,'utf8');if(args.check){const checkPath=resolve(args.check);let matches=false;if(existsSync(checkPath)){try{matches=stableJson(JSON.parse(readFileSync(checkPath,'utf8')))===stableJson(manifest);}catch{matches=false;}}if(!matches){console.error('R4C_GENERATED_MANIFEST_BEGIN');console.error(serialized.trimEnd());console.error('R4C_GENERATED_MANIFEST_END');throw new Error(`frozen manifest mismatch: ${checkPath}`);}}if(args.print)process.stdout.write(serialized);console.error(`CURRENT_RENDER_SHA256=${manifest.conditionRenderSha256}`);console.error(`MANIFEST_SHA256=${manifest.manifestSha256}`);}
const invokedPath=process.argv[1]?pathToFileURL(resolve(process.argv[1])).href:null;if(invokedPath===import.meta.url)main();
