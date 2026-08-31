# Pryzael R4C Carrier

A standalone, public-safe carrier for the frozen Pryzael R4C conditioned-behavior qualification mechanics. It verifies frozen identities, renders the historical CURRENT comparator, prepares closed SUBJECT/Judge delivery envelopes, captures exact UTF-8 responses, validates completeness, and scans the tracked public distribution boundary. It does **not** run the hidden R4C baseline or replace Pryzael.

The original detailed Carrier design in [`docs/superpowers/specs/2026-08-29-pryzael-r4c-carrier-design.md`](docs/superpowers/specs/2026-08-29-pryzael-r4c-carrier-design.md) remains historical design context. For the R5 MVP evaluation, [Issue #4](https://github.com/4i7/Pryzael-R4C-Carrier/issues/4) is the controlling project/evaluation decision and [`evaluation/r5-mvp/`](evaluation/r5-mvp/) is the executable MVP path. Operational invariants for the existing stronger Carrier mechanics are summarized in [`spec/carrier-protocol.md`](spec/carrier-protocol.md).

## Authority and boundaries

The Carrier is subordinate to the frozen Pryzael R4 authority. Historical CURRENT is exactly `4i7/Pryzael` commit `3bba19e0be936e7b9d3554ac737d32f5cf84c846`, tree `29c3d97126d0f11de8d5c89dddf21f23d861f257`, canonical `skills/` tree `4395ef86a309ed610f4860f47284d0e4da572914`, rendered by `r4c-condition-render-v1`.

Public repository material includes Carrier implementation/documentation, digest/path/blob identity metadata, the non-secret frozen qualification commitment index, explicitly synthetic development fixtures, and intentionally public-safe Issue #4 MVP artifacts under `evaluation/r5-mvp/**`. Hidden/held-out SUBJECT bodies, authoritative hidden R4C Judge authority/results, hidden routing/blind maps, private retry/host ledgers, and held-out prompts/predicates remain private or hidden outside this repository. The hidden qualification packet is neither needed nor authorized for public mechanics verification or the R5 MVP path.

The existing human-run SUBJECT and Judge path remains human-operated in fresh ChatGPT Web Temporary Chats. There is no browser automation, paid model API, resident supervisor, or production Pryzael runtime in that harness. It is an optional stronger diagnostic/qualification path for Issue #4; the R5 MVP instead uses fresh ChatGPT Web sessions plus public-safe artifacts under `evaluation/r5-mvp/**`.

## R5 MVP evaluation

Issue #4 resets the default R4/R5 comparison to a proportional public MVP: six representative public-safe tasks, one fresh ChatGPT Web execution per task/condition, 12 initial SUBJECT executions total, and a separate fresh blind A/B Judge session for each comparison. The default MVP does **not** require hidden R4C execution, Windows/Codex/local filesystem execution, byte-exact browser/backend proof, cryptographic evidence binding, or the authoritative 42-slot matrix.

The previously initialized Windows public run may remain unused. The human-run harness and authoritative 42-slot validator are preserved as optional stronger infrastructure when a concrete observed failure mode or stronger claim actually justifies them.

See [`evaluation/r5-mvp/README.md`](evaluation/r5-mvp/README.md) for the exact public procedure, task set, run/review paths, and admission rule.

## Qualification runtime and safe entry point

The exact qualification Node runtime is **22.23.2**, recorded once in [`.node-version`](.node-version) and consumed by CI. `package.json` declares a broader package compatibility floor (`>=22`); that compatibility range is not the qualification runtime authority.

From a clean Carrier checkout using Node 22.23.2:

```sh
npm test
```

Prepare the exact historical Pryzael source as a separate checkout:

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

A human run requires an explicit private run directory outside the Carrier worktree. There is no repository-local default. The harness canonicalizes the run root and revalidates every sensitive child directory and artifact at the point of use. `private-run-state.json`, `host-attestations/**`, `subjects/**`, `responses/**`, `judges/**`, `judge-results/**`, and state temporary files must resolve under the exact canonical run root and outside the Carrier worktree. Pre-created symlinks, Windows junction/reparse redirections observable through Node, and later child-directory substitutions fail closed.

`private-run-state.json` is a durable coordination record, not semantic authority. Every command reload reconstructs the Carrier identity, frozen manifest and CURRENT/ABSENT renders, canonical four-slot identity, and blind associations before using state. Final validation additionally reconstructs host attestations, SUBJECT packets, response captures, Judge packets, and Judge-result captures from the preserved artifacts before calling canonical public completeness.

State updates use a fresh exclusive temporary sibling, flush it, revalidate the fixed state path, and rename it into place. Established evidence artifacts are never silently overwritten: an exact existing artifact may be reused after a crash, while differing bytes fail closed. Node/platform APIs do not provide a portable, race-proof no-follow transaction across all filesystem operations, so the threat boundary is fail-closed validation before/after sensitive uses and rejection of observable symlink/junction/reparse redirection, not a claim of immunity to an attacker racing kernel namespace operations between syscalls.

### Safe PowerShell setup

The example first derives the Carrier repository root from Git itself, so it remains correct when launched from any repository subdirectory. The run path is a sibling of the repository root. Do not manually create `$run`; `init` performs the guarded creation.

```powershell
$carrierRoot = (git rev-parse --show-toplevel).Trim()
if (-not $carrierRoot) { throw "Not inside the Carrier repository" }
$carrierRoot = (Resolve-Path $carrierRoot).Path
$carrierMain = (git -C $carrierRoot rev-parse HEAD).Trim()
$carrierParent = Split-Path -Parent $carrierRoot
$pryzael = (Resolve-Path (Join-Path $carrierParent "Pryzael-r4c-frozen")).Path
$run = Join-Path (Split-Path -Parent $carrierRoot) "r4c-public-human-run"

npm --prefix $carrierRoot run human-run -- init `
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

Do not convert an unknown or unobservable predicate to `false`. If every required visible predicate cannot be established, `prepare-subject` records that slot as `INCONCLUSIVE` instead of preparing a normal SUBJECT claim. Internal ChatGPT routing/backend state remains `UNVERIFIED` because the harness cannot observe it. The accepted attestation bytes are preserved under `host-attestations/` and rebound during final validation; this prevents later mutable-state edits from redefining already-established host evidence. It does not prove that the operator's original visible attestation was truthful.

### SUBJECT transfer: generated file is exact, web ingress is unverified

For every public slot, create a **fresh Temporary Chat** for SUBJECT execution and use it only for that SUBJECT execution.

```powershell
$slot = "<slot id printed by init>"
$attestation = Join-Path $run "host-$slot.json"

npm --prefix $carrierRoot run human-run -- prepare-subject `
  --run-dir $run `
  --slot $slot `
  --attestation-file $attestation
```

The CLI reports these distinct facts:

- `generatedDeliveryFile: EXACT_CANONICAL_BYTES` — `subjects/<slot>.subject.bin` exactly equals canonical `buildSubjectEnvelope().deliveryBytes`.
- `webIngressTransfer: HUMAN_OPERATED` — Carrier does not automate the ChatGPT Web composer.
- `browserModelVisibleIngressBytes: UNVERIFIED` — Carrier does not observe or prove the bytes that the browser/backend ultimately made model-visible.

Supported web transfer procedure:

1. Read the already-generated `.subject.bin` as exact valid UTF-8 text.
2. Place that textual content into the fresh Temporary Chat composer.
3. Do **not** intentionally edit, trim, normalize, annotate, prefix, suffix, or reframe the packet.
4. Submit it.

This procedure does not require reconstructing packet framing. The source file is canonically exact; clipboard, browser, composer, transport, backend, and model-visible byte preservation are outside Carrier mechanical observation. Do not substitute an attachment-upload procedure unless its actual model-visible semantics have been separately established.

After the human SUBJECT run, supply an explicit external capture file containing the response bytes you obtained:

```powershell
$response = Join-Path $run "captured-$slot.bin"

npm --prefix $carrierRoot run human-run -- capture-response `
  --run-dir $run `
  --slot $slot `
  --response-file $response

npm --prefix $carrierRoot run human-run -- prepare-judge `
  --run-dir $run `
  --slot $slot
```

`capture-response` preserves the operator-supplied file bytes exactly, including CRLF/LF distinctions, trailing spaces, and multibyte UTF-8. It proves only `EXACT_BYTES_OF_OPERATOR_SUPPLIED_CAPTURE_FILE_ONLY`. It does not prove inaccessible browser/backend response bytes. If exact response bytes are unavailable, do not reconstruct them; the slot becomes `INCONCLUSIVE`. Malformed UTF-8 also fails closed.

### Judge transfer: a different fresh isolated Temporary Chat

For **every** public slot, the Judge packet must be executed in a **different fresh isolated Temporary Chat** from the SUBJECT chat. The SUBJECT chat must never be reused as the Judge chat.

Before Judge execution, the Judge chat must not previously contain the SUBJECT packet, SUBJECT response-generation context, condition material, true condition identity, the corresponding SUBJECT conversation, or another Judge execution where independent Judge sessions are required. The public harness does not mechanically attest ChatGPT-side Judge isolation; that boundary is human-observed/operator-attested and is therefore not mechanically proven by Carrier.

`prepare-judge` writes `judges/<judgeBlindId>.judge.bin` plus safe integrity metadata. Its CLI uses the same three ingress classifications as SUBJECT: exact canonical generated file, human-operated web transfer, browser/model-visible ingress unverified. Transfer the `.judge.bin` textual content using the same read-as-valid-UTF-8 -> paste unchanged -> submit procedure, but into the distinct fresh Judge Temporary Chat.

After the human Judge returns its public structural TrialResult JSON object, preserve it in an explicit external file and record it by blind ID:

```powershell
$blind = "<judgeBlindId printed by prepare-judge>"
$judgeResult = Join-Path $run "judge-result-$blind.json"

npm --prefix $carrierRoot run human-run -- record-judge-result `
  --run-dir $run `
  --blind-id $blind `
  --result-file $judgeResult
```

Repeat the complete SUBJECT/response/Judge/Judge-result sequence for all four initialized slots. Then validate only the public development run:

```powershell
npm --prefix $carrierRoot run human-run -- validate --run-dir $run
```

Final validation rereads and reconstructs all four canonical evidence records before completeness. A successful summary remains body-free and reports `PUBLIC_HUMAN_DEVELOPMENT_DRY_RUN`, `NOT_R4C_EVIDENCE`, `authoritativeR4cEvidence=false`, `hiddenBaselineExecuted=false`, `realTemporaryChatExecution="UNVERIFIED"`, and `realTemporaryChatExecutedByHarness=false`. `UNVERIFIED` means Carrier cannot mechanically establish whether the human Temporary Chat execution occurred; it is not a claim that execution did not occur.

### Crash and partial-transition behavior

A partial state write is not accepted as completed evidence. State JSON is replaced from an exclusive flushed temporary sibling to avoid ordinary torn-overwrite behavior. Evidence files are content-established: retry may reuse an already-present exact artifact, but it will not overwrite different established bytes. If a crash leaves only some artifacts written, the coordination state remains at the prior transition and final validation fails until the canonical artifacts/state are coherently re-established; if existing bytes conflict, start a new private run rather than forcing an overwrite.

## Synthetic mechanics are not R4C evidence

`npm run dry-run` is intentionally limited to `DEV-SIMPLE-001` and `DEV-REPLAN-001` under the two conditions, one trial each: exactly 4/4 public synthetic slots. That validates carrier mechanics only. It never counts toward the authoritative 7 × 2 × 3 = 42 R4C baseline and does not establish that a real Temporary Chat was opened or isolated.

Authoritative completeness is a separate closed validator. It loads the seven task IDs/digests from the frozen non-secret commitment and internally requires exactly 42 slots with activation `CONDITIONED_BEHAVIOR` and surface `NATIVE`; callers cannot redefine that required matrix. That 42-slot requirement applies only to the authoritative historical R4C completeness path, not to the Issue #4 R5 MVP comparison.

## Never commit

Never commit any of the following:

- the hidden qualification packet;
- hidden/held-out task prompts, predicates, gold/reference material, or Judge rubric material;
- authoritative hidden R4C SUBJECT response bodies;
- authoritative hidden R4C Judge authority payloads or Judge results;
- hidden/private routing maps, true-condition maps, blind maps, or blinding keys;
- private host, environment, retry, attestation, or execution ledgers;
- hidden or held-out PR #10/R5 candidate semantic material where disclosure would invalidate a benchmark;
- a vendored `frozen-pryzael/` checkout or frozen Pryzael Skill bodies.

Issue #4 intentionally allows public-safe R4/R5 MVP task outputs, blind Judge reviews, post-judge A/B mappings, and aggregate summaries **only** under the documented `evaluation/r5-mvp/**` boundary. That narrow exception does not weaken the prohibitions above for hidden/held-out or private material.

The external human-run directory is deliberately private operator state and may contain the real operator artifacts above. That permission applies only to the explicitly external directory; none of those harness artifacts belong in tracked or untracked paths inside the Carrier worktree.

## Distribution and license boundary

[`LICENSE`](LICENSE) is MIT and applies to Carrier-authored source and documentation in this repository. It does **not** relicense historical or external `4i7/Pryzael` material fetched during execution. Frozen Pryzael Skill bodies are not vendored into Carrier; only public identity metadata such as path/blob/digest values and the non-secret commitment index are retained where needed for verification. Upstream/external material remains governed by its own applicable terms; this repository does not guess, replace, or redefine those terms.
