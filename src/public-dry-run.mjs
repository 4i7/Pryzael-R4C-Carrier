import { renderAbsent, renderCurrent } from './condition-renderer.mjs';
import { validatePublicSyntheticCompleteness } from './completeness.mjs';
import { buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from './judge-envelope.mjs';
import { buildPublicSyntheticSlots, buildPublicTaskAuthority } from './public-task-authority.mjs';
import { captureResponse } from './response-capture.mjs';
import { deriveJudgeBlindId } from './slots.mjs';
import { buildSubjectEnvelope } from './subject-envelope.mjs';

export function runPublicDryRunMechanics({ identity, manifest, materialByPath, tasks, judgeAuthorityBytes, hostAttestation, blindingKey }) {
  if (!Array.isArray(tasks) || tasks.length !== 2) throw new Error('public dry-run requires exactly two development tasks');
  const byTask = new Map(tasks.map((task) => [task.taskId, task]));
  if (byTask.size !== tasks.length) throw new Error('duplicate public development task');
  for (const required of ['DEV-SIMPLE-001','DEV-REPLAN-001']) if (!byTask.has(required)) throw new Error(`required public development task missing: ${required}`);

  const taskAuthorities = new Map();
  for (const [taskId, task] of byTask) taskAuthorities.set(taskId, buildPublicTaskAuthority(taskId, task.prompt));
  const judgeAuthority = buildPublicSyntheticJudgeAuthority(judgeAuthorityBytes);
  const current = renderCurrent({ materialByPath, manifest });
  const absent = renderAbsent();
  const baseSlots = buildPublicSyntheticSlots();
  const slots = baseSlots.map((slot) => Object.freeze({ ...slot, judgeBlindId: deriveJudgeBlindId(slot, blindingKey) }));
  const subjects = [];
  const judges = [];
  const evidence = [];

  for (const slot of slots) {
    const task = byTask.get(slot.taskId);
    if (!task || task.syntheticResponse === undefined) throw new Error(`public synthetic response missing: ${slot.taskId}`);
    const taskAuthority = taskAuthorities.get(slot.taskId);
    const condition = slot.conditionId === 'CURRENT_PRYZAEL' ? current : absent;
    const subject = buildSubjectEnvelope({ slot, condition, taskAuthority, attestation: hostAttestation });
    const response = captureResponse(task.syntheticResponse, { captureMethod: 'PUBLIC_SYNTHETIC_FIXTURE', timestamp: null });
    if (response.status !== 'CAPTURED') throw new Error(`public synthetic response is not valid exact UTF-8: ${slot.taskId}`);
    const judge = buildJudgeEnvelope({
      judgeBlindId: slot.judgeBlindId,
      taskAuthorityDigest: slot.taskDigest,
      responseBytes: response.responseBytes,
      responseCapture: response,
      judgeAuthority
    });
    subjects.push(subject);
    judges.push(judge);
    evidence.push(Object.freeze({
      qualificationId: slot.qualificationId,
      slotId: slot.slotId,
      taskId: slot.taskId,
      taskDigest: slot.taskDigest,
      conditionId: slot.conditionId,
      trialIndex: slot.trialIndex,
      activation: slot.activation,
      surface: slot.surface,
      artifactIdentity: slot.conditionId === 'CURRENT_PRYZAEL' ? identity.sourceCommit : 'NONE',
      conditionRenderSha256: condition.conditionRenderSha256,
      responseSha256: response.sha256,
      hostProfileDigest: subject.hostProfileDigest,
      judgeBlindId: slot.judgeBlindId,
      judgeResult: Object.freeze({
        judgeBlindId: slot.judgeBlindId,
        taskAuthorityDigest: slot.taskDigest,
        responseSha256: response.sha256,
        trialResult: Object.freeze({ evidenceClass: 'PUBLIC_SYNTHETIC_FIXTURE', verdict: 'NOT_R4C_EVIDENCE' })
      })
    }));
  }

  const completeness = validatePublicSyntheticCompleteness({
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
