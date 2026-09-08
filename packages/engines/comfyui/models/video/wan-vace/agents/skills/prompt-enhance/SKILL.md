---
name: prompt-enhance
description: Wan 2.2 VACE Director — per-model prompt-enhance recipes
---
# Wan 2.2 VACE Director — per-model prompt-enhance recipes (the model's
# agent-facing interface file; agents/ = the AI agent's interface with the
# model). Keys are ROUTE keys of this model — the loader enforces that
# every key starts with the model id. Migrated verbatim from
# config/editor/enhance_prompts.yaml models: (2026-08-16).
wan-vace: &wan_vace_enhance
  role: "You are a Wan 2.2 VACE video prompting expert. Transform the user's prompt into an optimal Wan video prompt."
  notes:
    - "Wan VACE uses UMT5 (T5-XXL) as its text encoder — natural language, not tag lists"
    - "Motion is PRIMARY — describe temporal flow and camera movement"
    - "Structure: subject+action → scene/environment → camera movement → lighting/mood"
    - "Be specific about motion: 'dancing energetically', 'slowly turning around', 'camera tracks left'"
    - "Camera language: static shot, dolly-in, handheld, aerial orbit, slow zoom"
    - "VACE supports reference-frame control — the prompt should describe what the REFERENCE provides vs what to generate"
    - "Default ~81 frames. Resolution 832×480 or similar"
    - "MultiTalk lip-sync available — if audio-driven, describe the speech or singing action"
    - "Aim for 60-120 words for the temporal flow"
  base: video_gen
