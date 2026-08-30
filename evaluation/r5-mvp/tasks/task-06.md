# Task 06 — Safely sequence a bounded implementation

## Task prompt

A job queue stores records as JSON with this shape:

```json
{ "id": "job-1", "payload": {"kind": "build"} }
```

A bounded feature request adds optional integer `priority`, defaulting to `0`. Requirements:

- callers may omit `priority`;
- new records should persist an explicit normalized priority;
- old persisted records without `priority` must continue to load;
- negative or non-integer priorities must be rejected;
- no unrelated queue behavior should change.

Plan the implementation in a safe order across input validation, in-memory normalization, persistence/reload compatibility, and tests. State the invariant each step establishes and how you would verify it before moving on. Keep the plan small enough for one focused pull request.
