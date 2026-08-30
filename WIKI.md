# inference.cpp Wiki — Lessons Learned

Everything we learned building the video inference pipeline, action card
system, and queue-driven agent architecture. Last updated 2026-08-30.

---

## Table of Contents

1. [Architecture](#architecture)
2. [The Card Law](#the-card-law)
3. [Queue System](#queue-system)
4. [Gateway](#gateway)
5. [Model Selection](#model-selection)
6. [Serial GPU Law](#serial-gpu-law)
7. [Crashes and Fixes](#crashes-and-fixes)
8. [Private Data Gate](#private-data-gate)
9. [Common Pitfalls](#common-pitfalls)

---

## Architecture

### Components

| Component | Port | What it does |
|-----------|------|-------------|
| inference.cpp gateway | :18090 | Serves pipeline runs, drafts, status. Built from C++ in this repo. |
| ComfyUI | :18465 | Lazy-boots on first run. The GPU backend. |
| meld-assets MCP | :33081 (DEAD) | Old ray gateway. Retired. Do NOT target. |
| asset-queue | file-based | Requests in `game-kit/requests/{pending,active,done,rejected}/` |
| DSH web GUI | :3080 | Operator-facing interface. Model selected in GUI. |
| DSH headless | CLI | Consumer agents spawned by queue. Profile sets model. |

### Data Flow

```
Request YAML → queue pending → consumer claims → agent composes card
→ card door (draft → start) → gateway run → ComfyUI render
→ stitch + verify → deliver mp4 → complete via MCP → done/
```

---

## The Card Law

**Operator order, absolute: ALL inference goes through action cards.**

1. Compose via `build_pipeline` DSH tool (preferred) or POST
   `/v1/pipelines/drafts` (headless fallback).
2. Run via POST `/v1/pipelines/start` with `draft_id` — NEVER without
   a draft. The card door persists `{intent, stages}` → draftId, then
   start creates the run with `linked_draft` in card.json.
3. Poll `/v1/pipelines/status/<run_id>` until success/error.
4. Verify: stitch bytes > 100KB, ffprobe duration within 10% of spec.
5. Deliver: cp stitch to `game-kit/videos/<asset_id>.mp4`, sha256 first16.
6. Complete: MCP `complete_asset_request` with ABSOLUTE `game_path`.

**Why cards?** They're the queue-native interface. They appear in the
GUI as editable cards. They carry the draft linkage (proof of card-door
routing). They enforce serial GPU via the queue claim door.

**NEVER:**
- POST directly to `/v1/pipelines/start` (bypasses card door, no draft)
- Use MCP inference doors for video generation
- Use kimodo/BVH for video specs

---

## Queue System

### Structure

```
game-kit/requests/
  pending/     # Waiting for consumer
  active/      # Claimed by consumer
  done/        # Completed successfully
  rejected/    # Failed or requeued
  .consumer.lock  # PID-based lock file
```

### Request YAML Format

```yaml
schema: meld.asset-request/v1
id: req-YYYYMMDD-HHMMSS-<slug>
class: motion  # or props, icons, sprites, etc.
asset_id: <slug>
priority: P0
spec: '<description of what to make>'
```

### Consumer Lifecycle

1. **Kick** (`python3 scripts/kick_queue_consumer.py`):
   - Checks lock (PID alive check via /proc)
   - If no lock and pending requests exist, spawns headless DSH
2. **Consumer agent** (headless DSH session):
   - Probes gateway (:18090) — 10s timeout
   - Lists pending, reads YAML, checks class field
   - Non-motion/video: requeues with note
   - Motion/video: claims → card law → deliver → complete
3. **Self-chain**: consumer runs kick again if more video requests pending
4. **Cleanup**: always removes .consumer.lock as final step

### Key Scripts

| Script | Location | Purpose |
|--------|----------|---------|
| kick_queue_consumer.py | ray/scripts/ | Spawns the consumer agent |
| process_requests.py | ray/scripts/ | list/claim/complete/sweep/reject |
| asset_registry.py | ray/scripts/ | MCP server for meld-assets |
| mcp_asset_server.py | ray/scripts/ | MCP server process |

### Dead-Backend Law

When a backend probe fails: requeue the active request with a note naming
the dead backend, remove the lock, exit. NEVER churn against a dead port.

---

## Gateway

### Lifecycle

```
cd build && setsid nohup ./inference_cli serve --port 18090 \
  --plugin-dir . --catalog-dir .. > /tmp/inf39.log 2>&1 &
```

- Uses `setsid` — plain `nohup` children die with the spawning shell
- One active run at a time (FIFO ticket)
- ComfyUI lazy-boots on :18465 when first run needs it
- Runs outlive failures (resilience law)

### h3-timeline Card

The video generation pipeline:
- 4 windows + stitch
- Params: seed (42), fps (24), calls (text/beats/start/end per shot)
- `continue_from`: cross-run continuation via window1_load yaml swap
- Form spec: `plugins/comfyui/cards/video_timeline/form_video_timeline.yaml`

### Card Door

- POST `/v1/pipelines/drafts` → persists `{intent, stages}` → draftId
- POST `/v1/pipelines/start` with `draft_id` → run with `linked_draft`
- Draft files in `build/drafts/draft-*.json`

---

## Model Selection

### The PUX_MODEL Trap

The env var `PUX_MODEL=deepseek-chat` overrides the headless profile's
cordis.patch.yml model setting. When spawning headless DSH consumers:

- **NEVER** use `--patch infer/preset.yml` — it overrides the profile's
  model to deepseek-v3.2 (has quota wall)
- **DO** use just `dsh --profile headless <PROMPT>` — the headless
  profile's cordis.patch.yml correctly sets mimo-v2.5/opencode-go

### Profiles

| Profile | Model | Source |
|---------|-------|--------|
| headless | mimo-v2.5/opencode-go | cordis.patch.yml in profiles/headless/ |
| web | user-selected in GUI | No default override |
| infer preset | deepseek-v3.2 (BUG) | Preset overrides profile model |

### Quota

- opencode-go (mimo-v2.5): NO quota wall
- deepseek-v3.2: 5-hour usage limit, resets at HH:08:14 UTC
- The consumer MUST run on mimo-v2.5 to avoid quota death

---

## Serial GPU Law

**One active inference request machine-wide.**

Enforced at two boundaries:
1. **Queue claim door** (process_requests.py): one active claim at a time
2. **Gateway FIFO ticket** (/v1/pipelines/start): one active run

**Danger zone:** Two gateways active simultaneously = two independent
serial domains = the law breaks at the seam. This is why :33081 was
retired — if it came back while :18090 serves, both could load models
into the same ComfyUI, causing VRAM oversubscription → OOM or thrash.

---

## Crashes and Fixes

### Buffer Overflow (wf[4] fix)

**File:** `src/server.cpp`, line 799

**Bug:** `wf[3][640]` declared for 3 windows but the context-engine
loop iterated 4 windows → buffer overrun → fortify abort → gateway crash.

**Fix:** `wf[4][640]` + matching seam format with 4 slots
(`seam_w1` through `seam_w4`).

**Commit:** 3338ff1

### Seam Format Mismatch

**Bug:** Stitch format string had 3 seam slots but 4 args were passed
(window4 seam added by context engine but format not updated).

**Fix:** Updated format to `"seam_w1":"%s","seam_w2":"%s","seam_w3":"%s","seam_w4":"%s"`

### continue_from Validation

Buffers for realpath must be ≥ PATH_MAX (4096). The `__realpath_chk`
function aborts on any buffer < 4096 regardless of actual path length.

---

## Private Data Gate

The repo's pre-commit hook (gitleaks) blocks commits containing
absolute `/home/user` paths in tracked files.

**Rule:** No `/home/user` literals in committed code. Use:
- `Path.home()` in Python
- `str(Path(__file__).resolve().parent.parent)` for repo root
- Repo-relative paths (`game-kit/videos/file.mp4`) for game_path
- `<user-home>` placeholders in documentation

**The hook scans ALL staged files.** Even one flagged file blocks the
entire commit. Fix every occurrence before committing.

---

## Common Pitfalls

### 1. Consumer Dies Silently

**Cause:** Popen without `stdin=subprocess.DEVNULL` — the headless
dsh session waits on stdin and dies.

**Fix:** Always pass `stdin=subprocess.DEVNULL` in Popen calls.

### 2. Consumer Claims But Doesn't Dispatch

**Cause:** Agent reads spec, finds something "not dispatchable"
(absent production tree, wrong spec format), rejects without running
the card law.

**Fix:** Make the consumer prompt simpler — claim, then run the card
law unconditionally. Don't pre-judge dispatchability.

### 3. game_path Resolution

**Cause:** MCP server CWD = ray/. Relative paths resolve against
ray/, NOT against game-kit/ or meld/.

**Fix:** ALWAYS pass absolute game_path to `complete_asset_request`:
`/home/user/Documents/programs/ray/game-kit/videos/<file>`

### 4. Commit Fails (Private Data)

**Cause:** /home/user literals in tracked files.

**Fix:** Derive paths from `Path.home()` or `__file__`. Check
registry.yaml for delivery game_path entries.

### 5. Old Consumer Resurrection

**Cause:** Submit doors auto-kick `kick_queue_consumer.py`. Even after
killing the consumer process, the NEXT queue submit spawns a new one.

**Fix:** The kick script IS the respawn mechanism. Rewrite it to
match the current law (card law, no ray lanes). The script is the
source of truth for what the consumer does.

### 6. Pre-commit Hook Blocks

**Cause:** The gitleaks hook detects private data patterns in ALL
staged files, not just the ones you changed.

**Fix:** Scan with `bash .githooks/pre-commit` before committing.
Fix all flagged files, not just yours.

---

## Git History (Key Commits)

| Hash | Description |
|------|-------------|
| 081e7b09 | fix model: remove --patch infer/preset.yml |
| b4b89037 | fix spawn: unset PUX_MODEL |
| 92ddca86 | simplify consumer prompt |
| 84a5f1f0 | KILL-RAY: rewrite kick_queue_consumer.py |
| 3338ff1 | fix write-back: wf[3]->wf[4] + seam_w4 |
| 4b3dffb | context engine: window4 loop |

---

## The Kill-Ray Order

**Operator order (2026-08-30):** Ray's consumer machinery, class dispatch
table, and :33081 gateway lanes are DEAD — deleted from the code, not
disabled.

**What was killed:**
- Consumer persona ("game-kit asset-queue consumer for the ray (Melite) repo")
- Class dispatch table (props/icons/sprites → :33081 YAMLs)
- All :33081 gateway references in the consumer path
- The ray-era probe (model-catalog on :33081)

**What survived:**
- Queue infrastructure (file-based requests, process_requests.py, asset_registry.py)
- MCP server (mcp_asset_server.py) — serves the queue, not the lanes
- The kick script — rewritten as the card-consumer spawner

**Lesson:** "Kill ray" means the lane machinery, not the queue
infrastructure. The queue is the SSOT for asset requests regardless of
which repo hosts the scripts.

## DSH Headless Profile — Loading build_pipeline (SOLVED, 2026-08-30)

**Problem:** The headless consumer had no build_pipeline tool, so consumers
hand-rolled gateway JSON with curl — wrong shapes, lost timing context, 6.6s
videos where 15s was specified.

**Root cause:** build_pipeline comes from the @melite-plugin/dsh-tools cordis
plugin. The web profile loads it through dsh-web-ui-all's dependency tree. The
headless profile only loads its bundle list — and DSH bundles are **cordis
patch layers**, not npm dependency scanners. Being in node_modules does
NOTHING; a plugin loads only when a patch INSERTS it.

**The mechanism (see dsh-base/cordis.patch.yml):**

    - insert:
        - id: some-id
          name: '@package/plugin-name'   # resolved from install + profile node_modules
          config: {...}

**The fix — a shim bundle (dsh/melite-tools-shim/):**
- package.json: dsh.bundle.patch = "./patch.yml" (REQUIRED field —
  "dsh.bundle: true" is meaningless; the loader wants dsh.bundle.patch)
- patch.yml: TWO insert rows —
  1. @deepseek-ai/dsh-host-webserver with port: 0, host: '127.0.0.1'
     (OS assigns a free port; the plugin's webServer inject is satisfied)
  2. @melite-plugin/dsh-tools with gatewayUrl config
- Headless profile package.json: shim in dsh.profile.bundles + link: dep;
  melite-tools symlinked into the profile's node_modules/@melite-plugin/

**Cordis inject laws learned the hard way:**
- Property access ctx.webServer THROWS "cannot get property without inject"
  if not declared — even ctx.webServer?. (the proxy guards the getter)
- This cordis version has NO optional injects
- A required inject that no service ever provides = "entry did not activate"
- Solution: PROVIDE the service in the same patch (the webserver row above)

**Proof:** headless agent answered "build_pipeline, model_catalog" when asked
for its pipeline/catalog tools, then CALLED build_pipeline — a real draft id
came back. Consumer session shows 5 build_pipeline invocations; runs now carry
a proper calls document linked to a tool-composed draft.

**Lesson (operator order):** SOLVE IN TOOLS FIRST, PROMPTS LAST. Every prompt
rewrite (curl shapes, per-shot splitting) was a band-aid over a missing tool.
The tool composes correct shapes; the prompt only chooses content. A prompt
that references an unavailable tool is worse than none.

---


## Gateway Runs-Dir Scan Cap (2026-08-30)

**Problem:** The `/v1/pipelines/runs` endpoint silently caps at 256 directory entries.
Output dir has 5991+ runs. New runs (entry 257+) are invisible in the media tab.

**Fix:** Bumped `run_dir_ent ents[256]` and scan cap `n < 256` to 8192 in
`handle_pipelines_runs` (server.cpp lines 3090, 3095). Commit `1cf87ab`.

**Lesson:** Always check capacity limits when dealing with growing collections.

---

## Sidecar Format — Pretty-print vs Compact (2026-08-30)

**Problem:** Python `json.dumps(indent=2)` produces pretty-printed JSON with spaces
after colons. The gateway's `sidecar_str()` parser uses `strstr(""status":"")`
which requires compact JSON (`"status":"success"` not `"status": "success"`).

**Fix:** Write sidecars with `json.dumps(data, separators=(',', ':'))` (compact).

**Lesson:** The gateway's JSON parser is a hand-rolled strstr-based parser, not a
full JSON library. Field patterns must match byte-for-byte.

---

## ONE PATTERN — Unified Completion Response (2026-08-30)

**Problem:** `complete_asset_request` returned `{ok, asset, version}` — no artifact
URLs or paths. Callers got nothing usable back for video.

**Fix:** Added `artifact_urls` (map of name→gateway URL) and `game_path` to the
completion response. Same shape for images, video, audio, 3D. Commit `3adb5819`.

**The pattern:** Every completion returns artifact gateway URLs so the caller can
fetch any artifact directly. No special cases per asset type.


---

## The 6.6s Stub — Three Compounding Causes (2026-08-30, SOLVED)

Symptom: every queue render came out 6.656s regardless of spec duration.

1. **No tool** (fixed first): consumer had no build_pipeline -> hand-rolled
   curl bodies with no calls document -> default 4 x 1.66s windows.
   Fix: shim bundle (see SOLVED section above).
2. **Whitespace parser bug** (gateway): compile_calls_windows required
   byte-exact "text":" but json.dumps emits "text": " (space) -> tl_nw=0
   -> prompts AND lengths silently dropped. Fix: whitespace-tolerant parse.
3. **Seam-head law missing** (gateway): window*_t4 workflows Trim 22 pinned
   head frames on every seam window in-graph; the compiler computed
   lens = span only -> seam windows landed 22 frames short each
   (90+3x68=294 -> 12.32s on a 15s spec). Fix: seam windows render
   span+22 (or first_frame_prev_sec x 24 when the call declares it) so
   the trim lands the exact tile. Observed injects: 90,112,112,112 ->
   delivered 15s-class stitch.

Also: >4-call documents now reject LOUDLY (400 + split guidance) instead
of silently truncating to 4 windows — queue-lane law.

## Zombie Gateway Herd (2026-08-30, AGAIN)

Three inference_cli processes shared :18090 simultaneously (SO_REUSEPORT
semantics); requests were served by whichever old binary accepted first.
The seam-head fix "didn't work" for an hour because a 02:09-era process
was still answering runs.

**Why pkill kept failing:** pkill -f 'inference_cli serve' matches YOUR
OWN bash -c command string (it contains the pattern) and kills your own
shell mid-command, leaving the real gateways alive.

**The law:** kill by exact process name (pkill -9 -x inference_cli — no
-f), then VERIFY with ss -tlnp that exactly ONE listener holds the port
before believing any test result. NEVER pkill -x node on a DSH host —
the harness itself is node.

## CARD LAW MACHINERY (2026-08-30, PROVEN: 15.000s exact)

The full chain, proven end-to-end on chase-scene-15s-v8:
queue -> consumer -> skill_read(video-timeline) -> h3_timeline_card TOOL
-> start {yaml, name, calls, seed, fps, draft_id} -> card-linked run ->
exact-tile stitch (ffprobe 15.000000) -> deliver -> MCP complete.

Laws (all machinery, prompts can no longer break them):
1. PLUGIN SYSTEM: complex cards own their tools. tool.json sits BESIDE
   the card's form (plugins/<owner>/cards/<card>/); GET /v1/card-tools
   serves manifests; the DSH plugin registers one tool per manifest
   (src/tools/card-tools.ts). Adding a card = adding its dir. NO godfile.
2. CARD-LINKED RUNS: draft_id in the start body wins (with -1 stage
   suffix resolution); the hardcoded draft-timeline-h3 fallback fires
   only when no draft_id was sent.
3. CARD-EXECUTES: a body with draft_id but no calls loads the calls
   from the card document itself - the card IS the run definition.
4. 400 ON CARD-LESS TIMELINE RUNS: bare prompt/params.prompt2..4 bodies
   (consumer model improvisation, observed twice) are rejected loudly.
5. EXACT-TILE STITCH: ffmpeg_concat gained "spans" (per-input -t cut);
   the start door injects spans = ACTUAL tiles / fps. [SUPERSEDED
   2026-08-31 by the GRID LAW section below: the in-graph trim does NOT
   vary - it is exactly context_length; the 7-22f "variance" was grid
   round-up. Spans stay wired as a no-op safety.]
6. SEAM-HEAD RENDER LAW: seam windows render span + 19f (pv load) or
   +22f (default t4) - pv sets the motion pin, NOT the output length.
   [SUPERSEDED 2026-08-31: the pin is context_length frames exactly;
   sampled = tile + trim, on the H3 grid. first_frame_prev_sec is
   DELETED from the card schema.]
7. STRING-FORM CALLS: calls arrives either as array or JSON-encoded
   string; escaped quotes (") broke the parser silently -> 1.66s stubs.
   compile_calls_windows unescapes the string form first.
8. QUEUE SNAPSHOT ITERATION: consumer iterates the pending SNAPSHOT;
   a rejected request is skipped this pass. Loop-back-to-list caused
   head-of-line starvation (19 rejections of the-last-signal while v8
   waited behind it).
9. The concat plugin .so has NO cmake target - build it by hand:
   gcc -shared -fPIC -O2 -Iinclude plugins/ffmpeg/engines/concat/ffmpeg_concat_plugin.c -o build/ffmpeg_concat_plugin.so -lm

## THE 12-FRAME SEAM SKIP — GRID LAW (2026-08-31, SOLVED)

The seam the operator called "really bad, I don't think it even
exists": every join SKIPPED 12 frames of motion. Root cause chain,
proven from inf49.log + pack logs:

1. H3 core aligns EVERY clip length UP to the 17k+5 grid
   (align_frame_count in nodes_minimax_h3.py: 5, 22, 39, 56, 73, 90,
   107, 124 ...). The gateway injected span+trim (90+19=109); H3
   snapped 109 -> 124; the pack trimmed exactly 22 -> delivered 102;
   the concat span-cut chopped to 90. The film showed frames 0..111
   of a 124-frame sample; the next pin continued from frame 123.
   12 frames of motion vanished at EVERY seam.
2. FIX (grid law, src/server.cpp compile_calls_windows): the gateway
   now computes ON-GRID sampled lengths itself - window 1 samples
   snap(span, resid=5) (a 17k+5 value), seam windows sample
   tile + trim where tile = snap(span, resid=0) (multiple of 17) and
   trim = the pack's context_length WIDGET read from the seam
   template (tl_seam_trim) or the card's context_length override
   (never hardcoded - lane law). Injects: 90/107/107/107 for a
   90/85/85/85 film. The stitch spans are now the ACTUAL tiles
   (the cut is a no-op safety).
3. Composition law: 17k (tile) + (17m+5) (any pin window 5/22/39/56)
   = 17(k+m)+5 - every pin window keeps seam samples on-grid.
4. PROOF (run-6a94062c, chase_scene_gridlaw_v10): injects 90/107x3,
   pack logs "107 frame clip, trim 22" on all three seams, windows
   decode 90/85/85/85 EXACT, stitch 345f/14.375000s EXACT, seam
   diffs 5.4/2.8 vs motion baseline 2.6/2.2 (the old hard-cut seam
   measured 42.6). One join per film may still jump ~30 when the
   model pivots content at the first free frame - that is prompt
   authoring (the skill's "airlock" rule), not machinery.
5. tiling evidence line: "[timeline] grid law: trim=22 tiles=[...]
   sampled=[...] total=..." lands in the gateway log every run.

## THE MUXER'S -shortest FRAME THEFT (2026-08-31, SOLVED)

After the grid fix, seam windows delivered 84 frames, not 85. The
pack's match_tail audio was CORRECT (3.541656s = 85 frames - one
sample short); the comfyui plugin's ffmpeg mux ran -shortest, and AAC
encoder priming made the audio track a hair shorter in the muxer's
accounting -> the video stream was cut to 3.500s = 84 frames. ONE
frame eaten per seam window, deterministic.

FIX: video-mastered mux (comfyui_plugin.c): -shortest replaced by
-t <frame_count/fps>. The frame count is the truth; audio runs its
natural, hair-shorter length. v10 proves it: 85/85/85 windows.

## THE DEAD >4-CALLS COUNTER (2026-08-31, CAUGHT LIVE)

The >4-calls guard counted "start_frame" occurrences - but the key
is ELEVEN chars and the scanner advanced 10, then demanded ':' at
the final 'e'. total_calls read 0 on EVERY body: a 31-call document
QUEUED and silently truncated to the 4-window graph instead of
rejecting. Found by accident (a free "loader probe" with 31 calls
was expected to 400 and instead registered a run - stopped via the
stop door, 0.3s, then the counter fixed and re-proven: 6 calls ->
exact 400). LESSON: a guard that has never fired is not a guard -
probe it with the shape it exists to reject.

## PACK COEXISTENCE, NOT SUPERSESSION (2026-08-31, OPERATOR CORRECTION)

model.yaml declared MultiRef "SUPERSEDES h3_motion_context base
pack"; comfyui-setup.sh even disabled the base pack as a "conflict";
a later edit flipped to "MultiRef RETIRED". ALL WRONG - the packs
were never either/or. The seitanism fork is a SUPERSET built ON TOP
of the base pack: same four class names PLUS ~37 uniquely-named
additions (V2V latent motion transfer, masked/keyframed contexts,
music-video + AV-extension controllers, streaming VHS, de-rope
continuation).

Truth, verified from live object_info (Update 8, 5839d45):
- BOTH packs enabled: the four shared names (MiniMaxH3MotionContext/
  Trim/SaveLatent/LoadLatent) resolve to the BASE pack (loader
  iterates sorted dir names; ComfyUI-... registers before h3_...,
  so the base's mapping lands last and owns the keys - confirmed by
  signature: base's context_length is the ["22","5","39","56"]
  string combo, the fork's target_start is absent).
- The fork contributes all its extra nodes alongside.
- Every window*_t4.json graph edge validates against the combined
  node set (checked offline, free, no GPU).
Docs now state coexistence in model.yaml requires, extensions.yaml,
and comfyui-setup.sh verification (base pack CONFLICT check deleted).
Old disable_pack logic is gone; the fork clone was dirty with a
pre-Update-8 backport (archived to
custom_nodes/multiref_local_mods_20260830.patch) before pulling U8.

## THE STRING-WIDGET LOADER (2026-08-31, SOLVED)

tl_seam_trim read the template's context_length widget with
atoi(colon+1) - but the widget is a STRING ("22"), and
atoi(" \"22\"") is 0, read as absent -> "seam graph unreadable" 500
on any calls body without a card-level context_length (the consumer
hit it live on v9's first start and escaped via the card override -
the designed escape working as intended). FIX: scan the quoted value
(tl_scan_context_length) in the loader too. LESSON: ComfyUI combo
widgets are strings even when they carry numbers - never atoi a
widget value you have not type-checked.
