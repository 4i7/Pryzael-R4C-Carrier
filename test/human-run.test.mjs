import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from '../src/judge-envelope.mjs';
import { buildPublicSyntheticSlots, buildPublicTaskAuthority } from '../src/public-task-authority.mjs';
import { captureResponse } from '../src/response-capture.mjs';
import { deriveJudgeBlindId } from '../src/slots.mjs';
import { buildSubjectEnvelope } from '../src/subject-envelope.mjs';
import { renderAbsent } from '../src/condition-renderer.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const frozenSource = resolve(repositoryRoot, 'frozen-pryzael');
const currentCarrierHead = execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const slots = buildPublicSyntheticSlots();
const stateName = 'private-run-state.json';
const hasFrozenCheckout = existsSync(resolve(frozenSource, '.git'));

const baseAttestation = Object.freeze({
  temporaryChat: true,
  outsideProjects: true,
  personalization: false,
  nativePryzael: false,
  pluginPryzael: false,
  mcpPryzael: false,
  candidateMaterial: false,
  sessionReused: false,
  model: 'GPT-5.6 Sol',
  product: 'ChatGPT Web Temporary Chat',
  ordinaryTools: ['GitHub']
});

function runHuman(args) {
  return spawnSync(npmCommand, ['--silent', 'run', 'human-run', '--', ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env }
  });
}

function diagnostics(result) {
  return `status=${result.status}\nstdout=${result.stdout ?? ''}\nstderr=${result.stderr ?? ''}`;
}

function assertPass(result) {
  assert.equal(result.status, 0, diagnostics(result));
}

function assertFail(result, pattern) {
  assert.notEqual(result.status, 0, diagnostics(result));
  assert.match(`${result.stdout ?? ''}\n${result.stderr ?? ''}`, pattern, diagnostics(result));
}

function makeRunDir() {
  return mkdtempSync(join(tmpdir(), 'pryzael-r4c-human-'));
}

function initRun() {
  const runDir = makeRunDir();
  const result = runHuman([
    'init',
    '--run-dir', runDir,
    '--pryzael-source', frozenSource,
    '--carrier-main', currentCarrierHead
  ]);
  assertPass(result);
  return runDir;
}

function slotBy(taskId, conditionId) {
  const slot = slots.find((entry) => entry.taskId === taskId && entry.conditionId === conditionId);
  assert.ok(slot);
  return slot;
}

function writeAttestation(runDir, slot, attestation = baseAttestation) {
  const path = join(runDir, `attestation-${slot.slotId}.json`);
  writeFileSync(path, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
  return path;
}

function prepareSubject(runDir, slot, attestation = baseAttestation) {
  const attestationFile = writeAttestation(runDir, slot, attestation);
  const result = runHuman([
    'prepare-subject',
    '--run-dir', runDir,
    '--slot', slot.slotId,
    '--attestation-file', attestationFile
  ]);
  assertPass(result);
  return join(runDir, 'subjects', `${slot.slotId}.subject.bin`);
}

function captureResponseFile(runDir, slot, bytes) {
  const input = join(runDir, `operator-response-${slot.slotId}.bin`);
  writeFileSync(input, bytes);
  const result = runHuman([
    'capture-response',
    '--run-dir', runDir,
    '--slot', slot.slotId,
    '--response-file', input
  ]);
  assertPass(result);
  return join(runDir, 'responses', `${slot.slotId}.response.bin`);
}

function prepareJudge(runDir, slot) {
  const result = runHuman(['prepare-judge', '--run-dir', runDir, '--slot', slot.slotId]);
  assertPass(result);
  const state = readState(runDir);
  const record = state.slots.find((entry) => entry.slotId === slot.slotId);
  assert.ok(record?.judgeBlindId);
  return {
    blindId: record.judgeBlindId,
    packetPath: join(runDir, 'judges', `${record.judgeBlindId}.judge.bin`),
    metadataPath: join(runDir, 'judges', `${record.judgeBlindId}.judge.meta.json`)
  };
}

function recordJudgeResult(runDir, blindId, trialResult = { verdict: 'PUBLIC_TEST_RESULT' }) {
  const input = join(runDir, `judge-result-${blindId}.json`);
  writeFileSync(input, `${JSON.stringify(trialResult)}\n`, 'utf8');
  const result = runHuman([
    'record-judge-result',
    '--run-dir', runDir,
    '--blind-id', blindId,
    '--result-file', input
  ]);
  assertPass(result);
}

function completeSlot(runDir, slot, attestation = baseAttestation, responseBytes = Buffer.from(`operator supplied public development response for ${slot.taskId}\n`, 'utf8')) {
  prepareSubject(runDir, slot, attestation);
  captureResponseFile(runDir, slot, responseBytes);
  const judge = prepareJudge(runDir, slot);
  recordJudgeResult(runDir, judge.blindId);
}

function readState(runDir) {
  return JSON.parse(readFileSync(join(runDir, stateName), 'utf8'));
}

function writeState(runDir, state) {
  writeFileSync(join(runDir, stateName), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function withRun(fn) {
  const runDir = initRun();
  try { return fn(runDir); }
  finally { rmSync(runDir, { recursive: true, force: true }); }
}

function frozenTest(name, fn) {
  test(name, { skip: !hasFrozenCheckout }, fn);
}

test('rejects the Carrier repository root as a human run directory before sensitive creation', () => {
  const result = runHuman([
    'init',
    '--run-dir', repositoryRoot,
    '--pryzael-source', repositoryRoot,
    '--carrier-main', currentCarrierHead
  ]);
  assertFail(result, /run directory.*Carrier repository|outside.*worktree|repository root/i);
});

test('rejects a non-existent descendant of the Carrier repository without creating it', () => {
  const descendant = join(repositoryRoot, `.human-run-forbidden-${process.pid}`);
  rmSync(descendant, { recursive: true, force: true });
  const result = runHuman([
    'init',
    '--run-dir', descendant,
    '--pryzael-source', repositoryRoot,
    '--carrier-main', currentCarrierHead
  ]);
  assertFail(result, /run directory.*Carrier repository|outside.*worktree|descendant/i);
  assert.equal(existsSync(descendant), false);
});

test('rejects symlink or junction traversal that resolves back into the Carrier repository', () => {
  const parent = makeRunDir();
  const link = join(parent, 'repo-link');
  try {
    symlinkSync(repositoryRoot, link, process.platform === 'win32' ? 'junction' : 'dir');
    const result = runHuman([
      'init',
      '--run-dir', link,
      '--pryzael-source', repositoryRoot,
      '--carrier-main', currentCarrierHead
    ]);
    assertFail(result, /run directory.*Carrier repository|outside.*worktree|(?:symlink|symbolic-link|junction|reparse)[^\n]{0,120}(?:redirection|traversal|redirected|unsafe filesystem)/i);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

frozenTest('exports exact canonical SUBJECT deliveryBytes unchanged', () => withRun((runDir) => {
  const slot = slotBy('DEV-SIMPLE-001', 'NO_PRYZAEL');
  const exported = prepareSubject(runDir, slot);
  const task = JSON.parse(readFileSync(join(repositoryRoot, 'fixtures/public', slot.taskId, 'task.json'), 'utf8'));
  const taskAuthority = buildPublicTaskAuthority(slot.taskId, task.prompt);
  const expected = buildSubjectEnvelope({ slot, condition: renderAbsent(), taskAuthority, attestation: baseAttestation });
  assert.deepEqual(readFileSync(exported), expected.deliveryBytes);
}));

frozenTest('preserves CRLF, trailing spaces, and multibyte operator response bytes exactly', () => withRun((runDir) => {
  const slot = slotBy('DEV-SIMPLE-001', 'NO_PRYZAEL');
  prepareSubject(runDir, slot);
  const bytes = Buffer.from('alpha  \r\nbeta\t \r\n雪と星  \r\n', 'utf8');
  const stored = captureResponseFile(runDir, slot, bytes);
  assert.deepEqual(readFileSync(stored), bytes);
  const state = readState(runDir);
  const record = state.slots.find((entry) => entry.slotId === slot.slotId);
  const expectedCapture = captureResponse(bytes, { captureMethod: 'OPERATOR_SUPPLIED_CAPTURE_FILE', timestamp: record.response.timestamp });
  assert.equal(record.response.sha256, expectedCapture.sha256);
  assert.equal(record.response.byteCount, bytes.length);
}));

frozenTest('marks malformed UTF-8 human response capture INCONCLUSIVE', () => withRun((runDir) => {
  const slot = slotBy('DEV-SIMPLE-001', 'NO_PRYZAEL');
  prepareSubject(runDir, slot);
  const input = join(runDir, 'invalid-response.bin');
  writeFileSync(input, Buffer.from([0x66, 0x6f, 0x80]));
  const result = runHuman(['capture-response', '--run-dir', runDir, '--slot', slot.slotId, '--response-file', input]);
  assertFail(result, /INCONCLUSIVE|INVALID_UTF8_RESPONSE/i);
  const record = readState(runDir).slots.find((entry) => entry.slotId === slot.slotId);
  assert.equal(record.status, 'INCONCLUSIVE');
  assert.match(record.inconclusiveReason, /INVALID_UTF8_RESPONSE/);
}));

frozenTest('exports Judge packet bytes exactly equal to the canonical Judge builder output', () => withRun((runDir) => {
  const slot = slotBy('DEV-SIMPLE-001', 'NO_PRYZAEL');
  prepareSubject(runDir, slot);
  const responseBytes = Buffer.from('operator supplied exact response bytes\r\nwith trailing space  \r\n', 'utf8');
  const storedResponse = captureResponseFile(runDir, slot, responseBytes);
  const judge = prepareJudge(runDir, slot);
  const state = readState(runDir);
  const record = state.slots.find((entry) => entry.slotId === slot.slotId);
  const capture = captureResponse(readFileSync(storedResponse), { captureMethod: 'OPERATOR_SUPPLIED_CAPTURE_FILE', timestamp: record.response.timestamp });
  const blind = deriveJudgeBlindId(slot, Buffer.from(state.blindingKeyBase64, 'base64'));
  assert.equal(judge.blindId, blind);
  const authority = buildPublicSyntheticJudgeAuthority(readFileSync(join(repositoryRoot, 'fixtures/public/judge-authority.json')));
  const expected = buildJudgeEnvelope({
    judgeBlindId: blind,
    taskAuthorityDigest: slot.taskDigest,
    responseBytes: readFileSync(storedResponse),
    responseCapture: capture,
    judgeAuthority: authority
  });
  assert.deepEqual(readFileSync(judge.packetPath), expected.deliveryBytes);
}));

frozenTest('Judge-facing filename and integrity metadata contain no true condition or slot identity', () => withRun((runDir) => {
  const slot = slotBy('DEV-REPLAN-001', 'CURRENT_PRYZAEL');
  prepareSubject(runDir, slot);
  captureResponseFile(runDir, slot, Buffer.from('opaque operator response\n', 'utf8'));
  const judge = prepareJudge(runDir, slot);
  const visible = `${judge.packetPath}\n${judge.metadataPath}\n${readFileSync(judge.metadataPath, 'utf8')}`;
  assert.doesNotMatch(visible, /CURRENT_PRYZAEL|NO_PRYZAEL/);
  assert.doesNotMatch(visible, new RegExp(slot.slotId));
  assert.doesNotMatch(visible, /conditionId|conditionRenderSha256|trueCondition|blindingKey|routing/i);
}));

frozenTest('final validation fails closed for missing and duplicate human slots', () => withRun((runDir) => {
  for (const slot of slots.slice(0, 3)) completeSlot(runDir, slot);
  const missing = runHuman(['validate', '--run-dir', runDir]);
  assertFail(missing, /exactly 4|missing slot|INCOMPLETE|not complete/i);

  completeSlot(runDir, slots[3]);
  const state = readState(runDir);
  state.slots.push(structuredClone(state.slots[0]));
  writeState(runDir, state);
  const duplicate = runHuman(['validate', '--run-dir', runDir]);
  assertFail(duplicate, /duplicate|exactly 4|unexpected/i);
}));

frozenTest('paired visible host-profile mismatch fails final validation', () => withRun((runDir) => {
  for (const slot of slots) {
    const attestation = slot.taskId === 'DEV-SIMPLE-001' && slot.conditionId === 'CURRENT_PRYZAEL'
      ? { ...baseAttestation, model: 'different-visible-model' }
      : baseAttestation;
    completeSlot(runDir, slot, attestation);
  }
  const result = runHuman(['validate', '--run-dir', runDir]);
  assertFail(result, /host-profile mismatch/i);
}));

frozenTest('human mode never substitutes the tracked synthetic response fixture when no response file was supplied', () => withRun((runDir) => {
  const slot = slotBy('DEV-SIMPLE-001', 'NO_PRYZAEL');
  prepareSubject(runDir, slot);
  const result = runHuman(['prepare-judge', '--run-dir', runDir, '--slot', slot.slotId]);
  assertFail(result, /response.*missing|response.*not captured|explicit response/i);
  assert.equal(existsSync(join(runDir, 'responses', `${slot.slotId}.response.bin`)), false);
  const stateText = readFileSync(join(runDir, stateName), 'utf8');
  const synthetic = readFileSync(join(repositoryRoot, 'fixtures/public', slot.taskId, 'synthetic-response.txt'), 'utf8').trim().slice(0, 48);
  assert.equal(stateText.includes(synthetic), false);
}));

frozenTest('successful public human 4/4 validation remains explicitly NOT_R4C_EVIDENCE', () => withRun((runDir) => {
  for (const slot of slots) completeSlot(runDir, slot);
  const result = runHuman(['validate', '--run-dir', runDir]);
  assertPass(result);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.classification, 'PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN');
  assert.equal(summary.evidenceClassification, 'NOT_R4C_EVIDENCE');
  assert.equal(summary.authoritativeR4cEvidence, false);
  assert.equal(summary.completeness.total, 4);
  assert.equal(summary.hiddenBaselineExecuted, false);
  assert.equal(summary.realTemporaryChatExecution, 'UNVERIFIED');
  assert.equal(summary.realTemporaryChatExecutedByHarness, false);
  assert.equal(Object.hasOwn(summary, 'realTemporaryChatExecuted'), false);
}));
