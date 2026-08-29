import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import { validatePublicSyntheticCompleteness } from '../src/completeness.mjs';
import { renderAbsent, renderCurrent } from '../src/condition-renderer.mjs';
import { FROZEN_IDENTITY } from '../src/constants.mjs';
import { loadFrozenMaterial, verifyFrozenIdentity, verifyManifestDigest } from '../src/frozen-source.mjs';
import { stableJson } from '../src/hash.mjs';
import { buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from '../src/judge-envelope.mjs';
import { buildPublicSyntheticSlots, buildPublicTaskAuthority } from '../src/public-task-authority.mjs';
import { captureResponse } from '../src/response-capture.mjs';
import { deriveJudgeBlindId } from '../src/slots.mjs';
import { buildHostProfile, buildSubjectEnvelope } from '../src/subject-envelope.mjs';
import { buildFromFrozenCheckout } from './build-frozen-manifest.mjs';

export const HUMAN_RUN_CLASSIFICATION = 'PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN';
export const HUMAN_EVIDENCE_CLASSIFICATION = 'NOT_R4C_EVIDENCE';
export const HUMAN_RUN_STATE_FILE = 'private-run-state.json';

const STATE_SCHEMA = 'pryzael-r4c-public-human-run-v1';
const RESPONSE_CAPTURE_METHOD = 'OPERATOR_SUPPLIED_CAPTURE_FILE';
const JUDGE_CAPTURE_METHOD = 'OPERATOR_SUPPLIED_JUDGE_RESULT_FILE';
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const repositoryRoot = realpathSync(resolve(import.meta.dirname, '..'));
const trackedManifestPath = resolve(repositoryRoot, 'frozen/current-manifest.json');
const fixtureRoot = resolve(repositoryRoot, 'fixtures/public');

export function initializeHumanRun({ runDir: runDirInput, pryzaelSource, carrierMain }) {
  const runDir = resolveExternalRunDirectory(runDirInput, { create: true });
  const statePath = join(runDir, HUMAN_RUN_STATE_FILE);
  if (existsSync(statePath)) throw new Error(`human run state already exists: ${statePath}`);

  const carrier = verifyCarrierSourceIdentity(carrierMain);
  const frozen = verifyFrozenCheckout(pryzaelSource);
  const absent = renderAbsent();
  const blindingKey = randomBytes(32);
  const slots = buildPublicSyntheticSlots().map((slot) => ({
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
    realTemporaryChatExecuted: false,
    internalChatGptRoutingState: 'UNVERIFIED',
    carrier,
    frozen: {
      sourceRoot: frozen.sourceRoot,
      identity: frozen.manifest.identity,
      manifestSha256: frozen.manifest.manifestSha256,
      currentRenderSha256: frozen.manifest.conditionRenderSha256,
      absentRenderSha256: absent.conditionRenderSha256
    },
    blindingKeyBase64: blindingKey.toString('base64'),
    slots
  };
  writeStateInitial(statePath, state);

  return Object.freeze({
    status: 'READY',
    classification: HUMAN_RUN_CLASSIFICATION,
    evidenceClassification: HUMAN_EVIDENCE_CLASSIFICATION,
    authoritativeR4cEvidence: false,
    runDirectory: runDir,
    carrierSourceCommit: carrier.sourceCommit,
    carrierSourceTree: carrier.sourceTree,
    frozenSourceCommit: frozen.manifest.identity.sourceCommit,
    currentRenderSha256: frozen.manifest.conditionRenderSha256,
    absentRenderSha256: absent.conditionRenderSha256,
    manifestSha256: frozen.manifest.manifestSha256,
    internalChatGptRoutingState: 'UNVERIFIED',
    hiddenBaselineExecuted: false,
    realTemporaryChatExecuted: false,
    slots: slots.map(({ slotId, taskId, conditionId, trialIndex, activation, surface }) => ({ slotId, taskId, conditionId, trialIndex, activation, surface }))
  });
}

export function prepareHumanSubject({ runDir: runDirInput, slotId, attestationFile }) {
  const context = loadRunContext(runDirInput);
  const record = findUniqueSlot(context.state, slotId);
  requireUsableSlot(record);
  if (record.subject) throw new Error(`SUBJECT already prepared for slot ${slotId}`);

  const attestationPath = resolveExternalExistingFile(attestationFile, 'host attestation file');
  let attestation;
  try {
    const attestationBytes = readFileSync(attestationPath);
    attestation = JSON.parse(UTF8.decode(attestationBytes));
    buildHostProfile(attestation);
  } catch (error) {
    return markAndPersistInconclusive(context, record, `HOST_ATTESTATION_UNESTABLISHED: ${error.message}`);
  }

  const canonicalSlot = canonicalSlotById(slotId);
  if (!canonicalSlot) throw new Error(`unexpected public development slot: ${slotId}`);
  const taskAuthority = readPublicTaskAuthority(canonicalSlot.taskId);
  const condition = canonicalSlot.conditionId === 'CURRENT_PRYZAEL'
    ? renderCurrent({ materialByPath: loadFrozenMaterial(context.state.frozen.sourceRoot, context.manifest), manifest: context.manifest })
    : renderAbsent();
  const subject = buildSubjectEnvelope({ slot: canonicalSlot, condition, taskAuthority, attestation });

  const subjectDirectory = ensurePrivateSubdirectory(context.runDir, 'subjects');
  const deliveryPath = join(subjectDirectory, `${canonicalSlot.slotId}.subject.bin`);
  const metadataPath = join(subjectDirectory, `${canonicalSlot.slotId}.subject.meta.json`);
  writeExclusiveBuffer(deliveryPath, subject.deliveryBytes);
  writeExclusiveJson(metadataPath, {
    slotId: canonicalSlot.slotId,
    byteCount: subject.deliveryByteCount,
    sha256: subject.deliverySha256
  });

  record.subject = {
    hostProfileDigest: subject.hostProfileDigest,
    artifactIdentity: canonicalSlot.conditionId === 'CURRENT_PRYZAEL' ? context.state.frozen.identity.sourceCommit : 'NONE',
    conditionRenderSha256: subject.conditionRenderSha256,
    deliveryByteCount: subject.deliveryByteCount,
    deliverySha256: subject.deliverySha256,
    deliveryFile: `subjects/${canonicalSlot.slotId}.subject.bin`,
    metadataFile: `subjects/${canonicalSlot.slotId}.subject.meta.json`
  };
  record.status = 'SUBJECT_PREPARED';
  persistState(context);

  return Object.freeze({
    status: 'SUBJECT_PREPARED',
    slotId: canonicalSlot.slotId,
    taskId: canonicalSlot.taskId,
    conditionId: canonicalSlot.conditionId,
    deliveryFile: deliveryPath,
    deliveryByteCount: subject.deliveryByteCount,
    deliverySha256: subject.deliverySha256,
    hostAttestation: 'ESTABLISHED',
    internalChatGptRoutingState: 'UNVERIFIED'
  });
}

export function captureHumanResponse({ runDir: runDirInput, slotId, responseFile }) {
  const context = loadRunContext(runDirInput);
  const record = findUniqueSlot(context.state, slotId);
  requireUsableSlot(record);
  if (!record.subject) throw new Error(`SUBJECT not prepared for slot ${slotId}`);
  if (record.response) throw new Error(`response already captured for slot ${slotId}`);

  const inputPath = resolveExternalExistingFile(responseFile, 'operator response file');
  const exactBytes = readFileSync(inputPath);
  const timestamp = new Date().toISOString();
  const capture = captureResponse(exactBytes, { captureMethod: RESPONSE_CAPTURE_METHOD, timestamp });
  if (capture.status !== 'CAPTURED') return markAndPersistInconclusive(context, record, capture.reason);

  const responseDirectory = ensurePrivateSubdirectory(context.runDir, 'responses');
  const responsePath = join(responseDirectory, `${record.slotId}.response.bin`);
  writeExclusiveBuffer(responsePath, exactBytes);
  record.response = {
    captureMethod: capture.captureMethod,
    timestamp: capture.timestamp,
    byteCount: capture.byteCount,
    sha256: capture.sha256,
    file: `responses/${record.slotId}.response.bin`,
    captureClaim: 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY',
    browserBackendInternalBytes: 'UNVERIFIED'
  };
  record.status = 'RESPONSE_CAPTURED';
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
  const record = findUniqueSlot(context.state, slotId);
  requireUsableSlot(record);
  if (!record.response) throw new Error(`explicit response file has not been captured for slot ${slotId}`);
  if (record.judge) throw new Error(`Judge packet already prepared for slot ${slotId}`);

  const canonicalSlot = canonicalSlotById(slotId);
  if (!canonicalSlot) throw new Error(`unexpected public development slot: ${slotId}`);
  const responsePath = join(context.runDir, 'responses', `${record.slotId}.response.bin`);
  const responseBytes = readFileSync(responsePath);
  const verifiedCapture = captureResponse(responseBytes, {
    captureMethod: record.response.captureMethod,
    timestamp: record.response.timestamp
  });
  if (verifiedCapture.status !== 'CAPTURED' || verifiedCapture.sha256 !== record.response.sha256 || verifiedCapture.byteCount !== record.response.byteCount) {
    return markAndPersistInconclusive(context, record, 'RESPONSE_CAPTURE_BINDING_MISMATCH');
  }

  const blindingKey = decodeBlindingKey(context.state);
  const expectedBlindId = deriveJudgeBlindId(canonicalSlot, blindingKey);
  if (record.judgeBlindId !== expectedBlindId) return markAndPersistInconclusive(context, record, 'JUDGE_BLIND_ID_MISMATCH');
  const judgeAuthority = buildPublicSyntheticJudgeAuthority(readFileSync(join(fixtureRoot, 'judge-authority.json')));

  let judge;
  try {
    judge = buildJudgeEnvelope({
      judgeBlindId: expectedBlindId,
      taskAuthorityDigest: canonicalSlot.taskDigest,
      responseBytes,
      responseCapture: verifiedCapture,
      judgeAuthority
    });
  } catch (error) {
    return markAndPersistInconclusive(context, record, `JUDGE_PACKET_BUILD_FAILED: ${error.message}`);
  }

  const judgeDirectory = ensurePrivateSubdirectory(context.runDir, 'judges');
  const deliveryPath = join(judgeDirectory, `${expectedBlindId}.judge.bin`);
  const metadataPath = join(judgeDirectory, `${expectedBlindId}.judge.meta.json`);
  writeExclusiveBuffer(deliveryPath, judge.deliveryBytes);
  writeExclusiveJson(metadataPath, {
    judgeBlindId: expectedBlindId,
    byteCount: judge.deliveryByteCount,
    sha256: judge.deliverySha256
  });
  record.judge = {
    deliveryByteCount: judge.deliveryByteCount,
    deliverySha256: judge.deliverySha256,
    deliveryFile: `judges/${expectedBlindId}.judge.bin`,
    metadataFile: `judges/${expectedBlindId}.judge.meta.json`
  };
  record.status = 'JUDGE_PREPARED';
  persistState(context);

  return Object.freeze({
    status: 'JUDGE_PREPARED',
    judgeBlindId: expectedBlindId,
    deliveryFile: deliveryPath,
    deliveryByteCount: judge.deliveryByteCount,
    deliverySha256: judge.deliverySha256
  });
}

export function recordHumanJudgeResult({ runDir: runDirInput, blindId, resultFile }) {
  const context = loadRunContext(runDirInput);
  const matches = context.state.slots.filter((record) => record.judgeBlindId === blindId);
  if (matches.length !== 1) throw new Error(`Judge blind identity must resolve to exactly one private slot: ${blindId}`);
  const record = matches[0];
  requireUsableSlot(record);
  if (!record.judge) throw new Error(`Judge packet not prepared for blind identity ${blindId}`);
  if (record.judgeResult) throw new Error(`Judge result already recorded for blind identity ${blindId}`);

  const canonicalSlot = canonicalSlotById(record.slotId);
  if (!canonicalSlot) throw new Error(`unexpected public development slot: ${record.slotId}`);
  const expectedBlindId = deriveJudgeBlindId(canonicalSlot, decodeBlindingKey(context.state));
  if (expectedBlindId !== blindId) return markAndPersistInconclusive(context, record, 'JUDGE_BLIND_ID_MISMATCH');

  const inputPath = resolveExternalExistingFile(resultFile, 'Judge result file');
  const exactBytes = readFileSync(inputPath);
  const timestamp = new Date().toISOString();
  const capture = captureResponse(exactBytes, { captureMethod: JUDGE_CAPTURE_METHOD, timestamp });
  if (capture.status !== 'CAPTURED') return markAndPersistInconclusive(context, record, capture.reason);

  const resultDirectory = ensurePrivateSubdirectory(context.runDir, 'judge-results');
  const preservedPath = join(resultDirectory, `${blindId}.result.bin`);
  writeExclusiveBuffer(preservedPath, exactBytes);

  let trialResult;
  try {
    trialResult = JSON.parse(UTF8.decode(exactBytes));
  } catch (error) {
    return markAndPersistInconclusive(context, record, `JUDGE_RESULT_JSON_INVALID: ${error.message}`);
  }
  if (!trialResult || typeof trialResult !== 'object' || Array.isArray(trialResult)) {
    return markAndPersistInconclusive(context, record, 'JUDGE_RESULT_TRIAL_RESULT_OBJECT_REQUIRED');
  }

  record.judgeResult = {
    judgeBlindId: blindId,
    taskAuthorityDigest: canonicalSlot.taskDigest,
    responseSha256: record.response.sha256,
    trialResult,
    original: {
      captureMethod: capture.captureMethod,
      timestamp: capture.timestamp,
      byteCount: capture.byteCount,
      sha256: capture.sha256,
      file: `judge-results/${blindId}.result.bin`
    }
  };
  record.status = 'COMPLETE';
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
  if (inconclusive.length > 0) throw new Error(`INCONCLUSIVE human slot remains unresolved: ${inconclusive.map((record) => record.slotId).join(',')}`);

  const blindingKey = decodeBlindingKey(state);
  const evidence = state.slots.map((record) => {
    if (record.status !== 'COMPLETE' || !record.subject || !record.response || !record.judge || !record.judgeResult) {
      throw new Error(`human slot not complete: ${record.slotId}`);
    }

    const responsePath = join(context.runDir, 'responses', `${record.slotId}.response.bin`);
    const responseBytes = readFileSync(responsePath);
    const recapture = captureResponse(responseBytes, {
      captureMethod: record.response.captureMethod,
      timestamp: record.response.timestamp
    });
    if (recapture.status !== 'CAPTURED' || recapture.sha256 !== record.response.sha256 || recapture.byteCount !== record.response.byteCount) {
      throw new Error(`response digest mismatch for ${record.slotId}`);
    }

    const slotIdentity = slotIdentityFromRecord(record);
    const expectedBlindId = deriveJudgeBlindId(slotIdentity, blindingKey);
    if (record.judgeBlindId !== expectedBlindId) throw new Error(`Judge blind-ID mismatch for ${record.slotId}`);
    if (record.judgeResult.judgeBlindId !== record.judgeBlindId) throw new Error(`Judge identity mismatch for ${record.slotId}`);
    if (record.judgeResult.taskAuthorityDigest !== record.taskDigest) throw new Error(`Judge task authority mismatch for ${record.slotId}`);
    if (record.judgeResult.responseSha256 !== record.response.sha256) throw new Error(`response digest mismatch between SUBJECT and Judge for ${record.slotId}`);

    return {
      qualificationId: record.qualificationId,
      slotId: record.slotId,
      taskId: record.taskId,
      taskDigest: record.taskDigest,
      conditionId: record.conditionId,
      trialIndex: record.trialIndex,
      activation: record.activation,
      surface: record.surface,
      artifactIdentity: record.subject.artifactIdentity,
      conditionRenderSha256: record.subject.conditionRenderSha256,
      responseSha256: record.response.sha256,
      hostProfileDigest: record.subject.hostProfileDigest,
      judgeBlindId: record.judgeBlindId,
      judgeResult: {
        judgeBlindId: record.judgeResult.judgeBlindId,
        taskAuthorityDigest: record.judgeResult.taskAuthorityDigest,
        responseSha256: record.judgeResult.responseSha256,
        trialResult: record.judgeResult.trialResult
      }
    };
  });

  const completeness = validatePublicSyntheticCompleteness({
    evidence,
    expectedIdentity: {
      currentArtifactId: state.frozen.identity.sourceCommit,
      currentRenderSha256: state.frozen.currentRenderSha256,
      absentRenderSha256: state.frozen.absentRenderSha256
    }
  });

  return Object.freeze({
    status: 'PASS',
    classification: HUMAN_RUN_CLASSIFICATION,
    evidenceClassification: HUMAN_EVIDENCE_CLASSIFICATION,
    authoritativeR4cEvidence: false,
    completeness,
    currentRenderSha256: state.frozen.currentRenderSha256,
    manifestSha256: state.frozen.manifestSha256,
    absentRenderSha256: state.frozen.absentRenderSha256,
    exactResponseCaptureClaim: 'EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY',
    browserBackendInternalBytes: 'UNVERIFIED',
    internalChatGptRoutingState: 'UNVERIFIED',
    hiddenBaselineExecuted: false,
    realTemporaryChatExecuted: false
  });
}

function loadRunContext(runDirInput) {
  const runDir = resolveExternalRunDirectory(runDirInput, { create: false });
  const statePath = join(runDir, HUMAN_RUN_STATE_FILE);
  if (!existsSync(statePath)) throw new Error(`human run state missing: ${statePath}`);
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  validateStateHeader(state);
  verifyCarrierSourceIdentity(state.carrier.sourceCommit);
  const frozen = verifyFrozenCheckout(state.frozen.sourceRoot);
  if (frozen.manifest.manifestSha256 !== state.frozen.manifestSha256) throw new Error('frozen manifest digest changed after run initialization');
  return { runDir, statePath, state, manifest: frozen.manifest };
}

function validateStateHeader(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new Error('human run state invalid');
  if (state.schemaVersion !== STATE_SCHEMA) throw new Error(`human run state schema mismatch: ${state.schemaVersion}`);
  if (state.classification !== HUMAN_RUN_CLASSIFICATION) throw new Error('human run classification mismatch');
  if (state.evidenceClassification !== HUMAN_EVIDENCE_CLASSIFICATION || state.authoritativeR4cEvidence !== false) throw new Error('human run evidence classification mismatch');
  if (!Array.isArray(state.slots)) throw new Error('human run slots missing');
}

function verifyCarrierSourceIdentity(expectedMain) {
  if (typeof expectedMain !== 'string' || !/^[0-9a-f]{40}$/u.test(expectedMain)) throw new Error('carrier --carrier-main must be an exact 40-hex commit');
  const top = realpathSync(git(repositoryRoot, 'rev-parse', '--show-toplevel'));
  if (top !== repositoryRoot) throw new Error(`Carrier repository root mismatch: expected ${repositoryRoot}, got ${top}`);
  const sourceCommit = git(repositoryRoot, 'rev-parse', 'HEAD');
  if (sourceCommit !== expectedMain) throw new Error(`Carrier source identity mismatch: expected ${expectedMain}, got ${sourceCommit}`);
  const sourceTree = git(repositoryRoot, 'rev-parse', 'HEAD^{tree}');
  return Object.freeze({ expectedMain, sourceCommit, sourceTree });
}

function verifyFrozenCheckout(sourceInput) {
  if (typeof sourceInput !== 'string' || sourceInput.length === 0) throw new Error('--pryzael-source is required');
  const sourceRoot = realpathSync(resolve(sourceInput));
  const generated = buildFromFrozenCheckout(sourceRoot);
  const tracked = JSON.parse(readFileSync(trackedManifestPath, 'utf8'));
  verifyFrozenIdentity(tracked.identity, FROZEN_IDENTITY);
  verifyManifestDigest(tracked);
  if (stableJson(generated) !== stableJson(tracked)) throw new Error('exact frozen Pryzael checkout does not reproduce tracked canonical manifest');
  return Object.freeze({ sourceRoot, manifest: tracked });
}

function readPublicTaskAuthority(taskId) {
  const taskPath = join(fixtureRoot, taskId, 'task.json');
  const task = JSON.parse(readFileSync(taskPath, 'utf8'));
  if (task.taskId !== taskId) throw new Error(`public task identity mismatch: ${taskId}`);
  return buildPublicTaskAuthority(taskId, task.prompt);
}

function canonicalSlotById(slotId) {
  return buildPublicSyntheticSlots().find((slot) => slot.slotId === slotId) ?? null;
}

function slotIdentityFromRecord(record) {
  return {
    qualificationId: record.qualificationId,
    slotId: record.slotId,
    taskId: record.taskId,
    taskDigest: record.taskDigest,
    conditionId: record.conditionId,
    trialIndex: record.trialIndex,
    activation: record.activation,
    surface: record.surface
  };
}

function findUniqueSlot(state, slotId) {
  if (typeof slotId !== 'string' || !/^slot-[0-9a-f]{32}$/u.test(slotId)) throw new Error(`invalid public development slot id: ${slotId}`);
  const matches = state.slots.filter((record) => record.slotId === slotId);
  if (matches.length !== 1) throw new Error(`slot id must resolve to exactly one private run record: ${slotId}`);
  return matches[0];
}

function requireUsableSlot(record) {
  if (record.status === 'INCONCLUSIVE') throw new Error(`INCONCLUSIVE slot cannot continue: ${record.slotId}: ${record.inconclusiveReason}`);
}

function decodeBlindingKey(state) {
  const key = Buffer.from(state.blindingKeyBase64 ?? '', 'base64');
  if (key.length < 32) throw new Error('private blinding state invalid');
  return key;
}

function markAndPersistInconclusive(context, record, reason) {
  record.status = 'INCONCLUSIVE';
  record.inconclusiveReason = String(reason);
  persistState(context);
  return Object.freeze({ status: 'INCONCLUSIVE', slotId: record.slotId, reason: record.inconclusiveReason });
}

function persistState(context) {
  writeFileSync(context.statePath, `${JSON.stringify(context.state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

function writeStateInitial(path, state) {
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

function ensurePrivateSubdirectory(runDir, name) {
  const directory = join(runDir, name);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  return directory;
}

function writeExclusiveBuffer(path, bytes) {
  writeFileSync(path, bytes, { mode: 0o600, flag: 'wx' });
}

function writeExclusiveJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

function resolveExternalRunDirectory(input, { create }) {
  if (typeof input !== 'string' || input.length === 0) throw new Error('--run-dir is required');
  const canonicalCandidate = canonicalizeEvenIfMissing(input);
  assertOutsideCarrier(canonicalCandidate, 'run directory');
  if (create) mkdirSync(canonicalCandidate, { recursive: true, mode: 0o700 });
  if (!existsSync(canonicalCandidate)) throw new Error(`run directory does not exist: ${canonicalCandidate}`);
  const canonical = realpathSync(canonicalCandidate);
  if (!statSync(canonical).isDirectory()) throw new Error(`run directory is not a directory: ${canonical}`);
  assertOutsideCarrier(canonical, 'run directory');
  return canonical;
}

function resolveExternalExistingFile(input, label) {
  if (typeof input !== 'string' || input.length === 0) throw new Error(`${label} is required`);
  const canonical = realpathSync(resolve(input));
  if (!statSync(canonical).isFile()) throw new Error(`${label} is not a file: ${canonical}`);
  assertOutsideCarrier(canonical, label);
  return canonical;
}

function canonicalizeEvenIfMissing(input) {
  let probe = resolve(input);
  const missing = [];
  while (!existsSync(probe)) {
    const parent = dirname(probe);
    if (parent === probe) throw new Error(`cannot establish canonical path for ${input}`);
    missing.unshift(basename(probe));
    probe = parent;
  }
  return resolve(realpathSync(probe), ...missing);
}

function assertOutsideCarrier(candidate, label) {
  if (isSameOrDescendant(repositoryRoot, candidate)) {
    throw new Error(`${label} must be outside the Carrier repository worktree: ${candidate}`);
  }
}

function isSameOrDescendant(root, candidate) {
  const normalizedRoot = platformComparable(root);
  const normalizedCandidate = platformComparable(candidate);
  const rel = relative(normalizedRoot, normalizedCandidate);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function platformComparable(path) {
  return process.platform === 'win32' ? path.toLowerCase() : path;
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}
