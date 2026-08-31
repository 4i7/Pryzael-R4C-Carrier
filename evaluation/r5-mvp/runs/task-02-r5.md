Task: task-02
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

`timeoutMs` is not merely a loader-local name. The evidence makes it both a public runtime contract and part of a durable persisted schema. Renaming only the loader output would immediately split that contract: the CLI and worker would read `undefined`, the whole-object snapshot would change, and persisted files containing `timeoutMs` could lose the timeout or fall back incorrectly after restart. Because the object is public, repository-local consumers also do not prove that no external consumer exists.

The smallest safe change for the stated “consistency” cleanup is therefore **not to rename the exposed property**. If internal naming consistency is desired, use `timeout` only as an implementation-local variable and map it at the loader boundary, e.g. return `{ timeoutMs: timeout, retries }`. Keep the persisted JSON representation as `timeoutMs` as well; persistence is a compatibility boundary, not an incidental reflection of an internal variable name. This avoids introducing a second name or migration mechanism for a request that did not ask to change the public contract.

If a public rename is actually required, treat it as an explicit contract migration rather than this cleanup: update all runtime consumers atomically, normalize legacy persisted `{ timeoutMs: ... }` at the read boundary into one canonical in-memory field, define the compatibility/deprecation policy for external callers, and write only the chosen canonical persisted schema. Do not allow both names to propagate as competing runtime authorities.

Verification should specifically falsify a split contract: repository-wide search for both names including serializers/deserializers and snapshots; an exact-shape loader test; focused CLI and worker tests; a write → restart → read persistence round-trip; and, for a migration, a legacy `timeoutMs` fixture that survives restart and is rewritten/serialized according to the declared canonical schema. Assert that runtime and serialized objects contain exactly the intended canonical key, with the old name present only in deliberate compatibility code if a migration exists. Source inspection alone can establish the blast radius, but executable restart/round-trip tests are the decisive proof of compatibility.