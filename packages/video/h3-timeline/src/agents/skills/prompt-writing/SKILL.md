---
name: prompt-writing
description: "H3 call-text craft — the 90-word density floor, the four elements, the vendor camera verbs, the spoken form for dialogue, and the traps (rows are the voice; ref_audios is timbre). Deepens the drafting of a film's first call text."
---

# H3 prompt craft

The card composes the model's scaffolding for you (reference alignment, `[Shot n]` headers,
keyframe instructions). What is left is the **content of each call** — and that is where a film is
won or lost. This file is the whole craft in one page; no other document is needed.

## 1. Density — the measured law

The vendor's three complete examples in the H3 prompt guide carry **85 / 81 / 93 words at 5.2 / 8.0
/ 6.0 s** — flat in duration. That is the calibration.

- **Floor 90 words per call; target 95–128.**
- Under 90 words the model invents the missing detail: hair, garment, room, sound.
- The 350–500-word budget in the reference guide is the six-section rewrite **the card performs
  itself** — it is not a per-call number. Never inflate a call to reach it.

## 2. The four elements, in this order

Every call states all four. The order is the vendor's, and it is also how a director speaks.

| # | element | what it sounds like |
|---|---|---|
| 1 | **style line** — the medium, stated flat | "Live-action, cinematic, shallow depth of field." / "2D-animated, flat cel shading, clean line art." |
| 2 | **scene + subject** — wardrobe, hair, feet, the room, the light | "She stands on wet sand at dusk in a pale blue bikini, hair loose, salt drying on her shoulders." |
| 3 | **pose / motion continuity** — the shape she holds, restated every call | "She holds her weight on the left foot, right knee soft, arms low and open." |
| 4 | **camera + ambient sound** — a vendor verb, amplitude, speed, then the room tone | "The camera pushes in with small amplitude at slow speed toward her face; breakers, wind, wet sand underfoot." |

A call that states only (2) and (4) is a caption. The model fills the rest by inventing.

## 3. Camera vocabulary — a closed list

`Zoom In / Out`, `Push In / Pull Out`, `Pan Left / Right`, `Truck Left / Right`, `Tilt Up / Down`,
`Pedestal Up / Down`, `Arc Shot`, `Tracking Shot`, `Static Shot`, `Shake Slightly / Strongly`, `POV`,
`Roll Clockwise / Counterclockwise` — each `with small|large amplitude` and `at slow|fast speed`.

**"Pan up" is not a move.** A vertical scan of a standing body is `Tilt Up` or `Pedestal Up`; a pan
pivots horizontally. Write the move as an action inside the sentence, never as a label.

## 4. Never in call text

- `[Shot n]` headers or cut timestamps — the card writes them.
- "For the target video…", "How the reference pictures align…" — vendor scaffolding, the card's job.
- First-frame / last-frame language — pins ride the keyframes lane.
- **Spoken lines** — dialogue is a placed clip row (see the mode table at the end of this file).

A call stays ONE continuous action line. If it reads like a caption, it will be filmed like one.

## 5. Dialogue — the words move the mouth

Dialogue is a **placed clip**, not prose. An `audio_clips` row:

```json
{"id":"line-1","src":"<spoken asset>","start_frame":12,"dur_frames":91,"text":"I told you I would finish it before dawn."}
```

- `text` is the exact spoken words; `start_frame` / `dur_frames` are film coordinates.
- One lane per class per window; the row that STARTS inside a window owns that window's lane. A row
  crossing a seam continues but yields the next window to a row that starts inside it; two
  same-class rows starting inside one window refuse.
- The generated voice ducks under a conditioned row at `duck_depth_db` (default −14 dB).
- **To hear your own take, place the row.** Words in the prompt do not move the mouth.

The four dialogue modes — the dictionary at `packages/video/h3-timeline/src/agents/h3-prompt-dictionary.json` is the source and this
table is its rendering:

| mode | rides | derived by | verdict |
|---|---|---|---|
| `placed` | `audio_clips` rows | rows only | pressed — the row's voice is the film's voice |
| `referenced` | `audio_clips` rows + `ref_audios` | rows plus reference audio | closed — with rows placed the soundtrack measures identical; the reference adds nothing |
| `silent` | nothing | neither rows nor references | pressed — the window declares no dialogue |
| `ref-only` | `ref_audios` | reference audio only | closed — the model places the voices itself, measured 1.92 s late; never use it to time dialogue |

When the prompt itself must name speech, the vendor's spoken form is: speakers as `(S1)` / `(S2)`,
words **verbatim** inside `<d>[English] …</d>`:

```
<Subject 1> (S1) says: <d>[English] I told you I would finish it before dawn.</d>
```

Voice references are declared once and cited:

```
<Audio 1> is the voice-timbre reference for <Subject 1> (S1).
<Audio 1>: reference - the target speaker follows <Audio 1>'s voice timbre and measured delivery
without copying the original signal.
```

## 6. `ref_audios` is the voice seat, not a line

- It conditions timbre/prosody; the engine loads each clip **once per window** and mixes it
  **under** a conditioned row.
- With rows placed, the row's voice wins. Measured A/B (same seed, same rows): the soundtrack was
  indistinguishable — clip copy correlation 0.827 and 0.545 in both arms, window RMS agreeing to
  four decimals. The audio reference added nothing the row had not already set.
- Without rows, the model places voices itself — measured 1.92 s late, both voices inside a window
  that declared no dialogue. Do not use it to time dialogue.
- `ref_mods` is the identity **bake** (tight face crops), not one of the rails. Keep dialogue on rows.

## 7. The rails — feed by meaning, never by habit

- **Anchor** (`image`, or the keyframes lane): pins the opening AND conditions identity. Use for
  "animate this picture".
- **References** (`ref_images`, `ref_videos`): condition identity / style / motion without anchoring
  the opening. Use for "a film of this character".
- **Both at once is legal and often best**: an anchored opening plus identity references.
- A film ships with `ref_mods` carrying a tight **face crop** — it is the bake that keeps her across
  windows. `ref_images` is a generation rail; it does not survive the mod handoffs.
- One style line per film, repeated in every call; same seed for re-rolls of the same shot. A
  4–5 s call is the reliable unit on a single GPU; a 20 s film is four calls, not one.

## 8. Traps that cost a round each

1. **Stacked ghosts in the final window track the reference-audio arm.** If the last shot arrives as
   a collage of overlapping frames, check whether `ref_audios` was armed; the same prose without it
   stays clean (measured across four arms).
2. **A second dialogue mode will look plausible and measure the same.** One measured arm looked
   sensible, produced an indistinguishable soundtrack, and was retired; do not invent an
   alternative entry.
3. **A removal needs a next call that asserts it.** A garment removed in window k is invented back
   unless a later call states the new state ("the bikini bottoms are gone, they lie on the sand").
4. **The grid is not a suggestion.** First call `22+17k`, carried call `17k`; off-grid refuses. The
   seam default is context carry — never author `cut`.

## 9. Pre-press checklist

- [ ] every call ≥ 90 words, and states style, scene, pose, camera + sound
- [ ] the camera verb is in the closed list, with amplitude + speed (`Static Shot` is exempt from the amplitude/speed phrases)
- [ ] no `[Shot]`, no vendor scaffolding, no spoken words in call text
- [ ] every dialogue line is an `audio_clips` row with exact words and film-clock frames
- [ ] rails chosen by meaning (anchor / references / both); `ref_mods` carries the face crop

---

Vendor source for the camera and spoken-form shapes: MiniMax H3 prompt-writing references
(`base-en.txt` sections 4.3-4.4, `ref-en.txt` sections 2.4 and 5.2), upstream
`github.com/MiniMax-AI/MiniMax-H3/tree/main/skills/h3-prompt-writing/references`. The density
numbers and traps are measured on this estate; they supersede habits, not the vendor.
