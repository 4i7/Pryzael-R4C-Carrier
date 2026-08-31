Task: task-02
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

The proposed loader-only rename is not a local cleanup. It changes two observable contracts: the public configuration object and the persisted JSON representation. The known blast radius already includes the CLI, worker, whole-object snapshot, and restart path. A loader-only change would make the CLI/worker read `undefined`, break the snapshot, and make old persisted `{ timeoutMs: ... }` data unreadable by code expecting only `timeout`. Changing the writer too can also break rollback/older readers. Adding both keys without a defined authority rule risks a split contract where different consumers use different names or disagree on precedence.

The smallest safe change is therefore to preserve `timeoutMs` at the public and persistence boundaries unless the request explicitly authorizes a compatibility migration. If “consistency” is only an internal naming concern, rename an internal local variable to `timeout` but continue returning and persisting `timeoutMs`; no consumer or stored-data migration is then required.

If the public field really must become `timeout`, treat it as one bounded migration rather than a loader edit: update the CLI, worker, and snapshot expectation together; make the persistence reader accept existing `timeoutMs` records and map them into the new canonical in-memory field; and choose one canonical write format deliberately. If rollback or older-version compatibility matters, keep writing `timeoutMs` until a versioned migration is admitted. Otherwise write only `timeout` after migration, with deterministic handling if both keys are present. Do not casually dual-write both names.

Verification should target the contract boundaries, not just the loader: search for both field names across code, fixtures, schemas, and serialization; run focused CLI and worker tests; assert the exact returned-object shape; update the snapshot only if the public rename is intentional; and perform persistence tests that (1) load a pre-change `timeoutMs` JSON fixture after restart and (2) write the chosen post-change representation, restart, and read it back. If rollback compatibility is required, also prove the new file remains readable by the old reader. Finally, assert there is one canonical in-memory field and one intentional persisted representation so no consumer is silently left on the other name.

Overall verdict: the loader-only rename is **NOT VERIFIED** as safe and should not be made. The public/persisted contract should remain unchanged unless an explicit migration scope is approved and the boundary checks above pass.