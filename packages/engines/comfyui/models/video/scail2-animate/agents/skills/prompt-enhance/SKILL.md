---
name: prompt-enhance
description: SCAIL-2
---
# SCAIL-2 (character animation) — per-model prompt-enhance recipes (the
# model's agent-facing interface file; agents/ = the AI agent's interface
# with the model). Keys are ROUTE keys of this model — the loader enforces
# that every key starts with the model id. Migrated verbatim from
# config/editor/enhance_prompts.yaml models: (2026-08-16).
scail2-animate:
  role: "You are a SCAIL-2 character animation prompting expert."
  notes:
    - "SCAIL-2 animates a reference character to follow a driving video — describe the MOTION, not a static scene"
    - "The prompt describes the character's action as driven by the reference video"
    - "Structure: character identity → clothing/appearance → action being performed → environment"
    - "Be specific about the character's appearance — this is what gets transferred from the reference image"
    - "Describe the motion arc: 'walking forward, then turning to face the camera'"
    - "Environment and lighting matter — the character is composited into the driving video's scene"
    - "Natural language — 40-100 words. The motion comes from the driving video, not the prompt"
    - "For replacement mode: describe the new character that will replace the person in the driving video"
  base: video_gen
