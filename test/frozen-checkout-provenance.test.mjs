import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFrozenGitIdentity } from '../scripts/build-frozen-manifest.mjs';
function git(root,...args){return execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
function checkout(remote){const root=mkdtempSync(join(tmpdir(),'r4c-provenance-'));git(root,'init');git(root,'config','user.name','test');git(root,'config','user.email','test@example.invalid');mkdirSync(join(root,'.codex-plugin'),{recursive:true});mkdirSync(join(root,'skills/a'),{recursive:true});writeFileSync(join(root,'.codex-plugin/plugin.json'),'{"version":"0.3.0"}\n');writeFileSync(join(root,'skills/a/SKILL.md'),'x\n');git(root,'add','.');git(root,'commit','-m','fixture');git(root,'remote','add','origin',remote);return root;}
test('rejects a different GitHub repository provenance',()=>{const root=checkout('https://github.com/not-4i7/Pryzael');try{assert.throws(()=>readFrozenGitIdentity(root),/repository mismatch/);}finally{rmSync(root,{recursive:true,force:true});}});
test('recognizes exact HTTPS and SSH repository provenance',()=>{for(const remote of ['https://github.com/4i7/Pryzael','git@github.com:4i7/Pryzael.git']){const root=checkout(remote);try{assert.equal(readFrozenGitIdentity(root).repository,'4i7/Pryzael');}finally{rmSync(root,{recursive:true,force:true});}}});
