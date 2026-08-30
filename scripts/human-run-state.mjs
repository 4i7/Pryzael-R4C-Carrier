import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import { validatePublicSyntheticCompleteness } from '../src/completeness.mjs';
import { renderAbsent, renderCurrent } from '../src/condition-renderer.mjs';
import {
  ABSENT_RENDER_SHA256,
  CANONICAL_MANIFEST_SHA256,
  CURRENT_RENDER_SHA256,
  FROZEN_IDENTITY
} from '../src/constants.mjs';
import { loadFrozenMaterial, verifyFrozenIdentity, verifyManifestDigest } from '../src/frozen-source.mjs';
import { sha256Hex, stableJson } from '../src/hash.mjs';
import { buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from '../src/judge-envelope.mjs';
import { buildPublicSyntheticSlots, buildPublicTaskAuthority } from '../src/public-task-authority.mjs';
import { captureResponse } from '../src/response-capture.mjs';
import { deriveJudgeBlindId } from '../src/slots.mjs';
import { buildHostProfile, buildSubjectEnvelope } from '../src/subject-envelope.mjs';
import { buildFromFrozenCheckout } from './build-frozen-manifest.mjs';

export const HUMAN_RUN_CLASSIFICATION = 'PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN';
export const HUMAN_EVIDENCE_CLASSIFICATION = 'NOT_R4C_EVIDENCE';
export const HUMAN_RUN_STATE_FILE = 'private-run-state.json';

const STATE_SCHEMA = 'pryzael-r4c-public-human-run-v2';
const RESPONSE_CAPTURE_METHOD = 'OPERATOR_SUPPLIED_CAPTURE_FILE';
const JUDGE_CAPTURE_METHOD = 'OPERATOR_SUPPLIED_JUDGE_RESULT_FILE';
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const repositoryRoot = realpathSync(resolve(import.meta.dirname, '..'));
const trackedManifestPath = resolve(repositoryRoot, 'frozen/current-manifest.json');
const fixtureRoot = resolve(repositoryRoot, 'fixtures/public');
const SENSITIVE_DIRECTORIES = new Set(['host-attestations', 'subjects', 'responses', 'judges', 'judge-results']);
const SLOT_IDENTITY_FIELDS = Object.freeze([
  'qualificationId',
  'slotId',
  'taskId',
  'taskDigest',
  'conditionId',
  'trialIndex',
  'activation',
  'surface'
]);

export function initializeHumanRun({ runDir: runDirInput, pryzaelSource, carrierMain }) {
  const runDir = resolveExternalRunDirectory(runDirInput, { create: true });
  const statePath = fixedStatePath(runDir, { allowMissing: true });
  if (existsSync(statePath)) throw new Error(`human run state already exists: ${statePath}`);

  const carrier = verifyCarrierSourceIdentity(carrierMain);
  const frozen = verifyFrozenCheckout(pryzaelSource);
  const current = renderCurrent({
    materialByPath: loadFrozenMaterial(frozen.sourceRoot, frozen.manifest),
    manifest: frozen.manifest
  });
  const absent = renderAbsent();
  assertCanonicalFrozenDigests(frozen.manifest, current, absent);

  const blindingKey = randomBytes(32);
  const canonicalSlots = buildPublicSyntheticSlots();
  const slots = canonicalSlots.map((slot) => ({
    ...slot,
    judgeBlindId: deriveJudgeBlindId(slot, blindingKey),
    status: 'INITIALIZED',
    inconclusiveReason: null,
    subject: null,
    response: null,
    judge: null,
    judgeResult: null
  }));

  const state = {
    schemaVersion: STATE_SCHEMA,
    classification: HUMAN_RUN_CLASSIFICATION,
    evidenceClassification: HUMAN_EVIDENCE_CLASSIFICATION,
    authoritativeR4cEvidence: false,
    hiddenBaselineExecuted: false,
    realTemporaryChatExecution: 'UNVERIFIED',
    realTemporaryChatExecutedByHarness: false,
    internalChatGptRoutingState: 'UNVERIFIED',
    carrier,
    frozen: {
      sourceRoot: frozen.sourceRoot,
      identity: frozen.manifest.identity,
      manifestSha256: frozen.manifest.manifestSha256,
      currentRenderSha256: current.conditionRenderSha256,
      absentRenderSha256: absent.conditionRenderSha256
    },
    blindingKeyBase64: blindingKey.toString('base64'),
    slots
  };
  persistStateBytes(runDir, state, { requireExisting: false });

  return Object.freeze({
    status: 'READY',
    classification: HUMAN_RUN_CLASSIFICATION,
    evidenceClassification: HUMAN_EVIDENCE_CLASSIFICATION,
    authoritativeR4cEvidence: false,
    runDirectory: runDir,
    carrierSourceCommit: carrier.sourceCommit,
    carrierSourceTree: carrier.sourceTree,
    frozenSourceCommit: frozen.manifest.identity.sourceCommit,
    currentRenderSha256: current.conditionRenderSha256,
    absentRenderSha256: absent.conditionRenderSha256,
    manifestSha256: frozen.manifest.manifestSha256,
    internalChatGptRoutingState: 'UNVERIFIED',
    hiddenBaselineExecuted: false,
    realTemporaryChatExecution: 'UNVERIFIED',
    realTemporaryChatExecutedByHarness: false,
    slots: canonicalSlots.map(({ slotId, taskId, conditionId, trialIndex, activation, surface }) => ({
      slotId, taskId, conditionId, trialIndex, activation, surface
    }))
  });
}

export function prepareHumanSubject({ runDir: runDirInput, slotId, attestationFile }) {
  const context = loadRunContext(runDirInput);
  const { canonicalSlot, record } = slotContext(context, slotId);
  requireUsableSlot(record);
  if (record.subject) throw new Error(`SUBJECT already prepared for slot ${slotId}`);

  const input = readExternalOperatorInput({
    context,
    record,
    inputPath: attestationFile,
    label: 'host attestation file',
    unavailableCode: 'HOST_ATTESTATION_UNESTABLISHED'
  });
  if (input.inconclusive) return input.inconclusive;

  let attestation;
  try {
    attestation = parseExactJsonObject(input.bytes, 'host attestation');
    buildHostProfile(attestation);
  } catch (error) {
    return markAndPersistInconclusive(context, record, `HOST_ATTESTATION_UNESTABLISHED: ${error.message}`);
  }

  const taskAuthority = readPublicTaskAuthority(canonicalSlot.taskId);
  const condition = conditionForSlot(context, canonicalSlot);
  const subject = buildSubjectEnvelope({ slot: canonicalSlot, condition, taskAuthority, attestation });

  const attestationRelative = `host-attestations/${canonicalSlot.slotId}.attestation.bin`;
  const subjectRelative = `subjects/${canonicalSlot.slotId}.subject.bin`;
  const metadataRelative = `subjects/${canonicalSlot.slotId}.subject.meta.json`;
  const attestationPath = sensitiveArtifactPath(context.runDir, 'host-attestations', `${canonicalSlot.slotId}.attestation.bin`, { createDirectory: true, allowMissingFile: true });
  const deliveryPath = sensitiveArtifactPath(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.bin`, { createDirectory: true, allowMissingFile: true });
  const metadataPath = sensitiveArtifactPath(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.meta.json`, { createDirectory: true, allowMissingFile: true });

  writeSensitiveArtifact(context.runDir, 'host-attestations', `${canonicalSlot.slotId}.attestation.bin`, input.bytes);
  writeSensitiveArtifact(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.bin`, subject.deliveryBytes);
  writeSensitiveArtifact(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.meta.json`, jsonBytes(subjectMetadata(canonicalSlot, subject)));

  record.subject = {
    hostAttestation: {
      file: attestationRelative,
      byteCount: input.bytes.length,
      sha256: sha256Hex(input.bytes)
    },
    hostProfileDigest: subject.hostProfileDigest,
    artifactIdentity: canonicalSlot.conditionId === 'CURRENT_PRYZAEL' ? context.frozen.manifest.identity.sourceCommit : 'NONE',
    conditionRenderSha256: subject.conditionRenderSha256,
    deliveryByteCount: subject.deliveryByteCount,
    deliverySha256: subject.deliverySha256,
    deliveryFile: subjectRelative,
    metadataFile: metadataRelative
  };
  record.status = 'SUBJECT_PREPARED';
  record.inconclusiveReason = null;
  persistState(context);

  return Object.freeze({
    status: 'SUBJECT_PREPARED',
    slotId: canonicalSlot.slotId,
    taskId: canonicalSlot.taskId,
    conditionId: canonicalSlot.conditionId,
    deliveryFile: deliveryPath,
    deliveryByteCount: subject.deliveryByteCount,
    deliverySha256: subject.deliverySha256,
    generatedDeliveryFile: 'EXACT_CANONICAL_BYTES',
    webIngressTransfer: 'HUMAN_OPERATED',
    browserModelVisibleIngressBytes: 'UNVERIFIED',
    hostAttestation: 'ESTABLISHED',
    internalChatGptRoutingState: 'UNVERIFIED'
  });
}

export function captureHumanResponse({ runDir: runDirInput, slotId, responseFile }) {
  const context = loadRunContext(runDirInput);
  const { record } = slotContext(context, slotId);
  requireUsableSlot(record);
  if (!record.subject) throw new Error(`SUBJECT not prepared for slot ${slotId}`);
  if (record.response) throw new Error(`response already captured for slot ${slotId}`);

  const input = readExternalOperatorInput({
    context,
    record,
    inputPath: responseFile,
    label: 'operator response file',
    unavailableCode: 'RESPONSE_BYTES_UNAVAILABLE'
  });
  if (input.inconclusive) return input.inconclusive;

  const timestamp = new Date().toISOString();
  const capture = captureResponse(input.bytes, { captureMethod: RESPONSE_CAPTURE_METHOD, timestamp });
  if (capture.status !== 'CAPTURED') return markAndPersistInconclusive(context, record, capture.reason);

  const relativeFile = `responses/${record.slotId}.response.bin`;
  const responsePath = sensitiveArtifactPath(context.runDir, 'responses', `${record.slotId}.response.bin`, { createDirectory: true, allowMissingFile: true });
  writeSensitiveArtifact(context.runDir, 'responses', `${record.slotId}.response.bin`, input.bytes);
  record.response = {
    captureMethod: capture.captureMethod,
    timestamp: capture.timestamp,
    byteCount: capture.byteCount,
    sha256: capture.sha256,
    file: relativeFile,
    captureClaim: 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY',
    browserBackendInternalBytes: 'UNVERIFIED'
  };
  record.status = 'RESPONSE_CAPTURED';
  record.inconclusiveReason = null;
  persistState(context);

  return Object.freeze({
    status: 'RESPONSE_CAPTURED',
    slotId: record.slotId,
    responseByteCount: capture.byteCount,
    responseSha256: capture.sha256,
    captureClaim: 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY',
    browserBackendInternalBytes: 'UNVERIFIED'
  });
}

export function prepareHumanJudge({ runDir: runDirInput, slotId }) {
  const context = loadRunContext(runDirInput);
  const { canonicalSlot, record } = slotContext(context, slotId);
  requireUsableSlot(record);
  if (!record.response) throw new Error(`explicit response file has not been captured for slot ${slotId}`);
  if (record.judge) throw new Error(`Judge packet already prepared for slot ${slotId}`);

  const response = revalidateResponse(context, canonicalSlot, record);
  const expectedBlindId = deriveJudgeBlindId(canonicalSlot, context.blindingKey);
  requireStoredBlindId(record, expectedBlindId);
  const judgeAuthority = readPublicJudgeAuthority();
  const judge = buildJudgeEnvelope({
    judgeBlindId: expectedBlindId,
    taskAuthorityDigest: canonicalSlot.taskDigest,
    responseBytes: response.bytes,
    responseCapture: response.capture,
    judgeAuthority
  });

  const relativeDelivery = `judges/${expectedBlindId}.judge.bin`;
  const relativeMetadata = `judges/${expectedBlindId}.judge.meta.json`;
  const deliveryPath = sensitiveArtifactPath(context.runDir, 'judges', `${expectedBlindId}.judge.bin`, { createDirectory: true, allowMissingFile: true });
  const metadataPath = sensitiveArtifactPath(context.runDir, 'judges', `${expectedBlindId}.judge.meta.json`, { createDirectory: true, allowMissingFile: true });
  writeSensitiveArtifact(context.runDir, 'judges', `${expectedBlindId}.judge.bin`, judge.deliveryBytes);
  writeSensitiveArtifact(context.runDir, 'judges', `${expectedBlindId}.judge.meta.json`, jsonBytes(judgeMetadata(expectedBlindId, canonicalSlot, response.capture, judge)));

  record.judge = {
    deliveryByteCount: judge.deliveryByteCount,
    deliverySha256: judge.deliverySha256,
    deliveryFile: relativeDelivery,
    metadataFile: relativeMetadata
  };
  record.status = 'JUDGE_PREPARED';
  record.inconclusiveReason = null;
  persistState(context);

  return Object.freeze({
    status: 'JUDGE_PREPARED',
    judgeBlindId: expectedBlindId,
    deliveryFile: deliveryPath,
    deliveryByteCount: judge.deliveryByteCount,
    deliverySha256: judge.deliverySha256,
    generatedDeliveryFile: 'EXACT_CANONICAL_BYTES',
    webIngressTransfer: 'HUMAN_OPERATED',
    browserModelVisibleIngressBytes: 'UNVERIFIED'
  });
}

export function recordHumanJudgeResult({ runDir: runDirInput, blindId, resultFile }) {
  const context = loadRunContext(runDirInput);
  const match = canonicalSlotByBlindId(context, blindId);
  if (!match) throw new Error(`Judge blind identity must resolve to exactly one private slot: ${blindId}`);
  const { canonicalSlot, record } = match;
  requireUsableSlot(record);
  if (!record.judge) throw new Error(`Judge packet not prepared for blind identity ${blindId}`);
  if (record.judgeResult) throw new Error(`Judge result already recorded for blind identity ${blindId}`);
  requireStoredBlindId(record, blindId);
  revalidateJudge(context, canonicalSlot, record);

  const input = readExternalOperatorInput({
    context,
    record,
    inputPath: resultFile,
    label: 'Judge result file',
    unavailableCode: 'JUDGE_RESULT_BYTES_UNAVAILABLE'
  });
  if (input.inconclusive) return input.inconclusive;

  const timestamp = new Date().toISOString();
  const capture = captureResponse(input.bytes, { captureMethod: JUDGE_CAPTURE_METHOD, timestamp });
  if (capture.status !== 'CAPTURED') return markAndPersistInconclusive(context, record, capture.reason);

  let trialResult;
  try {
    trialResult = parseExactJsonObject(input.bytes, 'Judge result');
  } catch (error) {
    return markAndPersistInconclusive(context, record, `JUDGE_RESULT_JSON_INVALID: ${error.message}`);
  }

  const relativeFile = `judge-results/${blindId}.result.bin`;
  const preservedPath = sensitiveArtifactPath(context.runDir, 'judge-results', `${blindId}.result.bin`, { createDirectory: true, allowMissingFile: true });
  writeSensitiveArtifact(context.runDir, 'judge-results', `${blindId}.result.bin`, input.bytes);

  const response = revalidateResponse(context, canonicalSlot, record);
  record.judgeResult = {
    judgeBlindId: blindId,
    taskAuthorityDigest: canonicalSlot.taskDigest,
    responseSha256: response.capture.sha256,
    trialResult,
    original: {
      captureMethod: capture.captureMethod,
      timestamp: capture.timestamp,
      byteCount: capture.byteCount,
      sha256: capture.sha256,
      file: relativeFile
    }
  };
  record.status = 'COMPLETE';
  record.inconclusiveReason = null;
  persistState(context);

  return Object.freeze({
    status: 'JUDGE_RESULT_RECORDED',
    judgeBlindId: blindId,
    byteCount: capture.byteCount,
    sha256: capture.sha256,
    trialResultSemantics: 'OPAQUE_PUBLIC_JUDGE_RESULT_OBJECT'
  });
}

export function validateHumanRun({ runDir: runDirInput }) {
  const context = loadRunContext(runDirInput);
  const state = context.state;
  const inconclusive = state.slots.filter((record) => record.status === 'INCONCLUSIVE');
  if (inconclusive.length > 0) {
    throw new Error(`INCONCLUSIVE human slot remains unresolved: ${inconclusive.map((record) => record.slotId).join(',')}`);
  }

  const evidence = [];
  for (const canonicalSlot of context.canonicalSlots) {
    const record = findUniqueSlot(state, canonicalSlot.slotId);
    if (record.status !== 'COMPLETE' || !record.subject || !record.response || !record.judge || !record.judgeResult) {
      throw new Error(`human slot not complete: ${canonicalSlot.slotId}`);
    }
    const subject = revalidateSubject(context, canonicalSlot, record);
    const response = revalidateResponse(context, canonicalSlot, record);
    const judge = revalidateJudge(context, canonicalSlot, record, response);
    const judgeResult = revalidateJudgeResult(context, canonicalSlot, record, response, judge.blindId);
    evidence.push({
      ...canonicalSlot,
      artifactIdentity: canonicalSlot.conditionId === 'CURRENT_PRYZAEL' ? context.frozen.manifest.identity.sourceCommit : 'NONE',
      conditionRenderSha256: subject.conditionRenderSha256,
      hostProfileDigest: subject.hostProfileDigest,
      responseSha256: response.capture.sha256,
      judgeBlindId: judge.blindId,
      judgeResult: {
        judgeBlindId: judge.blindId,
        taskAuthorityDigest: canonicalSlot.taskDigest,
        responseSha256: response.capture.sha256,
        trialResult: judgeResult.trialResult
      }
    });
  }

  const completeness = validatePublicSyntheticCompleteness({
    evidence,
    expectedIdentity: {
      currentArtifactId: context.frozen.manifest.identity.sourceCommit,
      currentRenderSha256: context.frozen.current.conditionRenderSha256,
      absentRenderSha256: context.frozen.absent.conditionRenderSha256
    }
  });

  return Object.freeze({
    status: 'COMPLETE',
    classification: HUMAN_RUN_CLASSIFICATION,
    evidenceClassification: HUMAN_EVIDENCE_CLASSIFICATION,
    authoritativeR4cEvidence: false,
    hiddenBaselineExecuted: false,
    generatedDeliveryFile: 'EXACT_CANONICAL_BYTES',
    webIngressTransfer: 'HUMAN_OPERATED',
    browserModelVisibleIngressBytes: 'UNVERIFIED',
    realTemporaryChatExecution: 'UNVERIFIED',
    realTemporaryChatExecutedByHarness: false,
    subjectJudgeIsolation: 'HUMAN_OBSERVED_OPERATOR_ATTESTED_NOT_MECHANICALLY_VERIFIED',
    responseCaptureClaim: 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY',
    browserBackendInternalResponseBytes: 'UNVERIFIED',
    internalChatGptRoutingState: 'UNVERIFIED',
    completeness
  });
}

function loadRunContext(runDirInput) {
  const runDir = resolveExternalRunDirectory(runDirInput, { create: false });
  const state = readState(runDir);
  validateStateHeader(state);

  const carrier = verifyCarrierSourceIdentityFresh();
  requireExactObject(state.carrier, carrier, 'Carrier identity state');

  if (typeof state.frozen?.sourceRoot !== 'string' || !state.frozen.sourceRoot) throw new Error('frozen source root missing from coordination state');
  const frozen = verifyFrozenCheckout(state.frozen.sourceRoot);
  const current = renderCurrent({
    materialByPath: loadFrozenMaterial(frozen.sourceRoot, frozen.manifest),
    manifest: frozen.manifest
  });
  const absent = renderAbsent();
  assertCanonicalFrozenDigests(frozen.manifest, current, absent);
  revalidateFrozenCoordinationState(state, frozen, current, absent);

  const canonicalSlots = buildPublicSyntheticSlots();
  const blindingKey = decodeBlindingKeyStrict(state);
  revalidateCanonicalSlotState(state, canonicalSlots, blindingKey);

  return {
    runDir,
    statePath: fixedStatePath(runDir),
    state,
    carrier,
    canonicalSlots,
    blindingKey,
    frozen: { ...frozen, current, absent }
  };
}

function validateStateHeader(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('private human run state object required');
  if (state.schemaVersion !== STATE_SCHEMA) throw new Error(`human run state schema mismatch: expected ${STATE_SCHEMA}, got ${state.schemaVersion}`);
  if (state.classification !== HUMAN_RUN_CLASSIFICATION) throw new Error('human run classification mismatch');
  if (state.evidenceClassification !== HUMAN_EVIDENCE_CLASSIFICATION) throw new Error('human evidence classification mismatch');
  if (state.authoritativeR4cEvidence !== false) throw new Error('human run cannot claim authoritative R4C evidence');
  if (state.hiddenBaselineExecuted !== false) throw new Error('human run cannot claim hidden baseline execution');
  if (state.realTemporaryChatExecution !== 'UNVERIFIED') throw new Error('human run Temporary Chat execution must remain UNVERIFIED');
  if (state.realTemporaryChatExecutedByHarness !== false) throw new Error('human harness must not claim it executed ChatGPT');
}

function revalidateFrozenCoordinationState(state, frozen, current, absent) {
  if (!state.frozen || typeof state.frozen !== 'object') throw new Error('frozen coordination state missing');
  if (realpathSync(state.frozen.sourceRoot) !== frozen.sourceRoot) throw new Error('frozen source root coordination mismatch');
  requireExactObject(state.frozen.identity, frozen.manifest.identity, 'frozen identity state');
  requireEqual(state.frozen.manifestSha256, frozen.manifest.manifestSha256, 'frozen manifest digest state');
  requireEqual(state.frozen.currentRenderSha256, current.conditionRenderSha256, 'CURRENT render digest state');
  requireEqual(state.frozen.absentRenderSha256, absent.conditionRenderSha256, 'ABSENT render digest state');
}

function revalidateCanonicalSlotState(state, canonicalSlots, blindingKey) {
  if (!Array.isArray(state.slots)) throw new Error('private slot coordination array missing');
  if (state.slots.length !== canonicalSlots.length) throw new Error(`private slot coordination must contain exactly ${canonicalSlots.length} slots`);
  const seen = new Set();
  for (const record of state.slots) {
    if (!record || typeof record !== 'object') throw new Error('private slot coordination record invalid');
    if (seen.has(record.slotId)) throw new Error(`duplicate private slot coordination: ${record.slotId}`);
    seen.add(record.slotId);
  }
  for (const slot of canonicalSlots) {
    const record = findUniqueSlot(state, slot.slotId);
    for (const field of SLOT_IDENTITY_FIELDS) requireEqual(record[field], slot[field], `${field} coordination for ${slot.slotId}`);
    requireStoredBlindId(record, deriveJudgeBlindId(slot, blindingKey));
  }
}

function revalidateSubject(context, canonicalSlot, record) {
  if (!record.subject || typeof record.subject !== 'object') throw new Error(`SUBJECT metadata missing for ${canonicalSlot.slotId}`);
  const expectedAttestationRelative = `host-attestations/${canonicalSlot.slotId}.attestation.bin`;
  const expectedSubjectRelative = `subjects/${canonicalSlot.slotId}.subject.bin`;
  const expectedMetadataRelative = `subjects/${canonicalSlot.slotId}.subject.meta.json`;
  requireEqual(record.subject.hostAttestation?.file, expectedAttestationRelative, `host attestation file binding for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.deliveryFile, expectedSubjectRelative, `SUBJECT file binding for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.metadataFile, expectedMetadataRelative, `SUBJECT metadata file binding for ${canonicalSlot.slotId}`);

  const attestationBytes = readSensitiveArtifact(context.runDir, 'host-attestations', `${canonicalSlot.slotId}.attestation.bin`);
  requireEqual(record.subject.hostAttestation?.byteCount, attestationBytes.length, `host attestation byte count for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.hostAttestation?.sha256, sha256Hex(attestationBytes), `host attestation digest for ${canonicalSlot.slotId}`);
  const attestation = parseExactJsonObject(attestationBytes, 'preserved host attestation');
  const host = buildHostProfile(attestation);

  const condition = conditionForSlot(context, canonicalSlot);
  const taskAuthority = readPublicTaskAuthority(canonicalSlot.taskId);
  const subject = buildSubjectEnvelope({ slot: canonicalSlot, condition, taskAuthority, attestation });
  requireEqual(host.digest, subject.hostProfileDigest, `host profile reconstruction for ${canonicalSlot.slotId}`);
  const exported = readSensitiveArtifact(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.bin`);
  requireBufferEqual(exported, subject.deliveryBytes, `canonical SUBJECT bytes for ${canonicalSlot.slotId}`);
  const metadataBytes = readSensitiveArtifact(context.runDir, 'subjects', `${canonicalSlot.slotId}.subject.meta.json`);
  requireBufferEqual(metadataBytes, jsonBytes(subjectMetadata(canonicalSlot, subject)), `SUBJECT metadata bytes for ${canonicalSlot.slotId}`);

  requireEqual(record.subject.hostProfileDigest, subject.hostProfileDigest, `SUBJECT host profile digest state for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.artifactIdentity, canonicalSlot.conditionId === 'CURRENT_PRYZAEL' ? context.frozen.manifest.identity.sourceCommit : 'NONE', `SUBJECT artifact identity state for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.conditionRenderSha256, subject.conditionRenderSha256, `SUBJECT condition render state for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.deliveryByteCount, subject.deliveryByteCount, `SUBJECT byte count state for ${canonicalSlot.slotId}`);
  requireEqual(record.subject.deliverySha256, subject.deliverySha256, `SUBJECT digest state for ${canonicalSlot.slotId}`);
  return subject;
}

function revalidateResponse(context, canonicalSlot, record) {
  if (!record.response || typeof record.response !== 'object') throw new Error(`response metadata missing for ${canonicalSlot.slotId}`);
  requireEqual(record.response.file, `responses/${canonicalSlot.slotId}.response.bin`, `response file binding for ${canonicalSlot.slotId}`);
  requireEqual(record.response.captureMethod, RESPONSE_CAPTURE_METHOD, `response capture method for ${canonicalSlot.slotId}`);
  requireEqual(record.response.captureClaim, 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY', `response capture claim for ${canonicalSlot.slotId}`);
  requireEqual(record.response.browserBackendInternalBytes, 'UNVERIFIED', `response browser/backend claim for ${canonicalSlot.slotId}`);
  if (typeof record.response.timestamp !== 'string' || !record.response.timestamp) throw new Error(`response timestamp missing for ${canonicalSlot.slotId}`);
  const bytes = readSensitiveArtifact(context.runDir, 'responses', `${canonicalSlot.slotId}.response.bin`);
  const capture = captureResponse(bytes, { captureMethod: RESPONSE_CAPTURE_METHOD, timestamp: record.response.timestamp });
  if (capture.status !== 'CAPTURED') throw new Error(`response artifact is INCONCLUSIVE for ${canonicalSlot.slotId}: ${capture.reason}`);
  requireEqual(record.response.byteCount, capture.byteCount, `response byte count state for ${canonicalSlot.slotId}`);
  requireEqual(record.response.sha256, capture.sha256, `response digest state for ${canonicalSlot.slotId}`);
  return { bytes, capture };
}

function revalidateJudge(context, canonicalSlot, record, responseInput = null) {
  if (!record.judge || typeof record.judge !== 'object') throw new Error(`Judge metadata missing for ${canonicalSlot.slotId}`);
  const blindId = deriveJudgeBlindId(canonicalSlot, context.blindingKey);
  requireStoredBlindId(record, blindId);
  requireEqual(record.judge.deliveryFile, `judges/${blindId}.judge.bin`, `Judge file binding for ${canonicalSlot.slotId}`);
  requireEqual(record.judge.metadataFile, `judges/${blindId}.judge.meta.json`, `Judge metadata file binding for ${canonicalSlot.slotId}`);
  const response = responseInput ?? revalidateResponse(context, canonicalSlot, record);
  const judge = buildJudgeEnvelope({
    judgeBlindId: blindId,
    taskAuthorityDigest: canonicalSlot.taskDigest,
    responseBytes: response.bytes,
    responseCapture: response.capture,
    judgeAuthority: readPublicJudgeAuthority()
  });
  const exported = readSensitiveArtifact(context.runDir, 'judges', `${blindId}.judge.bin`);
  requireBufferEqual(exported, judge.deliveryBytes, `canonical Judge bytes for ${canonicalSlot.slotId}`);
  const metadata = readSensitiveArtifact(context.runDir, 'judges', `${blindId}.judge.meta.json`);
  requireBufferEqual(metadata, jsonBytes(judgeMetadata(blindId, canonicalSlot, response.capture, judge)), `Judge metadata bytes for ${canonicalSlot.slotId}`);
  requireEqual(record.judge.deliveryByteCount, judge.deliveryByteCount, `Judge byte count state for ${canonicalSlot.slotId}`);
  requireEqual(record.judge.deliverySha256, judge.deliverySha256, `Judge digest state for ${canonicalSlot.slotId}`);
  return { blindId, judge };
}

function revalidateJudgeResult(context, canonicalSlot, record, response, blindId) {
  if (!record.judgeResult || typeof record.judgeResult !== 'object') throw new Error(`Judge result metadata missing for ${canonicalSlot.slotId}`);
  requireEqual(record.judgeResult.judgeBlindId, blindId, `Judge result blind binding for ${canonicalSlot.slotId}`);
  requireEqual(record.judgeResult.taskAuthorityDigest, canonicalSlot.taskDigest, `Judge result task binding for ${canonicalSlot.slotId}`);
  requireEqual(record.judgeResult.responseSha256, response.capture.sha256, `Judge result response binding for ${canonicalSlot.slotId}`);
  const original = record.judgeResult.original;
  if (!original || typeof original !== 'object') throw new Error(`Judge result original capture metadata missing for ${canonicalSlot.slotId}`);
  requireEqual(original.file, `judge-results/${blindId}.result.bin`, `Judge result file binding for ${canonicalSlot.slotId}`);
  requireEqual(original.captureMethod, JUDGE_CAPTURE_METHOD, `Judge result capture method for ${canonicalSlot.slotId}`);
  if (typeof original.timestamp !== 'string' || !original.timestamp) throw new Error(`Judge result timestamp missing for ${canonicalSlot.slotId}`);
  const bytes = readSensitiveArtifact(context.runDir, 'judge-results', `${blindId}.result.bin`);
  const capture = captureResponse(bytes, { captureMethod: JUDGE_CAPTURE_METHOD, timestamp: original.timestamp });
  if (capture.status !== 'CAPTURED') throw new Error(`Judge result artifact is INCONCLUSIVE for ${canonicalSlot.slotId}: ${capture.reason}`);
  requireEqual(original.byteCount, capture.byteCount, `Judge result byte count state for ${canonicalSlot.slotId}`);
  requireEqual(original.sha256, capture.sha256, `Judge result digest state for ${canonicalSlot.slotId}`);
  const trialResult = parseExactJsonObject(bytes, 'preserved Judge result');
  if (stableJson(record.judgeResult.trialResult) !== stableJson(trialResult)) throw new Error(`Judge result body state mismatch for ${canonicalSlot.slotId}`);
  return { capture, trialResult };
}

function conditionForSlot(context, canonicalSlot) {
  if (canonicalSlot.conditionId === 'CURRENT_PRYZAEL') return context.frozen.current;
  if (canonicalSlot.conditionId === 'NO_PRYZAEL') return context.frozen.absent;
  throw new Error(`unsupported public development condition: ${canonicalSlot.conditionId}`);
}

function slotContext(context, slotId) {
  const canonicalSlot = context.canonicalSlots.find((slot) => slot.slotId === slotId);
  if (!canonicalSlot) throw new Error(`unexpected public development slot: ${slotId}`);
  return { canonicalSlot, record: findUniqueSlot(context.state, slotId) };
}

function canonicalSlotByBlindId(context, blindId) {
  const matches = context.canonicalSlots
    .map((canonicalSlot) => ({
      canonicalSlot,
      record: findUniqueSlot(context.state, canonicalSlot.slotId),
      expectedBlindId: deriveJudgeBlindId(canonicalSlot, context.blindingKey)
    }))
    .filter((entry) => entry.expectedBlindId === blindId);
  if (matches.length !== 1) return null;
  return matches[0];
}

function findUniqueSlot(state, slotId) {
  const matches = state.slots.filter((record) => record?.slotId === slotId);
  if (matches.length !== 1) throw new Error(`slot must resolve to exactly one private record: ${slotId}`);
  return matches[0];
}

function requireUsableSlot(record) {
  if (record.status === 'INCONCLUSIVE') throw new Error(`slot is INCONCLUSIVE and cannot continue: ${record.slotId}`);
}

function requireStoredBlindId(record, expectedBlindId) {
  requireEqual(record.judgeBlindId, expectedBlindId, `Judge blind coordination for ${record.slotId}`);
}

function readPublicTaskAuthority(taskId) {
  const taskPath = join(fixtureRoot, taskId, 'task.json');
  const task = JSON.parse(readFileSync(taskPath, 'utf8'));
  if (!task || task.taskId !== taskId || typeof task.prompt !== 'string') throw new Error(`public task fixture invalid: ${taskId}`);
  return buildPublicTaskAuthority(taskId, task.prompt);
}

function readPublicJudgeAuthority() {
  return buildPublicSyntheticJudgeAuthority(readFileSync(join(fixtureRoot, 'judge-authority.json')));
}

function subjectMetadata(slot, subject) {
  return {
    slotId: slot.slotId,
    byteCount: subject.deliveryByteCount,
    sha256: subject.deliverySha256
  };
}

function judgeMetadata(blindId, canonicalSlot, responseCapture, judge) {
  return {
    judgeBlindId: blindId,
    taskAuthorityDigest: canonicalSlot.taskDigest,
    responseSha256: responseCapture.sha256,
    byteCount: judge.deliveryByteCount,
    sha256: judge.deliverySha256
  };
}

function readExternalOperatorInput({ context, record, inputPath, label, unavailableCode }) {
  if (typeof inputPath !== 'string' || !inputPath) return { inconclusive: markAndPersistInconclusive(context, record, `${unavailableCode}: ${label} path missing`) };
  let canonicalPath;
  try {
    canonicalPath = canonicalizeExternalInput(inputPath, label);
  } catch (error) {
    return { inconclusive: markAndPersistInconclusive(context, record, `${unavailableCode}: ${error.message}`) };
  }
  try {
    const stat = statSync(canonicalPath);
    if (!stat.isFile()) throw new Error(`${label} is not a regular file`);
    return { bytes: readFileSync(canonicalPath), canonicalPath };
  } catch (error) {
    return { inconclusive: markAndPersistInconclusive(context, record, `${unavailableCode}: ${error.message}`) };
  }
}

function markAndPersistInconclusive(context, record, reason) {
  record.status = 'INCONCLUSIVE';
  record.inconclusiveReason = reason;
  persistState(context);
  return Object.freeze({
    status: 'INCONCLUSIVE',
    slotId: record.slotId,
    reason,
    authoritativeR4cEvidence: false,
    hiddenBaselineExecuted: false,
    realTemporaryChatExecution: 'UNVERIFIED',
    realTemporaryChatExecutedByHarness: false
  });
}

function persistState(context) {
  persistStateBytes(context.runDir, context.state, { requireExisting: true });
}

function readState(runDir) {
  const path = fixedStatePath(runDir);
  const bytes = readFileSync(path);
  fixedStatePath(runDir);
  try {
    return JSON.parse(UTF8.decode(bytes));
  } catch (error) {
    throw new Error(`private human run state invalid: ${error.message}`);
  }
}

function persistStateBytes(runDir, state, { requireExisting }) {
  const statePath = fixedStatePath(runDir, { allowMissing: !requireExisting });
  if (requireExisting && !existsSync(statePath)) throw new Error('private human run state missing');
  const bytes = jsonBytes(state);
  const tempName = `.private-run-state.${process.pid}.${randomBytes(12).toString('hex')}.tmp`;
  const tempPath = fixedRootChildPath(runDir, tempName, { allowMissing: true });
  let fd = null;
  try {
    fd = openSync(tempPath, 'wx', 0o600);
    writeFileSync(fd, bytes);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    fixedRootChildPath(runDir, tempName);
    if (requireExisting) fixedStatePath(runDir);
    else fixedStatePath(runDir, { allowMissing: true });
    renameSync(tempPath, statePath);
    fixedStatePath(runDir);
  } catch (error) {
    if (fd !== null) {
      try { closeSync(fd); } catch {}
    }
    try { rmSync(tempPath, { force: true }); } catch {}
    throw error;
  }
}

function fixedStatePath(runDir, { allowMissing = false } = {}) {
  return fixedRootChildPath(runDir, HUMAN_RUN_STATE_FILE, { allowMissing });
}

function fixedRootChildPath(runDir, name, { allowMissing = false } = {}) {
  if (typeof name !== 'string' || !name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') throw new Error('invalid private root child name');
  const canonicalRoot = requireCanonicalRunRoot(runDir);
  const path = join(canonicalRoot, name);
  if (!existsSync(path)) {
    if (!allowMissing) throw new Error(`private run artifact missing: ${name}`);
    assertLexicalDescendant(path, canonicalRoot, 'private run child');
    assertOutsideRepository(path, 'private run child');
    return path;
  }
  const lst = lstatSync(path);
  rejectLinkLike(lst, path);
  if (!lst.isFile()) throw new Error(`private run child is not a regular file: ${path}`);
  const actual = realpathSync(path);
  assertRealDescendant(actual, canonicalRoot, 'private run child');
  assertOutsideRepository(actual, 'private run child');
  return actual;
}

function sensitiveArtifactPath(runDir, directoryName, fileName, { createDirectory = false, allowMissingFile = false } = {}) {
  if (!SENSITIVE_DIRECTORIES.has(directoryName)) throw new Error(`unknown sensitive directory: ${directoryName}`);
  if (typeof fileName !== 'string' || !fileName || fileName.includes('/') || fileName.includes('\\') || fileName === '.' || fileName === '..') throw new Error('invalid sensitive artifact filename');
  const directory = verifySensitiveDirectory(runDir, directoryName, { create: createDirectory });
  const path = join(directory, fileName);
  if (!existsSync(path)) {
    if (!allowMissingFile) throw new Error(`sensitive artifact missing: ${directoryName}/${fileName}`);
    assertLexicalDescendant(path, requireCanonicalRunRoot(runDir), 'sensitive artifact');
    assertOutsideRepository(path, 'sensitive artifact');
    return path;
  }
  const lst = lstatSync(path);
  rejectLinkLike(lst, path);
  if (!lst.isFile()) throw new Error(`sensitive artifact is not a regular file: ${path}`);
  const actual = realpathSync(path);
  assertRealDescendant(actual, requireCanonicalRunRoot(runDir), 'sensitive artifact');
  assertOutsideRepository(actual, 'sensitive artifact');
  return actual;
}

function readSensitiveArtifact(runDir, directoryName, fileName) {
  const path = sensitiveArtifactPath(runDir, directoryName, fileName);
  const bytes = readFileSync(path);
  sensitiveArtifactPath(runDir, directoryName, fileName);
  return bytes;
}

function verifySensitiveDirectory(runDir, directoryName, { create = false } = {}) {
  const canonicalRoot = requireCanonicalRunRoot(runDir);
  const requested = join(canonicalRoot, directoryName);
  assertLexicalDescendant(requested, canonicalRoot, 'sensitive directory');
  assertOutsideRepository(requested, 'sensitive directory');
  if (!existsSync(requested)) {
    if (!create) throw new Error(`sensitive directory missing: ${directoryName}`);
    mkdirSync(requested, { recursive: false, mode: 0o700 });
  }
  const lst = lstatSync(requested);
  rejectLinkLike(lst, requested);
  if (!lst.isDirectory()) throw new Error(`sensitive path is not a directory: ${requested}`);
  const actual = realpathSync(requested);
  assertRealDescendant(actual, canonicalRoot, 'sensitive directory');
  assertOutsideRepository(actual, 'sensitive directory');
  return actual;
}

function writeSensitiveArtifact(runDir, directoryName, fileName, bytes) {
  const path = sensitiveArtifactPath(runDir, directoryName, fileName, { createDirectory: true, allowMissingFile: true });
  writeEstablishedArtifact(path, bytes);
  sensitiveArtifactPath(runDir, directoryName, fileName);
  return path;
}

function writeEstablishedArtifact(path, bytes) {
  const expected = Buffer.from(bytes);
  if (existsSync(path)) {
    const lst = lstatSync(path);
    rejectLinkLike(lst, path);
    if (!lst.isFile()) throw new Error(`established artifact is not a regular file: ${path}`);
    const existing = readFileSync(path);
    if (!existing.equals(expected)) throw new Error(`established evidence artifact differs and will not be overwritten: ${path}`);
    return;
  }
  let fd = null;
  try {
    fd = openSync(path, 'wx', 0o600);
    writeFileSync(fd, expected);
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
  } catch (error) {
    if (fd !== null) {
      try { closeSync(fd); } catch {}
    }
    throw error;
  }
  const actual = readFileSync(path);
  if (!actual.equals(expected)) throw new Error(`established artifact verification failed: ${path}`);
}

function rejectLinkLike(stat, path) {
  if (stat.isSymbolicLink()) throw new Error(`symbolic-link/reparse redirection rejected for private path: ${path}`);
}

function resolveExternalRunDirectory(requested, { create }) {
  if (typeof requested !== 'string' || !requested) throw new Error('run directory required');
  const absolute = resolve(requested);
  assertOutsideRepository(absolute, 'run directory');
  if (!existsSync(absolute)) {
    if (!create) throw new Error(`run directory missing: ${absolute}`);
    const ancestor = nearestExistingAncestor(absolute);
    const actualAncestor = realpathSync(ancestor);
    assertOutsideRepository(actualAncestor, 'run directory ancestor');
    const remaining = relative(ancestor, absolute);
    const projected = resolve(actualAncestor, remaining);
    assertOutsideRepository(projected, 'run directory');
    mkdirSync(absolute, { recursive: true, mode: 0o700 });
  }
  const lst = lstatSync(absolute);
  rejectLinkLike(lst, absolute);
  if (!lst.isDirectory()) throw new Error(`run directory is not a directory: ${absolute}`);
  const canonical = realpathSync(absolute);
  assertOutsideRepository(canonical, 'run directory');
  return canonical;
}

function requireCanonicalRunRoot(runDir) {
  if (typeof runDir !== 'string' || !runDir) throw new Error('run directory required');
  if (!existsSync(runDir)) throw new Error(`run directory missing: ${runDir}`);
  const lst = lstatSync(runDir);
  rejectLinkLike(lst, runDir);
  if (!lst.isDirectory()) throw new Error(`run directory is not a directory: ${runDir}`);
  const canonical = realpathSync(runDir);
  assertOutsideRepository(canonical, 'run directory');
  return canonical;
}

function canonicalizeExternalInput(inputPath, label) {
  if (typeof inputPath !== 'string' || !inputPath) throw new Error(`${label} path missing`);
  const absolute = isAbsolute(inputPath) ? inputPath : resolve(inputPath);
  if (!existsSync(absolute)) throw new Error(`${label} missing: ${absolute}`);
  const canonical = realpathSync(absolute);
  assertOutsideRepository(canonical, label);
  return canonical;
}

function nearestExistingAncestor(path) {
  let cursor = path;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error(`no existing ancestor for path: ${path}`);
    cursor = parent;
  }
  return cursor;
}

function assertOutsideRepository(path, label) {
  const normalized = resolve(path);
  const rel = relative(repositoryRoot, normalized);
  if (rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) {
    throw new Error(`${label} must remain outside the Carrier repository worktree: ${normalized}`);
  }
}

function assertLexicalDescendant(child, parent, label) {
  const rel = relative(parent, child);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} escapes canonical run root`);
}

function assertRealDescendant(child, parent, label) {
  assertLexicalDescendant(realpathSync(child), realpathSync(parent), label);
}

function verifyCarrierSourceIdentity(expectedCommit) {
  const actual = verifyCarrierSourceIdentityFresh();
  if (typeof expectedCommit !== 'string' || !expectedCommit) throw new Error('Carrier main commit required');
  if (actual.sourceCommit !== expectedCommit) throw new Error(`Carrier source commit mismatch: expected ${expectedCommit}, got ${actual.sourceCommit}`);
  return actual;
}

function verifyCarrierSourceIdentityFresh() {
  const sourceCommit = git(repositoryRoot, ['rev-parse', 'HEAD']);
  const sourceTree = git(repositoryRoot, ['rev-parse', 'HEAD^{tree}']);
  return Object.freeze({ sourceCommit, sourceTree });
}

function verifyFrozenCheckout(sourceInput) {
  if (typeof sourceInput !== 'string' || !sourceInput) throw new Error('frozen Pryzael source required');
  const requested = resolve(sourceInput);
  if (!existsSync(requested)) throw new Error(`frozen Pryzael source missing: ${requested}`);
  const sourceRoot = realpathSync(requested);
  if (!statSync(sourceRoot).isDirectory()) throw new Error('frozen Pryzael source is not a directory');
  const manifest = buildFromFrozenCheckout(sourceRoot);
  verifyFrozenIdentity(manifest.identity, FROZEN_IDENTITY);
  verifyManifestDigest(manifest);
  const tracked = JSON.parse(readFileSync(trackedManifestPath, 'utf8'));
  verifyFrozenIdentity(tracked.identity, FROZEN_IDENTITY);
  verifyManifestDigest(tracked);
  if (stableJson(manifest) !== stableJson(tracked)) throw new Error('fresh frozen manifest does not exactly match tracked canonical manifest');
  return { sourceRoot, manifest };
}

function assertCanonicalFrozenDigests(manifest, current, absent) {
  requireEqual(manifest.manifestSha256, CANONICAL_MANIFEST_SHA256, 'canonical manifest SHA-256');
  requireEqual(current.conditionRenderSha256, CURRENT_RENDER_SHA256, 'canonical CURRENT render SHA-256');
  requireEqual(absent.conditionRenderSha256, ABSENT_RENDER_SHA256, 'canonical ABSENT render SHA-256');
}

function decodeBlindingKeyStrict(state) {
  const encoded = state.blindingKeyBase64;
  if (typeof encoded !== 'string' || !encoded) throw new Error('private blinding key missing');
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw new Error('private blinding key encoding is not canonical base64');
  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) throw new Error(`private blinding key must decode to exactly 32 bytes, got ${key.length}`);
  if (key.toString('base64') !== encoded) throw new Error('private blinding key encoding is non-canonical');
  return key;
}

function parseExactJsonObject(bytes, label) {
  const value = JSON.parse(UTF8.decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} object required`);
  return value;
}

function requireExactObject(actual, expected, label) {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(`${label} mismatch`);
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} mismatch: expected ${expected}, got ${actual}`);
}

function requireBufferEqual(actual, expected, label) {
  if (!Buffer.from(actual).equals(Buffer.from(expected))) throw new Error(`${label} mismatch`);
}

function jsonBytes(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}
