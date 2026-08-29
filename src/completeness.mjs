import { buildAuthoritativeSlots, authoritativeExpectedIdentity } from './qualification-authority.mjs';
import { buildPublicSyntheticSlots } from './public-task-authority.mjs';

export function validateCompleteness(input) {
  return validateAuthoritativeCompleteness(input);
}

export function validateAuthoritativeCompleteness(input) {
  assertExactInputKeys(input, ['evidence'], 'authoritative completeness');
  if (!Array.isArray(input.evidence)) throw new Error('authoritative evidence set missing');
  if (input.evidence.length !== 42) throw new Error(`authoritative completeness requires exactly 42 evidence slots, got ${input.evidence.length}`);
  const result = validateAgainstExpected({
    expectedSlots: buildAuthoritativeSlots(),
    evidence: input.evidence,
    expectedIdentity: authoritativeExpectedIdentity()
  });
  if (result.NO_PRYZAEL !== 21 || result.CURRENT_PRYZAEL !== 21 || result.pairedHostProfiles !== 21) throw new Error('authoritative completeness counts are not 21/21 with 21 paired host profiles');
  return Object.freeze({ ...result, mode: 'AUTHORITATIVE_42_SLOT_BASELINE' });
}

export function validatePublicSyntheticCompleteness({ evidence, expectedIdentity }) {
  if (!Array.isArray(evidence)) throw new Error('public synthetic evidence set missing');
  if (evidence.length !== 4) throw new Error(`public synthetic completeness requires exactly 4 evidence slots, got ${evidence.length}`);
  if (!expectedIdentity || typeof expectedIdentity !== 'object') throw new Error('public synthetic expected identity missing');
  const result = validateAgainstExpected({ expectedSlots: buildPublicSyntheticSlots(), evidence, expectedIdentity });
  if (result.NO_PRYZAEL !== 2 || result.CURRENT_PRYZAEL !== 2 || result.pairedHostProfiles !== 2) throw new Error('public synthetic completeness counts are not 2/2 with 2 paired host profiles');
  return Object.freeze({ ...result, mode: 'PUBLIC_SYNTHETIC_4_SLOT_MECHANICS' });
}

function validateAgainstExpected({ expectedSlots, evidence, expectedIdentity }) {
  const expectedById = new Map(expectedSlots.map((slot) => [slot.slotId, slot]));
  if (expectedById.size !== expectedSlots.length) throw new Error('duplicate internally required slot');
  const seen = new Set();
  for (const record of evidence) {
    if (!record || typeof record !== 'object') throw new Error('slot evidence invalid');
    if (seen.has(record.slotId)) throw new Error(`duplicate slot evidence: ${record.slotId}`);
    seen.add(record.slotId);
    if (!expectedById.has(record.slotId)) throw new Error(`unexpected slot: ${record.slotId}`);
  }
  for (const slotId of expectedById.keys()) if (!seen.has(slotId)) throw new Error(`missing slot: ${slotId}`);

  const byPair = new Map();
  let noCount = 0;
  let currentCount = 0;
  for (const record of evidence) {
    const expected = expectedById.get(record.slotId);
    for (const field of ['qualificationId','taskId','taskDigest','conditionId','trialIndex','activation','surface']) {
      if (record[field] !== expected[field]) throw new Error(`${field} mismatch for ${record.slotId}: expected ${expected[field]}, got ${record[field]}`);
    }
    const expectedArtifact = expected.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentArtifactId : 'NONE';
    if (record.artifactIdentity !== expectedArtifact) throw new Error(`artifact identity mismatch for ${record.slotId}`);
    const expectedRender = expected.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentRenderSha256 : expectedIdentity.absentRenderSha256;
    if (record.conditionRenderSha256 !== expectedRender) throw new Error(`condition render digest mismatch for ${record.slotId}`);
    if (typeof record.responseSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.responseSha256)) throw new Error(`response digest invalid for ${record.slotId}`);
    if (typeof record.judgeBlindId !== 'string' || !/^jb-[0-9a-f]{64}$/.test(record.judgeBlindId)) throw new Error(`Judge blind identity invalid for ${record.slotId}`);
    if (!record.judgeResult || typeof record.judgeResult !== 'object') throw new Error(`Judge result missing for ${record.slotId}`);
    if (record.judgeResult.judgeBlindId !== record.judgeBlindId) throw new Error(`Judge identity mismatch for ${record.slotId}`);
    if (record.judgeResult.taskAuthorityDigest !== expected.taskDigest) throw new Error(`Judge task authority mismatch for ${record.slotId}`);
    if (record.judgeResult.responseSha256 !== record.responseSha256) throw new Error(`response digest mismatch between SUBJECT and Judge for ${record.slotId}`);
    if (!Object.hasOwn(record.judgeResult, 'trialResult')) throw new Error(`Judge TrialResult missing for ${record.slotId}`);
    if (typeof record.hostProfileDigest !== 'string' || record.hostProfileDigest.length === 0) throw new Error(`host profile missing for ${record.slotId}`);

    if (expected.conditionId === 'NO_PRYZAEL') noCount += 1;
    else currentCount += 1;
    const pairKey = `${expected.qualificationId}\u0000${expected.taskId}\u0000${expected.trialIndex}`;
    const pair = byPair.get(pairKey) ?? {};
    pair[expected.conditionId] = record.hostProfileDigest;
    byPair.set(pairKey, pair);
  }

  let pairedHostProfiles = 0;
  for (const [pairKey, pair] of byPair) {
    if (pair.NO_PRYZAEL !== undefined && pair.CURRENT_PRYZAEL !== undefined) {
      if (pair.NO_PRYZAEL !== pair.CURRENT_PRYZAEL) throw new Error(`host-profile mismatch for pair ${pairKey}`);
      pairedHostProfiles += 1;
    }
  }
  return { total: evidence.length, NO_PRYZAEL: noCount, CURRENT_PRYZAEL: currentCount, pairedHostProfiles };
}

function assertExactInputKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} input missing`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`unexpected ${label} input shape: ${actual.join(',')}`);
}
