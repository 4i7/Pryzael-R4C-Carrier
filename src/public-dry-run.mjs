import { renderAbsent, renderCurrent } from './condition-renderer.mjs';
import { validateCompleteness } from './completeness.mjs';
import { buildJudgeEnvelope } from './judge-envelope.mjs';
import { captureResponse } from './response-capture.mjs';
import { deriveJudgeBlindId, generateSlots } from './slots.mjs';
import { buildSubjectEnvelope } from './subject-envelope.mjs';

export function runPublicDryRunMechanics({ identity, manifest, materialByPath, tasks, authorityEnvelope, judgeAuthority, hostAttestation, blindingKey }) {
  if (!Array.isArray(tasks) || tasks.length !== 2) throw new Error('public dry-run requires exactly two development tasks');
  const byTask = new Map(tasks.map((task) => [task.taskId, task]));
  if (byTask.size !== tasks.length) throw new Error('duplicate public development task');
  for (const required of ['DEV-SIMPLE-001', 'DEV-REPLAN-001']) {
    if (!byTask.has(required)) throw new Error(`required public development task missing: ${required}`);
  }

  const current = renderCurrent({ materialByPath, manifest });
  const absent = renderAbsent();
  const baseSlots = generateSlots({ qualificationId: 'public-r4c-dry-run-v1', taskIds: ['DEV-SIMPLE-001', 'DEV-REPLAN-001'], trialIndices: [0] });
  const expectedSlots = baseSlots.map((slot) => Object.freeze({ ...slot, judgeBlindId: deriveJudgeBlindId(slot, blindingKey) }));
  const subjects = [];
  const judges = [];
  const evidence = [];

  for (const slot of expectedSlots) {
    const task = byTask.get(slot.taskId);
    if (!task || task.syntheticResponse === undefined) throw new Error(`public synthetic response missing: ${slot.taskId}`);
    const condition = slot.conditionId === 'CURRENT_PRYZAEL' ? current : absent;
    const subject = buildSubjectEnvelope({ slot, condition, taskPrompt: task.prompt, authorityEnvelope, attestation: hostAttestation });
    const response = captureResponse(task.syntheticResponse, { captureMethod: 'PUBLIC_SYNTHETIC_FIXTURE', timestamp: null });
    const judge = buildJudgeEnvelope({ judgeBlindId: slot.judgeBlindId, responseBytes: response.responseBytes, responseCapture: response, judgeAuthority });
    subjects.push(subject);
    judges.push(judge);
    evidence.push(Object.freeze({
      qualificationId: slot.qualificationId,
      slotId: slot.slotId,
      taskId: slot.taskId,
      conditionId: slot.conditionId,
      trialIndex: slot.trialIndex,
      artifactIdentity: slot.conditionId === 'CURRENT_PRYZAEL' ? identity.sourceCommit : 'NONE',
      conditionRenderSha256: condition.conditionRenderSha256,
      responseSha256: response.sha256,
      hostProfileDigest: subject.hostProfileDigest,
      judgeResult: Object.freeze({
        judgeBlindId: slot.judgeBlindId,
        responseSha256: response.sha256,
        trialResult: Object.freeze({ evidenceClass: 'PUBLIC_SYNTHETIC_FIXTURE', verdict: 'NOT_R4C_EVIDENCE' })
      })
    }));
  }

  const completeness = validateCompleteness({
    expectedSlots,
    evidence,
    expectedIdentity: {
      currentArtifactId: identity.sourceCommit,
      currentRenderSha256: current.conditionRenderSha256,
      absentRenderSha256: absent.conditionRenderSha256
    }
  });
  return Object.freeze({
    mode: 'PUBLIC_SYNTHETIC_MECHANICS_ONLY',
    subjects: Object.freeze(subjects),
    judges: Object.freeze(judges),
    evidence: Object.freeze(evidence),
    completeness,
    currentRenderSha256: current.conditionRenderSha256,
    absentRenderSha256: absent.conditionRenderSha256,
    hiddenBaselineExecuted: false
  });
}
