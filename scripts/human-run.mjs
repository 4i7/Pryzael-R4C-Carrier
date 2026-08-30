#!/usr/bin/env node
import {
  captureHumanResponse,
  initializeHumanRun,
  prepareHumanJudge,
  prepareHumanSubject,
  recordHumanJudgeResult,
  validateHumanRun
} from './human-run-state.mjs';

const COMMANDS = Object.freeze({
  init: Object.freeze({
    required: Object.freeze(['run-dir','pryzael-source','carrier-main']),
    invoke: (args) => initializeHumanRun({ runDir: args['run-dir'], pryzaelSource: args['pryzael-source'], carrierMain: args['carrier-main'] })
  }),
  'prepare-subject': Object.freeze({
    required: Object.freeze(['run-dir','slot','attestation-file']),
    invoke: (args) => prepareHumanSubject({ runDir: args['run-dir'], slotId: args.slot, attestationFile: args['attestation-file'] })
  }),
  'capture-response': Object.freeze({
    required: Object.freeze(['run-dir','slot','response-file']),
    invoke: (args) => captureHumanResponse({ runDir: args['run-dir'], slotId: args.slot, responseFile: args['response-file'] })
  }),
  'prepare-judge': Object.freeze({
    required: Object.freeze(['run-dir','slot']),
    invoke: (args) => prepareHumanJudge({ runDir: args['run-dir'], slotId: args.slot })
  }),
  'record-judge-result': Object.freeze({
    required: Object.freeze(['run-dir','blind-id','result-file']),
    invoke: (args) => recordHumanJudgeResult({ runDir: args['run-dir'], blindId: args['blind-id'], resultFile: args['result-file'] })
  }),
  validate: Object.freeze({
    required: Object.freeze(['run-dir']),
    invoke: (args) => validateHumanRun({ runDir: args['run-dir'] })
  })
});

function parseOptions(argv, allowed) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unexpected positional argument: ${token}`);
    const key = token.slice(2);
    if (!allowed.has(key)) throw new Error(`unknown option for command: --${key}`);
    if (Object.hasOwn(result, key)) throw new Error(`duplicate option: --${key}`);
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`--${key} requires a value`);
    result[key] = value;
  }
  return result;
}

function main() {
  const [commandName, ...rest] = process.argv.slice(2);
  const command = COMMANDS[commandName];
  if (!command) throw new Error(`unknown or missing human-run command: ${commandName ?? '<missing>'}`);
  const allowed = new Set(command.required);
  const options = parseOptions(rest, allowed);
  for (const key of command.required) if (!Object.hasOwn(options, key)) throw new Error(`--${key} is required`);
  const result = command.invoke(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result?.status === 'INCONCLUSIVE') process.exitCode = 2;
}

try {
  main();
} catch (error) {
  process.stderr.write(`HUMAN_RUN_ERROR=${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
