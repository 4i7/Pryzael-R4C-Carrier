# Task 05 — Ambiguous failure semantics

## Task prompt

A configuration loader currently catches every read/parse error and silently returns defaults. The new requirement says:

> If the configuration file is missing, use defaults. If a configuration file exists but is invalid, fail closed. An explicit empty object `{}` is valid and means “use all defaults.”

The current implementation cannot distinguish a missing file from malformed JSON because both are handled by the same broad catch block.

Derive the intended behavior matrix, identify the assumption that must change in the implementation, and propose a bounded repair that preserves the valid-empty-object behavior. If any material error class is still unspecified by the requirement, call that ambiguity out explicitly instead of inventing policy. Include focused verification cases.
