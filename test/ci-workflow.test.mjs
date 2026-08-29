import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const nodeVersion = readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();

test('qualification runtime and GitHub-owned Actions are exact-pinned', () => {
  assert.equal(nodeVersion, '22.23.2');
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.doesNotMatch(workflow, /ubuntu-latest/);
  assert.match(workflow, /actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
  assert.match(workflow, /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
  assert.doesNotMatch(workflow, /actions\/(?:checkout|setup-node)@v\d/);
  assert.match(workflow, /node-version-file: \.node-version/);
  assert.match(workflow, /permissions:\n  contents: read/);
});

test('exact checkout identity guard executes before correctness tests', () => {
  const guard = workflow.indexOf('node scripts/verify-ci-checkout.mjs');
  const tests = workflow.indexOf('npm test');
  assert.ok(guard >= 0, 'identity guard missing');
  assert.ok(tests >= 0, 'test command missing');
  assert.ok(guard < tests, 'identity guard must run before correctness tests');
});
