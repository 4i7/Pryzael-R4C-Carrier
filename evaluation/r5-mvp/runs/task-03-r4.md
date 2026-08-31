Task: task-03
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

Preserve this migration invariant throughout: the production consumer pinned to v1 must continue receiving a supported v1 contract until that consumer itself has been migrated and verified. Treat dual-version support as a temporary compatibility boundary, not as evidence that v1 is already obsolete.

| Transition | Change | Verification required before advancing |
|---|---|---|
| 0. Baseline | Record the consumer/version matrix and add contract/integration checks for producer→v1 pinned consumer and producer→v2-capable consumers. | Exact repository/config evidence identifies the pinned consumer; tests demonstrate current v1 behavior and v2 behavior. |
| 1. Introduce dual support | Make the producer able to serve v1 and v2 with an explicit selection/negotiation rule. Keep the pinned production consumer on v1. | Focused tests prove v1 output is unchanged for the pinned path, v2 output is valid for v2 paths, and selection cannot silently send v2 to the pinned consumer. |
| 2. Move v2-capable consumers | Migrate the already-compatible consumers one at a time to v2. | For each consumer, verify its exact deployed/configured artifact consumes v2 successfully; failures stop that consumer's transition without changing the pinned v1 path. |
| 3. Ship the mixed-version release | Run production with migrated consumers on v2 and the pinned consumer on v1. | Integration/runtime evidence shows both paths work on the release candidate or deployed release. Do not proceed merely from source inspection or unit tests. |
| 4. Migrate the pinned consumer | After its pin expires, upgrade that consumer to v2 in a separate change while retaining producer v1 support for rollback. | Its exact deployed artifact must successfully consume v2 end to end. Rollback behavior must be understood and still safe while v1 remains available. |
| 5. Prove v1 is unused, then disable it reversibly | Change configuration/feature gating so normal production operation no longer emits v1, but leave the implementation available during a bounded observation/rollback period. | Repository/config inventory shows zero intended v1 consumers; runtime/telemetry or equivalent production evidence shows no v1 demand during the defined observation window; supported rollback targets also no longer require v1. |
| 6. Remove v1 support | Delete v1 emission, compatibility branches, and obsolete tests/fixtures only after transition 5 is VERIFIED. | Before deletion, the zero-v1-consumer predicate and rollback predicate must be VERIFIED, not inferred. After deletion, run whole-system v2 integration/runtime checks and verify no legacy references remain. |

The irreversible step is not "other consumers use v2"; it is making v1 unavailable. v1 may actually be removed only after the pinned consumer has been upgraded and verified on v2, all other consumers are likewise verified, production evidence shows no remaining v1 demand for the agreed observation window, and no supported rollback/release target still depends on v1. Until then, deleting or disabling v1 would weaken the compatibility requirement rather than complete the migration.
