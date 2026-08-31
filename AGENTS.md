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
- Enforced by the chaos test suite (tests/test_queue_chaos.py, C5
  banned-shape checks) and ctest test_queue_chaos (52 checks, green).

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
abandoned tickets drain in order), stop flags are C11 atomics, and all 24
regression checks in tests/test_queue.py are green — the stop door lands
in 0.3s with a witnessed /interrupt, SIGTERM manufactures zero zombies,
and boot sweeps are idempotent.

## PLUGIN ARCHITECTURE LAW (operator order, 2026-08-31, verbatim intent)

> "ARE YOU WRITING THE H3 TIMELINE SPECIFIC THINGS IN SERVER.CPP?"

- Lane/card-specific knowledge — calls→windows compile, grid math,
  template expansion, inject splices, knob maps, template families —
  lives in the PLUGIN that owns the lane (code + data), NEVER in
  src/server.cpp. The core stays generic.
- Enforcement shape: the optional `card_compose` C-ABI hook
  (include/inference/plugin.h). Phase 1 (run_id="") compiles/validates
  and returns extra run inputs; phase 2 rewrites the run graph in
  place. The server reads the engine type FROM THE GRAPH — it names no
  lane and no engine.
- The card's knob map is DATA the plugin owns, next to its model:
  plugins/<plugin>/models/video/<model>/card_knobs.yaml. A knob the
  card offers must be in the map AND real in the lane's templates
  (LAYER AUDIT enforces both directions; card_knobs.yaml is the SSOT
  for what compose actually splices).
- History note: the h3 timeline feature shipped 2026-08-30/31 with its
  compile/grid/splice logic embedded in server.cpp — a regression this
  law repaid. If a lane "needs" core changes to express its card, the
  ABI is extended generically instead.
