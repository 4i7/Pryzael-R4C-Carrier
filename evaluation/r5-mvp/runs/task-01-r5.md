Task: task-01
Condition: R5 candidate
Condition authority: frozen R4 3bba19e0be936e7b9d3554ac737d32f5cf84c846 with skills/architect/** from 4i7/Pryzael PR #10 head 213d3c7bf5155a303372b00d80611bbe0c74f834
Candidate tree: 8130ec49c9fc455f4c27f0fb9e0cecaa62573747
Architect package tree: c58d60466b0b88594be0776390c9fe0efbe2b067
Chat surface: ChatGPT Web
Trial: 1

The violated invariant is: **every operation that addresses a logical header key must apply the same canonicalization before touching the `Map`**. `set` stores `name.toLowerCase()`, so `get` and `has` must resolve names through that same lower-case representation. The bug is not specific to `ETag`; it is a read-path inconsistency.

The smallest coherent repair is to canonicalize both read operations at the `Map` boundary, without changing the storage model or class API:

```js
class HeaderCache {
  constructor() {
    this.values = new Map();
  }

  set(name, value) {
    this.values.set(name.toLowerCase(), value);
  }

  get(name) {
    return this.values.get(name.toLowerCase());
  }

  has(name) {
    return this.values.has(name.toLowerCase());
  }
}
```

A one-off change only to `get('ETag')`, or only to `get`, would leave the same defect class open in `has`. Adjacent cases that must follow the same rule are mixed-case reads such as `get('ETAG')`, membership checks such as `has('ETag')`/`has('ETAG')`, and aliases of the same logical key across writes and reads (`set('ETag', ...)`, `set('etag', ...)`, then read through any casing). Missing keys should retain the existing `undefined`/`false` behavior.

Focused regression verification:

```js
const assert = require('node:assert/strict');

const cache = new HeaderCache();
cache.set('ETag', 'abc');

assert.equal(cache.get('ETag'), 'abc');   // fails before, passes after
assert.equal(cache.get('ETAG'), 'abc');   // fails before, passes after
assert.equal(cache.has('ETag'), true);    // fails before, passes after
assert.equal(cache.has('ETAG'), true);    // fails before, passes after

cache.set('etag', 'def');
assert.equal(cache.get('ETag'), 'def');   // same logical key, case-independent
assert.equal(cache.get('missing'), undefined);
assert.equal(cache.has('missing'), false);
```

This closes the canonicalization defect at the full key-access boundary while preserving the class's existing representation and semantics.