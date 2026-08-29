import { RENDERER_VERSION } from './constants.mjs';
import { renderCurrent } from './condition-renderer.mjs';
import {
  computeManifestSha256,
  gitBlobSha1,
  verifyFrozenIdentity,
  verifyInventory
} from './frozen-source.mjs';
import { sha256Hex, toBuffer } from './hash.mjs';

export function buildFrozenManifestFromMaterial({
  actualIdentity,
  expectedIdentity,
  materialByPath,
  expectedPathBlobs,
  rendererImplementationSha256,
  rendererSourceVerification = true
}) {
  verifyFrozenIdentity(actualIdentity, expectedIdentity);
  if (!Array.isArray(expectedPathBlobs) || expectedPathBlobs.length === 0) {
    throw new Error('expected path/blob inventory missing');
  }
  const material = materialByPath instanceof Map
    ? new Map(materialByPath)
    : new Map(Object.entries(materialByPath ?? {}));

  const entries = [...expectedPathBlobs]
    .map(({ path, blobSha1, byteCount }) => {
      if (!material.has(path)) throw new Error(`missing path: ${path}`);
      const bytes = toBuffer(material.get(path));
      const actualBlobSha1 = gitBlobSha1(bytes);
      if (actualBlobSha1 !== blobSha1) {
        throw new Error(`${path} blobSha1 mismatch: expected ${blobSha1}, got ${actualBlobSha1}`);
      }
      if (bytes.length !== byteCount) {
        throw new Error(`${path} byteCount mismatch: expected ${byteCount}, got ${bytes.length}`);
      }
      return Object.freeze({ path, blobSha1, byteCount, sha256: sha256Hex(bytes) });
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  if (!/^[0-9a-f]{64}$/u.test(rendererImplementationSha256 ?? '')) {
    throw new Error('renderer implementation SHA-256 invalid');
  }

  const provisionalManifest = {
    manifestSchemaVersion: 'r4c-frozen-manifest-v1',
    identity: Object.freeze({ ...actualIdentity }),
    rendererVersion: RENDERER_VERSION,
    rendererImplementationSha256: rendererSourceVerification ? rendererImplementationSha256 : undefined,
    entries
  };

  verifyInventory(material, provisionalManifest);
  const rendered = assertDeterministicCurrentRender({ materialByPath: material, manifest: provisionalManifest });

  const manifest = {
    ...provisionalManifest,
    rendererImplementationSha256,
    conditionRenderSha256: rendered.conditionRenderSha256
  };
  manifest.manifestSha256 = computeManifestSha256(manifest);
  return Object.freeze({
    ...manifest,
    identity: Object.freeze({ ...manifest.identity }),
    entries: Object.freeze(manifest.entries.map((entry) => Object.freeze({ ...entry })))
  });
}

export function assertDeterministicCurrentRender({ materialByPath, manifest, renderCurrentFn = renderCurrent }) {
  const first = renderCurrentFn({ materialByPath, manifest });
  const second = renderCurrentFn({ materialByPath, manifest });
  if (!Buffer.isBuffer(first?.conditionBytes) || !Buffer.isBuffer(second?.conditionBytes)) {
    throw new Error('renderer did not return exact condition bytes');
  }
  if (first.conditionRenderSha256 !== second.conditionRenderSha256 || !first.conditionBytes.equals(second.conditionBytes)) {
    throw new Error('renderer nondeterminism detected');
  }
  return first;
}
