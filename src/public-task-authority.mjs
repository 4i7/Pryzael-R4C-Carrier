import { sha256Hex, toBuffer } from './hash.mjs';
import { qualificationTaskAuthority } from './qualification-authority.mjs';
import { generateBoundSlots } from './slots.mjs';

export const PUBLIC_QUALIFICATION_ID = 'public-r4c-dry-run-v1';
export const PUBLIC_TASK_PROMPT_SHA256 = Object.freeze({
  'DEV-SIMPLE-001': 'adb1ba121a113067f124de46f6e838271e627369c1c5ef20b6b7c88777d53a54',
  'DEV-REPLAN-001': '4d6ce8f0cfe70fa77b8df2e5b5f64a1ee8263a1ffd76c8b9e4043b4616cb34f0'
});

export function verifyPublicTaskPrompt(taskId, promptBytes) {
  const expected = PUBLIC_TASK_PROMPT_SHA256[taskId];
  if (!expected) throw new Error(`unknown public synthetic task: ${taskId}`);
  const exactBytes = toBuffer(promptBytes);
  const actual = sha256Hex(exactBytes);
  if (actual !== expected) throw new Error(`public task prompt digest mismatch for ${taskId}: expected ${expected}, got ${actual}`);
  return true;
}

export function buildPublicTaskAuthority(taskId, promptBytes) {
  verifyPublicTaskPrompt(taskId, promptBytes);
  const exactBytes = toBuffer(promptBytes);
  const digest = PUBLIC_TASK_PROMPT_SHA256[taskId];
  return Object.freeze({
    kind: 'PUBLIC_SYNTHETIC_TASK_V1',
    taskId,
    taskDigest: digest,
    promptBytes: exactBytes,
    promptSha256: digest
  });
}

export function buildExternalQualificationTaskAuthority(input) {
  assertExactKeys(input, ['taskId','taskDigest','promptBytes','expectedPromptSha256'], 'external qualification task authority');
  const committed = qualificationTaskAuthority(input.taskId);
  if (input.taskDigest !== committed.taskDigest) throw new Error(`qualification task digest mismatch for ${input.taskId}`);
  if (!/^[0-9a-f]{64}$/.test(input.expectedPromptSha256)) throw new Error('external prompt digest invalid');
  const exactBytes = toBuffer(input.promptBytes);
  const actual = sha256Hex(exactBytes);
  if (actual !== input.expectedPromptSha256) throw new Error(`external prompt digest mismatch for ${input.taskId}`);
  return Object.freeze({
    kind: 'EXTERNAL_QUALIFICATION_TASK_V1',
    taskId: input.taskId,
    taskDigest: input.taskDigest,
    promptBytes: exactBytes,
    promptSha256: input.expectedPromptSha256
  });
}

export function buildPublicSyntheticSlots() {
  return generateBoundSlots({
    qualificationId: PUBLIC_QUALIFICATION_ID,
    tasks: Object.entries(PUBLIC_TASK_PROMPT_SHA256).map(([taskId, taskDigest]) => ({ taskId, taskDigest })),
    trialIndices: [0]
  });
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} missing`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`${label} fields mismatch: ${actual.join(',')}`);
}
