import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256Hex } from '../src/hash.mjs';
import { buildExternalQualificationTaskAuthority, buildPublicSyntheticSlots, buildPublicTaskAuthority } from '../src/public-task-authority.mjs';
import { buildHostProfile, buildSubjectEnvelope } from '../src/subject-envelope.mjs';

const prompt = "A cache helper stores values under lower-cased keys but looks them up using the caller's original key. Identify the violated invariant, propose the smallest coherent repair, and name one focused verification that would fail before the repair and pass after it.";
const taskAuthority = buildPublicTaskAuthority('DEV-SIMPLE-001', Buffer.from(prompt));
const slot = buildPublicSyntheticSlots().find((entry) => entry.taskId === 'DEV-SIMPLE-001' && entry.conditionId === 'NO_PRYZAEL');
const currentSlot = buildPublicSyntheticSlots().find((entry) => entry.taskId === 'DEV-SIMPLE-001' && entry.conditionId === 'CURRENT_PRYZAEL');
const attestation = Object.freeze({ temporaryChat: true, outsideProjects: true, personalization: false, nativePryzael: false, pluginPryzael: false, mcpPryzael: false, candidateMaterial: false, sessionReused: false, model: 'GPT-5.6 Sol', product: 'ChatGPT Web Temporary Chat', ordinaryTools: ['GitHub'] });
const absent = Object.freeze({ state: 'ABSENT', semanticByteCount: 0, conditionBytes: Buffer.from('ABSENT-CARRIER\n'), conditionRenderSha256: 'a'.repeat(64) });
const current = Object.freeze({ state: 'PRESENT', semanticByteCount: 12, conditionBytes: Buffer.from('PRESENT-CARRIER\nsemantic'), conditionRenderSha256: 'b'.repeat(64) });

test('exports closed SUBJECT envelope API', () => { assert.equal(typeof buildHostProfile, 'function'); assert.equal(typeof buildSubjectEnvelope, 'function'); });

test('builds fail-closed NO envelope from only condition, exact task authority, fixed carrier authority, and host attestation', () => {
  const env = buildSubjectEnvelope({ slot, condition: absent, taskAuthority, attestation });
  assert.equal(env.conditionState, 'ABSENT');
  assert.equal(env.semanticByteCount, 0);
  assert.ok(env.deliveryBytes.includes(taskAuthority.promptBytes));
  assert.equal(env.taskDigest, taskAuthority.taskDigest);
  assert.equal(env.hostProfileDigest.length, 64);
  assert.equal(env.authorityEnvelopeId, 'r4c-neutral-subject-authority-v1');
});

test('CURRENT requires semantic material while NO forbids it', () => {
  assert.doesNotThrow(() => buildSubjectEnvelope({ slot: currentSlot, condition: current, taskAuthority, attestation }));
  assert.throws(() => buildSubjectEnvelope({ slot: currentSlot, condition: absent, taskAuthority, attestation }), /CURRENT material missing/);
  assert.throws(() => buildSubjectEnvelope({ slot, condition: current, taskAuthority, attestation }), /semantic material present in NO_PRYZAEL/);
});

test('rejects observable host/session/candidate contamination', () => {
  for (const [key, value] of [['temporaryChat',false],['outsideProjects',false],['personalization',true],['nativePryzael',true],['pluginPryzael',true],['mcpPryzael',true],['candidateMaterial',true],['sessionReused',true]]) {
    assert.throws(() => buildSubjectEnvelope({ slot, condition: absent, taskAuthority, attestation: { ...attestation, [key]: value } }), new RegExp(key));
  }
});

test('host profile is stable across ordinary-tool order but differs on visible profile changes', () => {
  const a = buildHostProfile({ ...attestation, ordinaryTools: ['Web','GitHub'] });
  const b = buildHostProfile({ ...attestation, ordinaryTools: ['GitHub','Web'] });
  const c = buildHostProfile({ ...attestation, ordinaryTools: ['GitHub','Web'], model: 'other-model' });
  assert.equal(a.digest, b.digest);
  assert.notEqual(a.digest, c.digest);
});

test('SUBJECT rejects every open extension channel instead of semantic denylisting', () => {
  assert.throws(() => buildSubjectEnvelope({ slot, condition: absent, taskAuthority, attestation, authorityEnvelope: 'ordinary' }), /unexpected SUBJECT input/);
  assert.throws(() => buildSubjectEnvelope({ slot, condition: absent, taskAuthority, attestation, notes: 'auxiliary semantics' }), /unexpected SUBJECT input/);
  assert.throws(() => buildHostProfile({ ...attestation, authorizationEnvelope: 'auxiliary semantics' }), /host attestation/);
});

test('future hidden operation accepts externally authenticated prompt bytes without storing them in Carrier', () => {
  const externalPrompt = Buffer.from('external exact prompt bytes supplied by qualification authority');
  const taskDigest = '489c20f710fed044c2075410569a011dd2057ea75fd911865f46491ab1026fa7';
  const authority = buildExternalQualificationTaskAuthority({ taskId: 'QLF-AMBIG-001', taskDigest, promptBytes: externalPrompt, expectedPromptSha256: sha256Hex(externalPrompt) });
  assert.equal(authority.taskDigest, taskDigest);
  assert.deepEqual(authority.promptBytes, externalPrompt);
});
