---
name: melite-music
description: Structured music generation lane — three-section captions (Genre/Vocal Details/Arrangement) with tagged lyrics and length presets.
---

Music via the music3 lane. Live-proven pattern.

## Caption structure (all three sections, plain text lines)
- Genre: 2-4 style tags + era/production flavor ("dark synthwave, 1985 analog production").
- Vocal Details: instrument-ish description of the voice ("airy female alto, heavy reverb tail") or "instrumental, no vocals".
- Arrangement: instrumentation timeline ("entrance: sub bass pulse; mid: gated snares; outro: tape stop").

## Lyrics law
Tagged sections: [Intro] [Verse 1] [Chorus] [Verse 2] [Bridge] [Outro]. Match the Arrangement timeline order.
Presets: draft_short (iteration), song (standard), final_long (delivery). Iterate on draft_short; only final render at song/final_long.

## Run door
Start it with `melite_flow` (`card="music", model="music3"` + your
caption/arrangement params — no curl, the `:33081` door died with
the gateway); poll `run_status` for the receipt. One style per run; variations = new seeds/captions, not param salad.
