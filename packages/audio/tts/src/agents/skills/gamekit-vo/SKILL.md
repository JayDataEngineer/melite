---
name: gamekit-vo
description: Character VO lines via qwen3-tts CustomVoice - preset voice + locked instruct DNA per character, one line per brick.
---

## Voice identity
One voice per character. Current cast: **scavenger** = voice `aiden` +
instruct DNA "weathered desert survivor, low gravelly timbre".
Per-LINE instruct carries only the emotion ("surprised, warming into relief").

## Casting a voice (the qvoice seats)
The retired flat door (`export_qvoice: true`) is GONE — the save and load
ride the tts card's mod bags (022's receipt: the grammar rides melite_load's
mods line):
- **Save**: `save_qvoice: true` (the presence stamp — the mod IS the
  save; no toggle, no knobs) plus `voice_name` (OPTIONAL — the Design
  mod's name popup; empty or absent and the build mints a unique
  `.qvoice` name for the run, landing under the voices root) plus the
  lane's `design_prompt` (the persona description — WHO speaks). Any
  lane fires the export.
- **Perform**: `qvoice: [{ qvoice: '<path>.qvoice', voice_strength: 1 }]`
  with `voice: "none"` on the CustomVoice lane (a preset and a saved persona
  never ride together; the Base lane clones ref_audio instead).

## Run (queue door — the only inference door)
Gateway: in-process estate lanes (DSH host; no port — the python gateway is retired).

Cast voice:
Compose via `melite_construct` `add_stage` onto the shared bench — the run
starts at the user's Run press.

Raw TTS (no cast):
Compose via `melite_construct` `add_stage` onto the shared bench — the run
starts at the user's Run press.

The progress rides the card (the user watches it run).

## Deliver
WAV/FLAC -> `data/delivery/unity/audio/vo/<character>/`, manifest rows.
