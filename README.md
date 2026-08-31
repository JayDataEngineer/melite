# inference.cpp

A single-binary inference gateway in C/C++: action cards in, films out.
One text prompt → an embedded lane agent composes a video action card →
strict gate → serial GPU queue → stitched film. ComfyUI on one GPU does
the rendering; this gateway owns compose, validation, queueing, stitching,
and the run ledger.

## QUICK START

### 1. Self-bootstrap

```bash
# build the gateway
cmake -B build -DCMAKE_BUILD_TYPE=Release && cmake --build build -j

# point it at your ComfyUI (url, boot cmd, input dir)
#   plugins/comfyui/data/comfyui_endpoint.json
#   { "url": "http://127.0.0.1:18465",
#     "boot_cmd": "...", "input_dir": "/abs/path/to/comfyui-input" }

# serve (plugins + catalog live beside the binary's build dir)
cd build && setsid nohup ./inference_cli serve --port 18090 \
  --plugin-dir . --catalog-dir .. >> /tmp/gw.log 2>&1 < /dev/null &

# smoke: the queue answers, the card tools list
curl -s localhost:18090/v1/queue
curl -s localhost:18090/v1/card-tools
```

Every lane (model + card + templates + knobs) is a PLUGIN under
`plugins/` — the core names no lane. Adding a lane = adding a plugin
directory, never touching `src/`.

### 2. DSH + SKILL setup (the interactive studio)

```bash
# install the Video Studio agent preset + the video-timeline skill
./dsh/video-studio/install.sh

# start a DSH session and pick "Video Studio" in the preset picker.
# Non-default gateway? export MELITE_GATEWAY=http://host:18090 first.
```

That session is a live film studio: it loads the `video-timeline` skill
(the calls document, the seam law — PlagueKind chain spine + the
optional global layer — the grid law), refines your film
conversationally (shots, spans, seams, music layer on/off), and only
when you say go composes ONE action card:

```bash
curl -s -X POST localhost:18090/v1/pipelines/start \
  -H 'Content-Type: application/json' \
  -d '{"model":"h3-timeline","prompt":"one line",
       "params":{"calls":[{"text":"...","start_frame":0,"end_frame":90},
                          {"text":"...","start_frame":90,"end_frame":189}],
                 "fps":24}}'
```

Monitor `GET /v1/pipelines/status/<run_id>`; the run lands window MP4s +
a stitched final cut under `build/output/<run_id>/`.

### 3. Competition artifacts (droppable workflow PNGs)

```bash
python3 plugins/comfyui/engines/comfyui/tools/competition_artifact.py <run_id>
```

One PNG per window — frame 0 with the EXACT executed graph embedded as
the `prompt` tEXt chunk. Drag onto the ComfyUI canvas and the workflow
rebuilds.

## Laws

- **Inference through the queue, always.** Cards in (compose → gate →
  queue → GPU), stop door out. No direct generation calls.
- **No legacy. No fallbacks. No hardcodes.** Unresolved requests are
  rejected loudly before any run registers.
- **A bad run never crashes the gateway.** Failures document themselves
  in the sidecar ledger and the queue continues.
- **Lane logic lives in the plugin.** The core stays generic
  (`card_compose` C-ABI; the server reads the engine type from the
  graph).
