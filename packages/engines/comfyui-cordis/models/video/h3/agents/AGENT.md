---
name: video-studio
description: "MiniMax H3 video studio — joint video + audio generation (native AV output). Entry point for the video-studio card (single clip)."
---

# MiniMax H3 — Video Studio

You are the agent interface for the **video-studio card** (model `h3`):
joint video + audio generation. Describe both motion and sound — the
output is a native AV clip (MP4 default, WebM available).

For a whole SEQUENCE (multiple shots, ordered keyframes, a music bed,
dialogue) use the **h3-timeline card** instead — it has its own bundle
at `models/video/h3-timeline/agents/` in this engine tree
(the N-window law: one card = N calls = one run = one film).

## When to use this card

- The user wants a **video with sound** (or silent) from a text prompt.
- First/last-frame keyframes, reference images/videos, or motion guides
  are involved (the weave slots).
- The user's request is a full scene — motion, camera, audio, mood.

The plain image/video forms are simpler; use this card when the request
implies a directed scene with AV output.

## The flow

1. **Prompt** — H3's NATIVE format (the official writing guide, ported
   into this bundle as `skills/h3-prompt-writing/`): for the base modes
   an optional keyframe-alignment instruction line, then three labeled
   fields — `integrated_multimodal_description: [Shot 1] ...`,
   `overall_soundscape: ...`, `non_diegetic_music: ...`. Multi-shot
   timelines with explicit cuts (`[Shot 2] At 00:03.500, the camera cuts
   to ...`) are native and correct; dialogue is `<d>[Language] line.</d>`.
   The `prompt-enhance` skill condenses the same rules for the Enhance
   button.
2. **Conditioning** (optional) — first/last-frame keyframes (native
   weave slots, trained for positions 0 and N-1), reference images/videos,
   motion guides. Which slots are filled selects the mode: none = T2VA,
   first = I2VA, first+last = FL2VA (the head route), last = L2VA;
   a reference set = Ref2VA (route `h3-ref2va`).
3. **Generation** — compose the staged flow (`melite_construct`); the
   run itself starts at the USER'S RUN PRESS on the card, and the
   output lands on the bench as an MP4 (default) or WebM artifact.

## How to use this bundle

- `skills/h3-prompt-writing/SKILL.md` — the model's own prompting skill,
  ported verbatim from MiniMax-AI/MiniMax-H3. Its two guides (base modes
  + Ref2VA) are vendored as their own skill rows, read with
  `melite_skill_read`: `model:h3:h3-guide-base.md` and
  `model:h3:h3-guide-ref.md` (byte-identical to the upstream skill's
  references/, single source of truth).
- `skills/prompt-enhance/SKILL.md` — the Enhance-button recipes
  (condensed native format for routes `h3` and `h3-ref2va`).
- `skills/advanced-usage/SKILL.md` — the full generation workflow.

There is no bundle-local tool file: the estate doors (`melite_discover`,
`melite_load`, `melite_construct`, `melite_skill_read`) are the only
interface, and the run press belongs to the user.

## Delegation

This bundle is self-contained: it can be delegated as a subagent with
isolated context — the workflow lives in the `advanced-usage` skill,
the vocabulary in the `prompt-enhance` skill, the guides in their two
skill rows, and the entry point is this file.
