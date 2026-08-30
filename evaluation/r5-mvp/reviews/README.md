# MVP blind review records

Use one fresh ChatGPT Web Judge session per task comparison. The Judge receives the task plus Candidate A and Candidate B, but not the R4/R5 identity.

Randomized ordering is desirable but manual ordering is sufficient. Do not build a separate blinding system for this MVP.

After the Judge returns its answer, create `task-NN.md` with:

```text
Task: task-NN
Judge surface: ChatGPT Web
Trial: 1

<judge answer using ../judge.md>

Mapping recorded after judgment:
Candidate A: R4 | R5
Candidate B: R4 | R5
```

The mapping must be added only after the Judge answer has been obtained. This keeps the Judge blind while leaving a simple repository record that can reconstruct the comparison afterward.

If an additional trial is justified by an ambiguous or contradictory individual result, record the reason and use a distinct trial number. Do not add repeats merely to dilute a worse result.
