# R5 MVP blind Judge prompt

Use this prompt in a fresh ChatGPT Web session after providing the task and the two condition-anonymous outputs as Candidate A and Candidate B.

Evaluate which candidate better satisfies the development task. Focus on correctness, root-cause or architectural reasoning where relevant, handling of constraints and ambiguity, boundedness of the proposed change, and verification quality. Do not reward verbosity by itself. Treat a material correctness, compatibility, safety, or verification failure as a possible major regression.

Return exactly these fields in plain text:

```text
better: A | B | neither
equivalent: true | false
reasoning: <concise reason>
major_regression: none | <concise description>
confidence: low | medium | high
```

Use `equivalent: true` only when neither answer has a meaningful quality advantage for the task. If one answer is materially better, set `equivalent: false` and select it in `better`. Do not infer which candidate is R4 or R5 and do not ask for that identity before judging.
