Task: task-01
Judge surface: ChatGPT Web
Trial: 1

better: B
equivalent: false
reasoning: Both candidates identify the canonicalization invariant and repair all affected read paths, but B is slightly better because it fixes exactly the inconsistent Map-boundary operations without adding a new class method, while also using strict assertions that unambiguously fail before the repair and pass after it. Its adjacent-case coverage also preserves missing-key behavior explicitly. A is correct, but its helper extraction is a slightly broader change and its console.assert checks are weaker as executable regression verification.
major_regression: none
confidence: high
