---
name: inference-cards
description: Drive the local inference gateway (inference.cpp) REST API from any DSH session - pick the lane, fetch its bundle, compose the card, submit through the queue, poll for the artifact. Use when the user wants ANY generated asset (image, video, TTS, SFX, music, 3D mesh, motion, character) produced by the local gateway.
---

# inference-cards — agent recipe for the inference gateway

This skill ships IN THIS REPO, under ".dsh/skills/". Any DSH session
started inside the repo sees it automatically — clone = installed.

The gateway is a local REST server (inference.cpp, py/gateway.py). You call it with
bash + curl. No MCP — plain HTTP. ALL inference goes through its QUEUE
(serial GPU). Never bypass it.

## 0. Find the gateway

Canonical port is 33081 (systemd unit scripts/inference-gateway.service):

    curl -s http://127.0.0.1:33081/v1/health

Manual runs may use 18201. If the gateway is NOT running: STOP — gateway
restarts are operator-only. Ask the operator to start it. Do not boot
it yourself.

## 1. Pick the lane (what did the user ask for?)

    video-gen   video clips (H3 joint video+audio) - h3-timeline card
    image-gen   images/sprites/concepts (krea-2, anima, ideogram, z-image)
    image-edit  1:1 ray-guided image edits
    tts         spoken VO lines
    sfx         sound effects
    voice-lock  design/lock a custom voice
    music       structured music
    3d-gen      TRELLIS meshes from concepts (somax, mask-studio)
    motion-gen  body motion from text
    body        full character body assets
    humanoid-flow / non-humanoid-flow   curated multi-step pipelines

## 2. Fetch the lane manifest (the lane ENTIRE surface)

    curl -s "http://127.0.0.1:33081/v1/lane-bundle?lane=video-gen" | jq .

Returns lane, params_schema (your input contract), and the lane skills.
Read the lane AGENT.md at plugins/<owner>/action_cards/<genre>/<card>/AGENT.md
for param laws (sizes, seeds, frame grids). The old /v1/cards/<lane>/bundle
route is RETIRED (interlock: the bundle is now served by the gateway's
lane resolver, not by a card-specific endpoint).

## 3. Compose a card, then start it through the queue

Compose (draft door — returns draftId, does NOT execute):

    curl -s -X POST http://127.0.0.1:33081/v1/pipelines/drafts \
      -H 'content-type: application/json' \
      -d '{"intent":"...","stages":[{"card":"h3-timeline","params":{...}}]}'

Start (queue door — the run registers; the draft carries the params):

    curl -s -X POST http://127.0.0.1:33081/v1/pipelines/start \
      -H 'content-type: application/json' \
      -d '{"yaml":"h3-timeline","draft_id":"<draftId>","prompt":"<tag>"}'

Unresolved requests are 4xx-rejected BEFORE registration — read the
error, fix the card, resubmit. Never retry blind. Name things
explicitly; there are no default models.

## 3b. OR delegate to the lane specialist (agent mode)

When you have intent but not parameters ("raspy villain VO line"):

    curl -s -X POST http://127.0.0.1:18090/v1/cards/tts/agent \
      -H 'content-type: application/json' \
      -d '{"prompt":"<what you want, natural language>"}'

Returns session, lane, log, prompt. The gateway spawns an isolated
lane session that composes ONE card; the gateway AUTO-ARMS the run
itself. Tail the log it names, then poll the queue.

## 4. Poll and deliver

    curl -s http://127.0.0.1:18090/v1/pipelines/status/<run_id> | jq .
    curl -s http://127.0.0.1:18090/v1/queue | jq .

Deliver the artifact path from the status response. On error: report
the sidecar EXACT error message — it names the failing node.

## 5. Stop

    curl -s -X POST http://127.0.0.1:18090/v1/pipelines/stop/<run_id>

Never kill processes. The stop door interrupts the render cleanly.

## LAWS (AGENTS.md — violations break the GPU queue)

- ALL inference through the queue. Never /generate or direct engine calls.
- ONE active run machine-wide (serial GPU). Queue the rest.
- No fallbacks, no default models: name the pipeline explicitly.
- Gateway restarts: operator only.

## GUI integration (already in this repo)

dsh/melite.yml wires the card deck, gallery, and lane tools into
dsh web against port 18090:  dsh web --patch dsh/melite.yml
