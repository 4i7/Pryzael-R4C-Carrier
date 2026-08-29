import { createHmac } from 'node:crypto';
import { sha256Hex, stableJson, toBuffer } from './hash.mjs';

export const CONDITION_IDS = Object.freeze(['NO_PRYZAEL', 'CURRENT_PRYZAEL']);
export const ACTIVATION = 'CONDITIONED_BEHAVIOR';
export const SURFACE = 'NATIVE';

export function generateSlots({ qualificationId, taskIds, conditions = CONDITION_IDS, trialIndices }) {
  return generateBoundSlots({
    qualificationId,
    tasks: uniqueDimension(taskIds, 'task').map((taskId) => ({ taskId, taskDigest: null })),
    conditions,
    trialIndices,
    includeTaskDigest: false
  });
}

export function generateBoundSlots({ qualificationId, tasks, conditions = CONDITION_IDS, trialIndices, includeTaskDigest = true }) {
  if (typeof qualificationId !== 'string' || qualificationId.length === 0) throw new Error('qualificationId required');
  if (!Array.isArray(tasks) || tasks.length === 0) throw new Error('task dimension required');
  const seenTasks = new Set();
  const normalizedTasks = tasks.map((task) => {
    if (!task || typeof task !== 'object') throw new Error('invalid task identity');
    if (typeof task.taskId !== 'string' || task.taskId.length === 0) throw new Error('invalid task identity');
    if (seenTasks.has(task.taskId)) throw new Error('duplicate task dimension value');
    seenTasks.add(task.taskId);
    if (includeTaskDigest && (typeof task.taskDigest !== 'string' || !/^[0-9a-f]{64}$/.test(task.taskDigest))) throw new Error(`invalid task digest: ${task.taskId}`);
    return { taskId: task.taskId, taskDigest: includeTaskDigest ? task.taskDigest : null };
  });
  const requestedConditions = uniqueDimension(conditions, 'condition');
  const trials = uniqueDimension(trialIndices, 'trial');
  for (const condition of requestedConditions) if (!CONDITION_IDS.includes(condition)) throw new Error(`unsupported condition: ${condition}`);
  for (const trial of trials) if (!Number.isInteger(trial) || trial < 0) throw new Error(`invalid trial index: ${trial}`);
  normalizedTasks.sort((a, b) => a.taskId < b.taskId ? -1 : a.taskId > b.taskId ? 1 : 0);
  const orderedConditions = CONDITION_IDS.filter((condition) => requestedConditions.includes(condition));
  trials.sort((a, b) => a - b);

  const slots = [];
  for (const task of normalizedTasks) {
    for (const conditionId of orderedConditions) {
      for (const trialIndex of trials) {
        const identity = {
          qualificationId,
          taskId: task.taskId,
          ...(includeTaskDigest ? { taskDigest: task.taskDigest } : {}),
          conditionId,
          trialIndex,
          activation: ACTIVATION,
          surface: SURFACE
        };
        slots.push(Object.freeze({ ...identity, slotId: `slot-${sha256Hex(stableJson(identity)).slice(0, 32)}` }));
      }
    }
  }
  return Object.freeze(slots);
}

export function deriveJudgeBlindId(slot, blindingKey) {
  if (!slot || typeof slot !== 'object') throw new Error('slot required');
  const key = toBuffer(blindingKey);
  if (key.length < 32) throw new Error('blinding key must be at least 32 bytes');
  const payload = stableJson({
    qualificationId: slot.qualificationId,
    slotId: slot.slotId,
    taskId: slot.taskId,
    taskDigest: slot.taskDigest ?? null,
    conditionId: slot.conditionId,
    trialIndex: slot.trialIndex,
    activation: slot.activation,
    surface: slot.surface
  });
  return `jb-${createHmac('sha256', key).update(payload, 'utf8').digest('hex')}`;
}

function uniqueDimension(values, label) {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${label} dimension required`);
  if (new Set(values).size !== values.length) throw new Error(`duplicate ${label} dimension value`);
  return [...values];
}
