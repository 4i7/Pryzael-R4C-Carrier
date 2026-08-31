Task: task-06
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

## Bounded implementation plan

### Contract to preserve

Use one record-normalization boundary as the single authority for the new field. Its priority rule is:

- if `priority` is absent, normalize it to integer `0`;
- if `priority` is present, accept it only when it is an integer `>= 0`, preserving that integer;
- reject negative integers;
- reject non-integer numbers such as `1.5`;
- reject explicitly supplied non-number values such as `"1"`, `null`, booleans, arrays, or objects where the input surface can supply them;
- if the caller-facing runtime can represent numeric values JSON cannot (for example non-finite numbers), reject those as not valid integers rather than coercing them.

The key distinction is **absent vs. present-and-invalid**. Do not implement this with a truthiness fallback or a coercion such as `priority || 0`, because that can turn invalid input into a valid default.

Canonical in-memory job invariant: every accepted job has exactly one normalized priority representation, an explicit non-negative integer field. Downstream queue behavior should consume that canonical record and should not need its own defaulting logic.

### 1. Establish the validation + normalization boundary

Make the smallest change at the existing job-record construction/admission boundary (or a narrowly shared helper used by that boundary) so all accepted jobs become canonical before ordinary queue logic sees them. Preserve the existing handling of `id`, `payload`, and all unrelated fields/behavior.

**Invariant established:** after admission, there is no accepted in-memory job with a missing, negative, fractional, coerced, or otherwise non-numeric `priority`; omission alone becomes `0`.

**Verification gate before advancing:** add focused unit/contract tests covering the full matrix:

- omitted `priority` -> accepted as `0`;
- explicit `0` -> accepted as `0`;
- representative positive integers (for example `1` and a larger value) -> accepted unchanged;
- negative integer -> rejected;
- non-integer number -> rejected;
- explicit non-number values supported by the input surface -> rejected rather than defaulted/coerced.

Also assert the normalized object contains an explicit `priority` field, not merely behavior equivalent to a missing field. Do not proceed until these tests prove the boundary itself.

### 2. Make reload backward-compatible through the same boundary

Have the persisted-record load path feed parsed job data through the same normalization rule instead of adding a second reload-only default. The persisted schema/read check must continue to permit the field to be absent, because existing JSON records predate it. Absence is normalized to `0` only after the record is accepted as a legacy-compatible input shape.

If an old record contains no `priority`, loading it should succeed and produce the same canonical in-memory shape as a newly admitted job with omitted priority. If a persisted record explicitly contains an invalid priority, it should be rejected according to the same validation rule rather than silently converted to `0`.

**Invariant established:** both caller-created jobs and legacy persisted jobs converge to the same canonical in-memory representation, while old JSON is not required to already contain the new field.

**Verification gate before advancing:** use a legacy fixture/object containing only the pre-feature shape (`id` + `payload`) and prove reload succeeds with in-memory `priority: 0`. Add representative persisted-invalid cases to prove the reload path does not bypass or weaken the shared validator. Confirm existing persisted fixtures that lack `priority` still load.

### 3. Persist the canonical value explicitly for new writes

Update only the job serialization/write projection needed for this field so newly written records include the already-normalized integer `priority`. Do not perform another default, coercion, or validation policy in the writer; serialization should emit the canonical in-memory value it receives.

No eager migration of old stored JSON is required for this feature. Legacy records can remain field-less on disk until they are naturally rewritten; any new write/rewrite should use the canonical explicit field.

**Invariant established:** every newly persisted job record contains explicit normalized `priority`, while legacy storage remains readable without a bulk migration.

**Verification gate before advancing:** persist one admitted job with omitted priority and inspect/parse the stored JSON to prove it contains `"priority": 0`; persist a positive-priority job and prove the exact integer is present. Ensure persistence tests do not pass merely because reload later supplies a default—the serialized representation itself must be asserted.

### 4. Prove reload/round-trip behavior and preserve queue semantics

Add focused end-to-end persistence tests across the existing save/load boundary:

- omitted on input -> in memory `0` -> persisted explicit `0` -> reload `0`;
- explicit `0` -> persisted/reloaded `0`;
- positive integer -> persisted/reloaded unchanged;
- legacy persisted record with no field -> reloads as `0`;
- negative/fractional/non-number explicit values are rejected at the normalization boundary and never become a newly persisted valid job.

Then run the existing queue test suite (or the narrowest existing regression suite that covers ordinary enqueue/dequeue, persistence, and reload behavior) without changing its unrelated expectations.

**Invariant established:** persistence is round-trip stable for the new canonical field, legacy data remains compatible, and the feature changes only the record contract—not scheduling, queue ordering, dequeue selection, retry behavior, or other queue semantics.

**Verification gate for completion:** all new contract/compatibility/round-trip tests pass and all previously existing relevant queue tests remain green. Review the final diff to confirm it is limited to the normalization/validation boundary, the necessary persistence projection/read integration, and focused tests; there should be no priority-based ordering algorithm, scheduling policy, broad queue refactor, or duplicated defaulting logic.

## Design choice and scope

Prefer a single normalization authority over three independent policies in callers, persistence, and reload. A duplicated approach (caller defaults, writer defaults, loader defaults) is rejected because the paths can drift and because it makes it easy for invalid explicit values to be mistaken for omission. The shared boundary gives both new and legacy inputs one contract while allowing the persistence writer to remain a simple projection of canonical state.

Keep this to one focused pull request: normalization/validation, load compatibility, explicit serialization, and their focused tests. Do not add queue prioritization behavior; the integer is stored contract data only in this feature.
