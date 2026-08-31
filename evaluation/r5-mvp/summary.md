# Pryzael R5 MVP comparison summary

## Authority

Controlling decision: `4i7/Pryzael-R4C-Carrier#4` — MVP WebChatGPT + GitHub comparison.

The comparison asks whether the R5 candidate preserves or improves representative Pryzael-assisted development quality relative to the frozen R4 baseline without clear major regressions.

## Compared conditions

### R4 baseline

- Repository: `4i7/Pryzael`
- Frozen commit: `3bba19e0be936e7b9d3554ac737d32f5cf84c846`
- Root tree: `29c3d97126d0f11de8d5c89dddf21f23d861f257`
- Skills tree: `4395ef86a309ed610f4860f47284d0e4da572914`

### R5 candidate

R5 is the frozen R4 condition except that `skills/architect/**` is replaced by the exact architect package from Pryzael PR #10.

- Pryzael PR: `4i7/Pryzael#10`
- Candidate head: `213d3c7bf5155a303372b00d80611bbe0c74f834`
- Candidate tree: `8130ec49c9fc455f4c27f0fb9e0cecaa62573747`
- Architect package tree: `c58d60466b0b88594be0776390c9fe0efbe2b067`

## Final blind-judge results

| Task | Final classification | Major regression | Confidence |
| --- | --- | --- | --- |
| task-01 | R5 better | none | high |
| task-02 | R4 better | none | high |
| task-03 | R5 better | none | high |
| task-04 | Equivalent | none | high |
| task-05 | Equivalent | none | high |
| task-06 | Equivalent | none | high |

All A/B condition mappings were recorded only after the corresponding blind judgment.

## Aggregate

- R5 better: **2**
- Equivalent: **3**
- R4 better: **1**
- Major regressions: **0**
- High-confidence judgments: **6 / 6**

Therefore **5 of 6** representative tasks are equivalent or better for R5.

No result was ambiguous or contradictory enough to require an additional trial under the MVP protocol.

## Targeted inspection of the R4-better result

The single R4-better result is task-02. The blind Judge found both answers correct, but preferred the R4 answer because it was more explicit about:

- rollback and older-reader compatibility for persisted data;
- deterministic behavior if old and new keys appear together; and
- tying the canonical write format to the declared compatibility policy.

This is a concrete, bounded quality difference rather than a major regression. It was not hidden by additional trial count and does not indicate a broad failure of the R5 candidate. It should remain a useful follow-up signal for future architect-skill refinement.

## Exact-head CI evidence

R5 candidate head:

`213d3c7bf5155a303372b00d80611bbe0c74f834`

Observed GitHub Actions run:

- Run: `33245570778`
- Workflow: `R1 structural qualification`
- Status: `completed`
- Conclusion: `success`

## MVP admission conclusion

Issue #4 defines R5 as a viable merge candidate when ordinary repository CI/tests remain green, no major regression is found, the overall comparison is predominantly equivalent or better for R5, and any worse result is concretely inspected.

The completed MVP satisfies those conditions:

- exact R5 head qualification workflow: **success**;
- major regressions: **0**;
- equivalent-or-better for R5: **5 / 6 tasks**;
- the single R4-better result was explicitly inspected and has a concrete bounded explanation.

**Conclusion: R5 is a viable merge candidate under the Issue #4 MVP admission rule.**

This conclusion is deliberately proportional to the MVP evidence. It does not claim that R5 dominates R4 on every task; it establishes that the representative comparison is predominantly equivalent or better for R5 without a clear major regression.
