---
name: character-vo
description: Character voice lines via qwen3-tts CustomVoice — preset speaker or designed persona, locked instruct DNA per character, one line per render.
---

## Voice identity
One voice per character. Cast once, then lock it: the character's
instruct DNA carries WHO they are (timbre, attitude, baseline read) and
rides EVERY line; the per-line instruct carries only the emotion
("surprised, warming into relief"). Casting obeys the speaker-gender
law below.

## The speaker-gender law
A preset speaker is a BODY — cast it to match the character. The nine
presets, in their lowercase wire spellings (the schema walk is
case-anchored — a Title-Case spelling refuses): **female** =
`vivian` (bright, slightly edgy young female),
`serena` (warm, gentle young female),
`ono_anna` (playful Japanese female, light and nimble),
`sohee` (warm Korean female, rich emotion); **male** =
`uncle_fu` (seasoned male, low mellow timbre), `dylan` (youthful Beijing
male, clear and natural), `eric` (lively Sichuan male, husky brightness),
`ryan` (dynamic male, strong rhythmic drive, English), `aiden` (sunny
American male, clear midrange). Pick gender first, then
language/accent, then timbre — and never cast a woman on a male preset
or the reverse.

## Casting a voice (the qvoice seats)
The save and load ride the tts card's mod bags:
- **Save**: `save_qvoice: true` (the presence stamp — the mod IS the
  save; no toggle, no knobs) plus `voice_name` (OPTIONAL — empty or
  absent and the build mints a unique `.qvoice` name, landing under the
  voices root) plus the lane's `design_prompt` (the persona description
  — WHO speaks). Any lane fires the export.
- **Perform**: `qvoice: [{ qvoice: '<path>.qvoice', voice_strength: 1 }]`
  with NO voice stated — a loaded persona owns the timbre and takes the
  qvoice branch before the speaker row is ever read; a preset and a
  saved persona never ride together; the Base lane clones ref_audio
  instead.

## Run
Compose the tts card onto the shared bench via `melite_construct`
`add_stage` — the run starts at the user's Run press and the progress
rides the card.

## Deliver
Audio lands in the run's output tree; copy to whatever delivery tree
the project directs.
