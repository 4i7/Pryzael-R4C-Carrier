import { readFileSync } from 'node:fs';
import { ABSENT_RENDER_SHA256, CURRENT_RENDER_SHA256, FROZEN_IDENTITY, QUALIFICATION_ID, QUALIFICATION_PACKET_COMMITMENT } from './constants.mjs';
import { generateBoundSlots } from './slots.mjs';

const COMMITMENT_URL = new URL('../frozen/qualification-commitment.json', import.meta.url);
const TOP_LEVEL_KEYS = Object.freeze(['created_by_authority','frozen_at','packet_bytes','packet_schema_version','packet_sha256','qualification_set_id','schema_version','status','task_count','task_index']);
const TASK_KEYS = Object.freeze(['family','task_digest','task_id']);
export const AUTHORITATIVE_TRIAL_INDICES = Object.freeze([0, 1, 2]);

export function validateQualificationCommitment(commitment) {
  if (!commitment || typeof commitment !== 'object' || Array.isArray(commitment)) throw new Error('qualification commitment missing');
  assertExactKeys(commitment, TOP_LEVEL_KEYS, 'qualification commitment');
  if (commitment.schema_version !== 'r4-qualification-commitment-v1') throw new Error('qualification commitment schema mismatch');
  if (commitment.status !== 'FROZEN_BEFORE_BASELINE') throw new Error('qualification commitment is not frozen before baseline');
  if (commitment.qualification_set_id !== QUALIFICATION_ID) throw new Error('qualification set identity mismatch');
  if (commitment.packet_schema_version !== QUALIFICATION_PACKET_COMMITMENT.schemaVersion) throw new Error('qualification packet schema mismatch');
  if (commitment.packet_sha256 !== QUALIFICATION_PACKET_COMMITMENT.sha256) throw new Error('qualification packet digest mismatch');
  if (commitment.packet_bytes !== QUALIFICATION_PACKET_COMMITMENT.byteCount) throw new Error('qualification packet byte count mismatch');
  if (commitment.task_count !== 7 || !Array.isArray(commitment.task_index) || commitment.task_index.length !== 7) throw new Error('authoritative qualification task count must be exactly 7');
  const seen = new Set();
  for (const task of commitment.task_index) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) throw new Error('qualification task identity invalid');
    assertExactKeys(task, TASK_KEYS, 'qualification task identity');
    if (!/^QLF-[A-Z0-9-]+$/.test(task.task_id)) throw new Error(`qualification task id invalid: ${task.task_id}`);
    if (seen.has(task.task_id)) throw new Error(`duplicate qualification task id: ${task.task_id}`);
    seen.add(task.task_id);
    if (typeof task.family !== 'string' || task.family.length === 0) throw new Error(`qualification task family invalid: ${task.task_id}`);
    if (!/^[0-9a-f]{64}$/.test(task.task_digest)) throw new Error(`qualification task digest invalid: ${task.task_id}`);
  }
  return true;
}

export function loadQualificationCommitment() {
  const commitment = JSON.parse(readFileSync(COMMITMENT_URL, 'utf8'));
  validateQualificationCommitment(commitment);
  return commitment;
}

export function qualificationTaskAuthority(taskId) {
  const task = loadQualificationCommitment().task_index.find((entry) => entry.task_id === taskId);
  if (!task) throw new Error(`unknown qualification task: ${taskId}`);
  return Object.freeze({ taskId: task.task_id, taskDigest: task.task_digest, family: task.family });
}

export function buildAuthoritativeSlots() {
  const commitment = loadQualificationCommitment();
  const slots = generateBoundSlots({
    qualificationId: QUALIFICATION_ID,
    tasks: commitment.task_index.map((task) => ({ taskId: task.task_id, taskDigest: task.task_digest })),
    trialIndices: AUTHORITATIVE_TRIAL_INDICES
  });
  if (slots.length !== 42) throw new Error(`authoritative slot construction failed: expected 42, got ${slots.length}`);
  return slots;
}

export function authoritativeExpectedIdentity() {
  return Object.freeze({
    currentArtifactId: FROZEN_IDENTITY.sourceCommit,
    currentRenderSha256: CURRENT_RENDER_SHA256,
    absentRenderSha256: ABSENT_RENDER_SHA256
  });
}

function assertExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(`${label} fields mismatch: ${actual.join(',')}`);
}
