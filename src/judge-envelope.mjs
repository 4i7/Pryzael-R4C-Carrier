import { toBuffer } from './hash.mjs';
import { verifyResponseCapture } from './response-capture.mjs';

const FORBIDDEN_KEYS = new Set([
  'conditionid', 'condition_id', 'truecondition', 'true_condition',
  'opposingcondition', 'opposing_condition', 'slotid', 'slot_id',
  'artifactidentity', 'artifact_identity', 'conditionmapping', 'condition_mapping'
]);
const FORBIDDEN_VALUE_PATTERNS = [/CURRENT_PRYZAEL/i, /NO_PRYZAEL/i];

export function buildJudgeEnvelope({ judgeBlindId, responseBytes, responseCapture, judgeAuthority }) {
  if (typeof judgeBlindId !== 'string' || !/^jb-[0-9a-f]{64}$/.test(judgeBlindId)) throw new Error('judge blind id invalid');
  if (!responseCapture || responseCapture.status === 'INCONCLUSIVE') throw new Error('response capture is INCONCLUSIVE');
  const exactBytes = toBuffer(responseBytes);
  verifyResponseCapture(exactBytes, responseCapture);
  assertNoConditionLeakage(judgeAuthority);
  const responseText = exactBytes.toString('utf8');
  if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(responseText))) throw new Error('condition identity leakage in exact response');
  return Object.freeze({
    protocol: 'r4c-judge-envelope-v1',
    judgeBlindId,
    response: Object.freeze({ byteCount: responseCapture.byteCount, sha256: responseCapture.sha256, exactBytes }),
    authority: judgeAuthority
  });
}

function assertNoConditionLeakage(value, key = '') {
  const normalizedKey = key.toLowerCase();
  if (FORBIDDEN_KEYS.has(normalizedKey)) throw new Error(`condition identity leakage via key: ${key}`);
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUE_PATTERNS.some((pattern) => pattern.test(value))) throw new Error('condition identity leakage via value');
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoConditionLeakage(item);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value)) assertNoConditionLeakage(childValue, childKey);
  }
}
