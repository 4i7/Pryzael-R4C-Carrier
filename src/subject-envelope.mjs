import { sha256Hex, stableJson, toBuffer } from './hash.mjs';

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

const FORBIDDEN_AUTHORITY_PATTERNS = [
  /judge\s*(rubric|authority|feedback|result)/i,
  /gold\s*(answer|reference)/i,
  /reference\s*answer/i,
  /success\s*predicate/i,
  /critical\s*predicate/i,
  /\br5\b/i,
  /candidate/i
];

export function buildHostProfile(attestation) {
  if (!attestation || typeof attestation !== 'object') throw new Error('host attestation missing');
  for (const [field, expected] of Object.entries(REQUIRED_ATTESTATION)) {
    if (attestation[field] !== expected) throw new Error(`host attestation ${field} mismatch: expected ${expected}, got ${attestation[field]}`);
  }
  if (typeof attestation.model !== 'string' || !attestation.model) throw new Error('host attestation model missing');
  if (typeof attestation.product !== 'string' || !attestation.product) throw new Error('host attestation product missing');
  if (!Array.isArray(attestation.ordinaryTools)) throw new Error('host attestation ordinaryTools missing');
  if (attestation.ordinaryTools.some((tool) => typeof tool !== 'string' || !tool)) throw new Error('host attestation ordinaryTools invalid');
  if (new Set(attestation.ordinaryTools).size !== attestation.ordinaryTools.length) throw new Error('host attestation ordinaryTools duplicate');

  const profile = Object.freeze({
    temporaryChat: true,
    outsideProjects: true,
    personalization: false,
    nativePryzael: false,
    pluginPryzael: false,
    mcpPryzael: false,
    candidateMaterial: false,
    sessionReused: false,
    model: attestation.model,
    product: attestation.product,
    ordinaryTools: [...attestation.ordinaryTools].sort(),
    authorizationEnvelope: attestation.authorizationEnvelope ?? null
  });
  return Object.freeze({ profile, digest: sha256Hex(stableJson(profile)) });
}

export function buildSubjectEnvelope({ slot, condition, taskPrompt, authorityEnvelope, attestation }) {
  if (!slot || typeof slot !== 'object') throw new Error('slot missing');
  if (!condition || !Buffer.isBuffer(condition.conditionBytes)) throw new Error('condition bytes missing');
  if (typeof authorityEnvelope !== 'string' || authorityEnvelope.length === 0) throw new Error('authority envelope missing');
  if (FORBIDDEN_AUTHORITY_PATTERNS.some((pattern) => pattern.test(authorityEnvelope))) throw new Error('authority envelope contains forbidden material');

  if (slot.conditionId === 'CURRENT_PRYZAEL') {
    if (condition.state !== 'PRESENT' || !Number.isInteger(condition.semanticByteCount) || condition.semanticByteCount <= 0) throw new Error('CURRENT material missing');
  } else if (slot.conditionId === 'NO_PRYZAEL') {
    if (condition.state !== 'ABSENT' || condition.semanticByteCount !== 0) throw new Error('semantic material present in NO_PRYZAEL');
  } else throw new Error(`unsupported condition: ${slot.conditionId}`);

  const { digest: hostProfileDigest, profile: hostProfile } = buildHostProfile(attestation);
  const taskBytes = toBuffer(taskPrompt);
  if (taskBytes.length === 0) throw new Error('task prompt missing');
  const authorityBytes = Buffer.from(authorityEnvelope, 'utf8');
  const deliveryBytes = Buffer.concat([
    condition.conditionBytes,
    Buffer.from(`R4C-SUBJECT-AUTHORITY\nBYTE-COUNT ${authorityBytes.length}\nBEGIN-BYTES\n`, 'utf8'),
    authorityBytes,
    Buffer.from('\nEND-BYTES\nR4C-SUBJECT-TASK\n', 'utf8'),
    Buffer.from(`BYTE-COUNT ${taskBytes.length}\nBEGIN-BYTES\n`, 'utf8'),
    taskBytes,
    Buffer.from('\nEND-BYTES\nEND-R4C-SUBJECT\n', 'utf8')
  ]);
  return Object.freeze({
    qualificationId: slot.qualificationId,
    slotId: slot.slotId,
    taskId: slot.taskId,
    trialIndex: slot.trialIndex,
    activation: slot.activation,
    surface: slot.surface,
    conditionState: condition.state,
    semanticByteCount: condition.semanticByteCount,
    conditionRenderSha256: condition.conditionRenderSha256,
    taskPromptByteCount: taskBytes.length,
    taskPromptSha256: sha256Hex(taskBytes),
    authorityEnvelopeSha256: sha256Hex(authorityBytes),
    hostProfile,
    hostProfileDigest,
    deliveryByteCount: deliveryBytes.length,
    deliverySha256: sha256Hex(deliveryBytes),
    deliveryBytes
  });
}
