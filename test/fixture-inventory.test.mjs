import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { scanTrackedRepository } from '../scripts/scan-public-repo.mjs';

const SOURCE_REPO_ROOT = resolve(import.meta.dirname, '..');
const EXPECTED_PUBLIC_FIXTURE_PATHS = Object.freeze([
  'fixtures/public/DEV-REPLAN-001/synthetic-response.txt',
  'fixtures/public/DEV-REPLAN-001/task.json',
  'fixtures/public/DEV-SIMPLE-001/synthetic-response.txt',
  'fixtures/public/DEV-SIMPLE-001/task.json',
  'fixtures/public/judge-authority.json'
]);

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function cloneTrackedCarrier() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'r4c-fixture-inventory-'));
  const root = join(tempRoot, 'repo');
  execFileSync('git', ['clone', '--quiet', '--no-hardlinks', SOURCE_REPO_ROOT, root], { encoding: 'utf8' });
  git(root, 'config', 'user.email', 'test@example.invalid');
  git(root, 'config', 'user.name', 'R4C Fixture Inventory Test');
  return { root, tempRoot };
}

function commitTrackedFile(root, path, content = 'unexpected fixture material\n') {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
  git(root, 'add', '--', path);
  git(root, 'commit', '-m', `track ${path}`);
}

function assertTrackedFixtureRejected(path) {
  const { root, tempRoot } = cloneTrackedCarrier();
  try {
    commitTrackedFile(root, path);
    assert.throws(
      () => scanTrackedRepository({ root }),
      /public fixture inventory|unexpected tracked public fixture/i
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('tracked extra root public fixture is rejected', () => {
  assertTrackedFixtureRejected('fixtures/public/extra.txt');
});

test('tracked extra task public fixture is rejected', () => {
  assertTrackedFixtureRejected('fixtures/public/DEV-SIMPLE-001/unexpected-material.bin');
});

test('tracked nested public fixture is rejected', () => {
  assertTrackedFixtureRejected('fixtures/public/DEV-REPLAN-001/subdir/file.txt');
});

test('known exact five-file public fixture inventory is accepted', () => {
  const { root, tempRoot } = cloneTrackedCarrier();
  try {
    const inventory = git(root, 'ls-tree', '-r', '--name-only', 'HEAD', 'fixtures/public')
      .split('\n')
      .filter(Boolean)
      .sort();
    assert.deepEqual(inventory, EXPECTED_PUBLIC_FIXTURE_PATHS);
    assert.doesNotThrow(() => scanTrackedRepository({ root }));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
