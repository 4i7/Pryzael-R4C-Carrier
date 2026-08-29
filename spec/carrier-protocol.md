# Pryzael R4C Carrier Protocol

This public carrier implements identity, rendering, envelope, exact-byte integrity, blinding, and structural completeness mechanics for the frozen Pryzael R4C experiment. It does not define a new evaluation policy and does not execute the hidden baseline.

## Frozen CURRENT authority

`CURRENT_PRYZAEL` is bound only to `4i7/Pryzael` commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, root tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, plugin version `0.3.0`, and renderer `r4c-condition-render-v1`.

The Carrier stores no copied Skill bodies. An external exact historical checkout is verified for commit, root tree, Skill tree, plugin version, complete model-visible path set, Git blob SHA-1, byte count, and SHA-256 before rendering. Included material is only each canonical package's exact `SKILL.md` plus package-local text resources under `references/`, `assets/`, and `scripts/`, in ordinal path order. LICENSE and non-package material are excluded. The manifest binds the renderer implementation and rendered condition digests; the builder renders twice and rejects disagreement.

## NO condition

The absent condition uses the same `R4C-CONDITION` envelope class, declares `STATE ABSENT`, and contains zero semantic bytes. It does not emulate absence with negative Pryzael workflow instructions.

## Manual SUBJECT boundary

Real SUBJECT execution remains a human-operated fresh ChatGPT Temporary Chat outside Projects. The Carrier never submits through a browser, invokes a paid model API, or runs a resident supervisor. Visible host attestation must show no personalization, Pryzael native/plugin/MCP assistance, candidate material, or session reuse. Observable mismatch fails closed; unobservable state remains unknown.

The public dry-run uses an explicitly synthetic host profile to exercise these structures. It is not evidence that a real Temporary Chat was opened and does not count toward R4C.

## Exact response and Judge separation

Response capture hashes exactly supplied UTF-8 bytes without trimming, whitespace or line-ending normalization, Markdown rewriting, cleanup, or summarization. If exact bytes are unavailable the record is `INCONCLUSIVE` and reconstruction is forbidden.

Judge blind IDs are HMAC-SHA-256 values derived using execution-context blinding state. Real keys and true-condition mappings stay outside this repository. Judge envelopes contain only an opaque blind ID, exact captured response/digest, and separately supplied Judge authority. Condition labels, slot/artifact identity, and opposing-condition identity are rejected. Public synthetic Judge material is explicitly non-secret and is not real R4C authority.

## Completeness and public dry-run

The structural baseline remains seven committed tasks by two conditions by three trial indices: 42 slots. The Carrier can generate this shape without hidden task contents. It rejects missing, duplicate, or unexpected slots and identity, artifact, render, response, Judge, or paired visible host-profile mismatches. `judgeResult.trialResult` remains opaque; the Carrier does not invent admission semantics.

`npm run dry-run` prepares exactly four public synthetic mechanics slots for `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under absent and present conditions, exact-byte captures their synthetic response fixtures, constructs blinded synthetic Judge envelopes, and validates the four-record structural set. No hidden task, predicate, response, Judge authority, or result is consumed.

Only implementation, digest-only frozen manifest, public development fixtures, synthetic responses, tests, and operator documentation belong here. Hidden qualification packet bytes, held-out prompts/predicates, real response bodies, real Judge inputs/results, real routing/blind mappings, private host/retry ledgers, and PR #10/R5 semantic material remain outside this repository.
