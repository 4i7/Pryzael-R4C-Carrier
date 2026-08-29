import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sha256Hex } from '../src/hash.mjs';
import { buildExternalJudgeAuthority, buildJudgeEnvelope, buildPublicSyntheticJudgeAuthority } from '../src/judge-envelope.mjs';
import { captureResponse } from '../src/response-capture.mjs';

const publicAuthorityBytes = readFileSync(new URL('../fixtures/public/judge-authority.json', import.meta.url));
const publicAuthority = buildPublicSyntheticJudgeAuthority(publicAuthorityBytes);
const taskAuthorityDigest = 'a'.repeat(64);

test('exports blinded Judge envelope API', () => assert.equal(typeof buildJudgeEnvelope, 'function'));

test('Judge delivery contains only opaque blind identity, task authority digest, exact response, fixed framing, and exact authenticated authority bytes', () => {
  const responseBytes = Buffer.from('exact response\r\nwith spaces  ');
  const capture = captureResponse(responseBytes);
  const env = buildJudgeEnvelope({ judgeBlindId: `jb-${'1'.repeat(64)}`, taskAuthorityDigest, responseBytes, responseCapture: capture, judgeAuthority: publicAuthority });
  assert.deepEqual(env.response.exactBytes, responseBytes);
  assert.equal(env.response.sha256, capture.sha256);
  assert.ok(env.deliveryBytes.includes(responseBytes));
  assert.ok(env.deliveryBytes.includes(publicAuthorityBytes));
  const serialized = JSON.stringify(env);
  for (const token of ['CURRENT_PRYZAEL','NO_PRYZAEL','slotId','conditionId','routingLedger']) assert.ok(!serialized.includes(token));
});

test('rejects response digest mismatch and INCONCLUSIVE capture', () => {
  const bytes = Buffer.from('original');
  const capture = captureResponse(bytes);
  assert.throws(() => buildJudgeEnvelope({ judgeBlindId: `jb-${'2'.repeat(64)}`, taskAuthorityDigest, responseBytes: Buffer.from('altered'), responseCapture: capture, judgeAuthority: publicAuthority }), /response (byte count|digest) mismatch/);
  assert.throws(() => buildJudgeEnvelope({ judgeBlindId: `jb-${'2'.repeat(64)}`, taskAuthorityDigest, responseBytes: bytes, responseCapture: { status: 'INCONCLUSIVE' }, judgeAuthority: publicAuthority }), /INCONCLUSIVE/);
});

test('rejects arbitrary authority extensions and condition identity in exact response', () => {
  const cleanBytes = Buffer.from('clean response');
  const cleanCapture = captureResponse(cleanBytes);
  assert.throws(() => buildJudgeEnvelope({ judgeBlindId: `jb-${'3'.repeat(64)}`, taskAuthorityDigest, responseBytes: cleanBytes, responseCapture: cleanCapture, judgeAuthority: { ...publicAuthority, metadata: { experimentArm: 'alpha' } } }), /unexpected Judge authority shape/);
  const leakedBytes = Buffer.from('I was in CURRENT_PRYZAEL');
  assert.throws(() => buildJudgeEnvelope({ judgeBlindId: `jb-${'3'.repeat(64)}`, taskAuthorityDigest, responseBytes: leakedBytes, responseCapture: captureResponse(leakedBytes), judgeAuthority: publicAuthority }), /condition identity leakage/);
});

test('external Judge authority is exact-byte/digest bound without Carrier claiming semantic cleanliness', () => {
  const payloadBytes = Buffer.from('trusted external Judge authority payload');
  const authority = buildExternalJudgeAuthority({ payloadBytes, expectedSha256: sha256Hex(payloadBytes) });
  const responseBytes = Buffer.from('clean exact response');
  const env = buildJudgeEnvelope({ judgeBlindId: `jb-${'4'.repeat(64)}`, taskAuthorityDigest, responseBytes, responseCapture: captureResponse(responseBytes), judgeAuthority: authority });
  assert.equal(env.authority.kind, 'EXTERNAL_EXACT_JUDGE_AUTHORITY_V1');
  assert.ok(env.deliveryBytes.includes(payloadBytes));
});
