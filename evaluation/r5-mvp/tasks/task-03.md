# Task 03 — Replan after compatibility evidence

## Task prompt

A migration plan assumed every consumer accepts schema v2, so the initial plan was:

1. switch the producer to emit v2 only;
2. migrate consumers;
3. delete v1 support.

New repository evidence shows one production consumer is pinned to v1 for the next release. The producer can emit both versions for a limited period, and the other consumers can already read v2.

Replan the migration so progress continues without silently weakening the compatibility requirement. Sequence the work into independently verifiable transitions, state what evidence is required before each irreversible step, and explain when v1 support may actually be removed. Do not solve the problem by pretending the pinned consumer is out of scope.
