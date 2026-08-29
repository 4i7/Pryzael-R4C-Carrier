import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthoritativeSlots, authoritativeExpectedIdentity } from '../src/qualification-authority.mjs';
import { validateAuthoritativeCompleteness } from '../src/completeness.mjs';

const expectedIdentity = authoritativeExpectedIdentity();
function slots() { return buildAuthoritativeSlots(); }
function evidence(slot, index = 0, overrides = {}) {
  const responseSha256 = overrides.responseSha256 ?? 'd'.repeat(64);
  const judgeBlindId = overrides.judgeBlindId ?? `jb-${String(index % 10).repeat(64)}`;
  return {
    slotId: slot.slotId,
    qualificationId: slot.qualificationId,
    taskId: slot.taskId,
    taskDigest: slot.taskDigest,
    conditionId: slot.conditionId,
    trialIndex: slot.trialIndex,
    activation: slot.activation,
    surface: slot.surface,
    artifactIdentity: slot.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentArtifactId : 'NONE',
    conditionRenderSha256: slot.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentRenderSha256 : expectedIdentity.absentRenderSha256,
    responseSha256,
    hostProfileDigest: 'h'.repeat(64),
    judgeBlindId,
    judgeResult: { judgeBlindId, taskAuthorityDigest: slot.taskDigest, responseSha256, trialResult: { status: 'OPAQUE' } },
    ...overrides
  };
}

test('authoritative completeness constructs and requires the exact 42-slot matrix internally', () => {
  const expectedSlots = slots();
  assert.equal(expectedSlots.length, 42);
  assert.deepEqual(validateAuthoritativeCompleteness({ evidence: expectedSlots.map(evidence) }), {
    total: 42, NO_PRYZAEL: 21, CURRENT_PRYZAEL: 21, pairedHostProfiles: 21, mode: 'AUTHORITATIVE_42_SLOT_BASELINE'
  });
});

test('rejects missing, duplicate, and unexpected authoritative slots', () => {
  const expectedSlots = slots();
  const base = expectedSlots.map(evidence);
  assert.throws(() => validateAuthoritativeCompleteness({ evidence: base.slice(1) }), /exactly 42|missing slot/);
  const duplicate = structuredClone(base); duplicate[41] = structuredClone(duplicate[0]);
  assert.throws(() => validateAuthoritativeCompleteness({ evidence: duplicate }), /duplicate slot/);
  const unexpected = structuredClone(base); unexpected[41].slotId = 'unexpected';
  assert.throws(() => validateAuthoritativeCompleteness({ evidence: unexpected }), /unexpected slot/);
});

test('rejects frozen authoritative trial identity and task digest drift', () => {
  const expectedSlots = slots();
  for (const [field, value] of [['qualificationId','wrong'],['taskId','wrong'],['taskDigest','0'.repeat(64)],['conditionId','CURRENT_PRYZAEL'],['trialIndex',99],['activation','OTHER'],['surface','OTHER']]) {
    const records = expectedSlots.map(evidence);
    const target = field === 'conditionId' ? records.find((record) => record.conditionId === 'NO_PRYZAEL') : records[0];
    target[field] = value;
    assert.throws(() => validateAuthoritativeCompleteness({ evidence: records }), new RegExp(`${field} mismatch`));
  }
});

test('rejects artifact, render, response, Judge, and paired-host mismatches', () => {
  const expectedSlots = slots();
  const base = expectedSlots.map(evidence);
  for (const [mutate, pattern] of [
    [records => { records[0].artifactIdentity = 'wrong'; }, /artifact identity mismatch/],
    [records => { records.find(record => record.conditionId === 'CURRENT_PRYZAEL').conditionRenderSha256 = '0'.repeat(64); }, /condition render digest mismatch/],
    [records => { records[0].judgeResult.responseSha256 = 'e'.repeat(64); }, /response digest mismatch/],
    [records => { records[0].judgeResult.judgeBlindId = `jb-${'9'.repeat(64)}`; }, /Judge identity mismatch/],
    [records => { records[0].judgeResult.taskAuthorityDigest = '9'.repeat(64); }, /Judge task authority mismatch/],
    [records => { const pair = records.find(record => record.taskId === records[0].taskId && record.trialIndex === records[0].trialIndex && record.conditionId !== records[0].conditionId); pair.hostProfileDigest = 'x'.repeat(64); }, /host-profile mismatch/]
  ]) {
    const records = structuredClone(base); mutate(records);
    assert.throws(() => validateAuthoritativeCompleteness({ evidence: records }), pattern);
  }
});

test('does not interpret TrialResult verdict semantics', () => {
  const expectedSlots = slots();
  const records = expectedSlots.map((slot, index) => evidence(slot, index, { judgeResult: { judgeBlindId: `jb-${String(index % 10).repeat(64)}`, taskAuthorityDigest: slot.taskDigest, responseSha256: 'd'.repeat(64), trialResult: { arbitraryFrozenSemantics: index } } }));
  assert.doesNotThrow(() => validateAuthoritativeCompleteness({ evidence: records }));
});
