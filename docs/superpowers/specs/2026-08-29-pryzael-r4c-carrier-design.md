# Pryzael R4C Carrier Design

Date: 2026-08-29
Status: Design only — implementation requires explicit review/approval
Repository: `4i7/Pryzael-R4C-Carrier`

## 1. Purpose

This repository is a standalone qualification carrier for Pryzael R4C conditioned-behavior evaluation. It is not a Pryzael runtime, plugin replacement, transport, model client, browser supervisor, or production dependency.

Its purpose is to make the bounded R4C baseline experiment reproducible, auditable, and fail-closed while preserving the already-frozen Pryzael evaluation authority.

The carrier MUST NOT modify `4i7/Pryzael`, PR #10, the R5 candidate, or the frozen R4 evaluation semantics.

## 2. Authority boundary

The carrier is subordinate to the frozen Pryzael R4 authority. It does not create a new evaluation policy.

Historical CURRENT comparator identity:

- repository: `4i7/Pryzael`
- source commit: `3bba19e0be936e7b9d3554ac737d32f5cf84c846`
- source tree: `29c3d97126d0f11de8d5c89dddf21f23d861f257`
- canonical `skills/` tree: `4395ef86a309ed610f4860f47284d0e4da572914`
- plugin version: `0.3.0`

Qualification packet commitment:

- qualification set: `pryzael-r4-qualification-cea3a894-v1`
- packet schema: `r4-qualification-packet-v1`
- packet SHA-256: `892a0c84f1c0adc45bb230efbb5a66cb86150def7ca6fc8fd9d5fcc38381b600`
- packet bytes: `14743`

The hidden packet itself MUST NOT be committed to this repository.

## 3. Scope

The public carrier MAY contain only repository-safe mechanics and synthetic development-task evidence:

- deterministic historical-condition renderer specification and implementation;
- immutable frozen-source identity manifest;
- canonical path/blob/byte/SHA-256 inventory for model-visible CURRENT material;
- ABSENT-condition realization for NO_PRYZAEL;
- public subject-envelope construction;
- slot/manifest generation;
- response byte hashing helpers;
- blinded Judge-envelope construction mechanics;
- baseline-completeness validation;
- public synthetic dry-run fixtures/results;
- negative fail-closed test vectors;
- operator documentation.

The repository MUST NOT contain:

- hidden qualification tasks or predicates;
- hidden SUBJECT response bodies;
- hidden Judge inputs/results/feedback;
- true-condition-to-opaque routing maps used for real qualification;
- private retry/environment/attestation ledgers for the real 42-trial baseline;
- PR #10 or R5 candidate semantic material.

## 4. Selected operational design

The authoritative SUBJECT host remains ChatGPT Web Temporary Chat operated manually by a human.

For every SUBJECT attempt:

1. create a new non-personalized Temporary Chat outside Projects;
2. record visible model/product/tool configuration before submission;
3. select the precommitted opaque condition slot;
4. prepare and verify the exact condition realization;
5. append only the exact task prompt and fixed ordinary-tool/authority envelope;
6. submit once;
7. capture the exact visible assistant output without rewriting;
8. record byte count and SHA-256;
9. close the attempt and never reuse that chat for another SUBJECT trial.

The carrier does not automate browser submission. It prepares, verifies, hashes, and audits the material around the manual host operation.

## 5. Condition realization

### 5.1 CURRENT_PRYZAEL

Renderer version: `r4c-condition-render-v1`.

The renderer MUST resolve only the frozen historical commit/tree. Moving refs such as `main` are forbidden inputs.

Model-visible semantic material consists of all ten historical canonical Skill packages:

- exact UTF-8 `skills/<name>/SKILL.md` files;
- exact package-local text resources under `references/`, `assets/`, and `scripts/`;
- deterministic ordinal path ordering.

Excluded from model-visible semantics:

- LICENSE files;
- `.codex-plugin/plugin.json` descriptive/default-prompt material;
- generated MCP wrappers/tool names/titles;
- project docs;
- current `main`;
- PR #10/R5 material.

For every included path, the carrier records:

- path;
- Git blob SHA-1;
- exact byte count;
- SHA-256.

It then renders fixed non-semantic delimiters plus the exact UTF-8 file bytes and computes:

`condition_render_sha256 = SHA256(exact delivered condition bytes)`

A separate canonical manifest SHA-256 binds repository identity, source commit/tree, canonical Skill tree, plugin version, renderer version/hash, path/blob inventory, and rendered digest.

Any mismatch aborts before SUBJECT submission.

### 5.2 NO_PRYZAEL

NO_PRYZAEL uses the same carrier shape with an explicit ABSENT condition and zero Pryzael semantic bytes.

The host must not expose Pryzael through Project context, personalization, native Pryzael deployment, plugin, MCP, or task-specific Pryzael projection.

Any observable Pryzael assistance or unresolved boundary uncertainty makes the trial INCONCLUSIVE.

## 6. Host equivalence and isolation

CURRENT and NO use the same host procedure. Only condition bytes differ.

Before paired execution, the operator records the visible ordinary-tool inventory, model/product configuration, and authorization envelope. If an observable difference exists between paired slots, the pair is INCONCLUSIVE.

Unobservable host state remains `UNKNOWN`; the carrier MUST NOT promote it to verified fact.

Any observable prior-task, opposing-condition, Judge, Project, personalization, plugin, or candidate carry-over invalidates the affected trial.

## 7. SUBJECT/JUDGE separation

SUBJECT receives only:

1. assigned deterministic condition realization;
2. exact frozen task `prompt`;
3. fixed ordinary-tool/authority envelope.

SUBJECT MUST NOT receive gold/reference answers, success predicates, critical predicates, metric applicability, Judge rubric/material, aggregate outcomes, opposing-condition mapping, or R5 candidate material.

Judge execution occurs in separate isolated Temporary Chats or an equivalently isolated zero-cost context. Judge sees only:

- opaque `judge_blind_id`;
- exact captured SUBJECT response;
- hidden task authority required by the frozen Judge protocol.

Judge does not receive the true condition mapping. Unblinding happens only after Judge result capture.

## 8. Trial identity and completeness

The authoritative baseline matrix is:

- 7 committed qualification tasks;
- 2 conditions: NO_PRYZAEL and CURRENT_PRYZAEL;
- 3 trial indices;
- activation: `CONDITIONED_BEHAVIOR`;
- surface: `NATIVE`.

Total required slots: 42.

The carrier generates an expected-slot manifest from frozen public commitment metadata and validates:

- 21/21 NO_PRYZAEL slots;
- 21/21 CURRENT_PRYZAEL slots;
- no missing slots;
- no duplicate slots;
- no unexpected slots;
- exact qualification/task/condition identity;
- correct historical-or-NONE artifact identity;
- correct condition-render digest;
- response digest identity;
- Judge-result identity;
- paired host-envelope comparability.

The carrier reuses the existing Pryzael TrialResult contract rather than inventing a replacement evaluation schema.

## 9. Response capture

The exact visible assistant output is captured without editing, cleanup, summarization, or normalization.

For each captured response the private qualification workspace records:

- capture method;
- timestamp;
- exact UTF-8 byte count;
- SHA-256.

If exact output cannot be recovered, the trial is INCONCLUSIVE.

Real hidden response bodies remain outside this public repository.

## 10. Retry semantics

At most one retry is permitted, and only for an externally observable host/transport/tool failure before any substantive answer.

A retry uses a completely new Temporary Chat and remains bound to the same required slot.

The following are not silently retriable:

- substantive partial answer;
- lost post-answer response;
- condition injection uncertainty discovered after substantive generation;
- wrong host/model discovered after generation;
- contamination;
- Judge isolation failure.

Those conditions produce the appropriate failed/INCONCLUSIVE record.

## 11. Fail-closed rules

Pre-send abort or INCONCLUSIVE is mandatory for any unresolved:

- wrong/moved source commit or tree;
- wrong canonical Skill tree;
- missing/wrong path or blob;
- render nondeterminism/digest mismatch;
- ambiguous CURRENT identity;
- Pryzael presence in NO_PRYZAEL;
- missing CURRENT semantic material;
- wrong assigned-condition execution;
- observable host/model/tool asymmetry;
- session reuse or carry-over;
- Project/personalization/plugin contamination;
- PR #10/R5 candidate exposure;
- altered/lost/unrecoverable response;
- unauthorized retry/duplicate submission;
- hidden-predicate leakage to SUBJECT;
- SUBJECT/Judge state sharing;
- condition unblinding to Judge;
- response/Judge ledger mismatch;
- missing/duplicate/unexpected baseline slot.

`UNKNOWN` remains distinct from `VERIFIED`.

## 12. Public dry-run

Before any hidden baseline execution, implement and run public synthetic mechanics only.

Minimum dry-run:

- `DEV-SIMPLE-001` NO_PRYZAEL;
- `DEV-SIMPLE-001` CURRENT_PRYZAEL;
- `DEV-REPLAN-001` NO_PRYZAEL;
- `DEV-REPLAN-001` CURRENT_PRYZAEL;
- four blinded public Judge runs.

The dry-run proves mechanics only and MUST NOT count toward R4C.

Required negative cases include:

- wrong source commit/tree;
- wrong blob;
- wrong rendered digest;
- missing slot;
- duplicate slot;
- host-profile mismatch;
- contaminated session attestation;
- altered response.

No hidden packet bytes may be consumed by the public dry-run.

## 13. Proposed implementation structure

```text
package.json
src/
  frozen-source.mjs
  condition-renderer.mjs
  slots.mjs
  subject-envelope.mjs
  response-capture.mjs
  judge-envelope.mjs
  completeness.mjs
spec/
  carrier-protocol.md
fixtures/public/
  DEV-SIMPLE-001/
  DEV-REPLAN-001/
test/
  frozen-source.test.mjs
  condition-renderer.test.mjs
  slots.test.mjs
  subject-envelope.test.mjs
  response-capture.test.mjs
  judge-envelope.test.mjs
  completeness.test.mjs
  fail-closed.test.mjs
```

Implementation should use Node.js built-ins where practical. No database, browser automation framework, model/API client, Worker, or resident service is required.

## 14. Data-flow boundary

```text
Frozen public Pryzael Git identity
        |
        v
identity guard + deterministic renderer
        |
        +--> CURRENT exact condition bytes
        +--> NO ABSENT condition
        |
        v
precommitted slot / host attestation
        |
        v
human-operated fresh Temporary Chat SUBJECT
        |
        v
exact response capture + SHA-256
        |
        v
blinded Judge envelope
        |
        v
isolated Temporary Chat JUDGE
        |
        v
private evidence ledger
        |
        v
42-slot completeness + existing R4 TrialResult validation
```

## 15. Non-goals

This project does not:

- change Pryzael production Skills;
- merge or alter PR #10;
- evaluate R5 candidate semantics during baseline collection;
- claim native automatic Skill selection;
- claim MCP automatic selection;
- create a paid API dependency;
- automate ChatGPT UI submission;
- weaken R4 evaluation criteria for host convenience;
- expose hidden qualification authority publicly.

## 16. Completion criteria for implementation phase

Implementation is ready for public dry-run only when:

1. frozen historical identity guards pass on the exact comparator;
2. CURRENT rendering is deterministic and manifest-bound;
3. NO emits zero Pryzael semantic bytes;
4. public slot generation is deterministic and duplicate-safe;
5. response bytes can be hashed without normalization;
6. Judge bundles contain no condition identity;
7. completeness rejects missing/duplicate/unexpected slots;
8. all required negative fixtures fail closed;
9. public tests pass from a clean checkout;
10. no hidden packet material, private real-baseline ledger, or R5 candidate material exists in the repository.

Hidden R4C execution remains a separate later action and is not authorized by completion of this implementation.
