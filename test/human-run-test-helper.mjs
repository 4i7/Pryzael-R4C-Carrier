import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const humanRunCli = resolve(repositoryRoot, 'scripts/human-run.mjs');

export function runHuman(args) {
  return spawnSync(process.execPath, [humanRunCli, ...args], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: { ...process.env }
  });
}
