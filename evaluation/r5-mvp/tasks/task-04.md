# Task 04 — Verification quality versus completion claim

## Task prompt

A pull request claims: “fixed lost updates during concurrent state saves.” The implementation now writes through a temporary file and then renames it.

The PR evidence contains:

- unit tests for the function that chooses the temporary filename;
- one integration test that performs a single save and checks the final file contents;
- no concurrent save test;
- no restart/reload test;
- no evidence about what happens if a process stops between writing the temporary file and renaming it.

Review whether the evidence is sufficient for the stated completion claim. Identify the most important unproven behavior, propose the minimum additional verification needed to support or narrow the claim, and distinguish what the current tests actually prove from what they merely suggest. Do not demand exhaustive formal proof.
