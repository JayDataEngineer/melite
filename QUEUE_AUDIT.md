# QUEUE AUDIT — TOTAL EXTREME AUDIT (operator order, 2026-08-29)

> "TOTAL EXTREM AUDIT ON THE QUEUE SYSTEM IT CAN NEVER BREAK DOWN AGIN TOTAL EXTREM AUDIT"

Scope: every path a run takes — registration → GPU FIFO ticket → thread →
plugin execution → ComfyUI submit/poll → sidecar/ledger writes — plus every
shutdown/crash/restart recovery path. Method: read the code, name the
failure, fix it, then PROVE the fix on the live gateway (chaos tests A-D).
All tests green: **100% tests passed, 0 failed out of 5** (ctest).

---

## Findings and fixes

| # | Sev | Finding | Fix | File |
|---|-----|---------|-----|------|
| F1 | HIGH | Sidecar written non-atomically (fopen("w") truncates; crash mid-write leaves corrupt/empty _pipeline.json) | tmp+rename atomic write, unlink on failure | server.cpp run_write_sidecar |
| F2 | HIGH | g_tl_wins/g_tl_nw GLOBALS: two concurrent POSTs cross-wire their window prompts (one run renders the other's beats) | locals tl_wins[4][2048] passed as parameters through add_run_extra_inputs | server.cpp |
| F3 | HIGH | Stop only checked at NODE boundaries — a 30-min window render ignored the stop door until timeout | New optional node_stop plugin ABI; runner publishes live node under cur_mu; runner_request_stop forwards INTO the executing plugin; comfyui poll loop checks stop_req every 500ms | plugin.h, plugin_loader.h, plugin.c, runner.c, comfyui_plugin.c |
| F4 | HIGH | Timeout returned -1 but never CANCELLED the ComfyUI job — zombie render kept burning the GPU while the queue released the ticket and the next run contended (serial GPU law violation) | comfy_interrupt() POSTs /interrupt on every timeout exit | comfyui_plugin.c |
| F5 | HIGH | Stop door didn't interrupt ComfyUI either (same class as F4) | node_stop → poll loop → POST /interrupt | comfyui_plugin.c |
| F6 | MED | Read-time zombie sweep patched only the API response, files kept lying "running" forever | sweep rewrites the FILE via the unified all-occurrences patcher + run.swept ledger event | server.cpp |
| F7 | MED | No boot-time sweep: crash leftovers kept "running" sidecars until someone listed runs; first-match-only rewrite re-swept the same file every boot (rev1 bug caught live in test C/D) | boot_sweep_stale_sidecars() runs BEFORE serving; patches every stale status (top-level AND per-stage), appends "sweep" note; idempotent | server.cpp |
| F8 | MED | stderr capture fixed path /tmp/_runner_stderr_capture — two processes overwrite each other's exact-error capture | pid-suffixed _capture_<pid> | runner.c |
| F9 | MED | Plugin retry-on-error would RESUBMIT after an operator stop/interrupt (fighting the queue); CACHED ctx kept stop_req=1 poisoning the next run on the same model | stop checks on every retry path; cfg->stop_req = 0 at execute entry | comfyui_plugin.c |
| F13 | MED | SIGTERM/SIGINT killed the gateway without marking runs — every shutdown manufactured zombies | SIGTERM/SIGINT blocked in all threads; dedicated sigwait thread marks every queued/running run "stopped (gateway shutdown)", writes sidecars+ledger, exits 0 | server.cpp |
| F25 | MED | Lazy-boot wait loop (240s) never checked stop — stop during executor boot hung 4 min | stop check each iteration | comfyui_plugin.c |
| F26 | HIGH | /v1/pipelines/status embedded the raw error string in JSON — any double-quote in ComfyUI's exact error broke the whole response (this is what failed test_queue at char 236) | json_quote() on both status paths (live + sidecar-restore) | server.cpp |
| F27 | MED | Mid-node stop returned rc=-1 → run marked "error", blaming the queue for an operator stop | runner maps node failure coinciding with stop_flag onto the cooperative-stop path (rc=1 → "stopped") | runner.c |

Verified-sound (no change needed): GPU FIFO ticket discipline (exactly-once
release on every path; pthread_cleanup stays REMOVED), slot recycling under
the th_done gate (never compacted), spawn-failure handling (loud 503, slot
released), ledger_log (mutex + append + close-per-line), ws_server locking,
curl timeouts (-m 30/60/300 — no infinite HTTP), yaml buffer sizing (all
batch YAMLs ≤ 2.1KB vs 4096 limit).

## Chaos verification (live, on :18090, zero GPU — fake executor on :18499)

- **TEST A — stop door mid-render:** run polling a hanging executor, stop
  POSTed → **stopped in 5.5s** (previously: 300s timeout), **POST /interrupt
  observed on the wire** by the fake executor's request log, final state
  "stopped" (not error), gateway alive.
- **TEST B — SIGTERM mid-run:** clean exit; sidecar "stopped" + exact
  reason "gateway shutdown (operator signal)"; ledger carries run.state
  stopped + server.shutdown. Zero zombies.
- **TEST C — kill -9 mid-run + restart:** sidecar frozen at "running" →
  boot sweep patched it to failed + note, ledger run.swept written.
- **TEST D — idempotence:** second restart re-swept NOTHING; top-level and
  per-stage statuses consistent (failed), sweep note present once.

Evidence run ids: run-6a92beb9-7428329fc6c0 (A), run-6a92becb-74282b7fe6c0
(B), run-6a92beda-73e0ba9fd6c0 (C), run-6a92bf9d-79e39a9fb6c0 (D) — sidecars
kept in build/output/ with sweep notes; ledger in build/output/_ledger.jsonl.

## Queue invariants now enforced (the "never break down" contract)

1. Gateway outlives every run failure — error paths release the FIFO ticket
   exactly once, write the exact error (top-level + per-stage), and the
   queue serves the next run.
2. Stop is fast and honest — <6s mid-render, cancels the remote job,
   reports "stopped" never "error".
3. No shutdown manufactures zombies — SIGTERM marks everything; kill -9
   leftovers are swept at boot AND at first read; sweeps are idempotent and
   land in the ledger.
4. Sidecars are always parseable JSON — atomic writes, quoted error
   strings, sweep notes appended as a new key.
5. Concurrent submissions cannot cross-wire — window prompts are
   per-request locals.

## Remaining known limitations (documented, not blocking)

- A plugin SEGFAULT still kills the process (no fork isolation). Recovery:
  boot sweep + restart. Process isolation would change the plugin ABI
  fundamentally — deferred.
- Artifact-download phase is bounded by per-file curl -m 300 AFTER the poll
  timeout (long but finite).
- static char staging[] in the comfyui plugin is safe ONLY under the GPU
  FIFO serialization — flagged if the FIFO is ever bypassed.

## Round 2 — perfection pass (2026-08-29, same day)

Code-level sweep of every remaining element; all fixed, built, and locked
into CI (tests/test_queue.py grew 12 -> 24 checks; ctest 5/5).

| id | class | finding | fix |
|----|-------|---------|-----|
| F28 | HIGH  | `len += snprintf(buf+len, cap-len)` accumulators (2 sites with realloc guards, 14 more with fixed buffers): a truncated snprintf returns the would-be length, len passes cap, next cap-len underflows to huge size_t = unbounded heap write (the H3 class) | new `jappend()` grow-and-retry appender; ALL 16 accumulation sites converted (artifacts, runs list, models, model detail, skills, prov jobs, queue SSE) |
| F31 | MED   | run_entry.yaml was 2048B vs yaml_override 4096B — silent truncation; h3-timeline-b4 sits at 2020B, 28 from a silent dag-parse failure | yaml field widened to 4096 with comment |
| M4  | MED   | GPU ticket taken inside the spawned thread = scheduler order, not submission order | ticket assigned AT REGISTRATION under g_gpu_mu (both registrars); run thread waits on its pre-assigned ticket; pthread_create failure abandons the ticket IN ORDER (`run_abandon_ticket_ordered` — never starves earlier waiters) with 3x retry |
| L1  | LOW   | runner stop_flag / plugin stop_req were plain volatile | C11 `__atomic` release/acquire loads+stores at every site |
| F29 | LOW   | comfyui staging[] was STATIC — correct only under GPU-FIFO serialization; also fixed-path /tmp/comfyui_req.json | staging is heap per execute (freed at tail); req file is pid-suffixed like the stderr capture |
| F30 | INFO  | kimodo poll loop: bounded (timeout_s, curl -m) — no change needed; ffmpeg concat probes bounded (-t 0.35) | documented |
| —   | FIX   | provision-thread spawn site lost its pthread_detach during the M4 rewrite | restored |
| F32 | MED   | draft ids were time+pthread_self: two cards composed in the same second on the same handler thread silently OVERWROTE each other (observed live: 5 batch cards collapsed to 2) | id gains an atomic monotonic sequence (draft-<time>-<tid>-<seq>); recomposed 5 cards verified distinct + verbatim |

Live evidence: `ctest` 5/5; test_queue 24 checks including — stop door
mid-render: stopped in 0.3s WITH /interrupt POSTed to the executor;
SIGTERM mid-run: clean exit, sidecar `stopped` + reason; boot sweep:
patches top+stage, idempotent across restarts (exactly 1 new ledger
entry); quoted-error status and sidecar both parse; M4 order: three
rapid submissions reach the engine in submission order. Deployed to the
live gateway (:18090) after a clean SIGTERM — zero zombies.

---

## CHAOS LAYER (operator order, 2026-08-30: "add a high amount of testing over the queue system")

tests/test_queue_chaos.py — the adversarial layer ON TOP of test_queue.py
(registered as ctest test_queue_chaos, TIMEOUT 600). 49 checks, green:

| ID | Attack | Invariant pinned |
|----|--------|------------------|
| C1 | 8 truly-parallel POSTs (barrier) | all 2xx; running<=1 at every sample; all 8 prompts reach the engine; ZERO cross-wired bodies (F2 under real concurrency) |
| C2 | 10 submit + 8 SIMULTANEOUS stops | every stop 200 exactly-once, every victim 'stopped' (never error), no victim ever reaches the engine, unknown-id 404, re-stop 400, zero leaked slots after |
| C3 | stop-vs-completion race x6, staggered offsets across the executor's finish line | never error/failed — only stopped/completed; queue serves a probe run after EVERY attempt |
| C4 | poll-never-completes executor, timeout_s=3 | bounded wall (<15s), /interrupt POSTed, ticket released, queue continues (F4/F5) |
| C5 | malformed-input barrage (8 shapes incl. 200KB prompt) | every shape 4xx-or-sane-2xx, gateway healthy, next real run serves immediately |
| C6 | error doc with quotes, escaped quotes, newline, unicode, backslash, 4KB junk | status AND sidecar parse; exact text preserved verbatim (F26 deep) |
| C7 | kill -9 mid-run x5 staggered | EVERY sidecar on disk still parses after each kill (F1 atomicity); 5 reboot cycles; system serves after |
| C8 | SIGINT mid-run | clean exit, sidecar stopped + shutdown reason (F13) |
| C9 | 3 rounds of interleave: hold + 3 submits + 2 stops | serial law through churn, full drain, no ghosts, NO starvation — next 3 runs execute in strict FIFO after abandoned tickets |
| C10 | boot-sweep matrix: top-only / stage-only / both stale + already-failed + MALFORMED sidecar | boot survives malformed; stale swept at BOTH levels exactly once (ledger delta == 1 each); failed untouched; second restart re-sweeps NOTHING |
| C11 | 8 threads hammer status for on-disk-only runs after restart (sidecar-restore path) | all restores parse |
| C12 | 8 threads hammer yaml/list + yaml/detail + status together | all parse, pipeline list byte-stable across the storm |
| CX | continuous monitor thread for the WHOLE suite | every 200 from status/queue parses (~70k polls/run) |

### Fixes from this round

- server.cpp: THREE handler-path buffers were STATIC (shared across the
  thread-per-connection pool): sidecar-restore sb[65536], yaml-list
  names[256][80], yaml-detail buf[65536]. Any concurrent GETs could
  cross-wire them. All three are now stack locals. One live corruption
  was observed (unparseable /v1/pipelines/status response, chaos run #1)
  before the fix; targeted repros could not re-trigger the window
  (~8k concurrent GETs, narrow window) — fix is hardening of a
  proven shared-mutable-state defect, pinned by C11/C12/CX.

### Reported, NOT changed (operator call needed)

- LEGACY-FALLBACK HAZARD: a start POST whose "yaml" is null, numeric, or
  an unknown name silently falls back to the LEGACY lane, which composes
  a run against the HARDCODED production ComfyUI (127.0.0.1:18465) with
  timeout_s=300. A typo'd pipeline name burns the real GPU through the
  back door and blocks the test/dev queue for 5 minutes. The chaos suite
  deliberately never submits such shapes; whether unknown yaml should
  404 instead of legacy-submit is a back-compat decision for the
  operator.

---

## LANE LAW ENFORCEMENT (operator order, 2026-08-30)

> "No legacy. No fallbacks. No hardcodes. These are banned."

### Code changes (server.cpp, comfyui_plugin.c)

server.cpp — 7 patches:
1. model default "" (was "krea-2"); wf[512] deleted entirely.
2. Early gate: yaml override || (model + resolve to disk) → else 400/404,
   BEFORE any run is registered (no zombie slots, no sidecars, no tickets).
3. Legacy compose branch deleted: the krea-style YAML with baked
   http://127.0.0.1:18465 is gone; the else path now fails LOUDLY
   (th_done=1, run_set_state "error", 500) — unreachable behind the gate.
4. workflow_file body parameter extraction removed (legacy-only knob).
5. wf default (../pipelines/krea-txt2img/workflow.json) removed.
6. Compose handler: model default "" (was "krea-2"), missing → 400.
7. Header doc updated to show {yaml:name} as the primary shape.

comfyui_plugin.c — 5 patches:
1. server_url param default → null (was "http://127.0.0.1:18465").
2. input_dir param default → null (was "/opt/ComfyUI/input").
3. node config load: server_url missing → fprintf + return -1 (loud).
4. input_dir: strdup(in_buf) unconditionally; empty is legal until latent
   seam needs it.
5. Latent seam: guard empty input_dir → fprintf + return -1.

### Test enforcement (tests/test_queue_chaos.py, C5)

Five banned shapes asserted MUST return 4xx (never 2xx/202):
  null yaml, numeric yaml, unknown yaml name, unknown model, no selection.
All five return 400 or 404 on the patched binary.  The LEGAL {model}
shape (resolving pipelines/_queue_test/pipeline.yaml) is asserted accepted
to prove the non-legacy lane survived.

### Verification

test_queue        24/0   (unchanged, no regression)
test_queue_chaos  52/0   (3 new: banned-shape reject x3, model-shape accept x1, queue-empty-x1)
ctest 2/2, 100%.


---

## PLUGIN LANE LAW ENFORCEMENT — kimodo_engine (operator order, 2026-08-30, cont.)

kimodo_engine.c — 5 patches:
1. server_url param default → null (was "http://127.0.0.1:8094").
2. model param default → null (was "soma-rp-v1.1").
3. model_dir param default → null (was "/mnt/data/models/motion/kimodo").
4. text_bundle param default → null (was "/mnt/data/models/motion/kimodo/llm2vec-text-bundle").
5. node config load: server_url/model/model_dir/text_bundle all required — missing any → fprintf + return -1 (loud fail).

### Full-repo sweep

After all patches, a repo-wide audit confirmed ZERO remaining hardcoded URL
endpoints, model names, or machine-specific filesystem paths across every
plugin's param schemas and config-load paths:

  comfyui_plugin.c  — server_url null + loud (prior patch), input_dir null + latent-seam guard
  kimodo_engine.c   — server_url/model/model_dir/text_bundle null + loud (this patch)
  trellis2/sam3/ffmpeg/echo — no hardcoded URL or path defaults

ctest 2/2, 100% (test_queue 24/0, test_queue_chaos 52/0).


---

## GAP-FIX PASS (stability + fault tolerance, 2026-08-30)

### Gap 1: GPU ticket ordering (server.cpp line ~1094)

The main completion path released the GPU FIFO ticket BEFORE marking the
slot th_done. All other release sites (spawn-fail, stop-early, dag-parse-
fail) correctly set th_done FIRST. The reversed order created a window
where the ticket was free but the slot looked occupied -- a concurrent
registrar could see all slots occupied and return spurious 503.

Fix: swap run_mark_th_done(idx) before gpu_ticket_release() so no window
exists where the ticket is free but the slot appears in-use.

### Gap 2: Exact error propagation (runner.c, 3 paths)

The resilience law requires every failing run to document the EXACT failure
message. Three runner setup error paths returned -1 without calling
runner_set_error_for_cb(), so run_thread_fn fell back to the generic
"pipeline execution failed" instead of the specific reason:

  Path A: !so_path (plugin not registered for type)
    -> now: "no plugin registered for type: <type>"

  Path B: plugin_load failure (dlopen failed)
    -> now: "plugin load failed: <so_path>"

  Path C: node_load failure (plugin params missing/invalid)
    -> now: "node_load failed for <node_id>: plugin params missing or invalid"

This means a comfyui run with server_url missing now documents
"node_load failed for generate: plugin params missing or invalid" in the
sidecar ledger instead of the generic "pipeline execution failed". The
kimodo plugin's loud failures at node_load also propagate correctly.

### Verification

test_queue        24/0   (unchanged)
test_queue_chaos  52/0   (unchanged -- no regressions)
ctest 2/2 100%

## 2026-08-30 production findings (THE LAST SIGNAL batch renders)

- F35 (process, not code): gateway launched with plain `&` died when the
  spawning bash tool shell was reaped — silent, no log lines. RESILIENCE LAW
  already mandates setsid; treat every gateway launch as `setsid nohup ...
  < /dev/null & disown`. Symptom: sidecar exists, status endpoint dead,
  ComfyUI idle.
- Batch yaml clip_index off-by-one: b2-b5 assumed 0-based slots; observed
  1-based (window N -> clip_0000N.safetensors). Rewired b2: load4->save8,
  b3: 8->12, b4: 12->16, b5: 16->18; b6 created (18->21). Also b2/b5 window4
  lacked SaveLatent injects (json hardcodes would overwrite clip_00004/2).
- ffmpeg_concat stitch stage fails ("moov atom not found" on
  /tmp/dsh_concat_*/in_000.mp4) even though all window mp4s are valid —
  final assembly therefore runs outside the stitch node (build_final_film.py).
  Root cause still open.
- Duration math: chained windows yield 102 new frames (124 - 22 pinned), so
  18 windows = 77.4s != 90s. Extended to 21 windows (plan21_extension.json).
- Tests do NOT pkill unrelated gateways (verified source); earlier "zombie
  test gateway" confusion came from ctest loops spawning their OWN ports.

## 2026-08-30 evening — film delivery findings (THE LAST SIGNAL delivered: 90.000s)

- F36 (QUEUE LANE violation): a pipeline yaml node MISSING its `type` field is
  not rejected at parse — the gateway registers the run and executes with
  type=(null), which wedges request handling (queue endpoint hangs; a restart
  is required). Repro: h3-timeline-b6 before the fix. Law says 4xx BEFORE
  registration. TODO: validate node types at yaml parse.
- Crash-after-terminal (root symptom still open): the gateway dies silently
  whenever a START arrives after a run has reached terminal state. Survived
  in production via gateway restarts between submissions (runner-side
  wait_gw + manual/operator restart). ~15 occurrences, always this pattern;
  never crashes mid-render, never on the first start of a fresh gateway.
- TTS speaker naming: audiocpp qwen3_tts CustomVoice validates speakers
  against talker_config.spk_id in the model config.json — lowercase snake
  case only (serena, uncle_fu, ono_anna). Display-case names ("Ono Anna")
  fail at exec time with "unsupported speaker".
- TTS artifact name is generate_audio.wav (no _0 suffix) unlike comfyui's
  windowN_video_0.mp4 convention.
- ffmpeg_concat stitch node still fails (moov atom on its temp copies);
  final assembly done outside the node by build_final_film.py (concat
  demuxer + re-encode, trim -frames:v 2160, adelay+amix dialogue).
- Delivered: productions/last_signal_90s/THE_LAST_SIGNAL_90s_FINAL.mp4
  (90.000s, 2160f @24fps, md5 57480044d740b8d10499ebc31a25db0b) +
  film_card.json reload record.
