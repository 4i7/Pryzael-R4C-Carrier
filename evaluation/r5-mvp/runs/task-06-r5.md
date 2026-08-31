Task: task-06
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

## Plan

Keep `priority` as a record-contract change only. Do not use it to alter scheduling, dequeue order, fairness, or any other queue policy. The smallest coherent design is one normalization boundary for raw job records, used by both caller admission and persisted-record loading. Absence is handled there; persistence writes only the canonical in-memory form.

### 1. Establish the single normalization contract first

Locate the existing boundary that turns an untrusted/raw job-shaped value into the queue's accepted in-memory job record. Extend that boundary if it already owns record validation; otherwise introduce one small record-normalization helper there and route both new caller input and reload input through it. Do not add separate `priority ?? 0` logic in callers, the writer, and the loader.

`priority` rules at this boundary:

- property omitted: accept and normalize to integer `0`;
- integer `0`: accept as `0`;
- positive integers: accept unchanged;
- negative integers: reject;
- non-integer numbers such as `1.5`: reject;
- non-number values such as strings, booleans, `null`, arrays, or objects: reject where those values can reach the boundary;
- if the runtime can supply non-JSON numeric values such as `NaN` or infinities before serialization, reject them as non-integers rather than treating them as missing.

Defaulting must be based on absence only. A present-but-invalid value must never fall through to `0`.

**Invariant established:** every accepted in-memory job has exactly one canonical representation for priority: an explicit integer `priority >= 0`. `undefined`/missing is permitted only before normalization, never on an accepted job.

**Verify before advancing:** add focused normalization/validation tests covering omitted, `0`, a representative positive integer, a negative integer, a fractional number, and representative non-number values. Assert both the accepted canonical record and rejection behavior. Keep existing validation/error style rather than inventing a new queue-wide error mechanism.

### 2. Route caller admission through that boundary

Make the public/internal job-creation or enqueue admission path pass the raw record through the normalization boundary before the job enters queue state. No caller should have to manufacture `priority: 0`, and no caller-specific default should exist.

**Invariant established:** once a newly submitted job is admitted to queue state, downstream queue code can rely on `priority` being present and valid without re-validating or re-defaulting it.

**Verify before advancing:** admission tests should show that omitted priority becomes in-memory `0`, `0` and positive integers are preserved, and every invalid present value is rejected before the record can be persisted or otherwise enter queue state. Run the existing queue behavior tests at this point to confirm that adding the field did not change unrelated admission semantics.

### 3. Make reload backward-compatible through the same normalization boundary

After JSON parsing, feed persisted job records through the same record normalizer. An old persisted record with no `priority` therefore loads as canonical `priority: 0`; a persisted record with a valid explicit priority retains it. Do not make the loader require the field merely because new writes will include it, and do not add a separate legacy-only defaulting path.

If a persisted record contains a present invalid priority, reject it using the repository's existing malformed-record/load failure semantics; only true absence receives the compatibility default.

**Invariant established:** both new and legacy persisted representations converge to the same canonical in-memory record, while invalid explicit data is not silently repaired.

**Verify before advancing:** use a legacy JSON fixture with no `priority` and assert successful load with in-memory `priority: 0`; also load records containing `0` and a positive integer and assert preservation. Add focused invalid persisted-value cases if the loader's existing test surface supports malformed-record assertions. Re-run existing reload/recovery tests unchanged.

### 4. Persist only the normalized form, with explicit priority

Update the job serializer/persistence projection so that newly written records always contain the canonical `priority` value. The writer should consume the already-normalized job record rather than performing its own defaulting. For example, a caller that omitted priority should eventually produce a persisted record equivalent to:

```json
{ "id": "job-1", "payload": {"kind": "build"}, "priority": 0 }
```

Do not eagerly rewrite existing stored records merely to add the field; backward-compatible loading is sufficient unless those records pass through the queue's normal existing write path.

**Invariant established:** every record newly written by this version explicitly persists an integer `priority >= 0`; old records remain readable without an out-of-band migration.

**Verify before advancing:** serialization/persistence tests should assert that omitted input writes `"priority": 0`, positive priorities are written unchanged, and `id`/`payload` plus any pre-existing persistence fields remain unchanged. Confirm invalid inputs never reach a successful write.

### 5. Close the contract with round-trip and non-regression tests

Add focused end-to-end record-contract tests for:

1. omitted priority -> admit as `0` -> persist explicit `0` -> reload as `0`;
2. explicit `0` -> persist/reload as `0`;
3. positive integer -> persist/reload unchanged;
4. legacy persisted record without the field -> reload as `0`, and if it later goes through the queue's normal write path, write back with explicit `0`;
5. negative, fractional, and representative non-number inputs -> rejection with no persisted record produced.

Also run the existing queue test suite and retain its ordering, dequeue, retry, identity, payload, and other established semantics. If priority values could accidentally be observed by an existing ordering path, add one narrow regression test showing that jobs with different priority values still follow the queue's pre-feature ordering behavior; `priority` is data only in this pull request.

**Invariant established:** accepted jobs survive persistence/reload without changing their normalized priority or existing job data, legacy data remains compatible, invalid data cannot be converted into valid data, and unrelated queue semantics are unchanged.

**Evidence required for completion:** the focused validation/normalization, legacy-load, persistence, and round-trip tests pass; the pre-existing queue suite passes without expectation changes unrelated to the new field; and the diff remains limited to the record contract, its persistence projection/loading path, and focused tests. No scheduling policy or queue refactor belongs in this pull request.
