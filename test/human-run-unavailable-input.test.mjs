import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildPublicSyntheticSlots } from '../src/public-task-authority.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const frozenSource = resolve(repositoryRoot, 'frozen-pryzael');
const currentCarrierHead = execFileSync('git', ['-C', repositoryRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const hasFrozenCheckout = existsSync(resolve(frozenSource, '.git'));
const slot = buildPublicSyntheticSlots().find((entry) => entry.taskId === 'DEV-SIMPLE-001' && entry.conditionId === 'NO_PRYZAEL');
const attestation = Object.freeze({
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

function assertPass(result) {
  assert.equal(result.status, 0, `stdout=${result.stdout ?? ''}\nstderr=${result.stderr ?? ''}`);
}

function initRun() {
  const runDir = mkdtempSync(join(tmpdir(), 'pryzael-r4c-human-unavailable-'));
  assertPass(runHuman(['init', '--run-dir', runDir, '--pryzael-source', frozenSource, '--carrier-main', currentCarrierHead]));
  return runDir;
}

function readRecord(runDir) {
  const state = JSON.parse(readFileSync(join(runDir, 'private-run-state.json'), 'utf8'));
  return state.slots.find((entry) => entry.slotId === slot.slotId);
}

function prepareSubject(runDir) {
  const file = join(runDir, 'attestation.json');
  writeFileSync(file, `${JSON.stringify(attestation)}\n`, 'utf8');
  assertPass(runHuman(['prepare-subject', '--run-dir', runDir, '--slot', slot.slotId, '--attestation-file', file]));
}

function prepareJudge(runDir) {
  prepareSubject(runDir);
  const response = join(runDir, 'response.bin');
  writeFileSync(response, Buffer.from('exact operator response\n', 'utf8'));
  assertPass(runHuman(['capture-response', '--run-dir', runDir, '--slot', slot.slotId, '--response-file', response]));
  assertPass(runHuman(['prepare-judge', '--run-dir', runDir, '--slot', slot.slotId]));
}

function unavailableTest(name, fn) {
  test(name, { skip: !hasFrozenCheckout }, () => {
    const runDir = initRun();
    try { fn(runDir); }
    finally { rmSync(runDir, { recursive: true, force: true }); }
  });
}

unavailableTest('missing explicit host-attestation file marks the slot INCONCLUSIVE', (runDir) => {
  const missing = join(runDir, 'missing-attestation.json');
  const result = runHuman(['prepare-subject', '--run-dir', runDir, '--slot', slot.slotId, '--attestation-file', missing]);
  assert.notEqual(result.status, 0);
  const record = readRecord(runDir);
  assert.equal(record.status, 'INCONCLUSIVE');
  assert.match(record.inconclusiveReason, /HOST_ATTESTATION_UNESTABLISHED/);
});

unavailableTest('missing explicit SUBJECT response file marks exact-byte capture INCONCLUSIVE', (runDir) => {
  prepareSubject(runDir);
  const missing = join(runDir, 'missing-response.bin');
  const result = runHuman(['capture-response', '--run-dir', runDir, '--slot', slot.slotId, '--response-file', missing]);
  assert.notEqual(result.status, 0);
  const record = readRecord(runDir);
  assert.equal(record.status, 'INCONCLUSIVE');
  assert.match(record.inconclusiveReason, /RESPONSE_BYTES_UNAVAILABLE/);
});

unavailableTest('missing explicit Judge result file marks exact-byte Judge capture INCONCLUSIVE', (runDir) => {
  prepareJudge(runDir);
  const recordBefore = readRecord(runDir);
  const missing = join(runDir, 'missing-judge-result.json');
  const result = runHuman(['record-judge-result', '--run-dir', runDir, '--blind-id', recordBefore.judgeBlindId, '--result-file', missing]);
  assert.notEqual(result.status, 0);
  const record = readRecord(runDir);
  assert.equal(record.status, 'INCONCLUSIVE');
  assert.match(record.inconclusiveReason, /JUDGE_RESULT_BYTES_UNAVAILABLE/);
});
