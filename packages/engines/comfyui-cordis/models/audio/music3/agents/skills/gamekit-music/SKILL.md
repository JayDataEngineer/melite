---
name: gamekit-music
description: Survival theme music via music3 - three-section structured caption; draft_short iterate, final_long deliver.
---

Deploy: `./setup.sh extensions` (declared packs: registry via comfy-mcp `install_node`; vendor packs symlinked from `vendor/comfyui_extensions/`). No `sync.sh` — the EXTENSION LAW (extensions DECLARED, never vendored) replaces the C-era `sync.sh` ritual.

## Caption contract (90% of quality)
Plain `Label: text` lines, exactly three sections:
Genre (2-4 tags + era) / Vocal Details (or "instrumental, no vocals") /
Arrangement (instrumentation timeline, bpm, key).

## Run
Compose with `melite_construct` `add_stage`, `card="music",
model="music3"` + your caption and `preset` (no curl); the run starts at the user's Run
press, the progress rides the card.
Iterate ONLY on `preset: draft_short`; render `final_long` once the caption
is locked. Variations = same caption, new seeds.

## Gotcha
`run_status` may list NO artifacts while the FLAC lands in the run dir -
trust disk (`ls data/runs/<run_id>/`).

## Deliver
FLAC -> `data/delivery/unity/audio/music/`, manifest row appended.
