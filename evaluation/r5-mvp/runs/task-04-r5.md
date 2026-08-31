Task: task-04
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

The evidence is not sufficient for the completion claim “fixed lost updates during concurrent state saves.” The claim is specifically about concurrent behavior, but no supplied test exercises overlapping saves.

| Predicate | Current evidence | Result |
|---|---|---|
| Temporary-name selection behaves as expected for the unit-test cases | Unit tests for the temporary-filename helper | VERIFIED only for the helper behavior exercised by those tests |
| A normal single save produces the expected final file contents | One single-save integration test | VERIFIED for that non-concurrent path |
| Two overlapping saves do not lose either update | No concurrent save test | NOT VERIFIED |
| Persisted state remains correct when reconstructed from storage | No restart/reload test | NOT VERIFIED |
| A stop between temporary-file write and rename has acceptable recovery semantics | No fault/crash evidence | INCONCLUSIVE |

What the implementation shape merely suggests is narrower. Writing a complete temporary file and then renaming it can reduce exposure to a partially written final file, assuming the relevant filesystem/rename semantics hold. It does not by itself establish lost-update prevention. Two writers can still independently derive state, write separate temporary files, and race to replace the same destination; unique temporary names would avoid temporary-file collision but would not necessarily prevent the later replacement from discarding an earlier writer’s logical update.

The most important unproven behavior is therefore the actual concurrent state invariant: when two saves overlap and each contributes a distinct update, the committed state must contain the updates required by the intended save contract after both operations complete. That is the direct falsifying check for the stated claim.

The minimum additional verification should be one deterministic concurrent integration test at the state-save boundary. Start from a known state, arrange two saves with distinct updates so their critical save intervals overlap, await both completions, then construct a fresh reader/state instance from the persisted file and assert that the final state contains both updates (or otherwise exactly matches the documented concurrency contract). The overlap should be controlled with a barrier/hook or equivalent synchronization rather than relying only on timing, so the test actually exercises the race it is meant to cover.

A fresh reload in that test is useful and proportionate because the feature under claim is a state save: it prevents an in-memory object from making the result look correct when the persisted artifact is not. A separate exhaustive restart matrix is not necessary for this claim.

Fault injection for a process stop between temporary-file write and rename is also currently unproven, but it is not the first missing check for the quoted completion claim. It becomes required if the PR also claims crash safety, durability, or recovery guarantees. Without such a claim, record that behavior as unresolved rather than expanding the verification scope unnecessarily.

Accordingly, the original completion claim is not currently supportable. It should remain unverified until the concurrent persistence test passes. If the implementation only demonstrates successful single-save replacement and perhaps reduced partial-write exposure, the claim must be narrowed to those demonstrated properties rather than saying concurrent lost updates are fixed.
