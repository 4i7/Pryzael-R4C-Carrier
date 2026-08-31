Task: task-01
Condition: R4 baseline
Condition authority: 4i7/Pryzael@3bba19e0be936e7b9d3554ac737d32f5cf84c846
Root tree: 29c3d97126d0f11de8d5c89dddf21f23d861f257
Skills tree: 4395ef86a309ed610f4860f47284d0e4da572914
Chat surface: ChatGPT Web
Trial: 1

## Answer

The violated invariant is: **every externally supplied header name must be canonicalized the same way before it is used as a `Map` key**. Header-name casing therefore must not affect identity across `set`, `get`, or `has`.

The smallest coherent repair is to make key canonicalization a single class-local rule and apply it at every map access, rather than patching only the reported `get('ETag')` case:

```js
class HeaderCache {
  constructor() {
    this.values = new Map();
  }

  canonicalName(name) {
    return name.toLowerCase();
  }

  set(name, value) {
    this.values.set(this.canonicalName(name), value);
  }

  get(name) {
    return this.values.get(this.canonicalName(name));
  }

  has(name) {
    return this.values.has(this.canonicalName(name));
  }
}
```

Adjacent cases that must follow the same rule include mixed-case `has` calls, reads using a different casing from the write, and equivalent-case overwrites such as `set('ETag', 'a')` followed by `set('etag', 'b')`.

Focused regression verification:

```js
const cache = new HeaderCache();
cache.set('ETag', 'abc');

console.assert(cache.get('ETag') === 'abc');
console.assert(cache.get('etag') === 'abc');
console.assert(cache.get('ETAG') === 'abc');
console.assert(cache.has('ETag') === true);
console.assert(cache.has('ETAG') === true);

cache.set('etag', 'def');
console.assert(cache.get('ETag') === 'def');
```

Before the repair, the mixed-case `get`/`has` assertions fail because reads bypass canonicalization. After the repair, all accesses address the same canonical key. No broader class redesign is required.
