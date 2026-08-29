# Pryzael R4C Carrier Protocol

This public carrier implements identity, rendering, closed delivery-envelope, exact-byte integrity, blinding, and structural completeness mechanics for the frozen Pryzael R4C experiment. It does not define a new evaluation policy and does not execute the hidden baseline.

## Frozen CURRENT and qualification authority

`CURRENT_PRYZAEL` is bound only to `4i7/Pryzael` commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, root tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, plugin version `0.3.0`, and renderer `r4c-condition-render-v1`.

The Carrier stores no copied Skill bodies. An external exact historical checkout is verified for commit, root tree, Skill tree, plugin version, complete model-visible path set, Git blob SHA-1, byte count, and SHA-256 before rendering. The manifest binds the renderer implementation and rendered condition digests; the builder renders twice and rejects disagreement.

The non-secret frozen qualification commitment records exactly seven task IDs and task digests without held-out prompt or predicate bodies. Authoritative completeness loads that tracked commitment and constructs the required 7 × 2 × 3 matrix internally with activation `CONDITIONED_BEHAVIOR` and surface `NATIVE`. Observed evidence is caller-supplied; the expected authoritative matrix is not.

## NO condition and closed SUBJECT delivery

The absent condition uses the same `R4C-CONDITION` envelope class, declares `STATE ABSENT`, and contains zero Pryzael semantic bytes. It does not emulate absence with negative Pryzael workflow instructions.

Real SUBJECT execution remains a human-operated fresh ChatGPT Temporary Chat outside Projects. Visible host attestation must show no personalization, Pryzael native/plugin/MCP assistance, candidate material, or session reuse. Observable mismatch fails closed; unobservable state remains unknown.

Model-visible SUBJECT bytes are produced by a closed constructor from only: the exact assigned condition realization, one fixed neutral Carrier authority payload, the exact task prompt bytes, and deterministic framing. There is no generic metadata, notes, instruction, authorization-envelope, or extension field. Public task prompts are verified against fixed public prompt digests. Future hidden execution can supply exact prompt bytes plus an externally trusted expected prompt digest and the publicly committed task digest; the Carrier does not store hidden prompt material.

## Strict response capture and closed Judge delivery

Response capture accepts only exact valid UTF-8. It preserves the original bytes, CRLF/LF distinction, trailing spaces, byte count, and SHA-256 without normalization. Malformed or truncated UTF-8 is `INCONCLUSIVE`; invalid bytes are never replacement-character decoded into captured evidence. If exact bytes are unavailable, reconstruction is forbidden. An empty but exactly captured UTF-8 response remains an exact zero-byte capture under the existing protocol.

Judge blind IDs are HMAC-SHA-256 values derived using execution-context blinding state. Real keys and true-condition mappings stay outside this repository. The Judge constructor is closed: it receives only the opaque blind ID, an opaque task-authority digest, exact captured response bytes, and an exact Judge-authority byte payload authenticated by its expected SHA-256. Carrier-controlled framing does not include condition labels, true-condition mappings, opposing conditions, render identity, routing ledger state, slot identity, or arbitrary metadata.

The public synthetic Judge authority is one fixed public fixture with a fixed digest. Future hidden execution may supply an exact external Judge-authority payload and trusted expected digest without storing it here. The Carrier proves exact-byte/digest binding and prevents Carrier/caller metadata from bypassing blinding; it does **not** claim semantic cleanliness of independently trusted hidden Judge-authority bytes.

## Completeness and public dry-run

Authoritative R4C completeness is exactly 42 slots: seven committed tasks, `NO_PRYZAEL` and `CURRENT_PRYZAEL`, and trial indices 0, 1, and 2. It rejects missing, duplicate, unexpected, wrong-task/digest, wrong-condition/index, wrong activation/surface, mixed qualification identity, artifact/render mismatch, response/Judge binding mismatch, and paired visible host-profile mismatch.

Public synthetic mechanics are explicitly separate. `npm run dry-run` prepares exactly four slots for `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under absent and present conditions at trial index 0. The resulting 4/4 structural completeness is never authoritative 42/42 R4C evidence. No hidden task, predicate, response, Judge authority, or result is consumed.

## Tracked public-distribution scan

`npm run scan` enumerates `git ls-tree -r HEAD` and treats the tracked Git artifact, not arbitrary workspace traversal, as repository-boundary authority. It rejects tracked symlinks (mode `120000`), unexpected gitlinks/submodules (mode `160000`), forbidden hidden/frozen-source path classes, non-public fixture classes, and structural drift in the frozen manifest, public task prompts, public Judge fixture, or qualification commitment. Beneath `fixtures/public/**`, the tracked blob inventory is closed to exactly five paths: the two public `task.json` files, their two `synthetic-response.txt` files, and `fixtures/public/judge-authority.json`; any additional or missing tracked blob fails closed. An external `frozen-pryzael/` checkout disappears from this authority naturally when it is untracked; a tracked path under that name is rejected rather than skipped.

The scan establishes mechanically detectable tracked public-boundary invariants only. It does not claim proof that every possible semantic leak is absent.

Only implementation, digest-only frozen manifest, non-secret qualification identity metadata, public development fixtures, synthetic responses, tests, and operator documentation belong here. Hidden qualification packet bytes, held-out prompts/predicates, real response bodies, real Judge inputs/results, real routing/blind mappings, private host/retry ledgers, and PR #10/R5 semantic material remain outside this repository.
