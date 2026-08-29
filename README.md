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

`npm run scan` treats the tracked Git tree as repository-boundary authority and rejects drift from the exact closed five-file blob inventory under `fixtures/public/**`: the two public task files, their two synthetic responses, and `judge-authority.json`. It proves mechanically detectable invariants of the **tracked public repository tree** only and does not prove absence of every possible semantic leak.

## Public human operator harness

`npm run human-run --` is a thin I/O/orchestration surface for the already-authorized four-slot **public human development dry run**. It reuses the same canonical Carrier slot, task, renderer, SUBJECT, response-capture, blinding, Judge-envelope, host-profile, and public four-slot completeness authorities. It does not define alternate framing or evaluation semantics.

A human run requires an explicit private run directory outside the Carrier worktree. There is no repository-local default. The harness resolves/canonicalizes the requested path before sensitive creation and rejects the repository root, every descendant, and symlink/junction traversal that resolves back into the worktree. Real SUBJECT delivery files, captured response bytes, Judge packets/results, blinding state, condition/blind associations, and private run state are written only under that external directory. `npm run scan` is still useful for the tracked distribution, but it is not the protection boundary for real operator artifacts.

Initialization verifies the current Carrier source commit supplied by the operator and reproduces the tracked canonical manifest from the exact external frozen Pryzael checkout. It creates fresh cryptographically random private blinding state; it never imports the deterministic synthetic dry-run key or a synthetic fixture response.

A PowerShell-compatible setup looks like this. The paths shown are examples; both `$pryzael` and `$run` should be outside the Carrier checkout for an actual operator run:

```powershell
$carrierMain = (git rev-parse HEAD).Trim()
$pryzael = (Resolve-Path ..\Pryzael-r4c-frozen).Path
$run = Join-Path (Resolve-Path ..).Path "r4c-public-human-run"
New-Item -ItemType Directory -Force -Path $run | Out-Null

npm run human-run -- init `
  --run-dir $run `
  --pryzael-source $pryzael `
  --carrier-main $carrierMain
```

`init` prints the four canonical public slot IDs. For each slot, create an external UTF-8 JSON host-attestation file containing **exactly** the visible fields below, with `model`, `product`, and `ordinaryTools` set to what is actually observable for that fresh Temporary Chat:

```json
{
  "temporaryChat": true,
  "outsideProjects": true,
  "personalization": false,
  "nativePryzael": false,
  "pluginPryzael": false,
  "mcpPryzael": false,
  "candidateMaterial": false,
  "sessionReused": false,
  "model": "<actually visible model>",
  "product": "<actually visible product/surface>",
  "ordinaryTools": []
}
```

Do not convert an unknown or unobservable predicate to `false`. If every required visible predicate cannot be established, `prepare-subject` records that slot as `INCONCLUSIVE` instead of preparing a normal SUBJECT claim. Internal ChatGPT routing/backend state remains `UNVERIFIED` because the harness cannot observe it.

For one slot:

```powershell
$slot = "<slot id printed by init>"
$attestation = Join-Path $run "host-$slot.json"

npm run human-run -- prepare-subject `
  --run-dir $run `
  --slot $slot `
  --attestation-file $attestation
```

The generated `subjects/<slot>.subject.bin` is the exact canonical `deliveryBytes` buffer. Deliver those bytes without reconstructing, normalizing, parsing, or reserializing the packet.

After the human SUBJECT run, supply an explicit external capture file containing the exact response bytes:

```powershell
$response = Join-Path $run "captured-$slot.bin"

npm run human-run -- capture-response `
  --run-dir $run `
  --slot $slot `
  --response-file $response

npm run human-run -- prepare-judge `
  --run-dir $run `
  --slot $slot
```

`capture-response` preserves the operator-supplied file bytes exactly, including CRLF/LF distinctions, trailing spaces, and multibyte UTF-8. It proves only **the exact bytes of that supplied capture file**. It does not prove inaccessible browser/backend internal bytes. If exact response bytes are unavailable, do not reconstruct them; the run is `INCONCLUSIVE`. Malformed UTF-8 also fails closed.

`prepare-judge` prints an opaque `judgeBlindId` and writes `judges/<judgeBlindId>.judge.bin` plus safe integrity metadata. Judge-facing filenames/metadata do not disclose the true condition or private slot mapping. After the human Judge returns its public structural TrialResult JSON object, preserve it in an explicit external file and record it by blind ID:

```powershell
$blind = "<judgeBlindId printed by prepare-judge>"
$judgeResult = Join-Path $run "judge-result-$blind.json"

npm run human-run -- record-judge-result `
  --run-dir $run `
  --blind-id $blind `
  --result-file $judgeResult
```

Repeat the subject/response/Judge sequence for all four initialized slots, using fresh Temporary Chats and truthful visible host attestations as required by the experiment. Then validate only the public development run:

```powershell
npm run human-run -- validate --run-dir $run
```

A successful validation is always classified as `PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN` and `NOT_R4C_EVIDENCE`, with `authoritativeR4cEvidence=false`. Four-of-four public human development completeness is never promoted to authoritative 42-slot R4C evidence. Implementing or invoking the harness alone does not prove that any real Temporary Chat execution occurred.

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

The external human-run directory is deliberately private operator state and may contain the real operator artifacts above. That permission applies only to the explicitly external directory; none of those artifacts belong in tracked or untracked paths inside the Carrier worktree.

## Distribution and license boundary

[`LICENSE`](LICENSE) is MIT and applies to Carrier-authored source and documentation in this repository. It does **not** relicense historical or external `4i7/Pryzael` material fetched during execution. Frozen Pryzael Skill bodies are not vendored into Carrier; only public identity metadata such as path/blob/digest values and the non-secret commitment index are retained where needed for verification. Upstream/external material remains governed by its own applicable terms; this repository does not guess, replace, or redefine those terms.
