---
name: H3 Timeline
description: Multi-window H3 timeline — plan windows, seam them on last frames, split audio across generations, auto-stitch the final.
---

# H3 Timeline (multi-window)

The N-window law (operator order 2026-09-04): **ONE card = N calls = ONE run = ONE film**.
The card composes the entire multi-window film in a SINGLE ComfyUI
submission (`h3-film` skeleton, ONE `native.execute`). Every window
after the first chains from the previous window's AV latent tail via
`MotionContextSave` / `MotionContextLoadLatent` — the sound continues
across windows, not re-rendered as a sound-alike. The in-graph `Trim`
node strips the pinned head from the delivered file (match_tail
grid-snap, 0.00ms drift), and `ffmpeg_concat` stitches the pre-trimmed
windows with per-join loudness matching.

Skills: `timeline-craft` (window planning, seams, audio continuity,
budget). Run door: `POST /v1/flows/start {"model":"h3-timeline",
"seed":N, "params":{"calls":[{"text":...},...]}}` on `:33081` (canonical).
The lane runs N windows (any N, default templated 4) — fewer calls hold
the last on tail windows (an airlock hold), so three calls is legal.
