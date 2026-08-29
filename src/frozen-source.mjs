import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { FROZEN_IDENTITY } from './constants.mjs';
import { sha256Hex, stableJson, toBuffer } from './hash.mjs';

const IDENTITY_FIELDS = ['repository', 'sourceCommit', 'sourceTree', 'canonicalSkillsTree', 'pluginVersion'];

export function verifyFrozenIdentity(actual, expected = FROZEN_IDENTITY) {
  if (!actual || typeof actual !== 'object') throw new Error('frozen identity missing');
  for (const field of IDENTITY_FIELDS) {
    if (actual[field] !== expected[field]) {
      throw new Error(`frozen identity ${field} mismatch: expected ${expected[field]}, got ${actual[field]}`);
    }
  }
  return true;
}

export function gitBlobSha1(bytesLike) {
  const bytes = toBuffer(bytesLike);
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

export function verifyInventory(materialByPath, manifest) {
  if (!manifest || !Array.isArray(manifest.entries)) throw new Error('manifest entries missing');
  const material = materialByPath instanceof Map ? new Map(materialByPath) : new Map(Object.entries(materialByPath ?? {}));
  const entries = [...manifest.entries];
  const expectedPaths = entries.map((entry) => entry.path);
  const sortedPaths = [...expectedPaths].sort();
  if (new Set(expectedPaths).size !== expectedPaths.length) throw new Error('manifest duplicate path');
  if (expectedPaths.some((path, index) => path !== sortedPaths[index])) throw new Error('manifest path order is not ordinal');

  for (const path of material.keys()) {
    if (!expectedPaths.includes(path)) throw new Error(`unexpected path: ${path}`);
  }

  const verified = [];
  for (const entry of entries) {
    if (!material.has(entry.path)) throw new Error(`missing path: ${entry.path}`);
    const bytes = toBuffer(material.get(entry.path));
    const actual = {
      path: entry.path,
      blobSha1: gitBlobSha1(bytes),
      byteCount: bytes.length,
      sha256: sha256Hex(bytes)
    };
    for (const field of ['blobSha1', 'byteCount', 'sha256']) {
      if (actual[field] !== entry[field]) {
        throw new Error(`${entry.path} ${field} mismatch: expected ${entry[field]}, got ${actual[field]}`);
      }
    }
    verified.push(Object.freeze({ ...actual, bytes }));
  }
  return verified;
}

export function computeManifestSha256(manifest) {
  const bound = {
    manifestSchemaVersion: manifest.manifestSchemaVersion ?? 'r4c-frozen-manifest-v1',
    identity: manifest.identity,
    rendererVersion: manifest.rendererVersion,
    rendererImplementationSha256: manifest.rendererImplementationSha256,
    entries: (manifest.entries ?? []).map(({ path, blobSha1, byteCount, sha256 }) => ({ path, blobSha1, byteCount, sha256 })),
    conditionRenderSha256: manifest.conditionRenderSha256
  };
  return sha256Hex(stableJson(bound));
}

export function verifyManifestDigest(manifest) {
  if (!manifest?.manifestSha256) throw new Error('manifest digest missing');
  const actual = computeManifestSha256(manifest);
  if (actual !== manifest.manifestSha256) {
    throw new Error(`manifest digest mismatch: expected ${manifest.manifestSha256}, got ${actual}`);
  }
  return true;
}

export function loadFrozenMaterial(sourceRoot, manifest) {
  if (typeof sourceRoot !== 'string' || !sourceRoot) throw new Error('source root required');
  const expectedPaths = new Set((manifest?.entries ?? []).map((entry) => entry.path));
  const discovered = discoverModelVisiblePaths(sourceRoot);
  for (const path of discovered) {
    if (!expectedPaths.has(path)) throw new Error(`unexpected model-visible path: ${path}`);
  }
  for (const path of expectedPaths) {
    if (!discovered.includes(path)) throw new Error(`missing model-visible path: ${path}`);
  }
  const material = new Map();
  for (const path of [...expectedPaths].sort()) {
    material.set(path, readFileSync(join(sourceRoot, ...path.split('/'))));
  }
  return material;
}

export function discoverModelVisiblePaths(sourceRoot) {
  const skillsRoot = join(sourceRoot, 'skills');
  const result = [];
  for (const packageEntry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!packageEntry.isDirectory()) continue;
    const packageRoot = join(skillsRoot, packageEntry.name);
    const skillPath = join(packageRoot, 'SKILL.md');
    try {
      const statEntries = readdirSync(packageRoot, { withFileTypes: true });
      if (statEntries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
        result.push(toRepoPath(sourceRoot, skillPath));
      }
      for (const directory of ['references', 'assets', 'scripts']) {
        const child = statEntries.find((entry) => entry.isDirectory() && entry.name === directory);
        if (child) walkFiles(join(packageRoot, directory), sourceRoot, result);
      }
    } catch (error) {
      throw new Error(`cannot inspect Skill package ${packageEntry.name}: ${error.message}`);
    }
  }
  return result.sort();
}

function walkFiles(directory, sourceRoot, output) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(absolute, sourceRoot, output);
    else if (entry.isFile()) output.push(toRepoPath(sourceRoot, absolute));
  }
}

function toRepoPath(sourceRoot, absolute) {
  return relative(sourceRoot, absolute).split(sep).join('/');
}
