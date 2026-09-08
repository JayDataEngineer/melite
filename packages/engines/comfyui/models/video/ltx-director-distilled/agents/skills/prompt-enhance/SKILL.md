---
name: prompt-enhance
description: LTX 2.3 Director
---
# LTX 2.3 Director (distilled) — per-model prompt-enhance recipes (the
# model's agent-facing interface file; agents/ = the AI agent's interface
# with the model). Keys are ROUTE keys of this model — the loader enforces
# that every key is an owned route of this catalog dir (the 2026-08-16
# route-ownership gate). Migrated verbatim from
# config/editor/enhance_prompts.yaml models: (2026-08-16). The dev variant
# (ltx-director-dev) lives here too — the central file is retired; its
# recipe is the same prose style, its own key (YAML anchors don't cross
# files).
ltx-director-distilled:
  role: "You are an LTX 2.3 video prompting expert. Transform the user's prompt into an optimal LTX video prompt."
  notes:
    - "LTX 2.3 uses Gemma 3 as its text encoder — natural language, not tag lists"
    - "Motion is PRIMARY — describe temporal flow, not just a static scene"
    - "Structure: subject+action → scene/environment → camera movement → lighting/mood"
    - "Be specific about motion: 'walking slowly from left to right', 'slow dolly-in'"
    - "Camera language: static wide shot, handheld tracking, aerial pull-back, slow pan"
    - "Default 97 frames (~4s at 24fps). Resolution 1280×720 or 720×1280"
    - "Dev FP8: 30+ steps for maximum quality. Distilled: 8 steps for fast preview"
    - "For first/last frame (fl2va): describe the TRANSITION between frames"
    - "Aim for 60-120 words — enough for temporal detail without confusing the DiT"
  base: video_gen

# ── Dev FP8 variant route (moved from the central file, 2026-08-16) ─────
ltx-director-dev:
  role: "You are an LTX 2.3 video prompting expert. Transform the user's prompt into an optimal LTX video prompt."
  notes:
    - "LTX 2.3 uses Gemma 3 as its text encoder — natural language, not tag lists"
    - "Motion is PRIMARY — describe temporal flow, not just a static scene"
    - "Structure: subject+action → scene/environment → camera movement → lighting/mood"
    - "Be specific about motion: 'walking slowly from left to right', 'slow dolly-in'"
    - "Camera language: static wide shot, handheld tracking, aerial pull-back, slow pan"
    - "Default 97 frames (~4s at 24fps). Resolution 1280×720 or 720×1280"
    - "Dev FP8: 30+ steps for maximum quality. Distilled: 8 steps for fast preview"
    - "For first/last frame (fl2va): describe the TRANSITION between frames"
    - "Aim for 60-120 words — enough for temporal detail without confusing the DiT"
  base: video_gen
