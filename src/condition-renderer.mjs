import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RENDERER_VERSION } from './constants.mjs';
import { verifyInventory } from './frozen-source.mjs';
import { sha256Hex } from './hash.mjs';

const SOURCE_PATH = fileURLToPath(import.meta.url);

export function rendererImplementationSha256() {
  return sha256Hex(readFileSync(SOURCE_PATH));
}

export function verifyRendererImplementation(manifest) {
  if (!manifest?.rendererImplementationSha256) throw new Error('renderer implementation identity missing');
  const actual = rendererImplementationSha256();
  if (actual !== manifest.rendererImplementationSha256) {
    throw new Error(`renderer implementation digest mismatch: expected ${manifest.rendererImplementationSha256}, got ${actual}`);
  }
  return true;
}

export function renderCurrent({ materialByPath, manifest }) {
  if (!manifest) throw new Error('CURRENT manifest missing');
  if (manifest.rendererVersion !== RENDERER_VERSION) {
    throw new Error(`renderer version mismatch: expected ${RENDERER_VERSION}, got ${manifest.rendererVersion}`);
  }
  if (manifest.rendererImplementationSha256) verifyRendererImplementation(manifest);
  const verified = verifyInventory(materialByPath, manifest);
  if (verified.length === 0) throw new Error('CURRENT material missing');

  const semanticBytes = Buffer.concat(verified.map((entry) => entry.bytes));
  if (semanticBytes.length === 0) throw new Error('CURRENT material missing');

  const chunks = [
    Buffer.from(`R4C-CONDITION ${RENDERER_VERSION}\nSTATE PRESENT\nSEMANTIC-BYTES ${semanticBytes.length}\nENTRY-COUNT ${verified.length}\n`, 'utf8')
  ];
  for (const entry of verified) {
    chunks.push(Buffer.from(
      `PATH ${entry.path}\nGIT-BLOB-SHA1 ${entry.blobSha1}\nBYTE-COUNT ${entry.byteCount}\nSHA256 ${entry.sha256}\nBEGIN-BYTES\n`,
      'utf8'
    ));
    chunks.push(entry.bytes);
    chunks.push(Buffer.from('\nEND-BYTES\n', 'utf8'));
  }
  chunks.push(Buffer.from('END-R4C-CONDITION\n', 'utf8'));

  const conditionBytes = Buffer.concat(chunks);
  const conditionRenderSha256 = sha256Hex(conditionBytes);
  if (manifest.conditionRenderSha256 && manifest.conditionRenderSha256 !== conditionRenderSha256) {
    throw new Error(`condition render digest mismatch: expected ${manifest.conditionRenderSha256}, got ${conditionRenderSha256}`);
  }
  return Object.freeze({
    state: 'PRESENT',
    rendererVersion: RENDERER_VERSION,
    semanticByteCount: semanticBytes.length,
    semanticBytes,
    conditionBytes,
    conditionRenderSha256
  });
}

export function renderAbsent() {
  const semanticBytes = Buffer.alloc(0);
  const conditionBytes = Buffer.from(
    `R4C-CONDITION ${RENDERER_VERSION}\nSTATE ABSENT\nSEMANTIC-BYTES 0\nENTRY-COUNT 0\nEND-R4C-CONDITION\n`,
    'utf8'
  );
  return Object.freeze({
    state: 'ABSENT',
    rendererVersion: RENDERER_VERSION,
    semanticByteCount: 0,
    semanticBytes,
    conditionBytes,
    conditionRenderSha256: sha256Hex(conditionBytes)
  });
}
