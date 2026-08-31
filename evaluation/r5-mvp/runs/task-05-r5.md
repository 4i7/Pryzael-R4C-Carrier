Task: task-05
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

## Intended behavior matrix

| Configuration state | Required behavior |
| --- | --- |
| File is missing | Succeed with defaults. This is the one failure-like condition that explicitly authorizes the missing-file fallback. |
| File exists and contains valid non-empty configuration | Parse/accept it and continue through the existing valid-configuration resolution path. The requirement does not otherwise change valid configuration semantics. |
| File exists and contains `{}` | Treat it as a successful, valid parse and resolve it to all defaults. It must not be mistaken for absence or parse failure. |
| File exists but contains malformed/invalid JSON | Fail closed: surface an error and do not silently return defaults. |

If the implementation already has schema/configuration validation after JSON parsing, a value rejected by that established validation contract is likewise an invalid existing configuration and must not be converted into a successful defaults result. The supplied requirement does not establish any new schema rules, so syntactically valid JSON shapes that the existing system has not defined as valid or invalid should not be reclassified here.

## Violated assumption

The broad catch encodes the assumption that all failures while obtaining configuration are semantically equivalent to "no configuration was supplied," and therefore that defaults are always a safe recovery. The new requirement invalidates that assumption.

The governing distinction is now evidence-based: defaults are authorized by a reliably identified **missing-file** outcome, while a file that was successfully obtained but cannot be parsed/validated must not be treated as absent. "Any error" is therefore no longer a valid boundary for defaulting.

## Bounded repair

Make the distinction at the narrowest reliable boundary rather than adding special cases after the existing broad catch:

1. Attempt the file read using the existing read primitive.
2. Catch only that primitive's specific, reliable "not found" result/error and return defaults for that case.
3. Leave other read failures distinct rather than converting them to "missing."
4. Parse the successfully read contents outside the missing-file catch. A parse/established-validation failure must escape through the error path instead of returning defaults.
5. Feed every successfully parsed valid object into the existing configuration-resolution/defaulting path, including `{}`. Do not introduce a non-empty/truthiness check that would turn `{}` into another absence signal.

Conceptually:

```text
try:
    text = read_config(path)
except FileMissing:
    return defaults()

parsed = parse_json(text)       # parse failure is not caught as "missing"
validated = validate_if_existing(parsed)
return resolve_config(validated) # {} is valid and resolves to defaults
```

A separate "exists?" pre-check is not needed for this repair and can introduce a check/read race. Classifying the read operation's own not-found outcome keeps one filesystem authority and directly encodes the requirement.

This is intentionally not a configuration-system refactor: it changes the error boundary and preserves the existing successful parse/resolution path.

## Unspecified read/error categories

The requirement does **not** define product semantics for materially different failures such as permission denial, transient or permanent I/O faults, encoding/decoding failures that occur before JSON parsing, or similar read-layer errors.

They must not be silently treated as "file missing," because that would invent policy and could again produce a successful defaults result without evidence of absence. They also should not be relabeled as malformed JSON unless the existing repository contract already says so. The bounded repair should keep those errors distinguishable and preserve their underlying error/propagation path pending an explicit policy decision. If a concrete implementation API requires an immediate behavior, propagating the original read error unchanged is the least policy-bearing transport behavior; it is not a declaration that the error is an invalid configuration.

## Focused verification

- **Missing file:** make the read primitive return its specific not-found condition; assert the loader returns defaults and does not require parsing.
- **Valid non-empty configuration:** supply valid non-empty JSON; assert parsing succeeds and the existing valid-configuration resolution path receives the parsed value rather than a whole-file defaults fallback.
- **Explicit `{}`:** supply exactly `{}`; assert it is accepted as valid and the normal resolver produces all defaults. This proves empty-object validity is preserved independently of missing-file handling.
- **Malformed JSON:** supply malformed JSON for an existing/readable file; assert the loader reports the parse failure and does not return defaults.
- **Established validation failure, if such validation already exists:** supply JSON that parses but is rejected by that validator; assert the validation error is surfaced and defaults are not returned.
- **Unspecified read failure sentinel:** inject a representative non-not-found read failure (for example permission denied or an I/O error); assert only the negative invariant that it does not traverse the missing-file/default fallback and remains distinguishable from both "missing" and JSON parse failure. Do not encode a new recovery policy in this test until that policy is specified.

The repair is complete when the only path that converts a read failure into defaults is the specifically identified missing-file path, while successful `{}` parsing still reaches the ordinary default-resolution path and invalid existing content cannot silently become a successful default configuration.
