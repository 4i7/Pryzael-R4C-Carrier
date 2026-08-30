# Pryzael R4C Carrier Protocol

This public carrier implements identity, rendering, closed delivery-envelope, exact-byte integrity, blinding, and structural completeness mechanics for the frozen Pryzael R4C experiment. It does not execute the hidden baseline. The historical protocol below continues to define the stronger Carrier mechanics; [Issue #4](https://github.com/4i7/Pryzael-R4C-Carrier/issues/4) separately defines the proportional public R5 MVP evaluation policy.

## Frozen CURRENT and qualification authority

`CURRENT_PRYZAEL` is bound only to `4i7/Pryzael` commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, root tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, plugin version `0.3.0`, and renderer `r4c-condition-render-v1`.

The Carrier stores no copied Skill bodies. An exact historical checkout is freshly verified for commit, root tree, Skill tree, plugin version, complete model-visible path set, Git blob SHA-1, byte count, and SHA-256 before rendering. The generated manifest must exactly reproduce the tracked canonical manifest. The canonical manifest digest is `456bf072c4f68c2dfdee18152930dc8eb0194c4c723d830601f78d463d8a1d2c`; CURRENT is `d4954eca15a58094daf185d30cd0343cbc9fc550bfc57bf30e3bc789b59d7557`; ABSENT is `bddc995273f2a9d22a86706ab3b5b2ca530eb6557a2ea40318725b40a196af64`.

The non-secret frozen qualification commitment records exactly seven task IDs and task digests without held-out prompt or predicate bodies. Authoritative completeness loads that tracked commitment and constructs the required 7 × 2 × 3 matrix internally with activation `CONDITIONED_BEHAVIOR` and surface `NATIVE`. Observed evidence is caller-supplied; the expected authoritative matrix is not.

## Issue #4 R5 MVP path

Issue #4 authorizes a separate lightweight comparison under `evaluation/r5-mvp/**`. That path uses six intentionally public-safe development tasks, one R4 and one R5 SUBJECT execution per task in fresh ChatGPT Web sessions, separate fresh blind A/B Judge sessions, and a concise aggregate summary. Its default initial SUBJECT count is 12, not 42.

The existing human-run harness, exact-byte capture mechanics, blinding machinery, and authoritative 42-slot validator remain available as stronger optional infrastructure. They are not prerequisites for the Issue #4 MVP, and the previously initialized Windows public run does not need to be continued. Hidden R4C execution is not required by the MVP path.

Intentionally public-safe MVP tasks, R4/R5 final outputs, blind Judge reviews, post-judge A/B mappings, and aggregate summaries may be committed only under `evaluation/r5-mvp/**`. Hidden/held-out evaluation material, secrets, private user/operator data, authoritative hidden R4C responses/results, and material whose disclosure would invalidate a hidden benchmark remain excluded.

## NO condition and closed SUBJECT delivery

The absent condition uses the same `R4C-CONDITION` envelope class, declares `STATE ABSENT`, and contains zero Pryzael semantic bytes. It does not emulate absence with negative Pryzael workflow instructions.

Real SUBJECT execution remains a human-operated fresh ChatGPT Temporary Chat outside Projects. Visible host attestation must show no personalization, Pryzael native/plugin/MCP assistance, candidate material, or session reuse. Observable mismatch fails closed; unobservable state remains unknown.

Model-visible SUBJECT source bytes are produced by a closed constructor from only: the exact assigned condition realization, one fixed neutral Carrier authority payload, the exact task prompt bytes, and deterministic framing. There is no generic metadata, notes, instruction, authorization-envelope, or extension field. Public task prompts are verified against fixed public prompt digests. Future hidden execution can supply exact prompt bytes plus an externally trusted expected prompt digest and the publicly committed task digest; the Carrier does not store hidden prompt material.

The term “model-visible” in the preceding paragraph describes the intended protocol payload. For the public human web harness, Carrier mechanically proves only the generated source file, not the browser/backend ingress actually observed by the model; the epistemic boundary is defined below.

## Strict response capture and closed Judge delivery

Response capture accepts only exact valid UTF-8. It preserves the original supplied capture-file bytes, CRLF/LF distinction, trailing spaces, byte count, and SHA-256 without normalization. Malformed or truncated UTF-8 is `INCONCLUSIVE`; invalid bytes are never replacement-character decoded into captured evidence. If exact capture bytes are unavailable, reconstruction is forbidden. An empty but exactly captured UTF-8 response remains an exact zero-byte capture under the existing protocol.

Judge blind IDs are HMAC-SHA-256 values derived using execution-context blinding state. Real keys and true-condition mappings stay outside this repository. The Judge constructor is closed: it receives only the opaque blind ID, an opaque task-authority digest, exact captured response bytes, and an exact Judge-authority byte payload authenticated by its expected SHA-256. Carrier-controlled framing does not include condition labels, true-condition mappings, opposing conditions, render identity, routing ledger state, slot identity, or arbitrary metadata.

The public synthetic Judge authority is one fixed public fixture with a fixed digest. Future hidden execution may supply an exact external Judge-authority payload and trusted expected digest without storing it here. The Carrier proves exact-byte/digest binding and prevents Carrier/caller metadata from bypassing blinding; it does **not** claim semantic cleanliness of independently trusted hidden Judge-authority bytes.

## Public human operator harness

The public human operator harness is an I/O/orchestration layer only and is now an optional stronger diagnostic/qualification path relative to the Issue #4 MVP. It does not introduce a renderer, slot generator, response-capture format, Judge framing, host-profile authority, or completeness algorithm. Its operator path directly reuses `buildPublicSyntheticSlots()`, `buildPublicTaskAuthority()`, `renderCurrent()`, `renderAbsent()`, `buildSubjectEnvelope()`, `captureResponse()`, `deriveJudgeBlindId()`, `buildPublicSyntheticJudgeAuthority()`, `buildJudgeEnvelope()`, `buildHostProfile()`, and `validatePublicSyntheticCompleteness()`.

The harness is restricted to the same four development slots already defined by the public authority: `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under `NO_PRYZAEL` and `CURRENT_PRYZAEL`, trial index 0, activation `CONDITIONED_BEHAVIOR`, surface `NATIVE`. It creates no caller-defined slot matrix. Its successful classification is always `PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN` / `NOT_R4C_EVIDENCE`; it cannot satisfy or invoke authoritative 42-slot completeness.

### Canonical authority and mutable coordination state

The human harness follows this authority direction:

```text
CANONICAL AUTHORITY
→ external private artifacts
→ human-operated unverified transport
→ external captured artifacts
→ CANONICAL RECONSTRUCTION
→ public development completeness
```

`private-run-state.json` is a durable coordination record. It is not semantic authority for canonical slot identity, task digest, condition identity, frozen Pryzael identity, render identity, host-profile digest, Judge blind identity, response binding, Judge packet binding, or completeness expectations.

Every reload independently re-establishes current Carrier HEAD/tree, rebuilds and verifies the frozen manifest against the tracked canonical manifest, renders CURRENT and ABSENT with the canonical renderers, rebuilds the exact four slots, strictly decodes the 32-byte blinding key, and re-derives each slot’s blind ID. Mutable state must equal those canonical values in the canonical-to-state direction. Missing, extra, duplicate, or mutated slot identity is rejected.

Final validation goes further: for every completed slot it reconstructs host evidence from preserved attestation bytes, rebuilds and byte-compares the canonical SUBJECT, rereads and recaptures the exact response artifact, rebuilds and byte-compares the canonical Judge packet, rereads/recaptures/reparses the preserved Judge-result artifact, then constructs completeness evidence from those freshly reconstructed values. Only after all four records succeed is `validatePublicSyntheticCompleteness()` called with freshly canonical expected identity.

### Sensitive filesystem boundary

The canonical external run root is validated before creation/use. Every sensitive class is then independently validated at the point of use:

- `private-run-state.json` and state temporary siblings;
- `host-attestations/**`;
- `subjects/**`;
- `responses/**`;
- `judges/**`;
- `judge-results/**`.

Sensitive child paths are constructed only from the canonical run root plus fixed Carrier-controlled names. Existing child directories are `lstat`-checked for observable symbolic-link/reparse redirection, canonicalized with `realpath`, proven to remain descendants of the exact run root, and independently proven outside the Carrier worktree. This validation is repeated on later commands, so replacing a safe child directory with a symlink or Windows junction between operations is rejected before the next private use.

An existing sensitive artifact must be a regular non-link file at the fixed canonical name. Evidence writes use exclusive creation. If a crash left an exact established artifact, an identical retry may reuse it after verification; differing bytes are never silently overwritten.

State persistence writes complete JSON to an exclusive random temporary sibling under the verified run root, flushes it, revalidates the fixed state path, and renames the sibling into place. A substituted state-file symlink/reparse target is rejected rather than overwritten. These controls are intentionally described as fail-closed checks around Node/platform filesystem operations; they are not a claim of portable race-proof filesystem transactions against an attacker that can win a namespace race between syscalls.

### Frozen authority and strict blinding state

At initialization the blinding key is fresh `randomBytes(32)`. On reload its state representation must be canonical base64 and decode to **exactly** 32 bytes. Overlength, malformed, or non-canonical encodings fail closed. Every slot’s stored blind association must equal `deriveJudgeBlindId(canonicalSlot, key)`.

A coordinated edit of the mutable key and stored blind IDs cannot silently redefine an already-exported Judge binding at final validation: final validation derives the blind from the canonical slot and strict current key, then requires the fixed Judge artifact at that blind ID to equal a freshly rebuilt canonical Judge packet. Previously exported bytes/path bindings therefore remain mechanically checked.

### Preserved host attestation

`prepare-subject` preserves the exact operator-supplied host-attestation bytes under the private run root and records integrity metadata. Final validation rereads those preserved bytes, exact-decodes/parses them, reruns canonical `buildHostProfile()`, recomputes its digest, and rebuilds the SUBJECT. Paired NO/CURRENT host-profile equality is therefore evaluated from freshly reconstructed profiles, not from mutable `hostProfileDigest` fields.

This prevents post-establishment mutable-state corruption from redefining host evidence. It does not protect against an operator who supplied a false attestation originally; human-observed predicates remain human-observed.

### SUBJECT and Judge artifact revalidation

For each completed slot, final validation reconstructs canonical task authority and condition from freshly verified frozen material, reconstructs host profile from preserved attestation bytes, rebuilds `buildSubjectEnvelope()`, and requires the exported `.subject.bin` plus byte count/SHA metadata/state binding to match.

Response validation rereads the fixed preserved response artifact and reruns canonical `captureResponse()` with the established capture metadata. The claim remains `EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY`; browser/backend response bytes are unverified.

Judge validation derives the canonical blind ID, rereads the response, rebuilds the fixed public Judge authority and canonical `buildJudgeEnvelope()`, and requires exported `.judge.bin` plus integrity metadata/state binding to match.

Judge-result validation rereads the preserved original result bytes, reruns exact UTF-8 capture, reparses a public structural JSON object, and constructs the completeness-facing wrapper from the canonical blind ID, canonical task digest, freshly recaptured response SHA-256, and freshly parsed opaque TrialResult. Mutable copies are checked as coordination metadata but are not used to redefine canonical bindings.

### Web ingress epistemic contract

The CLI and operator documentation distinguish three separate claims for both SUBJECT and Judge packets:

```text
generatedDeliveryFile: EXACT_CANONICAL_BYTES
webIngressTransfer: HUMAN_OPERATED
browserModelVisibleIngressBytes: UNVERIFIED
```

Carrier proves that the generated `.subject.bin` / `.judge.bin` exactly equals canonical `deliveryBytes`. It does **not** automatically prove that clipboard/browser/composer transport preserved those bytes or that the same byte sequence was what the backend/model actually saw.

The supported procedure is: read the already-generated file as exact valid UTF-8 text, place that textual content in the appropriate fresh Temporary Chat composer, intentionally perform no edit/trim/normalization/annotation/reframing, then submit. The procedure deliberately avoids reconstructing packet framing. Browser/model-visible ingress remains `UNVERIFIED`. Attachment-upload semantics are not assumed.

### SUBJECT/Judge isolation

Every public slot requires a fresh SUBJECT Temporary Chat. Its Judge packet requires a **different fresh isolated Judge Temporary Chat**. The SUBJECT chat must never be reused as the Judge chat.

The Judge chat must not previously contain the SUBJECT packet, SUBJECT response-generation context, condition material, true condition identity, the corresponding SUBJECT conversation, or another Judge execution when independent sessions are required. The public harness does not mechanically attest ChatGPT-side Judge isolation. That property is human-observed/operator-attested, not mechanically proven, and no new Judge authority is invented to pretend otherwise.

### Temporary Chat execution semantics

The harness itself never drives ChatGPT Web. Consequently it records:

```text
realTemporaryChatExecution: UNVERIFIED
realTemporaryChatExecutedByHarness: false
```

`UNVERIFIED` is epistemic: Carrier cannot independently prove from its local mechanics whether a human Temporary Chat execution occurred. It must not be encoded as `realTemporaryChatExecuted:false`, because “not mechanically verified” is not the same statement as “did not execute.”

### Crash/partial transitions

A partially written/torn state file is not accepted as completed evidence. Evidence transitions become complete only after their canonical artifact writes and the subsequent state replacement succeed. A crash before state replacement leaves prior state, and final validation rejects missing/incomplete coordination. A retry may reuse identical already-established artifacts but cannot overwrite conflicting established evidence. No large transaction subsystem is introduced.

### Safe summary

Final validation output is body-free: no response body, Judge body, blinding key, condition/blind map, or private host details are emitted. It retains `PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN`, `NOT_R4C_EVIDENCE`, `authoritativeR4cEvidence=false`, and `hiddenBaselineExecuted=false`, plus only correctly named observational states such as the web-ingress and Temporary-Chat verification classifications above.

## Completeness and public dry-run

Authoritative R4C completeness is exactly 42 slots: seven committed tasks, `NO_PRYZAEL` and `CURRENT_PRYZAEL`, and trial indices 0, 1, and 2. It rejects missing, duplicate, unexpected, wrong-task/digest, wrong-condition/index, wrong activation/surface, mixed qualification identity, artifact/render mismatch, response/Judge binding mismatch, and paired visible host-profile mismatch. This 42-slot requirement belongs only to the authoritative historical R4C qualification path; it is not a default requirement for the Issue #4 R5 MVP.

Public synthetic mechanics are explicitly separate. `npm run dry-run` prepares exactly four slots for `DEV-SIMPLE-001` and `DEV-REPLAN-001`, each under absent and present conditions at trial index 0. The resulting 4/4 structural completeness is never authoritative 42/42 R4C evidence. No hidden task, predicate, response, Judge authority, or result is consumed.

The public human operator harness uses that same four-slot public structural authority with real operator-supplied capture files, but its result remains development evidence only. Neither synthetic 4/4 nor human 4/4 changes the authoritative R4C matrix or its admission semantics, and neither is a prerequisite for the Issue #4 MVP.

## Tracked public-distribution scan

`npm run scan` enumerates `git ls-tree -r HEAD` and treats the tracked Git artifact, not arbitrary workspace traversal, as repository-boundary authority. It rejects tracked symlinks (mode `120000`), unexpected gitlinks/submodules (mode `160000`), forbidden hidden/frozen-source path classes, non-public fixture classes, and structural drift in the frozen manifest, public task prompts, public Judge fixture, or qualification commitment. Beneath `fixtures/public/**`, the tracked blob inventory is closed to exactly five paths: the two public `task.json` files, their two `synthetic-response.txt` files, and `fixtures/public/judge-authority.json`; any additional or missing tracked blob fails closed. An external `frozen-pryzael/` checkout disappears from this authority naturally when it is untracked; a tracked path under that name is rejected rather than skipped.

The scan establishes mechanically detectable tracked public-boundary invariants only. It does not claim proof that every possible semantic leak is absent, and it is not the primary containment control for human-run artifacts: those artifacts are rejected from the worktree before creation.

Implementation, digest-only frozen manifest, non-secret qualification identity metadata, public development fixtures, synthetic responses, tests, operator documentation, and the intentionally public-safe Issue #4 MVP artifacts under `evaluation/r5-mvp/**` may belong here. Hidden qualification packet bytes, held-out prompts/predicates, authoritative hidden R4C response/Judge bodies, hidden/private routing or blind mappings, private host/retry ledgers, and benchmark-invalidating hidden candidate material remain outside this repository.
