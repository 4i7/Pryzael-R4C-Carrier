#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { FROZEN_IDENTITY, FROZEN_PATH_BLOBS } from '../src/constants.mjs';
import { PUBLIC_JUDGE_AUTHORITY_SHA256 } from '../src/judge-envelope.mjs';
import { sha256Hex } from '../src/hash.mjs';
import { validateQualificationCommitment } from '../src/qualification-authority.mjs';
import { verifyPublicTaskPrompt } from '../src/public-task-authority.mjs';

export const PUBLIC_SCAN_CLAIM = 'MECHANICALLY_DETECTABLE_TRACKED_BOUNDARY_ONLY';
const rootDefault = resolve(import.meta.dirname, '..');
const forbiddenPathClass = /(^|\/)(skills|worker|mcp|evidence|results|private|hidden|held[-_]?out|frozen-pryzael)(\/|$)/i;
const suspiciousPath = /(^|\/)(real[-_]?baseline|routing[-_]?ledger|blind[-_]?mapping|retry[-_]?ledger|r5[-_]?candidate|pr10)(\/|\.|-|_|$)/i;

export function scanTrackedRepository({ root = rootDefault } = {}) {
  const entries = listTrackedEntries(root);
  const paths = entries.map((entry) => entry.path).sort();
  for (const entry of entries) {
    if (entry.mode === '120000') throw new Error(`tracked symlink mode 120000 is forbidden: ${entry.path}`);
    if (entry.mode === '160000') throw new Error(`tracked gitlink/submodule mode 160000 is forbidden: ${entry.path}`);
    if (entry.type !== 'blob' || !['100644','100755'].includes(entry.mode)) throw new Error(`unexpected tracked Git entry ${entry.mode} ${entry.type}: ${entry.path}`);
    if (forbiddenPathClass.test(entry.path)) throw new Error(`forbidden tracked public-boundary path: ${entry.path}`);
    if (suspiciousPath.test(entry.path)) throw new Error(`suspicious hidden/candidate tracked path: ${entry.path}`);
    if (entry.path.startsWith('fixtures/') && !entry.path.startsWith('fixtures/public/')) throw new Error(`non-public fixture path: ${entry.path}`);
  }

  const frozenFiles = paths.filter((path) => path.startsWith('frozen/'));
  const allowedFrozen = ['frozen/current-manifest.json','frozen/qualification-commitment.json'];
  if (JSON.stringify(frozenFiles) !== JSON.stringify(allowedFrozen)) throw new Error(`frozen directory tracked set mismatch: ${frozenFiles.join(', ')}`);
  const manifest = JSON.parse(readTrackedText(root, 'frozen/current-manifest.json'));
  if (JSON.stringify(manifest.identity) !== JSON.stringify(FROZEN_IDENTITY)) throw new Error('frozen manifest identity mismatch');
  if (!Array.isArray(manifest.entries) || manifest.entries.length !== FROZEN_PATH_BLOBS.length) throw new Error(`frozen manifest inventory count mismatch: expected ${FROZEN_PATH_BLOBS.length}, got ${manifest.entries?.length ?? 0}`);
  const expectedPaths = FROZEN_PATH_BLOBS.map((entry) => entry.path).sort();
  const actualPaths = manifest.entries.map((entry) => entry.path).sort();
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) throw new Error('frozen manifest path inventory mismatch');
  const allowedManifestKeys = new Set(['manifestSchemaVersion','identity','rendererVersion','rendererImplementationSha256','entries','conditionRenderSha256','manifestSha256']);
  for (const key of Object.keys(manifest)) if (!allowedManifestKeys.has(key)) throw new Error(`unexpected frozen manifest field: ${key}`);
  for (const entry of manifest.entries) if (Object.keys(entry).sort().join(',') !== 'blobSha1,byteCount,path,sha256') throw new Error(`frozen manifest entry carries unexpected material: ${entry.path ?? '<unknown>'}`);

  const commitment = JSON.parse(readTrackedText(root, 'frozen/qualification-commitment.json'));
  validateQualificationCommitment(commitment);
  const publicTaskIds = paths.filter((path) => /^fixtures\/public\/[^/]+\/task\.json$/.test(path)).map((path) => path.split('/')[2]).sort();
  if (publicTaskIds.join(',') !== 'DEV-REPLAN-001,DEV-SIMPLE-001') throw new Error(`unexpected public task fixture set: ${publicTaskIds.join(',')}`);
  for (const taskId of publicTaskIds) {
    const task = JSON.parse(readTrackedText(root, `fixtures/public/${taskId}/task.json`));
    if (Object.keys(task).sort().join(',') !== 'prompt,taskId' || task.taskId !== taskId) throw new Error(`public task fixture shape/identity mismatch: ${taskId}`);
    verifyPublicTaskPrompt(taskId, Buffer.from(task.prompt, 'utf8'));
    const response = readTrackedBlob(root, `fixtures/public/${taskId}/synthetic-response.txt`);
    try { new TextDecoder('utf-8', { fatal: true }).decode(response); } catch { throw new Error(`public synthetic response invalid UTF-8: ${taskId}`); }
    if (/CURRENT_PRYZAEL|NO_PRYZAEL/u.test(response.toString('utf8'))) throw new Error(`condition identity leaked into public synthetic response: ${taskId}`);
  }
  const judgeAuthority = readTrackedBlob(root, 'fixtures/public/judge-authority.json');
  if (sha256Hex(judgeAuthority) !== PUBLIC_JUDGE_AUTHORITY_SHA256) throw new Error('public synthetic Judge authority fixture digest mismatch');

  return Object.freeze({ files: paths.length, publicTasks: publicTaskIds.length, frozenEntries: manifest.entries.length, claim: PUBLIC_SCAN_CLAIM });
}

export function listTrackedEntries(root) {
  const raw = execFileSync('git', ['-C', resolve(root), 'ls-tree', '-r', '-z', 'HEAD']);
  if (raw.length === 0) throw new Error('tracked Git tree is empty');
  return raw.toString('utf8').split('\0').filter(Boolean).map((record) => {
    const tab = record.indexOf('\t');
    if (tab < 0) throw new Error(`malformed git ls-tree record: ${record}`);
    const [mode, type, sha] = record.slice(0, tab).split(' ');
    return Object.freeze({ mode, type, sha, path: record.slice(tab + 1) });
  });
}

function readTrackedText(root, path) {
  return readTrackedBlob(root, path).toString('utf8');
}

function readTrackedBlob(root, path) {
  return execFileSync('git', ['-C', resolve(root), 'show', `HEAD:${path}`]);
}

function main() {
  const result = scanTrackedRepository();
  console.log(`PUBLIC_REPOSITORY_SCAN=PASS scope=${result.claim} files=${result.files} publicTasks=${result.publicTasks} frozenEntries=${result.frozenEntries}`);
  console.log('PUBLIC_REPOSITORY_SCAN_SEMANTIC_PROOF=NO');
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) main();
