import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { captureResponse } from '../src/response-capture.mjs';
import { buildPublicSyntheticSlots } from '../src/public-task-authority.mjs';
import { deriveJudgeBlindId } from '../src/slots.mjs';

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

function assertRejected(result) {
  assert.notEqual(result.status, 0, diagnostics(result));
}

function makeRunDir() {
  return mkdtempSync(join(tmpdir(), 'pryzael-r4c-human-security-'));
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

function readState(runDir) {
  return JSON.parse(readFileSync(join(runDir, stateName), 'utf8'));
}

function writeState(runDir, state) {
  writeFileSync(join(runDir, stateName), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function writeAttestation(runDir, slot, attestation = baseAttestation) {
  const path = join(runDir, `attestation-${slot.slotId}.json`);
  writeFileSync(path, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8');
  return path;
}

function prepareSubjectResult(runDir, slot, attestation = baseAttestation) {
  return runHuman([
    'prepare-subject',
    '--run-dir', runDir,
    '--slot', slot.slotId,
    '--attestation-file', writeAttestation(runDir, slot, attestation)
  ]);
}

function prepareSubject(runDir, slot, attestation = baseAttestation) {
  const result = prepareSubjectResult(runDir, slot, attestation);
  assertPass(result);
}

function captureResponseResult(runDir, slot, bytes = Buffer.from(`operator response ${slot.slotId}\n`, 'utf8')) {
  const path = join(runDir, `capture-${slot.slotId}.bin`);
  writeFileSync(path, bytes);
  return runHuman(['capture-response', '--run-dir', runDir, '--slot', slot.slotId, '--response-file', path]);
}

function captureHumanResponse(runDir, slot, bytes) {
  const result = captureResponseResult(runDir, slot, bytes);
  assertPass(result);
}

function prepareJudgeResult(runDir, slot) {
  return runHuman(['prepare-judge', '--run-dir', runDir, '--slot', slot.slotId]);
}

function prepareJudge(runDir, slot) {
  const result = prepareJudgeResult(runDir, slot);
  assertPass(result);
  const record = readState(runDir).slots.find((entry) => entry.slotId === slot.slotId);
  assert.ok(record?.judgeBlindId);
  return record.judgeBlindId;
}

function recordJudgeResultResult(runDir, blindId, trialResult = { verdict: 'PUBLIC_TEST_RESULT' }) {
  const path = join(runDir, `judge-result-${blindId}.json`);
  writeFileSync(path, `${JSON.stringify(trialResult)}\n`, 'utf8');
  return runHuman(['record-judge-result', '--run-dir', runDir, '--blind-id', blindId, '--result-file', path]);
}

function recordJudgeResult(runDir, blindId, trialResult) {
  const result = recordJudgeResultResult(runDir, blindId, trialResult);
  assertPass(result);
}

function completeSlot(runDir, slot, attestation = baseAttestation) {
  prepareSubject(runDir, slot, attestation);
  captureHumanResponse(runDir, slot, Buffer.from(`operator response ${slot.slotId}\n`, 'utf8'));
  const blindId = prepareJudge(runDir, slot);
  recordJudgeResult(runDir, blindId);
}

function completeRun(runDir, attestationForSlot = () => baseAttestation) {
  for (const slot of slots) completeSlot(runDir, slot, attestationForSlot(slot));
}

function validate(runDir) {
  return runHuman(['validate', '--run-dir', runDir]);
}

function withRun(fn) {
  const runDir = initRun();
  try { return fn(runDir); }
  finally { rmSync(runDir, { recursive: true, force: true }); }
}

function frozenTest(name, fn) {
  test(name, { skip: !hasFrozenCheckout }, fn);
}

function makeRepoTarget(label) {
  return mkdtempSync(join(repositoryRoot, `.human-harness-${label}-`));
}

function linkDirectory(target, link) {
  symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
}

frozenTest('rejects pre-created subjects symlink/junction into the Carrier worktree before private bytes are written', () => withRun((runDir) => {
  const slot = slots[0];
  const target = makeRepoTarget('subjects');
  const leaked = join(target, `${slot.slotId}.subject.bin`);
  try {
    linkDirectory(target, join(runDir, 'subjects'));
    const result = prepareSubjectResult(runDir, slot);
    assertRejected(result);
    assert.equal(existsSync(leaked), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}));

frozenTest('rejects pre-created responses symlink/junction before captured response bytes are written', () => withRun((runDir) => {
  const slot = slots[0];
  prepareSubject(runDir, slot);
  const target = makeRepoTarget('responses');
  const leaked = join(target, `${slot.slotId}.response.bin`);
  try {
    linkDirectory(target, join(runDir, 'responses'));
    const result = captureResponseResult(runDir, slot);
    assertRejected(result);
    assert.equal(existsSync(leaked), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}));

frozenTest('rejects pre-created judges symlink/junction before Judge packet bytes are written', () => withRun((runDir) => {
  const slot = slots[0];
  prepareSubject(runDir, slot);
  captureHumanResponse(runDir, slot);
  const target = makeRepoTarget('judges');
  try {
    linkDirectory(target, join(runDir, 'judges'));
    const result = prepareJudgeResult(runDir, slot);
    assertRejected(result);
    assert.equal(readdirSync(target).length, 0);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}));

frozenTest('rejects pre-created judge-results symlink/junction before Judge-result bytes are written', () => withRun((runDir) => {
  const slot = slots[0];
  prepareSubject(runDir, slot);
  captureHumanResponse(runDir, slot);
  const blindId = prepareJudge(runDir, slot);
  const target = makeRepoTarget('judge-results');
  const leaked = join(target, `${blindId}.result.bin`);
  try {
    linkDirectory(target, join(runDir, 'judge-results'));
    const result = recordJudgeResultResult(runDir, blindId);
    assertRejected(result);
    assert.equal(existsSync(leaked), false);
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
}));

frozenTest('revalidates a sensitive child directory after it is replaced between commands', () => withRun((runDir) => {
  const slot = slots[0];
  prepareSubject(runDir, slot);
  const responseBytes = Buffer.from('captured before directory replacement\n', 'utf8');
  captureHumanResponse(runDir, slot, responseBytes);
  const responseDir = join(runDir, 'responses');
  const redirected = mkdtempSync(join(tmpdir(), 'pryzael-r4c-redirected-responses-'));
  try {
    rmSync(responseDir, { recursive: true, force: true });
    writeFileSync(join(redirected, `${slot.slotId}.response.bin`), responseBytes);
    linkDirectory(redirected, responseDir);
    assertRejected(prepareJudgeResult(runDir, slot));
  } finally {
    rmSync(redirected, { recursive: true, force: true });
  }
}));

frozenTest('state-file symlink substitution cannot overwrite an arbitrary external target', (t) => withRun((runDir) => {
  const slot = slots[0];
  const statePath = join(runDir, stateName);
  const original = readFileSync(statePath);
  const victimDir = mkdtempSync(join(tmpdir(), 'pryzael-r4c-state-victim-'));
  const victim = join(victimDir, 'victim.json');
  writeFileSync(victim, original);
  rmSync(statePath);
  try {
    symlinkSync(victim, statePath, 'file');
  } catch (error) {
    rmSync(victimDir, { recursive: true, force: true });
    if (process.platform === 'win32' && ['EPERM', 'EACCESS'].includes(error?.code)) {
      t.skip(`file symlink unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const before = readFileSync(victim);
  try {
    assertRejected(prepareSubjectResult(runDir, slot));
    assert.deepEqual(readFileSync(victim), before);
  } finally {
    rmSync(statePath, { force: true });
    rmSync(victimDir, { recursive: true, force: true });
  }
}));

frozenTest('coordinated frozen source identity mutation cannot redefine canonical expected identity', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  const fake = '0'.repeat(40);
  state.frozen.identity.sourceCommit = fake;
  for (const record of state.slots) if (record.conditionId === 'CURRENT_PRYZAEL') record.subject.artifactIdentity = fake;
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('coordinated CURRENT and ABSENT render digest mutation cannot redefine canonical renders', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  state.frozen.currentRenderSha256 = '1'.repeat(64);
  state.frozen.absentRenderSha256 = '2'.repeat(64);
  for (const record of state.slots) {
    record.subject.conditionRenderSha256 = record.conditionId === 'CURRENT_PRYZAEL'
      ? state.frozen.currentRenderSha256
      : state.frozen.absentRenderSha256;
  }
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('canonical slot identity mutation is rejected from canonical-to-state comparison', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  state.slots[0].taskDigest = '3'.repeat(64);
  state.slots[0].judgeResult.taskAuthorityDigest = '3'.repeat(64);
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('paired hostProfileDigest state edits cannot hide different preserved host attestations', () => withRun((runDir) => {
  completeRun(runDir, (slot) => slot.taskId === 'DEV-SIMPLE-001' && slot.conditionId === 'CURRENT_PRYZAEL'
    ? { ...baseAttestation, model: 'different-visible-model' }
    : baseAttestation);
  const state = readState(runDir);
  for (const record of state.slots.filter((entry) => entry.taskId === 'DEV-SIMPLE-001')) {
    record.subject.hostProfileDigest = 'fake-same-host-profile';
  }
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('coordinated blinding key and stored blind-ID mutation cannot redefine previously exported Judge bindings', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  const replacementKey = Buffer.alloc(32, 0x5a);
  state.blindingKeyBase64 = replacementKey.toString('base64');
  for (const record of state.slots) {
    const slot = slots.find((entry) => entry.slotId === record.slotId);
    const blindId = deriveJudgeBlindId(slot, replacementKey);
    record.judgeBlindId = blindId;
    record.judgeResult.judgeBlindId = blindId;
  }
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('overlength blinding key encoding fails closed even when stored blind IDs are coordinated', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  const replacementKey = Buffer.alloc(33, 0x41);
  state.blindingKeyBase64 = replacementKey.toString('base64');
  for (const record of state.slots) {
    const slot = slots.find((entry) => entry.slotId === record.slotId);
    const blindId = deriveJudgeBlindId(slot, replacementKey);
    record.judgeBlindId = blindId;
    record.judgeResult.judgeBlindId = blindId;
  }
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('non-canonical base64 blinding key encoding fails closed', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  state.blindingKeyBase64 = `${state.blindingKeyBase64}\n`;
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('altered exported SUBJECT bytes fail final validation', () => withRun((runDir) => {
  completeRun(runDir);
  const record = readState(runDir).slots[0];
  writeFileSync(join(runDir, record.subject.deliveryFile), Buffer.from('tampered subject\n', 'utf8'));
  assertRejected(validate(runDir));
}));

frozenTest('altered exported Judge bytes fail final validation', () => withRun((runDir) => {
  completeRun(runDir);
  const record = readState(runDir).slots[0];
  writeFileSync(join(runDir, record.judge.deliveryFile), Buffer.from('tampered judge\n', 'utf8'));
  assertRejected(validate(runDir));
}));

frozenTest('altered captured response bytes cannot be legitimized by coordinated mutable metadata', () => withRun((runDir) => {
  completeRun(runDir);
  const state = readState(runDir);
  const record = state.slots[0];
  const changed = Buffer.from('post-Judge response tamper with valid UTF-8\n', 'utf8');
  writeFileSync(join(runDir, record.response.file), changed);
  const recapture = captureResponse(changed, {
    captureMethod: record.response.captureMethod,
    timestamp: record.response.timestamp
  });
  assert.equal(recapture.status, 'CAPTURED');
  record.response.byteCount = recapture.byteCount;
  record.response.sha256 = recapture.sha256;
  record.judgeResult.responseSha256 = recapture.sha256;
  writeState(runDir, state);
  assertRejected(validate(runDir));
}));

frozenTest('altered preserved Judge-result body fails final validation', () => withRun((runDir) => {
  completeRun(runDir);
  const record = readState(runDir).slots[0];
  writeFileSync(join(runDir, record.judgeResult.original.file), '{"verdict":"TAMPERED"}\n', 'utf8');
  assertRejected(validate(runDir));
}));

frozenTest('state claiming COMPLETE cannot substitute for missing canonical SUBJECT Judge or Judge-result artifacts', () => withRun((runDir) => {
  completeRun(runDir);
  const record = readState(runDir).slots[0];
  rmSync(join(runDir, record.subject.deliveryFile), { force: true });
  rmSync(join(runDir, record.judge.deliveryFile), { force: true });
  rmSync(join(runDir, record.judgeResult.original.file), { force: true });
  assertRejected(validate(runDir));
}));

frozenTest('successful summary classifies generated delivery as exact but browser/model-visible ingress as UNVERIFIED', () => withRun((runDir) => {
  completeRun(runDir);
  const result = validate(runDir);
  assertPass(result);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.generatedDeliveryFile, 'EXACT_CANONICAL_BYTES');
  assert.equal(summary.webIngressTransfer, 'HUMAN_OPERATED');
  assert.equal(summary.browserModelVisibleIngressBytes, 'UNVERIFIED');
}));

frozenTest('Temporary Chat execution semantics distinguish harness non-execution from mechanical verification status', () => withRun((runDir) => {
  completeRun(runDir);
  const result = validate(runDir);
  assertPass(result);
  const summary = JSON.parse(result.stdout);
  assert.equal(Object.hasOwn(summary, 'realTemporaryChatExecuted'), false);
  assert.equal(summary.realTemporaryChatExecution, 'UNVERIFIED');
  assert.equal(summary.realTemporaryChatExecutedByHarness, false);
}));

test('documentation requires a distinct fresh isolated Judge Temporary Chat for every SUBJECT chat', () => {
  const text = `${readFileSync(join(repositoryRoot, 'README.md'), 'utf8')}\n${readFileSync(join(repositoryRoot, 'spec/carrier-protocol.md'), 'utf8')}`;
  assert.match(text, /Judge[^\n]{0,180}(different|distinct)[^\n]{0,120}fresh[^\n]{0,120}Temporary Chat/i);
  assert.match(text, /SUBJECT[^\n]{0,180}(must not|never)[\n]{0,120}(reuse|reused)[^\n]{0,120}Judge/i);
  assert.match(text, /Judge[^\n]{0,180}(human-observed|operator-attested|not mechanically proven|UNVERIFIED)/i);
});

test('PowerShell operator example derives Carrier repository root and does not manually precreate the run directory', () => {
  const readme = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
  assert.match(readme, /git\s+rev-parse\s+--show-toplevel/i);
  assert.match(readme, /\$run\s*=\s*Join-Path\s+[^\n]*\$carrierRoot/i);
  assert.doesNotMatch(readme, /New-Item[^\n]*\$run/i);
});

frozenTest('Windows uses a real directory junction for the sensitive-child traversal regression', (t) => {
  if (process.platform !== 'win32') {
    t.skip('Windows junction evidence requires Windows');
    return;
  }
  withRun((runDir) => {
    const slot = slots[0];
    const target = makeRepoTarget('windows-junction');
    try {
      symlinkSync(target, join(runDir, 'subjects'), 'junction');
      const result = prepareSubjectResult(runDir, slot);
      assertRejected(result);
      assert.equal(existsSync(join(target, `${slot.slotId}.subject.bin`)), false);
    } finally {
      rmSync(target, { recursive: true, force: true });
    }
  });
});
