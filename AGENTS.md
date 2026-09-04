# AGENTS.md — LAWS FOR THIS MACHINE

## INFERENCE LAW (operator order, 2026-08-29, verbatim)

> "ONLY USE INFERENCE THROUGH THE QUEUE SYSTEM, NEVER USE THE INFERENCE SYSTEM DIRECTLY"

- ALL inference — video windows, images, TTS, motion, every GPU workload — goes
  through the QUEUE SYSTEM (asset requests / action cards). One active request
  at a time (serial GPU law).
- NEVER POST directly to /v1/flows/start or any inference door
  as a "straight demand". The GPU fails when the queue is bypassed.
- Action cards are the queue-native interface: compose the card, the run goes
  through the queue, claims enforce serialization.
- If a run must stop: use the stop door (/v1/flows/stop/<id>) — never kill
  processes.
- Gateway restarts: OPERATOR ONLY on production deployments. THE DEV DSH
  LOOP IS THE SANCTIONED EXCEPTION (operator order, 2026-09-04: "Change
  the [REDACTED 2026-11-05] operator law. I made a dev dsh just for testing this
  [REDACTED 2026-11-05], in this very project"): the dev DSH at
  https://cloud.tailb1e597.ts.net:3909/ (tests/dev_dsh/, launched by
  ~/bin/inference-dev-dsh.sh, isolated ~/.dsh-test home) exists precisely
  to test estate changes — so verifying a change MAY rebuild the web
  artifacts, restart the estate gateway, and probe the dev DSH. The
  restart preconditions still apply in full: confirm ZERO active runs
  first, use setsid, and never touch the prod DSH home (~/.dsh).


## QUEUE LANE LAW (operator order, 2026-08-30, verbatim)

> "No legacy. No fallbacks. No hardcodes. These are banned."

- The flow START handler must never silently compose a graph when a
  request fails to resolve. Unresolved requests are rejected with 4xx
  BEFORE any run is registered (no zombie slots, no sidecars).
- No default model names (e.g. the old "krea-2" fallback). A run must
  name its pipeline EXPLICITLY: `{flow:name}` resolving
  `flows/<name>/flow.py` — a PYTHON declaration (frozen pydantic rows,
  structural edges, TYPED edges — the closed `Kind` vocabulary
  refuses an image→text wire AT CONSTRUCTION, no GPU cycle
  needed, design record docs/queue/flow-typed-edges.md; the yaml text door +
  its parser retired 2026-09-04, design record docs/queue/flows.md) —
  or `{flow_inline:{...}}`, the SAME rows as JSON
  (py/flow.py `flow_from_body`; agent-constructed multi-step flows
  compiled by the identical validators — `POST /v1/flows/validate`
  returns verbatim compile refusals so the AI iterates without a
  queue slot, a GPU claim, or a sidecar) —
  or `{model}` for card-only models (the plugin compose hook builds
  the graph). Naming more than one door is an ambiguous request and
  refuses BEFORE registration. The `{pipeline:{steps}}` door named
  here earlier never
  existed in code; the law text now matches the resolver.
- Plugins (e.g. comfyui server_url) must not carry a hardcoded default
  endpoint. Missing required params fail the node LOUDLY at load.
- Enforced by the py gateway's route-layer validation (4xx BEFORE
  registration) and the parity test suites
  (tests/walls/suites/test_py_gateway.py,
  tests/walls/suites/test_http_parity.py).

## RESILIENCE LAW (operator order, 2026-08-29, verbatim)

> "GATEWAY SHOULD NOT CRASH. A BAD RUN SHOULD NOT CRASH THE ENTIRE SYSTEM.
> IT SHOULD DOCUMENT THE FAILURE, THEN CONTINUE"

- A failing run marks itself `error` with the EXACT failure message (from the
  plugin's stderr capture) in the sidecar ledger `_flow.json` — top-level
  `error` field AND per-stage `stages[].error`. Never a bare "failed".
- The gateway process outlives every run failure. No code path in a run thread
  may abort the server; early returns must release the GPU FIFO ticket exactly
  once (double-release corrupts the queue — see crash-guard note in PROCESS.md
  Phase 3).
- After a failure the queue continues: ticket released, next run served.
- Gateway restarts use `setsid` — plain `nohup` children die with the
  spawning shell and leave "running" sidecars (zombies) behind.

### AUDITED HARDENING — three rounds, the numbers live in the audit doc

- Round 1 (2026-08-29): the stop door reaches INTO renders (<6s, POSTs
  /interrupt, reports `stopped`); timeouts /interrupt; SIGTERM
  manufactures zero zombies; kill -9 swept idempotently; sidecar writes
  atomic.
- Round 2 (same day): jappend accumulators, FIFO tickets assigned at
  registration, atomic stop flags — no truncation/ordering class left.
- Round 3 (2026-09-04): engine-transition boundary is gateway-level
  (outgoing engine unload() across runs AND stages, sidecar-recorded) —
  tested at three layers (tests/unit/runtime/test_engine_boundary.py),
  pinned live by the GPU cpp suite, run in CI.

Full detail, timings, and VRAM evidence: docs/audits/queue-audit.md.

## PLUGIN ARCHITECTURE LAW (operator order, 2026-08-31, verbatim intent)

> "ARE YOU WRITING THE H3 TIMELINE SPECIFIC THINGS IN SERVER.CPP?"

- Lane/card-specific knowledge — calls→windows compile, grid math,
  template expansion, inject splices, knob maps, template families —
  lives in the PLUGIN that owns the lane (code + data), NEVER in the
  gateway core (`py/gateway.py`). The core stays generic.
- Enforcement shape (compose-first, operator order 2026-09-02; the
  declarer `py/plugins.py` is the discovery SSOT): a plugin lives at
  `plugins/engines/<id>/` and declares itself — `plugin.py` (a Plugin
  class: id, engines tuple, genres) — carrying `compose/` (card
  compose + execute), `models/<genre>/<model>/model.py`
  (self-contained families), and `action_cards/<genre>/<card>/py/`
  (card defs + lane code). A compose-first plugin has NO engine.py:
  execution rides comfyui-mcp. The legacy
  `engines/<dir>/engine.yaml` + `engine.py` shape survives only in
  audio-cpp (ffmpeg retired 2026-09-04). Phase 1 (run_id="") is the
  VALIDATION DOOR: document construction IS the gate — key admission,
  artifact-ref existence on the mounts, and semantic laws are
  pydantic validators (PYTHON SHAPE LAW: no post-hoc walks);
  everything that can 4xx does so BEFORE any run registers. Phase 2
  emits the run graph YAML and the run-input pool. The gateway
  resolves engine type FROM THE GRAPH — it names no lane and no
  engine.
- The card's knob vocabulary is card_knobs ROWS on the model class —
  frozen pydantic rows, not a yaml sidecar (`card_knobs.yaml` is
  extinct since the 2026-09-02 class flip). A knob a card offers
  must have a row on every model it boards AND be real in the lane's
  templates (LAYER AUDIT enforces both directions; the rows are the
  SSOT for what compose splices —
  tests/walls/suites/test_cpp_engines.py `TestKnobSSOT`).
- History note: the h3 timeline feature shipped 2026-08-30/31 with its
  compile/grid/splice logic embedded in server.cpp — a regression this
  law repaid. Post-flip, compose logic lives in
  `plugins/engines/comfyui/compose/` (per-card modules). If a
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
   `sys.path.insert` six-ups rituals (the six-ups are gone; the repo
   `py/`-root injection survives as a guarded two-liner at the module
   entry points that must stand alone when tools/tests import them,
   and plugin path setup lives in the loader, never inside the
   packages).
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
  (comfy-mcp / comfy-cli `install_node` — PIN LAW, live-probed flip
  day: bare registry ids take the rail; `install_node` REFUSES both
  git URLs AND `<id>@<version>` pins, so the declared version in
  nodes.yaml stays the RECORDED expectation and drift is reported
  for deliberate audit). docs/comfyui/comfy-mcp.md §8 is the design
  record.
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

## PROVISIONING LAW (operator order, 2026-09-03, verbatim)

> "the user comes before hand with their own comfyui, then this sits
>  on top of it"
> "It would impose less of a burden on power users, if the python
>  that runs this system, and comfyui, shared a single python venv"
> "But yes, let's build it out now, clean as possible"

ONE interface, TWO modes — the estate code NEVER knows the
difference (both modes speak HTTP + declared extensions; managed is
a deployment choice, never an assumption):

- **byo (default):** the user's own ComfyUI, anywhere — local,
  remote, cloud, updated. The estate VERIFIES (tools/provision.py
  verify: config shape, live /system_stats + /object_info probe)
  and NEVER installs one.
- **managed (opt-in via `provision: "managed"` in the endpoint
  config):** the estate is its own most convenient customer.
  `infra/comfyui/` is the recipe — uv-locked deps (core's own
  requirements, verbatim ranges) plus ComfyUI core as a PINNED git
  checkout (`infra/comfyui/core.pin` — core at the audited ref is
  not a pip package: no build system upstream, and Comfy-Org ships
  core as a checkout); version hops are deliberate, reviewable pin
  bumps. `tools/provision.py sync` materializes
  `data/runtime/comfyui` (checkout + `.venv`) — weights NEVER move
  (extra_model_paths.yaml, generated from `model_base_path`, points
  at the deployment's persistent storage); estate streams serve
  input/output (`data/input`, `data/temp`).
- **Management plane is ONE: comfy-mcp** (EXTENSION LAW). The
  managed env ships comfyui-manager ONLY as the v4 PACKAGE form —
  install_node drives its cm_cli machinery (the legacy
  custom_nodes clone does not count, live-probed 2026-09-03);
  it is the rail, never a second interactive plane.
- **ONE base env IS the management plane** (operator order,
  2026-09-03, verbatim: "ALL THIS NEEDS TO GO INTO THE BASE. THERE IS
  ONE [REDACTED 2026-11-05] FLOW HERE. THE OPTION IS A FULL COMFYUI INSTALL
  THROUGH PYTHON. COMFY-MCP NEEDS TO BE IN THE [REDACTED 2026-11-05] BASE. OUR
  SYSTEM DOES NOT RUN WITHOUT THAT"). Root `pyproject.toml` carries
  pydantic, comfy-script (composition), comfy-mcp (the engine
  boundary), comfyui-manager (cm_cli install rail), comfy-cli,
  fastmcp + starlette (MCP serving), pyyaml — no opt-in group, no
  second env. The resilience law's torch wall survives because the
  SERVING runtime (data/runtime/comfyui/.venv) stays its own
  bloodstream: the base env never imports torch; the manager rides
  the runtime env (COMFYUI_PATH) where it needs comfy core.

- **Management is python packages, not shell scripts** (operator
  order, 2026-09-03: "models, extensions, and comfyui management is
  done through those python packages, not shell scripts").
  `tools/provision.py` imports comfy-mcp and calls its tools
  IN-PROCESS (`install_node`, `download_model`); comfy-cli's binary
  routing is comfy-mcp's concern (COMFY_BIN/PATH — deployment
  config). `bootstrap.py` is deleted — its shell-wrapping era is
  over. The management group is RETIRED: `uv run python
  tools/provision.py` is the whole invocation (url+ref declarations
  install through cm_cli, the Manager's own acquisition rail —
  never a repo-side git clone); vendor symlinks and sha-verified
  downloads require a workspace WRITABLE from the orchestrator's
  world (containers provision via entrypoint/binds).

Enforced by tests/walls/suites/test_provision.py (config shape, full-plane base
env, no dependency-groups split, git-pinned core, manager-v4 rail,
BYO never-installs refusal, dead-instance refusal, no
comfy-shell-wrapping, manifest non-empty).

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

## LAW TEXT HYGIENE (2026-09-04, born from the first law audit)

- A law names a file or format only while a wall pins the claim. Dead
  paths in law text teach dead shapes with extra authority — the same
  drift class as the `{yaml:}` teachings, inside the law file itself.
- Dated audit narratives (timings, VRAM numbers, round detail) live in
  docs/audits/; a law carries a one-line pointer, not the journal.
- When code deletes a thing a law names, the law text dies in the SAME
  stroke. (Amended this stroke: the dead /generate door, the extinct
  `card_knobs.yaml` SSOT, pre-reorg plugin paths, three audit rounds
  compressed to pointers, rung-5's import-mechanics reality.)
- Enforced by tests/walls/suites/test_law_hygiene.py: every backticked
  file path in AGENTS.md must exist in the tree unless allowlisted as
  deliberate dead provenance (`src/server.cpp`, `card_knobs.yaml`,
  `bootstrap.py` — things the laws cite AS deleted).
