# Task 02 — Blast radius before a field rename

## Task prompt

A repository has a configuration loader that returns this public object:

```js
{ timeoutMs: 5000, retries: 3 }
```

A proposed cleanup renames `timeoutMs` to `timeout` inside the loader. Repository evidence shows four consumers:

- the CLI reads `config.timeoutMs`;
- a worker reads `config.timeoutMs`;
- a test helper snapshots the whole object;
- a persisted JSON file written by the application contains `timeoutMs` and is read after restart.

The change request only says: “rename `timeoutMs` to `timeout` for consistency.”

Assess the real blast radius and compatibility risks before editing. Recommend the smallest safe change shape, including how you would treat the persisted representation and how you would verify that the change did not create a split contract. Avoid unrelated refactoring.
