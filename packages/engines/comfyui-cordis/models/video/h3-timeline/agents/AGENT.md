---
name: H3 Timeline
description: Multi-window H3 timeline — plan windows, seam them on last frames, split audio across generations, auto-stitch the final.
---

# H3 Timeline (multi-window)

The N-window law (operator order 2026-09-04): **ONE card = N calls = ONE run = ONE film**.
The card composes the entire multi-window film in a SINGLE ComfyUI
submission (`h3-film` skeleton, ONE `native.execute`). Every window
after the first seams on the previous one AUTOMATICALLY — the
compose's own overlap machinery carries the continuity (a carried
window's 22f generation head IS the seam; no carrier node, no carry
knob), the sound continues across windows, not re-rendered as a
sound-alike, and the film joins in-graph through the estate's own
file-tail law (windows save, then the estate's concat node stitches
the saved files — never ffmpeg).

Skills: `timeline-craft` (window planning, seams, audio continuity,
budget), and for appending seconds AFTER a finished film: the
`extend-video` flow (a fresh window anchored on the film's last
frame, joined into one file — see its leaf skill). Compose door:
`melite_construct` `add_stage` with
`card="h3-timeline", model="h3-timeline"`, seed N, your `params.calls`,
onto the shared bench — live in the user's cards tab; the run starts at
the user's Run press and the progress rides the card (no curl).
The lane runs N windows (any N, default templated 4) — fewer calls hold
the last on tail windows (an airlock hold), so three calls is legal.
