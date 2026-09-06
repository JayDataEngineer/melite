# inference.cpp

A single-repo inference estate: action cards in, films (and stills, and
voice, and 3D mesh) out. The gateway is Python, stdlib-only (~500 LOC in
`py/gateway.py`), serial GPU FIFO, zero C obligations (`src/` is retired —
deleted 2026-09-02, the flip is complete, no twin, no transition, no
live C binary anywhere). The estate's own contract is pinned by the
golden wire files (`tests/golden_http/`) — the C-era quirks (capitalize,
variant `defaults: {}`, caps and precedence rules) are OUR format now, not
a reproduction of a dead server.

## Laws (carried verbatim from AGENTS.md — operator orders)

> Read [`AGENTS.md`](./AGENTS.md) first. The 8 operator orders below
> are the laws every doc and every test pins.

- **Inference Law (2026-08-29).** Every run through the queue; one active request machine-wide (serial GPU); the stop door interrupts the engine, never kills processes. Gateway restarts: OPERATOR ONLY on production deployments; THE DEV DSH LOOP at https://cloud.tailb1e597.ts.net:3909/ (operator order 2026-09-04) is the SANCTIONED EXCEPTION for testing estate changes.
- **Queue Lane Law (2026-08-30).** No legacy. No fallbacks. No hardcodes. Unresolved requests are rejected loudly before any run registers (4xx).
- **Resilience Law (2026-08-29).** A bad run never crashes the gateway. Failures document themselves in the sidecar ledger (`_flow.json`) and the queue continues. setsid for restarts; plain nohup dies with the shell.
- **Plugin Architecture Law (2026-08-31).** Lane logic lives in the plugin (Python plugin bus — `engines/<dir>/engine.py` + `compose/`); the core stays generic, names no lane, names no engine.
- **Python Shape Law (2026-09-03).** Classes = taxonomy + behavior; data = rows (not subclasses); schemas = frozen pydantic; closed vocab = enums; artifacts all-or-nothing; models don't render, cards do.
- **Extension Law (2026-09-03).** ComfyUI extensions declared, never vendored; `custom_nodes/` deleted; author packs live in `vendor/comfyui_extensions/<pack>`.
- **Provisioning Law (2026-09-03).** BYO verified, never installed; managed opt-in; `bootstrap.py` deleted; one interface, two choices.
- **C Retirement (2026-09-03).** No twin gateway; goldens are the estate's own contract.

---

## QUICK START

### 1. Provision (BYO ComfyUI + declarations)

Bring your own ComfyUI — anywhere (local, container, remote, cloud);
this estate sits on top and never installs one. The orchestrator is
`tools/provision.py`, driven through the MANAGEMENT environment
(comfy-mcp — the packages, in-process; `setup.sh` wraps the uv group):

```bash
./setup.sh verify        # config shape, live instance, comfy-cli routing
./setup.sh extensions    # declared packs: registry via comfy-mcp install_node,
                         # vendor packs symlinked from vendor/comfyui_extensions
./setup.sh models        # declared weights via comfy-mcp download_model,
                         # sha256-verified after
```

Endpoint + weights location are deployment config:
`plugins/engines/comfyui/data/comfyui_endpoint.json`
(`provision: byo|managed`, `url`, `boot_cmd`, `model_base_path`).

### 2. Serve the gateway

```bash
# python gateway, no build step — canonical port 33081 (systemd unit)
setsid nohup python3 py/gateway.py 33081 >> /tmp/gw.log 2>&1 < /dev/null &

# smoke: the queue answers, model catalog, refusal band (400 loud)
curl -s -o /dev/null -w '%{http_code}' http://localhost:33081/v1/queue        # 200
curl -s -o /dev/null -w '%{http_code}' http://localhost:33081/v1/health        # 200
curl -s -o /dev/null -w '%{http_code}' "http://localhost:33081/v1/model-catalog" # 200
curl -s -X POST -d '{}' http://localhost:33081/v1/flows/start           # 400
```

Every lane (model + card + templates + knobs) is a PLUGIN under
`plugins/` — the core names no lane. Adding a lane = adding a plugin
directory, never touching the gateway core.

### 3. DSH profile setup (the interactive studio)

```bash
# install the inference profile (tools + card view + gallery) into ~/.dsh
plugins/harness/dsh/install-profile.sh   # Linux / macOS
# (Windows bat deprecated; profile sources live in plugins/harness/dsh/)

# non-default gateway? export first (canonical :33081, manual :18201):
#   export MELITE_GATEWAY=http://localhost:33081      (bash)
#   set MELITE_GATEWAY=http://localhost:33081         (cmd)

# boot it
dsh web --profile inference --port 3081
```

The profile source lives in `plugins/harness/dsh/` (fully in git) —
the provisioner bundle (`provisioner/cordis.patch.yml`) declares every
row as a PACKAGE linked back into this repo, so rendered profiles and
`dsh plugin add` can never drift apart (template rendering was retired
2026-09-03). `install-profile.sh` is a thin shim onto the one renderer,
`provisioner/bin/infer-provision.mjs`, which materializes
`~/.dsh/profiles/inference/` and installs dependencies. Every session
on the profile gets the tool surface —
`lane_bundle` (list lanes / load a lane's manifest + skills),
`build_flow` (compose an action card), `model_catalog`,
`skill_index` / `skill_read`, `provision_model`, `enhance_prompt` —
plus the card deck / card view / gallery UI, whatever agent preset the
session uses. The agent flow:

```
lane_bundle()                  → list every lane
lane_bundle("image-gen")       → the lane's params_schema + skills
skill_read("model:krea-2:...") → the model's craft rules
build_flow("krea-2", ...)  → ONE action card in the chat
                                → you press Run; the queue renders
```

For multi-shot video the same session loads the `video-timeline` skill
(the calls document, the seam law, the grid law), refines your film
conversationally, and composes ONE card whose `calls` array carries
every shot:

```bash
# CARD BIRTH LAW: compose the card FIRST (POST /v1/flows/drafts mints
# the draftId), THEN start with the id on the envelope — a start
# without a doc-backed draft_id 4xxes BEFORE any run registers.
DID=$(curl -s -X POST localhost:33081/v1/flows/drafts \
  -H 'Content-Type: application/json' \
  -d '{"model":"h3-timeline","prompt":"one line",
       "params":{"calls":[{"text":"...","start_frame":0,"end_frame":90},
                          {"text":"...","start_frame":90,"end_frame":189}],
                 "fps":24}}' | python3 -c 'import json,sys; print(json.load(sys.stdin)["draftId"])')
curl -s -X POST localhost:33081/v1/flows/start \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"h3-timeline\",\"draft_id\":\"$DID\",\"prompt\":\"one line\",
       \"params\":{\"calls\":[{\"text\":\"...\",\"start_frame\":0,\"end_frame\":90},
                          {\"text\":\"...\",\"start_frame\":90,\"end_frame\":189}],
                 \"fps\":24}}"
```

Monitor `GET /v1/flows/status/<run_id>`; the run lands window MP4s +
a stitched final cut under `output/<run_id>/` (gateway-managed) or
`build/output/<run_id>/` (editor-managed; see docs/architecture/editor.md).

### 4. Competition artifacts (droppable workflow PNGs)

```bash
# The artifact tool now lives in the lane's compose package
# (the card owns its own artifact format — see card.py for the compose arm)
python3 -m plugins.engines.comfyui.compose.tools.competition_artifact <run_id>
```

One PNG per window — frame 0 with the EXACT executed graph embedded as
the `prompt` tEXt chunk. Drag onto the ComfyUI canvas and the workflow
rebuilds. (Path is lane-specific; the h3-timeline card renders its own
artifact — see `plugins/engines/comfyui/action_cards/video/h3-timeline/`.)

## Laws (carried verbatim from AGENTS.md — operator orders)

- **Inference through the queue, always.** Cards in (compose → gate →
  queue → GPU), stop door out. No direct generation calls.
- **No legacy. No fallbacks. No hardcodes.** Unresolved requests are
  rejected loudly before any run registers (4xx).
- **A bad run never crashes the gateway.** Failures document themselves
  in the sidecar ledger (_flow.json) and the queue continues.
- **Lane logic lives in the plugin** (Python plugin bus, not the dead
  C-ABI). The core stays generic: it resolves engine type FROM THE
  GRAPH and names no lane and no engine.
- **Python Shape Law (2026-09-03).** Classes = taxonomy + behavior; data
  = rows (not subclasses); schemas = frozen pydantic; closed vocab =
  enums; artifacts all-or-nothing; models don't render, cards do.
- **Extension Law (2026-09-03).** ComfyUI extensions declared, never
  vendored; custom_nodes/ deleted; author packs live in
  vendor/comfyui_extensions/<pack>.
- **Provisioning Law (2026-09-03).** BYO verified, never installed;
  managed opt-in; bootstrap.py deleted; one interface, two choices.
- **C Retirement (2026-09-03).** No twin gateway; goldens are the
  estate's own contract.
