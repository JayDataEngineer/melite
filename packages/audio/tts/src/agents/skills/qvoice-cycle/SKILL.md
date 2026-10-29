---
name: qvoice-cycle
description: Design a character's voice once (VoiceDesign → .qvoice), then perform any line in that voice with an emotion direction on top (CustomVoice). Two phases, one locked identity — the save→perform cycle, its grammar, its refusals, and the address law.
genre: audio
---

# The voice-lock cycle

> VERIFIED LIVE 2026-11-12 against receipt `contracts/receipts/2026-11-12-cards-tts-qvoice-cycle-skill.md` (runs run-7ff0c865a624-871abb91 save + run-8591a6002407-876c85d0 perform — the two-artifact save, the locked-identity perform, the byte-identical PCM re-render run-e172061d383e-876d9b23, and the measured emotion ladder through run-03104187538c-877eea98, with the post-fix wire proven clean on run-d0f67aab33b4-891adb3e).

A character is made ONCE and performed MANY times. Phase A builds the
voice from a description and saves it as a `.qvoice`. Phase B performs
that file under an emotion instruct. The `.qvoice` owns WHO; the
instruct owns HOW. (The lock law itself — same file, same voice, every
render — and the persona/preset pairing rule live in AGENT.md and
melite-voice; this skill owns the CYCLE: what lands where, in which
grammar, and what each refusal is telling you.)

## THE ADDRESS LAW (read this first — the trap is cured, know it anyway)

`qwen3-tts` is the FAMILY and it is ALSO the 0.6B CustomVoice cell's
route name — historically, stating the family bought the small cell
(which declares **no `style_instruction`**) while every doc promised
the 1.7B. That trap is FIXED at the resolver: the family head now
resolves the **1.7B** cell (pool-first), and reaching the 0.6B cell
REQUIRES a stated `quant: "0_6b"`. Safe spellings today:

| half | `params.model` | `variant` | resolves to |
|---|---|---|---|
| A. design + save | `"qwen3-tts"` | `"voicedesign"` | 1.7B VoiceDesign |
| B. perform | `"qwen3-tts"` (head, pool-first) or `"qwen3-tts-voicedesign"` (explicit route) | `"customvoice"` | 1.7B CustomVoice |
| small cell (rare, deliberate) | `"qwen3-tts"` + `quant: "0_6b"` | `"customvoice"` | 0.6B CustomVoice — no style control |

If a style instruction ever refuses with "fires nothing on this lane",
you are on a cell without instruction control — check what resolved,
not what you stated.

## PHASE A — make the voice (once per character)

```json
{
  "model": "qwen3-tts",
  "variant": "voicedesign",
  "design_prompt": "A regal woman in her late thirties. Warm contralto with a smoky edge, low and unhurried, each word placed with royal finality. Slight rasp on the consonants.",
  "text": "The dead know better than to knock uninvited.",
  "save_qvoice": true,
  "voice_name": "hecate-01"
}
```

- `design_prompt` describes **who speaks** — age, gender, texture,
  pitch, cadence, breath. NEVER the emotion of a line ("furious",
  "sad") — that is Phase B's job and baking it in poisons every
  future line.
- `voice_name` is the character's identity forever and is
  **single-tenant**: mint a fresh name per character, never reuse one
  from an earlier session (newest-wins copy arbitration).
- THE TWO-ARTIFACT SAVE: the save emits a preview FLAC **plus**
  `/mnt/data/models/audio/voices/<voice_name>.qvoice` — BOTH must
  land. The FLAC is the audition; the `.qvoice` is the asset.
- Verify the asset: file exists, magic `QVOICE-LITE` (or
  `QVOICE-WDELTA`), ~20 KB.

## PHASE B — perform the voice (every line)

```json
{
  "model": "qwen3-tts",
  "variant": "customvoice",
  "text": "You dare enter my hall uninvited? The dead know better! Get out! GET OUT!",
  "qvoice": "/mnt/data/models/audio/voices/hecate-01.qvoice",
  "style_instruction": "FURIOUS. Screaming at the top of her lungs, voice cracking, explosive, spitting each word."
}
```

THE BARE-PATH GRAMMAR (the qvoice mod bag accepts three spellings):

- a bare string — `"qvoice": "/mnt/.../hecate-01.qvoice"` (or just
  `"hecate-01"`; the voices directory resolves bare names)
- a one-element array of the same — `"qvoice": ["hecate-01"]`
- a row with the lock strength — `"qvoice": [{ "qvoice": "hecate-01",
  "voice_strength": 1 }]` (omit `voice_strength` to leave the default)

THE NAME MAPPING (one knob, two engine pins): the card's
`style_instruction` knob maps to the engine's `instruct` on every
synthesis lane (generate/preview); only the export arms read
`style_instruction` directly. You always state `style_instruction`;
the card performs the mapping.

## THE SPEAKER LAW — a preset can NEVER ride with a `.qvoice`

There is no upstream `speaker` argument on the clone path, so the
preset seat is INERT beside a persona. The pair now REFUSES LOUD at
compose (`params 'voice' and 'qvoice' fire together`) and the panel
never stamps a preset onto a persona-carrying run — but do not state
one, and do not believe a preset you see beside a `.qvoice`. If a line
needs a DIFFERENT character, mint a second `.qvoice` — never try to
steer one with a preset.

## THE EMOTION LADDER (measured on one saved voice, same seed)

| instruct | F0 median | pitch range | loudness | use for |
|---|---|---|---|---|
| (none) | 170 Hz | 87 Hz | 0.068 | neutral read |
| "cold and imperious, slow and deliberate" | 170 Hz | 83 Hz | 0.056 | menace, dismissal, dead calm |
| "FURIOUS. screaming, voice cracking, explosive" | 231 Hz | 204 Hz | 0.094 | rage, command, breaking point |

Direction is honoured faithfully — write the delivery physically
(pitch, volume, pace, breath, cracking), not abstractly ("be angry").

## REFUSALS AND THEIR CURES

| refusal | cure |
|---|---|
| `params 'voice' and 'qvoice' fire together` | ONE voice performs — drop the preset or the `.qvoice` |
| `'style_instruction' fires nothing on this lane` | the resolved cell has no instruction control — the 0.6B cell (or a lane mismatch); check the address law above |
| `'design_prompt' missing or empty` | Phase A requires the description — state it |
| `preview_voice: not a .qvoice file` | the path is not a saved persona (check the magic bytes) |
| `'qvoice' is the 'qvoice' mod field of family …` | the field belongs to another family's lane — state `params.model` on the named family |

## THE LOCK, AND HOW TO CHECK IT

The seed derives from the `.qvoice` **path**, so the same file + same
text + same instruct reproduces the same audio (never state a `seed`
for a character's lines unless asked — a stated seed overrides the
lock). Determinism is checked on **decoded PCM**, never on FLAC file
bytes: the container carries per-run metadata, so two byte-different
FLACs can be the identical render — decode first
(`ffmpeg -i out.flac -f s16le - | md5sum`), then compare.
