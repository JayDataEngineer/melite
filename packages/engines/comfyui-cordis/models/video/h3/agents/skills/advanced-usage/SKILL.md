---
name: advanced-usage
description: "Full h3-timeline workflow — pre-flight spec, AV call craft, conditioning seats, staging on the bench."
---

# H3 Timeline Workflow

## 1. Pre-flight — ALWAYS

Open the card with `melite_load` first. Its served doc carries the live
form fields + defaults; the compile layer rejects unknown params loudly,
so the loaded card IS the vocabulary.

## 2. The call — H3's native three-field format

H3 is a JOINT video+audio model: one call conditions both tracks. The
native shape (official guide, served as skill row
`model:h3:h3-guide-base.md`):

- `integrated_multimodal_description:` the timeline, written as PLAIN
  scene/action prose — one continuous action line per shot, a camera
  verb with amplitude + speed. The card composes the shot headers
  itself: NEVER author `[Shot n]`, "for the target video", or "how the
  reference pictures align" — the prompt dictionary refuses all three
  on sight (NO-VENDOR-SCAFFOLDING).
- `overall_soundscape:` ambient + action + non-verbal sound (1-4 sentences).
- `non_diegetic_music:` the score, or `N/A`.

Dialogue is `<d>[Language] the line.</d>` after the speaker is
introduced as `(S1)`. With keyframes, write the action so it fits the
pinned frames; alignment scaffolding is compose-owned, not yours.

## 3. Conditioning (optional)

- **Keyframes** — the keyframes lane pins ANY frame at ANY time
  (THERE IS NO FIRST FRAME NOR LAST FRAME, JUST ARBITRARY FRAMES
  WHENEVER); `image` is the frame-0 shorthand, `last_frame` a hidden
  alias for the final row.
- **Reference images / videos / audios** — anchor + refs combine on
  ONE window's seats (`ref_images` / `ref_videos` / `ref_audios`);
  media must be artifact ids from the editor's media library.

There is ONE lane: every composition — single shot, keyframes,
reference sets included — rides the timeline lane's windows. The
folded-lane variant routes (`h3-ref2va`, `h3-fl2va`, …) are RETIRED;
a draft naming one refuses LOUD at the run door. The live roster is
`h3-timeline` and `h3-singularity`.

The `h3-prompt-writing` skill carries the full guides; the
`prompt-enhance` skill condenses the same rules for the Enhance button.

## 4. Compose — the run is the user's

Stage the generation with `melite_construct` (`add_stage`, then
`patch`/`rewire` as the user refines); the flow lands live on the
shared bench in the user's cards tab. RUNS START AT THE USER'S RUN
PRESS on the card — never at yours. The finished MP4/WebM artifact
lands on the bench beside it.

## Gotchas

- `frames` ≈ seconds × the schema fps default (24 fps; 124 frames ≈
  5.17 s) — a clip's length lives in its calls' spans, not a film-level
  prompt field.
- `seed=42` is the catalog default; a fixed seed reproduces the clip.
- The timeline skills (persistent audio lane, beat/keyframe slots) belong
  to the editor UI — as the agent, compose the call + conditioning, not
  the timeline graph.
- A failed submission returns the compile-layer violation list — surface
  the actual error to the user, never a summary.
