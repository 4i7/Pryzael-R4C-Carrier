Task: task-04
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

## Verdict

The current evidence is not sufficient to support the completion claim “fixed lost updates during concurrent state saves.” The implementation shape is compatible with safer file replacement, but the evidence never exercises the concurrent behavior named by the claim.

The most important unproven behavior is what happens when two saves overlap: whether one save can still overwrite or discard state produced by the other, and whether the implementation enforces the preservation or ordering invariant that the claim depends on. A temporary-file-plus-rename sequence can make replacement atomic at the file level, but by itself it does not demonstrate that concurrent writers cannot produce a lost update.

## What the current evidence actually demonstrates

| Predicate | Current method | Result |
|---|---|---|
| The temporary-filename selection function behaves as covered by its unit cases. | Unit tests for that helper. | VERIFIED, within those cases. |
| A single save can complete and leave the expected final file contents. | One single-save integration test. | VERIFIED for that exercised path. |
| Concurrent saves do not lose an update. | No concurrent save test. | NOT VERIFIED. |
| Persisted state remains correct when opened again after the save sequence. | No restart/reload test. | NOT VERIFIED. |
| Stopping after the temporary file is written but before rename has a defined safe outcome. | No fault/restart evidence for that window. | NOT VERIFIED. |

## What the implementation shape merely suggests

Writing to a temporary file and then renaming it suggests an intent to avoid exposing a partially written destination file and may provide atomic replacement semantics on the relevant platform/filesystem. The temporary-filename tests may also give confidence in the filename-selection logic itself.

Those facts do not establish the concurrency claim. Two writers can each successfully produce temporary output and still race at the replacement step; without evidence of the surrounding coordination/versioning/merge semantics, the final rename pattern alone cannot show that a stale or later writer will not discard another writer's update. The present tests therefore support “single-save replacement works in the tested case,” not “lost updates under concurrency are fixed.”

## Minimum additional verification

The minimum decisive addition is one focused concurrent integration test that deliberately forces two state saves to overlap across the critical save/replacement window and then checks the actual persisted state against the concurrency invariant promised by the fix.

The test should:

1. start from a known shared state;
2. launch two saves with distinguishable intended updates;
3. synchronize or otherwise force both saves to be in flight at the same time rather than relying on accidental scheduler timing;
4. allow both operations to finish;
5. read the resulting state through a fresh load/reopen path; and
6. assert the intended contract: for example, both independent updates are preserved, or a defined version/order rule prevents a stale save from overwriting the accepted newer state.

This is sufficient to directly challenge the stated completion claim without requiring an exhaustive concurrency proof. Repeating the forced interleaving for the known critical ordering is preferable to a large nondeterministic stress test as the first verification step.

The crash window is a separate unproven behavior. If the PR also intends to claim crash safety or restart recovery, add one fault-injection test that stops after the temporary write and before rename, then reloads and verifies the defined acceptable outcome (for example, the previous complete state remains readable and no partial state is accepted). If crash safety is not part of the claim, that behavior can remain explicitly out of scope rather than blocking the narrower concurrency claim.

## Claim status

As written, the completion claim is not currently supportable because its central behavior has no direct evidence. Until the concurrent overlap test passes, the claim should be narrowed to something like: “changed state saves to use temporary-file replacement; single-save persistence succeeds in the tested integration path.”

If the focused concurrent save plus fresh reload verification passes for the intended lost-update invariant, the original concurrency claim becomes materially supportable for that exercised behavior. Crash/restart safety should still not be implied unless separately verified.