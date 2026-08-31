# Task 01 — Canonicalization invariant

## Task prompt

A JavaScript cache stores keys in canonical lower-case form but does not apply the same canonicalization on reads:

```js
class HeaderCache {
  constructor() {
    this.values = new Map();
  }

  set(name, value) {
    this.values.set(name.toLowerCase(), value);
  }

  get(name) {
    return this.values.get(name);
  }

  has(name) {
    return this.values.has(name);
  }
}
```

A bug report says `set('ETag', 'abc')` followed by `get('ETag')` returns `undefined`.

Identify the violated invariant, propose the smallest coherent repair rather than a one-off symptom patch, name adjacent cases that should follow the same rule, and give focused verification that would fail before the repair and pass after it. Do not redesign the class beyond what the defect requires.
