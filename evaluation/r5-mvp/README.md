# R5 MVP evaluation

This directory implements the public-safe MVP comparison authorized by [Issue #4](https://github.com/4i7/Pryzael-R4C-Carrier/issues/4).

The claim under test is deliberately narrow:

> R5 appears to preserve or improve representative development-task quality relative to R4 without clear major regressions.

This is not the authoritative hidden R4C qualification path. The existing human-run/42-slot machinery remains available as a stronger optional diagnostic or qualification path, but it is not required for this MVP. The previously initialized Windows public run does not need to be continued, and hidden R4C execution is not part of this procedure.

## Initial matrix

Run the six tasks in `tasks/` once under each condition:

- R4 baseline: 6 SUBJECT executions;
- R5 candidate: 6 SUBJECT executions;
- total initial SUBJECT executions: 12.

Use a fresh ChatGPT Web session for every task/condition execution. Keep the task text identical across R4 and R5; condition setup is external to the task definition. Record the exact public Pryzael repository ref used for each condition alongside the saved output so later readers can reconstruct the comparison.

No Windows runner, Codex session, local filesystem harness, browser/backend byte proof, cryptographic blinding, or fixed 42-slot matrix is required by this MVP.

## Procedure

For each `task-NN.md`:

1. Open a fresh ChatGPT Web session configured for the R4 baseline condition.
2. Submit only the task prompt and obtain the final answer.
3. Store the public-safe final answer as documented in `runs/README.md`.
4. Open a different fresh ChatGPT Web session configured for the R5 candidate condition.
5. Submit the same task prompt and store that final answer separately.
6. Prepare Candidate A and Candidate B from the two saved outputs. Randomize their order manually when convenient.
7. Open another fresh ChatGPT Web session for judging. Give it `judge.md`, the task, and the two outputs without revealing which condition produced either candidate.
8. After the Judge answers, store the review and then record the A/B-to-R4/R5 mapping as documented in `reviews/README.md`.

Do not reuse a SUBJECT session as its Judge session.

## Additional trials

Do not add trials merely to overwhelm a negative result. Repeat an individual task only when its result is ambiguous or contradictory enough that one more fresh comparison would materially clarify the case. Document why the repeat was added.

## Public output boundary

Material intentionally created for this MVP may be committed under `evaluation/r5-mvp/**` when it is public-safe. This includes:

- these six public task definitions;
- the intentionally public-safe R4 and R5 final outputs;
- blind Judge reviews and the post-judge A/B mapping;
- the aggregate MVP summary.

The following remain forbidden here and elsewhere in the public repository:

- hidden or held-out evaluation material;
- secrets or private user/operator data;
- authoritative hidden R4C responses, Judge material, mappings, or results;
- material whose disclosure would invalidate a hidden benchmark.

Do not copy hidden R4C material into this directory to make the MVP look stronger.

## Admission rule

R5 remains a viable merge candidate when ordinary Pryzael CI/tests are green, no major regression is identified, the six comparisons are predominantly equivalent or better for R5, and any worse result is investigated directly.

Examples:

- `3 R5 better / 3 equivalent / 0 R4 better / 0 major regressions`: strong MVP PASS signal.
- `2 R5 better / 2 equivalent / 2 R4 better`: inspect the two regressions before admission.

Use `summary-template.md` for the final concise record.
