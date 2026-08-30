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

Each record should contain a short header followed by the final assistant answer:

```text
Task: task-01
Condition: R4 baseline | R5 candidate
Pryzael repository ref: <public commit or ref actually used>
Chat surface: ChatGPT Web
Trial: 1

<final public-safe assistant answer>
```

Keep the task text itself in `../tasks/`; do not edit the task between conditions.

If an individual comparison is repeated because the first result is ambiguous or contradictory, add `-trial-2` to both condition filenames for that task and record the reason in its review. There is no default trial 2 and no default 42-slot expansion.
