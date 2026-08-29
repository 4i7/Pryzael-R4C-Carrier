# Pryzael R4C Carrier

A standalone, public-safe carrier for the frozen Pryzael R4C conditioned-behavior qualification mechanics. It verifies frozen identities, renders the historical CURRENT comparator, prepares closed SUBJECT/Judge delivery envelopes, captures exact UTF-8 responses, validates completeness, and scans the tracked public distribution boundary. It does **not** run the hidden R4C baseline or replace Pryzael.

The authoritative design is [`docs/superpowers/specs/2026-08-29-pryzael-r4c-carrier-design.md`](docs/superpowers/specs/2026-08-29-pryzael-r4c-carrier-design.md). Operational invariants are summarized in [`spec/carrier-protocol.md`](spec/carrier-protocol.md).

## Authority and boundaries

The Carrier is subordinate to the frozen Pryzael R4 authority. Historical CURRENT is exactly `4i7/Pryzael` commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, rendered by `r4c-condition-render-v1`.

Public repository material includes Carrier implementation/documentation, digest/path/blob identity metadata, the non-secret frozen qualification commitment index, and explicitly synthetic development fixtures. Real SUBJECT bodies, real Judge authority/results, routing/blind maps, private retry/host ledgers, and held-out prompts/predicates remain private or hidden outside this repository. The hidden qualification packet is neither needed nor authorized for public mechanics verification.

Real SUBJECT and Judge execution remains human-operated in fresh ChatGPT Web Temporary Chats (or the already-authorized equivalent Judge isolation boundary). There is no browser automation, paid model API, resident supervisor, production Pryzael runtime, or PR #10/R5 evaluation path here.

## Qualification runtime and safe entry point

The exact qualification Node runtime is **22.23.2**, recorded once in [`.node-version`](.node-version) and consumed by CI. `package.json` declares a broader package compatibility floor (`>=22`); that compatibility range is not the qualification runtime authority.

From a clean Carrier checkout using Node 22.23.2:

```sh
npm test
```

Prepare the exact historical Pryzael source as an external, untracked checkout:

```sh
git clone https://github.com/4i7/Pryzael.git frozen-pryzael
git -C frozen-pryzael checkout --detach 3bba19e0be936e7b9d3554ac737d32f5cf84c846
```

Verify the frozen manifest twice when qualifying a candidate:

```sh
node scripts/build-frozen-manifest.mjs --source frozen-pryzael --check frozen/current-manifest.json
node scripts/build-frozen-manifest.mjs --source frozen-pryzael --check frozen/current-manifest.json
```

Run only the public synthetic four-slot mechanics:

```sh
PRYZAEL_SOURCE_ROOT="$PWD/frozen-pryzael" npm run dry-run
```

On PowerShell, set `$env:PRYZAEL_SOURCE_ROOT = (Resolve-Path frozen-pryzael)` and then run `npm run dry-run`.

Finally scan the exact tracked Git artifact:

```sh
npm run scan
```

`npm run scan` proves mechanically detectable invariants of the **tracked public repository tree**. It does not prove absence of every possible semantic leak.

## Synthetic mechanics are not R4C evidence

`npm run dry-run` is intentionally limited to `DEV-SIMPLE-001` and `DEV-REPLAN-001` under the two conditions, one trial each: exactly 4/4 public synthetic slots. That validates carrier mechanics only. It never counts toward the authoritative 7 × 2 × 3 = 42 R4C baseline and does not establish that a real Temporary Chat was opened or isolated.

Authoritative completeness is a separate closed validator. It loads the seven task IDs/digests from the frozen non-secret commitment and internally requires exactly 42 slots with activation `CONDITIONED_BEHAVIOR` and surface `NATIVE`; callers cannot redefine that required matrix.

## Never commit

Never commit any of the following:

- the hidden qualification packet;
- hidden/held-out task prompts, predicates, gold/reference material, or Judge rubric material;
- real SUBJECT response bodies;
- real Judge authority payloads or Judge results;
- real routing maps, true-condition maps, blind maps, or blinding keys;
- private host, environment, retry, attestation, or execution ledgers;
- PR #10/R5 candidate semantic material where the frozen R4 boundary prohibits it;
- a vendored `frozen-pryzael/` checkout or frozen Pryzael Skill bodies.

## Distribution and license boundary

[`LICENSE`](LICENSE) is MIT and applies to Carrier-authored source and documentation in this repository. It does **not** relicense historical or external `4i7/Pryzael` material fetched during execution. Frozen Pryzael Skill bodies are not vendored into Carrier; only public identity metadata such as path/blob/digest values and the non-secret commitment index are retained where needed for verification. Upstream/external material remains governed by its own applicable terms; this repository does not guess, replace, or redefine those terms.
