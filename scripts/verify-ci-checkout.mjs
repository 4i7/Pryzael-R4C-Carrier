#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function assertPullRequestIdentity({ localHead, localParents, githubSha, event }) {
  if (!event?.pull_request?.base?.sha || !event?.pull_request?.head?.sha) throw new Error('pull_request event identity missing');
  if (localHead !== githubSha) throw new Error(`local HEAD does not match GITHUB_SHA: ${localHead} != ${githubSha}`);
  if (!Array.isArray(localParents) || localParents.length !== 2) throw new Error(`pull_request synthetic merge must have exactly two parents, got ${localParents?.length ?? 0}`);
  if (localParents[0] !== event.pull_request.base.sha) throw new Error(`pull_request base parent mismatch: ${localParents[0]} != ${event.pull_request.base.sha}`);
  if (localParents[1] !== event.pull_request.head.sha) throw new Error(`pull_request head parent mismatch: ${localParents[1]} != ${event.pull_request.head.sha}`);
  return true;
}

export function assertPushIdentity({ localHead, githubSha, githubRef, event }) {
  if (!event?.after || !event?.ref) throw new Error('push event identity missing');
  if (localHead !== githubSha) throw new Error(`local HEAD does not match GITHUB_SHA: ${localHead} != ${githubSha}`);
  if (localHead !== event.after) throw new Error(`push after identity mismatch: ${localHead} != ${event.after}`);
  if (githubRef !== event.ref) throw new Error(`push ref identity mismatch: ${githubRef} != ${event.ref}`);
  return true;
}

export function verifyCiCheckout({ eventName, githubSha, githubRef, event, root = process.cwd() }) {
  const localHead = git(root, 'rev-parse', 'HEAD');
  const localTree = git(root, 'rev-parse', 'HEAD^{tree}');
  const parentsText = git(root, 'show', '-s', '--format=%P', 'HEAD');
  const localParents = parentsText ? parentsText.split(/\s+/u) : [];
  if (eventName === 'pull_request') assertPullRequestIdentity({ localHead, localParents, githubSha, event });
  else if (eventName === 'push') assertPushIdentity({ localHead, githubSha, githubRef, event });
  else throw new Error(`unsupported CI event for exact checkout identity: ${eventName}`);
  return Object.freeze({ eventName, localHead, localTree, localParents });
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH missing');
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const result = verifyCiCheckout({
    eventName: process.env.GITHUB_EVENT_NAME,
    githubSha: process.env.GITHUB_SHA,
    githubRef: process.env.GITHUB_REF,
    event,
    root: process.env.GITHUB_WORKSPACE ?? process.cwd()
  });
  const evidence = {
    status: 'PASS',
    event: result.eventName,
    localHead: result.localHead,
    localTree: result.localTree,
    localParents: result.localParents,
    expectedBaseSha: event.pull_request?.base?.sha ?? null,
    expectedHeadSha: event.pull_request?.head?.sha ?? null,
    expectedPushAfter: event.after ?? null,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    runnerOs: process.env.RUNNER_OS ?? null,
    runnerArch: process.env.RUNNER_ARCH ?? null,
    imageOs: process.env.ImageOS ?? null,
    imageVersion: process.env.ImageVersion ?? null
  };
  process.stdout.write(`CI_CHECKOUT_IDENTITY=${JSON.stringify(evidence)}\n`);
}

function git(root, ...args) {
  return execFileSync('git', ['-C', resolve(root), ...args], { encoding: 'utf8' }).trim();
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) main();
