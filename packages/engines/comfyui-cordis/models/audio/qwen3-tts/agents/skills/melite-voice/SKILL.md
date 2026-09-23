---
name: melite-voice
description: Voice-actor line generation — the character instruct (VoiceDesign) feeds the emotion instruct (CustomVoice); qvoice locks the voice between them.
---

Character/VO lines via qwen3-tts. Live-proven pattern.

## THE BIG MODEL LAW

ALWAYS the 1.7B (`qwen3-tts-voicedesign`) — the default on every
door. The 0.6B is a fallback, never an unprompted choice. Base =
clone from a 3-second reference, nothing else.

## THE FLOW (character instruct INTO emotion instruct)

- The CHARACTER half designs WHO: on the VoiceDesign variant, the
  persona description (design_prompt) + voice_name export a .qvoice
  (the qvoice_save mod) — build each character once, reuse forever.
- The EMOTION half performs HOW: on the CustomVoice variant, the
  saved .qvoice performs the line (the qvoice mod) with
  instruct-text emotion riding on top ("delivered exhausted,
  half-whispered, after the fight"), never by rewriting the line.
- The .qvoice is the lock between them: same file, same voice, every
  line.

## Pattern

- One line per run; batch a script as sequential runs. Keep lines
  < ~20s of speech.
- Iterate: adjust the emotion instruct first; rebuilding the
  character is a NEW voice, not a tweak — do it only when the voice
  itself is wrong.
