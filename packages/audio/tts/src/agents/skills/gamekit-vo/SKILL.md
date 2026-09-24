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
- **Save**: `qvoice_save: [{ voice_name: '<char>_v1', temperature: 0.7, seed: -1 }]`
  plus the lane's `design_prompt` (the persona description — WHO speaks).
  Any lane fires the export; the `.qvoice` lands under the voices root.
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
