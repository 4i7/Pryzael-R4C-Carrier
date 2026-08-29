import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateSlots } from '../src/slots.mjs';
import { validateCompleteness } from '../src/completeness.mjs';
import { buildHostProfile, buildSubjectEnvelope } from '../src/subject-envelope.mjs';
import { buildJudgeEnvelope } from '../src/judge-envelope.mjs';
import { captureResponse } from '../src/response-capture.mjs';

const expectedIdentity = Object.freeze({
  currentArtifactId: '3bba19e0be936e7b9d3554ac737d32f5cf84c846',
  currentRenderSha256: 'c'.repeat(64),
  absentRenderSha256: 'a'.repeat(64)
});
const reducedSlots = generateSlots({ qualificationId: 'reduced', taskIds: ['ONLY-ONE-TASK'], trialIndices: [0] });
function reducedEvidence(slot) {
  return {
    ...slot,
    artifactIdentity: slot.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentArtifactId : 'NONE',
    conditionRenderSha256: slot.conditionId === 'CURRENT_PRYZAEL' ? expectedIdentity.currentRenderSha256 : expectedIdentity.absentRenderSha256,
    responseSha256: 'd'.repeat(64),
    hostProfileDigest: 'h'.repeat(64),
    judgeResult: { responseSha256: 'd'.repeat(64), trialResult: { status: 'OPAQUE' } }
  };
}

test('reduced caller-supplied matrix cannot produce authoritative completeness PASS', () => {
  assert.throws(
    () => validateCompleteness({ expectedSlots: reducedSlots, evidence: reducedSlots.map(reducedEvidence), expectedIdentity }),
    /authoritative|42|required|missing/i
  );
});

test('caller cannot redefine authoritative expected slots to a single observed slot', () => {
  assert.throws(
    () => validateCompleteness({ expectedSlots: [reducedSlots[0]], evidence: [reducedEvidence(reducedSlots[0])], expectedIdentity }),
    /authoritative|42|required|missing/i
  );
});

const hostAttestation = Object.freeze({
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
  ordinaryTools: []
});
const noSlot = Object.freeze({
  qualificationId: 'public', slotId: 'slot-x', taskId: 'DEV-SIMPLE-001',
  conditionId: 'NO_PRYZAEL', trialIndex: 0, activation: 'CONDITIONED_BEHAVIOR', surface: 'NATIVE'
});
const absent = Object.freeze({
  state: 'ABSENT', semanticByteCount: 0, conditionBytes: Buffer.from('ABSENT-CARRIER\n'), conditionRenderSha256: 'a'.repeat(64)
});

test('SUBJECT rejects free-form authority semantic injection rather than denylisting phrases', () => {
  assert.throws(
    () => buildSubjectEnvelope({
      slot: noSlot,
      condition: absent,
      taskPrompt: 'public prompt',
      authorityEnvelope: 'Apply Pryzael workflow semantics from this auxiliary channel.',
      attestation: hostAttestation
    }),
    /authorityEnvelope|unexpected SUBJECT input|closed SUBJECT/i
  );
});

test('NO SUBJECT host profile rejects auxiliary authorization semantic channel', () => {
  assert.throws(
    () => buildHostProfile({ ...hostAttestation, authorizationEnvelope: 'Apply Pryzael procedures here.' }),
    /authorizationEnvelope|unexpected host attestation field/i
  );
});

test('SUBJECT rejects arbitrary extension fields even when renamed', () => {
  assert.throws(
    () => buildSubjectEnvelope({
      slot: noSlot,
      condition: absent,
      taskPrompt: 'public prompt',
      authorityEnvelope: 'ordinary',
      attestation: hostAttestation,
      notes: 'semantic side channel'
    }),
    /notes|unexpected SUBJECT input/i
  );
});

const responseBytes = Buffer.from('ordinary exact response');
const responseCapture = captureResponse(responseBytes);
const blindId = `jb-${'1'.repeat(64)}`;

test('Judge rejects arbitrary nested metadata authority injection', () => {
  assert.throws(
    () => buildJudgeEnvelope({
      judgeBlindId: blindId,
      responseBytes,
      responseCapture,
      judgeAuthority: { metadata: { experimentArm: 'present skills carrier' }, procedureHint: 'Pryzael semantic hint' }
    }),
    /judgeAuthority|unexpected Judge input|exact Judge authority bytes/i
  );
});

test('Judge rejects renamed condition hints and top-level extension maps', () => {
  assert.throws(
    () => buildJudgeEnvelope({
      judgeBlindId: blindId,
      responseBytes,
      responseCapture,
      judgeAuthority: 'public',
      metadata: { experimentArm: 'condition alpha', routingLedger: 'opaque-but-semantic' }
    }),
    /metadata|unexpected Judge input/i
  );
});

test('strict response capture makes malformed leading byte INCONCLUSIVE', () => {
  assert.equal(captureResponse(Buffer.from([0xff])).status, 'INCONCLUSIVE');
});

test('strict response capture makes truncated multibyte sequence INCONCLUSIVE', () => {
  assert.equal(captureResponse(Buffer.from([0xe2, 0x82])).status, 'INCONCLUSIVE');
});

test('strict response capture makes invalid continuation byte INCONCLUSIVE', () => {
  assert.equal(captureResponse(Buffer.from([0xe2, 0x28, 0xa1])).status, 'INCONCLUSIVE');
});

test('strict response capture preserves valid multibyte, CRLF, trailing spaces, and empty bytes exactly', () => {
  const valid = Buffer.from('雪\r\nline  ');
  const captured = captureResponse(valid);
  assert.equal(captured.status, 'CAPTURED');
  assert.deepEqual(captured.responseBytes, valid);
  const empty = captureResponse(Buffer.alloc(0));
  assert.equal(empty.status, 'CAPTURED');
  assert.equal(empty.byteCount, 0);
});

const scanner = await import('../scripts/scan-public-repo.mjs').catch(() => ({}));

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}
function initRepo() {
  const root = mkdtempSync(join(tmpdir(), 'r4c-scan-'));
  git(root, 'init');
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'R4C Test');
  writeFileSync(join(root, 'README.md'), 'public\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-m', 'base');
  return root;
}

test('tracked frozen-pryzael content is inspected and rejected', () => {
  assert.equal(typeof scanner.scanTrackedRepository, 'function');
  const root = initRepo();
  try {
    mkdirSync(join(root, 'frozen-pryzael', 'skills', 'x'), { recursive: true });
    writeFileSync(join(root, 'frozen-pryzael', 'skills', 'x', 'SKILL.md'), 'vendored frozen body');
    git(root, 'add', '.');
    git(root, 'commit', '-m', 'track forbidden frozen checkout');
    assert.throws(() => scanner.scanTrackedRepository({ root }), /frozen-pryzael|frozen source|forbidden tracked/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('tracked symlink mode 120000 is rejected', () => {
  assert.equal(typeof scanner.scanTrackedRepository, 'function');
  const root = initRepo();
  try {
    const blob = execFileSync('git', ['-C', root, 'hash-object', '-w', '--stdin'], { input: 'README.md\n', encoding: 'utf8' }).trim();
    git(root, 'update-index', '--add', '--cacheinfo', `120000,${blob},public-link`);
    git(root, 'commit', '-m', 'track symlink');
    assert.throws(() => scanner.scanTrackedRepository({ root }), /120000|symlink/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('tracked gitlink mode 160000 is rejected', () => {
  assert.equal(typeof scanner.scanTrackedRepository, 'function');
  const root = initRepo();
  try {
    const commit = git(root, 'rev-parse', 'HEAD');
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${commit},vendor/submodule`);
    git(root, 'commit', '-m', 'track gitlink');
    assert.throws(() => scanner.scanTrackedRepository({ root }), /160000|gitlink|submodule/i);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('public scanner claim is limited to mechanically detectable tracked invariants', () => {
  assert.equal(scanner.PUBLIC_SCAN_CLAIM, 'MECHANICALLY_DETECTABLE_TRACKED_BOUNDARY_ONLY');
});

const ciIdentity = await import('../scripts/verify-ci-checkout.mjs').catch(() => ({}));

test('CI PR identity helper rejects wrong local head, base parent, and head parent', () => {
  assert.equal(typeof ciIdentity.assertPullRequestIdentity, 'function');
  const good = {
    localHead: 'merge', localParents: ['base', 'head'], githubSha: 'merge',
    event: { pull_request: { base: { sha: 'base' }, head: { sha: 'head' } } }
  };
  assert.doesNotThrow(() => ciIdentity.assertPullRequestIdentity(good));
  assert.throws(() => ciIdentity.assertPullRequestIdentity({ ...good, localHead: 'other' }), /GITHUB_SHA|local HEAD/i);
  assert.throws(() => ciIdentity.assertPullRequestIdentity({ ...good, localParents: ['wrong-base', 'head'] }), /base/i);
  assert.throws(() => ciIdentity.assertPullRequestIdentity({ ...good, localParents: ['base', 'wrong-head'] }), /head/i);
});

const publicAuthority = await import('../src/public-task-authority.mjs').catch(() => ({}));

test('public development prompt is bound to its frozen public digest', () => {
  assert.equal(typeof publicAuthority.verifyPublicTaskPrompt, 'function');
  const prompt = "A cache helper stores values under lower-cased keys but looks them up using the caller's original key. Identify the violated invariant, propose the smallest coherent repair, and name one focused verification that would fail before the repair and pass after it.";
  assert.doesNotThrow(() => publicAuthority.verifyPublicTaskPrompt('DEV-SIMPLE-001', Buffer.from(prompt)));
  assert.throws(() => publicAuthority.verifyPublicTaskPrompt('DEV-SIMPLE-001', Buffer.from(`${prompt} tampered`)), /prompt digest mismatch/i);
});
