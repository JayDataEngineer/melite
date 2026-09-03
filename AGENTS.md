# AGENTS.md — LAWS FOR THIS MACHINE

## INFERENCE LAW (operator order, 2026-08-29, verbatim)

> "ONLY USE INFERENCE THROUGH THE QUEUE SYSTEM, NEVER USE THE INFERENCE SYSTEM DIRECTLY"

- ALL inference — video windows, images, TTS, motion, every GPU workload — goes
  through the QUEUE SYSTEM (asset requests / action cards). One active request
  at a time (serial GPU law).
- NEVER POST directly to /v1/pipelines/start, /generate, or any inference door
  as a "straight demand". The GPU fails when the queue is bypassed.
- Action cards are the queue-native interface: compose the card, the run goes
  through the queue, claims enforce serialization.
- If a run must stop: use the stop door (/v1/pipelines/stop/<id>) — never kill
  processes. If the gateway needs a restart: operator only.


## QUEUE LANE LAW (operator order, 2026-08-30, verbatim)

> "No legacy. No fallbacks. No hardcodes. These are banned."

- The pipeline START handler must never silently compose a graph when a
  request fails to resolve. Unresolved requests are rejected with 4xx
  BEFORE any run is registered (no zombie slots, no sidecars).
- No default model names (e.g. the old "krea-2" fallback). A run must
  name its pipeline EXPLICITLY: {yaml:name}, {pipeline:{steps}}, or
  {model} that resolves to pipelines/<model>/pipeline.yaml on disk.
- Plugins (e.g. comfyui server_url) must not carry a hardcoded default
  endpoint. Missing required params fail the node LOUDLY at load.
- Enforced by the py gateway's route-layer validation (4xx BEFORE
  registration) and the parity test suites (tests/test_py_gateway.py,
  tests/test_http_parity.py).

## RESILIENCE LAW (operator order, 2026-08-29, verbatim)

> "GATEWAY SHOULD NOT CRASH. A BAD RUN SHOULD NOT CRASH THE ENTIRE SYSTEM.
> IT SHOULD DOCUMENT THE FAILURE, THEN CONTINUE"

- A failing run marks itself `error` with the EXACT failure message (from the
  plugin's stderr capture) in the sidecar ledger `_pipeline.json` — top-level
  `error` field AND per-stage `stages[].error`. Never a bare "failed".
- The gateway process outlives every run failure. No code path in a run thread
  may abort the server; early returns must release the GPU FIFO ticket exactly
  once (double-release corrupts the queue — see crash-guard note in PROCESS.md
  Phase 3).
- After a failure the queue continues: ticket released, next run served.
- Gateway restarts use `setsid` — plain `nohup` children die with the
  spawning shell and leave "running" sidecars (zombies) behind.

### AUDITED HARDENING (total extreme audit, 2026-08-29 — QUEUE_AUDIT.md)

The stop door now reaches INTO a running render (node_stop ABI): a stop
lands in <6s, POSTs /interrupt to ComfyUI, and reports `stopped` — never
`error`, never a 300s wait. Timeouts also /interrupt (no zombie GPU jobs).
SIGTERM/SIGINT mark every active run `stopped` and exit cleanly — a
deliberate shutdown manufactures zero zombies; kill -9 leftovers are swept
to `failed` at boot AND at first read (idempotent, ledgered as `run.swept`).
Sidecar writes are atomic (tmp+rename) and error strings are JSON-quoted —
a status response can never become unparseable. Window prompts are
per-request locals — concurrent submissions cannot cross-wire. Invoke law
unchanged: cards in, stop door out, operator-only gateway restarts.

Perfection pass (same day, QUEUE_AUDIT.md round 2): every JSON accumulator
is a grow-and-retry jappend (no truncation/underflow class left anywhere),
GPU tickets are assigned at registration (strict submission-order FIFO,
abandoned tickets drain in order), stop flags are C11 atomics, and the
py gateway's golden parity suite confirms the stop door lands in <6s with
a witnessed /interrupt, SIGTERM manufactures zero zombies, and boot sweeps
are idempotent.

## PLUGIN ARCHITECTURE LAW (operator order, 2026-08-31, verbatim intent)

> "ARE YOU WRITING THE H3 TIMELINE SPECIFIC THINGS IN SERVER.CPP?"

- Lane/card-specific knowledge — calls→windows compile, grid math,
  template expansion, inject splices, knob maps, template families —
  lives in the PLUGIN that owns the lane (code + data), NEVER in the
  gateway core (`py/gateway.py`). The core stays generic.
- Enforcement shape: each plugin exposes `engines/<dir>/engine.py`
  (execute) and `engines/<dir>/compose/` (card compose). Phase 1
  (run_id="") validates and returns extra run inputs; phase 2 emits the
  run graph YAML. The gateway resolves engine type FROM THE GRAPH — it
  names no lane and no engine.
- The card's knob map is DATA the plugin owns, next to its model:
  `plugins/<plugin>/models/video/<model>/card_knobs.yaml`. A knob the
  card offers must be in the map AND real in the lane's templates
  (LAYER AUDIT enforces both directions; `card_knobs.yaml` is the SSOT
  for what compose actually splices).
- History note: the h3 timeline feature shipped 2026-08-30/31 with its
  compile/grid/splice logic embedded in server.cpp — a regression this
  law repaid. Post-flip, compose logic lives in
  `plugins/comfyui/engines/comfyui/compose/` (per-card modules). If a
  lane "needs" core changes to express its card, the plugin contract is
  extended generically instead.

## PYTHON SHAPE LAW (operator order, 2026-09-03, verbatim intent)

> "I had to drill in the very, very basics of clean python. Over and over."
> "Are you saying this is the pythonic way to handle this?"
> "You recommend this pattern? Of not using Python Data Classes, but to
>  type raw strings?"

The ladder, every rung load-bearing — audited on the model/variant/cell
cascade and now THE law for how this repo writes python declarations:

1. **Classes are for taxonomy and behavior; data is instances.**
   Two classes that differ only in field values are not two types —
   they are two rows. A quant cell is a record, not a subclass. One
   class per family (Model subclasses carry real taxonomy), `variants`
   and `cells` are TUPLES OF INSTANCES of frozen schema models. The
   class-per-cell era exploded 4 variants × 3 quants into 12 classes +
   12 wiring attributes + a namespace-scanning metaclass that existed
   only to paper over classes-as-records.
2. **Schemas are pydantic models (the dataclass discipline), frozen.**
   Validation happens AT CONSTRUCTION — an invalid row cannot be built.
   Not `__post_init__` hand-rolling, not boot-time scans that remember
   to check, not opt-in guards (the `if source_url:` guard let linkless
   cells through — the `user_provided` hack's cousin). Mutability dies
   with `frozen=True`: no runtime `Krea2.defaults["steps"] = 99`.
3. **Closed vocabularies are enums; open ones are plain str.**
   `quant`/`dest_root` are closed sets → `Quant`/`DestRoot(str, Enum)`:
   a typo is a construction refusal, not a runtime route mismatch.
   Formats get constrained types (`HttpUrl`, `Sha256` pattern). Only
   genuinely open vocab (route, id, hint) stays `str` — typing theater
   there buys nothing.
4. **Artifacts are all-or-nothing.** A cell either IS a download place
   (a nested `CellArtifact`: url + sha256 + size, all validated) or is
   NOT (None). A url without a sha refuses. A linkless row claiming
   "user provided" is a dirty hack and is banned — the LoraRow flip
   (`source_url` required, `user_provided` deleted) is the precedent.
5. **No stringly handshakes.** Declarations are structural — class
   references and typed rows. `load_mod(__file__, "loras", "Loras")`
   magic-word pairs are tolerated ONLY where file-based loading forces
   them, and the loader owns import mechanics: no per-file
   `sys.path.insert` six-ups rituals (53 copies deleted — the loader
   injects the repo `py/` root once).
6. **No restated coordinates.** If a name is derived, never restate it
   beside the derivation (`Turbo = Turbo` + `id = "turbo"` was a drift
   surface). Instances state their id once, validated.
7. **Copy-paste fossils are a shape problem.** The krea-2 turbo/raw
   cells shared one sha256 across two different checkpoint files for a
   full day because class ceremony buries values. Rows make diffs
   legible; construction validation makes wrong shapes unbuildable.

8. **Models don't render; action cards render.** The graph-composition
   modules (co_script renderers) are CARD behavior —
   `action_cards/<genre>/<card>/renderer.py` — never model payload.
   A model ships DATA: typed rows (`lane_inputs` weight facts, cell
   artifacts, variants). The unet basename is DERIVED from the named
   cell's artifact (`lane_unet_basename`), never retyped beside it;
   facts with no artifact row (img-edit, music3) state their basename
   once in `lane_inputs`. The renderer receives the Model class as
   data and reads its rows. (Operator order, 2026-09-03: "I don't
   want the 'models' to render, I just want action cards to render.")

Where classes remain right: `Model` subclass per family; mods
(`Loras(LorasMod)` — genuine schema flavors under the single `Mod`
parent); anything with behavior or per-family taxonomy.

## EXTENSION LAW (operator order, 2026-09-03, verbatim intent)

> "The python package comfyui-mcp is supposed to manage our
>  extensions, yet we manage them on disk."
> "In the action card folders, we declare what extensions we need,
>  instead of keeping them on disk in our git repository."

- ComfyUI extensions are DECLARED, never vendored. A card that needs
  an extension says so (card `requires` + per-lane `nodes.yaml`,
  url+ref pinned); the MANAGEMENT PLANE installs them
  (comfy-mcp / comfy-cli `install_node`, registry-pinned — PIN LAW:
  bare ids silently git-clone; only <id>@<version> takes the
  registry rail). docs/comfyui/comfy-mcp.md §8 is the design record.
- Our AUTHORED packs live as submodules in ONE place:
  `vendor/comfyui_extensions/<pack>` (each its own repo). Nothing
  under any plugin's tree carries a pack copy — the fossil
  `plugins/engines/comfyui/custom_nodes/` (17 dirs, ~235 MB,
  drifting from the live ray binds) was deleted 2026-09-03.
- Foreign extensions we want to READ go in `references/` as study
  copies — nothing there executes or installs.
- The compose-time gate stays: `check_card_requires` resolves
  declarations against the LIVE object_info (and the vendor
  submodule dir for in-tree names) and REFUSES loudly before any
  graph is emitted.

## C RETIREMENT (operator order, 2026-09-03, verbatim)

> "Okay, let's fully retire C then"

The python gateway is THE gateway. There is no twin, no transition,
and no live C obligation anywhere in the estate (src/server.cpp was
deleted 2026-09-02; the compose-parity runner compares against
RECORDED outputs, never a live binary).

What retired with this order:

- **The goldens changed owner, not bytes.** `tests/golden_http/` was
  "what C served"; it is now the ESTATE'S OWN regression pin — the
  wire contract, full stop. The C-era wire quirks (the capitalize
  quirk, variant `defaults: {}`, the caps and precedence rules
  documented in the route modules) are no longer "C behavior we
  reproduce" — they are OUR wire format, and the goldens are its
  authority. Changing one means changing the contract deliberately,
  never by drift.
- **State is not contract.** The C-era `pipelines/runs` and
  `pipelines/drafts` snapshots (one dead server's 174 runs / 546
  drafts) are deleted; those routes are CONTRACT-pinned in the
  harness (envelope + count invariant + row shape). The skip entries
  and their "C-parity holdover" mode are gone.
- **Transition language is resolved.** "both gateways during the
  transition" and module-header "port of the C gateway" framings are
  retired where they framed the py side as a twin; historical
  references inside route modules (quirk provenance: "the C's
  off-by-one", line-number citations) are PROVENANCE and stay — they
  explain why the wire format is what it is.

Naming consequence (deferred, deliberate): the `py/` directory name
earned its keep by contrasting with the C side. That contrast is now
historical; a role-rename, if ever wanted, is its own coordinated
order — nothing here requires it.
