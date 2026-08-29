import { TextDecoder } from 'node:util';
import { sha256Hex, toBuffer } from './hash.mjs';
import { verifyResponseCapture } from './response-capture.mjs';

const UTF8 = new TextDecoder('utf-8', { fatal: true });
const JUDGE_AUTHORITY_KEYS = Object.freeze(['expectedSha256','kind','payloadBytes']);
const ALLOWED_AUTHORITY_KINDS = Object.freeze(['PUBLIC_SYNTHETIC_JUDGE_AUTHORITY_V1','EXTERNAL_EXACT_JUDGE_AUTHORITY_V1']);
const FORBIDDEN_RESPONSE_PATTERNS = [/CURRENT_PRYZAEL/i, /NO_PRYZAEL/i];
export const PUBLIC_JUDGE_AUTHORITY_SHA256 = 'a58b892a19f7e90277ae46c8e9ac79b60db2a9e680abf0d0187a05a7f27c4eb5';

export function buildPublicSyntheticJudgeAuthority(payloadBytes) {
  return buildExactJudgeAuthority({ kind: 'PUBLIC_SYNTHETIC_JUDGE_AUTHORITY_V1', payloadBytes, expectedSha256: PUBLIC_JUDGE_AUTHORITY_SHA256 });
}

export function buildExternalJudgeAuthority(input) {
  assertExactKeys(input, ['expectedSha256','payloadBytes'], 'external Judge authority input');
  return buildExactJudgeAuthority({ kind: 'EXTERNAL_EXACT_JUDGE_AUTHORITY_V1', payloadBytes: input.payloadBytes, expectedSha256: input.expectedSha256 });
}

export function buildJudgeEnvelope(input) {
  assertExactKeys(input, ['judgeAuthority','judgeBlindId','responseBytes','responseCapture','taskAuthorityDigest'], 'Judge input');
  const { judgeBlindId, responseBytes, responseCapture, judgeAuthority, taskAuthorityDigest } = input;
  if (typeof judgeBlindId !== 'string' || !/^jb-[0-9a-f]{64}$/.test(judgeBlindId)) throw new Error('judge blind id invalid');
  if (!/^[0-9a-f]{64}$/.test(taskAuthorityDigest ?? '')) throw new Error('task authority digest invalid');
  if (!responseCapture || responseCapture.status === 'INCONCLUSIVE') throw new Error('response capture is INCONCLUSIVE');
  const exactBytes = toBuffer(responseBytes);
  verifyResponseCapture(exactBytes, responseCapture);
  const responseText = UTF8.decode(exactBytes);
  if (FORBIDDEN_RESPONSE_PATTERNS.some((pattern) => pattern.test(responseText))) throw new Error('condition identity leakage in exact response');
  validateExactJudgeAuthority(judgeAuthority);
  const authorityBytes = toBuffer(judgeAuthority.payloadBytes);
  const deliveryBytes = Buffer.concat([
    Buffer.from(`R4C-JUDGE-V1\nJUDGE-BLIND-ID ${judgeBlindId}\nTASK-AUTHORITY-DIGEST ${taskAuthorityDigest}\n`, 'utf8'),
    frame('R4C-JUDGE-RESPONSE', exactBytes),
    frame('R4C-JUDGE-AUTHORITY', authorityBytes),
    Buffer.from('END-R4C-JUDGE\n', 'utf8')
  ]);
  return Object.freeze({
    protocol: 'r4c-judge-envelope-v1',
    judgeBlindId,
    taskAuthorityDigest,
    response: Object.freeze({ byteCount: responseCapture.byteCount, sha256: responseCapture.sha256, exactBytes }),
    authority: Object.freeze({ kind: judgeAuthority.kind, byteCount: authorityBytes.length, sha256: judgeAuthority.expectedSha256 }),
    deliveryByteCount: deliveryBytes.length,
    deliverySha256: sha256Hex(deliveryBytes),
    deliveryBytes
  });
}

function buildExactJudgeAuthority({ kind, payloadBytes, expectedSha256 }) {
  const authority = { kind, payloadBytes: toBuffer(payloadBytes), expectedSha256 };
  validateExactJudgeAuthority(authority);
  return Object.freeze(authority);
}

function validateExactJudgeAuthority(authority) {
  assertExactKeys(authority, JUDGE_AUTHORITY_KEYS, 'Judge authority');
  if (!ALLOWED_AUTHORITY_KINDS.includes(authority.kind)) throw new Error('Judge authority kind invalid');
  if (!/^[0-9a-f]{64}$/.test(authority.expectedSha256 ?? '')) throw new Error('Judge authority digest invalid');
  const bytes = toBuffer(authority.payloadBytes);
  if (sha256Hex(bytes) !== authority.expectedSha256) throw new Error('exact Judge authority bytes do not match expected digest');
  try { UTF8.decode(bytes); } catch { throw new Error('exact Judge authority bytes are not valid UTF-8'); }
}

function frame(label, bytes) {
  return Buffer.concat([
    Buffer.from(`${label}\nBYTE-COUNT ${bytes.length}\nBEGIN-BYTES\n`, 'utf8'),
    bytes,
    Buffer.from('\nEND-BYTES\n', 'utf8')
  ]);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} missing`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`unexpected ${label} shape: ${actual.join(',')}`);
}
