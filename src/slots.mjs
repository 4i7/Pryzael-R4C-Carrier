import { createHmac } from 'node:crypto';
import { sha256Hex, stableJson, toBuffer } from './hash.mjs';

export const CONDITION_IDS = Object.freeze(['NO_PRYZAEL', 'CURRENT_PRYZAEL']);

export function generateSlots({ qualificationId, taskIds, conditions = CONDITION_IDS, trialIndices }) {
  if (typeof qualificationId !== 'string' || qualificationId.length === 0) throw new Error('qualificationId required');
  const tasks = uniqueDimension(taskIds, 'task');
  const requestedConditions = uniqueDimension(conditions, 'condition');
  const trials = uniqueDimension(trialIndices, 'trial');
  for (const condition of requestedConditions) {
    if (!CONDITION_IDS.includes(condition)) throw new Error(`unsupported condition: ${condition}`);
  }
  for (const trial of trials) {
    if (!Number.isInteger(trial) || trial < 0) throw new Error(`invalid trial index: ${trial}`);
  }
  tasks.sort();
  const orderedConditions = CONDITION_IDS.filter((condition) => requestedConditions.includes(condition));
  trials.sort((a, b) => a - b);

  const slots = [];
  for (const taskId of tasks) {
    if (typeof taskId !== 'string' || taskId.length === 0) throw new Error('invalid task identity');
    for (const conditionId of orderedConditions) {
      for (const trialIndex of trials) {
        const identity = { qualificationId, taskId, conditionId, trialIndex };
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
    conditionId: slot.conditionId,
    trialIndex: slot.trialIndex
  });
  return `jb-${createHmac('sha256', key).update(payload, 'utf8').digest('hex')}`;
}

function uniqueDimension(values, label) {
  if (!Array.isArray(values) || values.length === 0) throw new Error(`${label} dimension required`);
  if (new Set(values).size !== values.length) throw new Error(`duplicate ${label} dimension value`);
  return [...values];
}
