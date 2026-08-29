export function validateCompleteness({ expectedSlots, evidence, expectedIdentity }) {
  if (!Array.isArray(expectedSlots) || expectedSlots.length === 0) throw new Error('expected slots missing');
  if (!Array.isArray(evidence)) throw new Error('evidence set missing');
  if (!expectedIdentity) throw new Error('expected identity missing');

  const expectedById = new Map();
  for (const slot of expectedSlots) {
    if (expectedById.has(slot.slotId)) throw new Error(`duplicate expected slot: ${slot.slotId}`);
    expectedById.set(slot.slotId, slot);
  }
  const seen = new Set();
  for (const record of evidence) {
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
    for (const field of ['qualificationId', 'taskId', 'conditionId', 'trialIndex', 'activation', 'surface']) {
      if (record[field] !== expected[field]) throw new Error(`${field} mismatch for ${record.slotId}: expected ${expected[field]}, got ${record[field]}`);
    }
    const expectedArtifact = expected.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentArtifactId : 'NONE';
    if (record.artifactIdentity !== expectedArtifact) throw new Error(`artifact identity mismatch for ${record.slotId}`);
    const expectedRender = expected.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentRenderSha256 : expectedIdentity.absentRenderSha256;
    if (record.conditionRenderSha256 !== expectedRender) throw new Error(`condition render digest mismatch for ${record.slotId}`);
    if (typeof record.responseSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.responseSha256)) throw new Error(`response digest invalid for ${record.slotId}`);
    if (!record.judgeResult || typeof record.judgeResult !== 'object') throw new Error(`Judge result missing for ${record.slotId}`);
    if (record.judgeResult.responseSha256 !== record.responseSha256) throw new Error(`response digest mismatch between SUBJECT and Judge for ${record.slotId}`);
    if (expected.judgeBlindId && record.judgeResult.judgeBlindId !== expected.judgeBlindId) throw new Error(`Judge identity mismatch for ${record.slotId}`);
    if (!Object.hasOwn(record.judgeResult, 'trialResult')) throw new Error(`Judge TrialResult missing for ${record.slotId}`);
    if (typeof record.hostProfileDigest !== 'string' || record.hostProfileDigest.length === 0) throw new Error(`host profile missing for ${record.slotId}`);

    if (expected.conditionId === 'NO_PRYZAEL') noCount += 1;
    else if (expected.conditionId === 'CURRENT_PRYZAEL') currentCount += 1;
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
  return Object.freeze({ total: evidence.length, NO_PRYZAEL: noCount, CURRENT_PRYZAEL: currentCount, pairedHostProfiles });
}
