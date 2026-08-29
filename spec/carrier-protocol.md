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

## Public human operator harness

The public human operator harness is an I/O/orchestration layer only. It does not introduce a renderer, slot generator, response-capture format, Judge framing, host-profile authority, or completeness algorithm. Its operator path directly reuses `buildPublicSyntheticSlots()`, `buildPublicTaskAuthority()`, `renderCurrent()`, `renderAbsent()`, `buildSubjectEnvelope()`, `captureResponse()`, `deriveJudgeBlindId()`, `buildPublicSyntheticJudgeAuthority()`, `buildJudgeEnvelope()`, `buildHostProfile()`, and `validatePublicSyntheticCompleteness()`.

The harness is restricted to the same four development slots already defined by the public authority: `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under `NO_PRYZAEL` and `CURRENT_PRYZAEL`, trial index 0, activation `CONDITIONED_BEHAVIOR`, surface `NATIVE`. It creates no caller-defined slot matrix. Its successful classification is always `PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN` / `NOT_R4C_EVIDENCE`; it cannot satisfy or invoke authoritative 42-slot completeness.

Every human-run artifact is private external state. The explicit run directory has no repository-local default and is canonicalized before sensitive creation. The Carrier repository root, descendants, and symlink/junction resolutions into the worktree are rejected. The same external-boundary check applies to operator-supplied host-attestation, SUBJECT-response, and Judge-result files. Private state may contain the blinding key and true slot/condition association because those are required to bind the run, but those values never belong in the Carrier worktree and are never copied to Judge-facing metadata.

Initialization binds the exact Carrier source identity supplied by the operator, verifies that the external frozen Pryzael checkout reproduces the tracked canonical manifest, constructs the four canonical public slots, and generates a fresh 32-byte cryptographically random blinding key with Node crypto. The deterministic key and synthetic responses used by `npm run dry-run` are not imported into human mode.

SUBJECT preparation requires an explicit visible host-attestation file. The attestation is validated by the existing host-profile authority without filling missing or unknown predicates. A malformed, missing, unknown, or mismatching required visible predicate makes the slot `INCONCLUSIVE`; no normal SUBJECT claim is prepared. Internal ChatGPT routing/backend state is not observable through this harness and remains `UNVERIFIED`.

The harness writes the exact `deliveryBytes` returned by the canonical SUBJECT builder as a Buffer and separately writes non-secret byte-count/SHA-256 integrity metadata. It does not reconstruct framing or normalize the packet.

Human response capture requires an explicit file. The file is read as a Buffer and passed directly to canonical `captureResponse()` without trimming, newline conversion, Markdown parsing, JSON serialization, or Unicode normalization. The preserved claim is limited to the exact bytes of the operator-supplied capture file; inaccessible browser/backend internal bytes remain unverified. Invalid UTF-8 makes the slot `INCONCLUSIVE`.

Judge preparation re-derives the private blind identity, re-verifies the captured response binding, uses the fixed public Judge authority through its canonical builder, and writes only canonical Judge `deliveryBytes` plus safe integrity metadata. Judge-facing filenames and metadata are keyed by opaque `judgeBlindId`; they omit condition labels, private slot identity, render identity, routing state, true-condition mappings, and the blinding key.

Judge result capture likewise requires an explicit external file. Exact valid UTF-8 bytes are preserved before the public structural TrialResult JSON object is parsed. The parsed object remains opaque to the operator harness; no success/failure scoring policy is added. Private state binds it to the canonical blind ID, task-authority digest, and captured response SHA-256. Malformed UTF-8, invalid JSON, a non-object result, or binding failure is `INCONCLUSIVE`/fail closed.

Final public-human validation assembles the four evidence records only from private external run state, rechecks response and blind bindings, and delegates structural completeness to `validatePublicSyntheticCompleteness()`. Missing, duplicate, extra, identity/render mismatch, Judge binding mismatch, paired visible host-profile mismatch, or any unresolved `INCONCLUSIVE` slot prevents success. The final CLI summary excludes response and Judge bodies and never claims that a real Temporary Chat or inaccessible backend bytes were independently proven by the harness.

## Completeness and public dry-run

Authoritative R4C completeness is exactly 42 slots: seven committed tasks, `NO_PRYZAEL` and `CURRENT_PRYZAEL`, and trial indices 0, 1, and 2. It rejects missing, duplicate, unexpected, wrong-task/digest, wrong-condition/index, wrong activation/surface, mixed qualification identity, artifact/render mismatch, response/Judge binding mismatch, and paired visible host-profile mismatch.

Public synthetic mechanics are explicitly separate. `npm run dry-run` prepares exactly four slots for `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under absent and present conditions at trial index 0. The resulting 4/4 structural completeness is never authoritative 42/42 R4C evidence. No hidden task, predicate, response, Judge authority, or result is consumed.

The public human operator harness uses that same four-slot public structural authority with real operator-supplied capture files, but its result remains development evidence only. Neither synthetic 4/4 nor human 4/4 changes the authoritative R4C matrix or its admission semantics.

## Tracked public-distribution scan

`npm run scan` enumerates `git ls-tree -r HEAD` and treats the tracked Git artifact, not arbitrary workspace traversal, as repository-boundary authority. It rejects tracked symlinks (mode `120000`), unexpected gitlinks/submodules (mode `160000`), forbidden hidden/frozen-source path classes, non-public fixture classes, and structural drift in the frozen manifest, public task prompts, public Judge fixture, or qualification commitment. Beneath `fixtures/public/**`, the tracked blob inventory is closed to exactly five paths: the two public `task.json` files, their two `synthetic-response.txt` files, and `fixtures/public/judge-authority.json`; any additional or missing tracked blob fails closed. An external `frozen-pryzael/` checkout disappears from this authority naturally when it is untracked; a tracked path under that name is rejected rather than skipped.

The scan establishes mechanically detectable tracked public-boundary invariants only. It does not claim proof that every possible semantic leak is absent, and it is not the primary containment control for human-run artifacts: those artifacts are rejected from the worktree before creation.

Only implementation, digest-only frozen manifest, non-secret qualification identity metadata, public development fixtures, synthetic responses, tests, and operator documentation belong here. Hidden qualification packet bytes, held-out prompts/predicates, real response bodies, real Judge inputs/results, real routing/blind mappings, private host/retry ledgers, and PR #10/R5 semantic material remain outside this repository.
