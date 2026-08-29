import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gitBlobSha1 } from '../src/frozen-source.mjs';
import { buildFrozenManifestFromMaterial } from '../src/frozen-manifest.mjs';
import { rendererImplementationSha256 } from '../src/condition-renderer.mjs';
import { runPublicDryRunMechanics } from '../src/public-dry-run.mjs';

const identity = { repository: 'repo', sourceCommit: 'c', sourceTree: 't', canonicalSkillsTree: 's', pluginVersion: 'v' };
const semantic = Buffer.from('public synthetic semantic bytes\n');
const manifest = buildFrozenManifestFromMaterial({ actualIdentity: identity, expectedIdentity: identity, materialByPath: new Map([['skills/a/SKILL.md', semantic]]), expectedPathBlobs: [{ path: 'skills/a/SKILL.md', blobSha1: gitBlobSha1(semantic), byteCount: semantic.length }], rendererImplementationSha256: rendererImplementationSha256() });
const tasks = [
  { taskId: 'DEV-SIMPLE-001', prompt: "A cache helper stores values under lower-cased keys but looks them up using the caller's original key. Identify the violated invariant, propose the smallest coherent repair, and name one focused verification that would fail before the repair and pass after it.", syntheticResponse: Buffer.from('Simple public response\n') },
  { taskId: 'DEV-REPLAN-001', prompt: 'A planned migration assumes every consumer accepts schema v2, but repository evidence shows one production consumer still requires v1. Replan the change so progress remains safe and independently verifiable without silently weakening compatibility requirements.', syntheticResponse: Buffer.from('Replan public response\r\n') }
];
const hostAttestation = { temporaryChat: true, outsideProjects: true, personalization: false, nativePryzael: false, pluginPryzael: false, mcpPryzael: false, candidateMaterial: false, sessionReused: false, model: 'PUBLIC-SYNTHETIC-MODEL', product: 'PUBLIC-SYNTHETIC-TEMPORARY-CHAT-PROFILE', ordinaryTools: [] };
const judgeAuthorityBytes = readFileSync(new URL('../fixtures/public/judge-authority.json', import.meta.url));

test('prepares exactly four public SUBJECT/Judge mechanics and validates separate 4-slot completeness', () => {
  const result = runPublicDryRunMechanics({ identity, manifest, materialByPath: new Map([['skills/a/SKILL.md', semantic]]), tasks, judgeAuthorityBytes, hostAttestation, blindingKey: Buffer.alloc(32, 7) });
  assert.equal(result.subjects.length, 4);
  assert.equal(result.judges.length, 4);
  assert.deepEqual(result.completeness, { total: 4, NO_PRYZAEL: 2, CURRENT_PRYZAEL: 2, pairedHostProfiles: 2, mode: 'PUBLIC_SYNTHETIC_4_SLOT_MECHANICS' });
  for (const judge of result.judges) assert.doesNotMatch(JSON.stringify(judge, (_key, value) => Buffer.isBuffer(value) ? value.toString('utf8') : value), /CURRENT_PRYZAEL|NO_PRYZAEL/);
  assert.equal(result.hiddenBaselineExecuted, false);
});
