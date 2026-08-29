import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildFrozenManifestFromMaterial, assertDeterministicCurrentRender } from '../src/frozen-manifest.mjs';
import { gitBlobSha1, loadFrozenMaterial, verifyFrozenIdentity, verifyInventory } from '../src/frozen-source.mjs';
import { renderAbsent, renderCurrent, rendererImplementationSha256 } from '../src/condition-renderer.mjs';
import { buildPublicSyntheticSlots, buildPublicTaskAuthority } from '../src/public-task-authority.mjs';
import { buildSubjectEnvelope } from '../src/subject-envelope.mjs';
import { captureResponse, verifyResponseCapture } from '../src/response-capture.mjs';
import { buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from '../src/judge-envelope.mjs';
import { validatePublicSyntheticCompleteness } from '../src/completeness.mjs';
import { readFileSync } from 'node:fs';

const identity = { repository: 'repo', sourceCommit: 'commit', sourceTree: 'tree', canonicalSkillsTree: 'skills', pluginVersion: '1.0.0' };
const bytes = Buffer.from('exact semantic bytes\n');
const entryBase = { path: 'skills/a/SKILL.md', blobSha1: gitBlobSha1(bytes), byteCount: bytes.length };
const manifest = buildFrozenManifestFromMaterial({ actualIdentity: identity, expectedIdentity: identity, materialByPath: new Map([[entryBase.path, bytes]]), expectedPathBlobs: [entryBase], rendererImplementationSha256: rendererImplementationSha256() });
const current = renderCurrent({ materialByPath: new Map([[entryBase.path, bytes]]), manifest });
const absent = renderAbsent();
const attestation = { temporaryChat: true, outsideProjects: true, personalization: false, nativePryzael: false, pluginPryzael: false, mcpPryzael: false, candidateMaterial: false, sessionReused: false, model: 'public-test-model', product: 'public-test-product', ordinaryTools: [] };
const prompt = "A cache helper stores values under lower-cased keys but looks them up using the caller's original key. Identify the violated invariant, propose the smallest coherent repair, and name one focused verification that would fail before the repair and pass after it.";
const taskAuthority = buildPublicTaskAuthority('DEV-SIMPLE-001', Buffer.from(prompt));
const publicSlots = buildPublicSyntheticSlots();
const noSlot = publicSlots.find((slot) => slot.taskId === 'DEV-SIMPLE-001' && slot.conditionId === 'NO_PRYZAEL');
const currentSlot = publicSlots.find((slot) => slot.taskId === 'DEV-SIMPLE-001' && slot.conditionId === 'CURRENT_PRYZAEL');
const judgeAuthority = buildPublicSyntheticJudgeAuthority(readFileSync(new URL('../fixtures/public/judge-authority.json', import.meta.url)));

for (const field of ['sourceCommit','sourceTree','canonicalSkillsTree']) test(`fails closed on wrong ${field}`, () => assert.throws(() => verifyFrozenIdentity({ ...identity, [field]: `wrong-${field}` }, identity), /mismatch/));
test('fails closed on wrong or missing Git blob evidence', () => { const exactEntry = { ...entryBase, sha256: createHash('sha256').update(bytes).digest('hex') }; assert.throws(() => verifyInventory(new Map([[entryBase.path, bytes]]), { entries: [{ ...exactEntry, blobSha1: '0'.repeat(40) }] }), /blobSha1 mismatch/); assert.throws(() => verifyInventory(new Map(), { entries: [exactEntry] }), /missing path/); });
test('fails closed on changed file bytes', () => assert.throws(() => renderCurrent({ materialByPath: new Map([[entryBase.path, Buffer.from('exact semantic bytes\r\n')]]), manifest }), /(blobSha1|byteCount|sha256) mismatch/));
test('fails closed on changed rendered digest', () => assert.throws(() => renderCurrent({ materialByPath: new Map([[entryBase.path, bytes]]), manifest: { ...manifest, conditionRenderSha256: '0'.repeat(64) } }), /condition render digest mismatch/));
test('fails closed on renderer nondeterminism', () => { let sequence = 0; assert.throws(() => assertDeterministicCurrentRender({ materialByPath: new Map(), manifest: {}, renderCurrentFn: () => { const conditionBytes = Buffer.from(`nondeterministic-${sequence++}`); return { conditionBytes, conditionRenderSha256: createHash('sha256').update(conditionBytes).digest('hex') }; } }), /renderer nondeterminism/); });

function record(slot, index = 0) {
  const judgeBlindId = `jb-${String(index % 10).repeat(64)}`;
  return { ...slot, artifactIdentity: slot.conditionId === 'CURRENT_PRYZAEL' ? 'artifact' : 'NONE', conditionRenderSha256: slot.conditionId === 'CURRENT_PRYZAEL' ? current.conditionRenderSha256 : absent.conditionRenderSha256, responseSha256: 'a'.repeat(64), hostProfileDigest: 'h'.repeat(64), judgeBlindId, judgeResult: { judgeBlindId, taskAuthorityDigest: slot.taskDigest, responseSha256: 'a'.repeat(64), trialResult: {} } };
}
const expectedIdentity = { currentArtifactId: 'artifact', currentRenderSha256: current.conditionRenderSha256, absentRenderSha256: absent.conditionRenderSha256 };

test('fails closed on missing, duplicate, or unexpected public mechanics slots', () => {
  const records = publicSlots.map(record);
  assert.throws(() => validatePublicSyntheticCompleteness({ evidence: records.slice(1), expectedIdentity }), /exactly 4|missing slot/);
  const duplicate = structuredClone(records); duplicate[3] = structuredClone(duplicate[0]);
  assert.throws(() => validatePublicSyntheticCompleteness({ evidence: duplicate, expectedIdentity }), /duplicate slot evidence/);
  const unexpected = structuredClone(records); unexpected[3].slotId = 'unexpected';
  assert.throws(() => validatePublicSyntheticCompleteness({ evidence: unexpected, expectedIdentity }), /unexpected slot/);
});

test('fails closed on paired host-profile mismatch', () => {
  const evidence = publicSlots.map(record);
  const first = evidence[0];
  const pair = evidence.find((item) => item.taskId === first.taskId && item.trialIndex === first.trialIndex && item.conditionId !== first.conditionId);
  pair.hostProfileDigest = 'x'.repeat(64);
  assert.throws(() => validatePublicSyntheticCompleteness({ evidence, expectedIdentity }), /host-profile mismatch/);
});

test('fails closed on contaminated session attestation', () => assert.throws(() => buildSubjectEnvelope({ slot: noSlot, condition: absent, taskAuthority, attestation: { ...attestation, sessionReused: true } }), /sessionReused mismatch/));
test('fails closed on altered response bytes', () => { const capture = captureResponse(Buffer.from('response\r\n')); assert.throws(() => verifyResponseCapture(Buffer.from('response\n'), capture), /response (byte count|digest) mismatch/); });
test('fails closed on condition identity leakage into Judge envelope', () => { const response = captureResponse(Buffer.from('ordinary response')); assert.throws(() => buildJudgeEnvelope({ judgeBlindId: `jb-${'a'.repeat(64)}`, taskAuthorityDigest: taskAuthority.taskDigest, responseBytes: response.responseBytes, responseCapture: response, judgeAuthority: { ...judgeAuthority, metadata: { conditionId: 'anything' } } }), /unexpected Judge authority shape/); });
test('fails closed when CURRENT material is missing', () => assert.throws(() => buildSubjectEnvelope({ slot: currentSlot, condition: absent, taskAuthority, attestation }), /CURRENT material missing/));
test('fails closed when NO contains semantic material', () => assert.throws(() => buildSubjectEnvelope({ slot: noSlot, condition: current, taskAuthority, attestation }), /semantic material present in NO_PRYZAEL/));
test('fails closed on mechanically detectable candidate/R5 material contamination', () => { const root = mkdtempSync(join(tmpdir(), 'r4c-candidate-')); try { mkdirSync(join(root, 'skills', 'a', 'references'), { recursive: true }); writeFileSync(join(root, 'skills', 'a', 'SKILL.md'), bytes); writeFileSync(join(root, 'skills', 'a', 'references', 'r5-candidate.md'), 'candidate semantics'); assert.throws(() => loadFrozenMaterial(root, { entries: [manifest.entries[0]] }), /unexpected model-visible path/); } finally { rmSync(root, { recursive: true, force: true }); } });
