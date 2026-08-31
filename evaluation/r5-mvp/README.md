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

Use a fresh ChatGPT Web session for every task/condition execution. Keep the task text identical across R4 and R5; condition setup is external to the task definition. Record the exact condition authority defined below alongside the saved output so later readers can reconstruct the comparison.

No Windows runner, Codex session, local filesystem harness, browser/backend byte proof, cryptographic blinding, or fixed 42-slot matrix is required by this MVP.

## Exact condition authorities

Both conditions are defined by exact public GitHub material from `4i7/Pryzael`. Do not substitute current `main`, another commit, or the whole PR #10 repository state.

### R4 baseline

- repository: `4i7/Pryzael`;
- frozen R4 commit: `3bba19e0be936e7b9d3554ac737d32f5cf84c846`;
- frozen R4 root tree: `29c3d97126d0f11de8d5c89dddf21f23d861f257`;
- frozen R4 `skills/` tree: `4395ef86a309ed610f4860f47284d0e4da572914`.

An R4 SUBJECT session must read and use the public Pryzael Skill material from that exact frozen R4 authority.

### R5 candidate

- PR: <https://github.com/4i7/Pryzael/pull/10>;
- candidate head: `213d3c7bf5155a303372b00d80611bbe0c74f834`;
- candidate tree: `8130ec49c9fc455f4c27f0fb9e0cecaa62573747`;
- candidate `skills/architect/` package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`.

For this MVP, the R5 condition is conceptually the same frozen R4 Pryzael material above, except `skills/architect/**` uses exactly the PR #10 candidate package. No other candidate-head, candidate-base, current-main, or repository drift is part of the R4-vs-R5 semantic delta.

Do not build a composed Git commit, generated checkout, hash layer, or materialized repository for this condition. ChatGPT Web may read the exact public GitHub refs directly.

## Fresh SUBJECT session setup

Before giving the unchanged task, tell each fresh SUBJECT session which exact authority governs the run. The following lightweight setup text is sufficient.

For R4:

```text
Condition: R4 baseline.
Use the public Pryzael Skill material from 4i7/Pryzael at frozen commit 3bba19e0be936e7b9d3554ac737d32f5cf84c846, root tree 29c3d97126d0f11de8d5c89dddf21f23d861f257, skills tree 4395ef86a309ed610f4860f47284d0e4da572914.
Perform the supplied unchanged task under that condition, return the final answer, and save the public-safe result under evaluation/r5-mvp/runs/task-NN-r4.md in 4i7/Pryzael-R4C-Carrier.
```

For R5:

```text
Condition: R5 candidate.
Use the same frozen R4 Pryzael authority as the R4 baseline, except skills/architect/** must use the exact 4i7/Pryzael PR #10 candidate package from head 213d3c7bf5155a303372b00d80611bbe0c74f834, candidate tree 8130ec49c9fc455f4c27f0fb9e0cecaa62573747, architect package tree c58d60466b0b88594be0776390c9fe0efbe2b067. Do not use unrelated candidate or repository drift.
Perform the supplied unchanged task under that condition, return the final answer, and save the public-safe result under evaluation/r5-mvp/runs/task-NN-r5.md in 4i7/Pryzael-R4C-Carrier.
```

Replace `NN` with the task number. This setup defines the behavioral comparison condition only; it does not claim that ChatGPT backend state or exact internal Skill activation is mechanically proven.

## Procedure

For each `task-NN.md`:

1. Open a fresh ChatGPT Web session and provide the R4 condition setup above.
2. Submit only the unchanged task prompt and obtain the final answer.
3. Store the public-safe final answer as documented in `runs/README.md`.
4. Open a different fresh ChatGPT Web session and provide the R5 condition setup above.
5. Submit the same unchanged task prompt and store that final answer separately.
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
