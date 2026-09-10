---
name: gamekit-music
description: Survival theme music via ace-step - three-section structured caption; draft_short iterate, final_long deliver.
---

## Caption contract (90% of quality)
Plain `Label: text` lines, exactly three sections:
Genre (2-4 tags + era) / Vocal Details (or "instrumental, no vocals") /
Arrangement (instrumentation timeline, bpm, key).

## Run (queue door — the only inference door)
Gateway: in-process estate lanes (DSH host; no port — the python gateway is retired).
Run via the estate tools (melite_flow) — same verb, in-process.
Poll `GET /v1/flows/status/<run_id>`. Iterate ONLY on `preset: draft_short`;
render `final_long` once the caption is locked. Variations = same caption, new seeds.

## Gotcha
The status endpoint may list NO artifacts while the FLAC lands in the run dir -
trust disk (`ls data/runs/<run_id>/`).

## Deliver
FLAC -> `data/delivery/unity/audio/music/`, manifest row appended.
