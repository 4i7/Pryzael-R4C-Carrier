# MVP SUBJECT run records

Store only intentionally public-safe final ChatGPT Web answers here. Do not store hidden R4C packets, private operator metadata, browser dumps, or other material outside the Issue #4 public MVP boundary.

## Initial filenames

For each task `01` through `06`, create exactly these two initial records after the corresponding fresh sessions run:

```text
task-01-r4.md
task-01-r5.md
...
task-06-r4.md
task-06-r5.md
```

That is 12 initial SUBJECT executions total.

Each record should contain a short header followed by the final assistant answer. Record the exact condition authority from `../README.md`; do not substitute an arbitrary repository ref.

For R4:

```text
Task: task-01
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

<final public-safe assistant answer>
```

For R5:

```text
Task: task-01
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

<final public-safe assistant answer>
```

Keep the task text itself in `../tasks/`; do not edit the task between conditions.

If an individual comparison is repeated because the first result is ambiguous or contradictory, add `-trial-2` to both condition filenames for that task and record the reason in its review. There is no default trial 2 and no default 42-slot expansion.
