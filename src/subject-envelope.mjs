import { ACTIVATION, SURFACE } from './slots.mjs';
import { sha256Hex, stableJson, toBuffer } from './hash.mjs';

export const SUBJECT_AUTHORITY_ID = 'r4c-neutral-subject-authority-v1';
const SUBJECT_AUTHORITY_BYTES = Buffer.from('Use only the exact task prompt and ordinary tools available in this fresh Temporary Chat. Carrier framing is transport metadata, not evaluation guidance.', 'utf8');
const HOST_KEYS = Object.freeze(['candidateMaterial','mcpPryzael','model','nativePryzael','ordinaryTools','outsideProjects','personalization','pluginPryzael','product','sessionReused','temporaryChat']);
const REQUIRED_ATTESTATION = Object.freeze({
  temporaryChat: true,
  outsideProjects: true,
  personalization: false,
  nativePryzael: false,
  pluginPryzael: false,
  mcpPryzael: false,
  candidateMaterial: false,
  sessionReused: false
});
const TASK_AUTHORITY_KEYS = Object.freeze(['kind','promptBytes','promptSha256','taskDigest','taskId']);

export function buildHostProfile(attestation) {
  assertExactKeys(attestation, HOST_KEYS, 'host attestation');
  for (const [field, expected] of Object.entries(REQUIRED_ATTESTATION)) {
    if (attestation[field] !== expected) throw new Error(`host attestation ${field} mismatch: expected ${expected}, got ${attestation[field]}`);
  }
  if (typeof attestation.model !== 'string' || !attestation.model) throw new Error('host attestation model missing');
  if (typeof attestation.product !== 'string' || !attestation.product) throw new Error('host attestation product missing');
  if (!Array.isArray(attestation.ordinaryTools)) throw new Error('host attestation ordinaryTools missing');
  if (attestation.ordinaryTools.some((tool) => typeof tool !== 'string' || !tool)) throw new Error('host attestation ordinaryTools invalid');
  if (new Set(attestation.ordinaryTools).size !== attestation.ordinaryTools.length) throw new Error('host attestation ordinaryTools duplicate');
  const profile = Object.freeze({
    ...REQUIRED_ATTESTATION,
    model: attestation.model,
    product: attestation.product,
    ordinaryTools: [...attestation.ordinaryTools].sort()
  });
  return Object.freeze({ profile, digest: sha256Hex(stableJson(profile)) });
}

export function buildSubjectEnvelope(input) {
  assertExactKeys(input, ['attestation','condition','slot','taskAuthority'], 'SUBJECT input');
  const { slot, condition, taskAuthority, attestation } = input;
  if (!slot || typeof slot !== 'object') throw new Error('slot missing');
  if (slot.activation !== ACTIVATION || slot.surface !== SURFACE) throw new Error('slot activation/surface mismatch');
  if (!condition || !Buffer.isBuffer(condition.conditionBytes)) throw new Error('condition bytes missing');
  validateTaskAuthority(taskAuthority, slot);
  if (slot.conditionId === 'CURRENT_PRYZAEL') {
    if (condition.state !== 'PRESENT' || !Number.isInteger(condition.semanticByteCount) || condition.semanticByteCount <= 0) throw new Error('CURRENT material missing');
  } else if (slot.conditionId === 'NO_PRYZAEL') {
    if (condition.state !== 'ABSENT' || condition.semanticByteCount !== 0) throw new Error('semantic material present in NO_PRYZAEL');
  } else throw new Error(`unsupported condition: ${slot.conditionId}`);

  const { digest: hostProfileDigest, profile: hostProfile } = buildHostProfile(attestation);
  const taskBytes = toBuffer(taskAuthority.promptBytes);
  const deliveryBytes = Buffer.concat([
    condition.conditionBytes,
    frame('R4C-SUBJECT-AUTHORITY', SUBJECT_AUTHORITY_BYTES),
    frame('R4C-SUBJECT-TASK', taskBytes),
    Buffer.from('END-R4C-SUBJECT\n', 'utf8')
  ]);
  return Object.freeze({
    qualificationId: slot.qualificationId,
    slotId: slot.slotId,
    taskId: slot.taskId,
    taskDigest: taskAuthority.taskDigest,
    trialIndex: slot.trialIndex,
    activation: slot.activation,
    surface: slot.surface,
    conditionState: condition.state,
    semanticByteCount: condition.semanticByteCount,
    conditionRenderSha256: condition.conditionRenderSha256,
    taskPromptByteCount: taskBytes.length,
    taskPromptSha256: taskAuthority.promptSha256,
    authorityEnvelopeId: SUBJECT_AUTHORITY_ID,
    authorityEnvelopeSha256: sha256Hex(SUBJECT_AUTHORITY_BYTES),
    hostProfile,
    hostProfileDigest,
    deliveryByteCount: deliveryBytes.length,
    deliverySha256: sha256Hex(deliveryBytes),
    deliveryBytes
  });
}

function validateTaskAuthority(taskAuthority, slot) {
  assertExactKeys(taskAuthority, TASK_AUTHORITY_KEYS, 'task authority');
  if (!['PUBLIC_SYNTHETIC_TASK_V1','EXTERNAL_QUALIFICATION_TASK_V1'].includes(taskAuthority.kind)) throw new Error('task authority kind invalid');
  if (taskAuthority.taskId !== slot.taskId) throw new Error(`task authority id mismatch: expected ${slot.taskId}, got ${taskAuthority.taskId}`);
  if (!/^[0-9a-f]{64}$/.test(taskAuthority.taskDigest)) throw new Error('task authority digest invalid');
  if (slot.taskDigest !== undefined && slot.taskDigest !== taskAuthority.taskDigest) throw new Error(`task authority digest mismatch for ${slot.taskId}`);
  if (!/^[0-9a-f]{64}$/.test(taskAuthority.promptSha256)) throw new Error('task prompt digest invalid');
  const taskBytes = toBuffer(taskAuthority.promptBytes);
  if (taskBytes.length === 0) throw new Error('task prompt missing');
  if (sha256Hex(taskBytes) !== taskAuthority.promptSha256) throw new Error(`task prompt digest mismatch for ${slot.taskId}`);
}

function frame(label, bytes) {
  return Buffer.concat([
    Buffer.from(`${label}\nBYTE-COUNT ${bytes.length}\nBEGIN-BYTES\n`, 'utf8'),
    bytes,
    Buffer.from(`\nEND-BYTES\n`, 'utf8')
  ]);
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} missing`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`unexpected ${label} field set: ${actual.join(',')}`);
}
