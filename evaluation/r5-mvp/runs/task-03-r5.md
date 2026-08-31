Task: task-03
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

The governing compatibility invariant changes with the new evidence: the pinned production consumer remains a supported v1 consumer until it has actually migrated. Do not reinterpret that requirement as optional. Instead, make the producer temporarily support both schemas and retire v1 only after the dependency is disproved by evidence.

1. **Establish the migration baseline and gates.** Record the consumer/version inventory, including the pinned production consumer and its release constraint, and add/retain contract fixtures for valid v1 and v2 behavior. This is the known state from which later transitions are judged.

2. **Add dual-version producer output without removing v1.** Prefer one canonical producer model with version-specific serialization so v1/v2 do not become independent semantic authorities. Verify that existing v1 behavior for the pinned consumer is unchanged, v2 conforms to its schema, and representative equivalent inputs preserve the intended semantics across both encodings. Failure leaves the old v1-only path available.

3. **Move already-capable consumers to v2 one at a time.** For each consumer, switch its configured/read path while the producer still emits v1 and v2, then verify its contract/integration path and production-equivalent behavior before advancing. A failed migration rolls back that consumer only; it does not justify weakening v1 compatibility for the pinned consumer.

4. **Run the mixed-version state explicitly.** In production, keep v1 available for the pinned consumer and v2 for migrated consumers. Require evidence that both paths are healthy and observable; version-specific errors/traffic must be distinguishable. The temporary dual-output period has an exit predicate, not merely an intended date.

5. **Migrate the pinned consumer when its allowed release is available.** Deploy a version that can read v2 while the producer still supports v1, prove the v2 path in production-equivalent tests and then in the real deployment, and retain v1 during the initial cutover/rollback window. Do not stop v1 emission merely because the release was scheduled or shipped.

6. **Prove zero remaining v1 dependency before disabling it.** The gate must cover more than direct online callers: consumer configuration, scheduled/offline jobs, retries, replay/backfill paths, retained or persisted v1 payloads, and any supported downgrade/rollback path. Required evidence should include an authoritative consumer inventory, source/config checks, successful v2 operation for the pinned consumer, and an agreed observation window with no required v1 reads/requests. Any unresolved path is `INCONCLUSIVE` and blocks removal.

7. **Disable v1 emission first, but keep the implementation temporarily.** This is the first destructive compatibility transition, so it requires the zero-v1-dependency gate above plus a defined rollback path. Observe the system for a bounded period and verify that all consumers and recovery paths continue to operate on v2 only. If not, re-enable v1 and repair the missed dependency.

8. **Delete v1 support as a separate cleanup.** Remove the v1 serializer/producer path only after the v1-disabled period is successful and any retained v1 data is either migrated, expired, or has an explicitly retained archival/read strategy. Remove v1 readers/converters only when no supported replay, downgrade, or historical-data obligation still needs them. Run the full compatibility/integration suite after deletion.

Therefore, v1 support may actually be removed only after the pinned production consumer has migrated to v2, every other supported path is proven independent of v1, the rollback/data-retention requirements no longer require it, and a v1-disabled observation period succeeds. Until those predicates hold, dual-version support is part of the compatibility contract rather than optional migration scaffolding.