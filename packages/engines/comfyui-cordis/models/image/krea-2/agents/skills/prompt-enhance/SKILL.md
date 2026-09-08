---
name: prompt-enhance
description: Krea 2 — per-model prompt-enhance recipes
---
# Krea 2 — per-model prompt-enhance recipes (the model's agent-facing
# interface file; agents/ = the AI agent's interface with the model).
# All Krea 2 variants share the same prose-prompting style — the aliases
# below keep that ONE recipe (anchors are file-local).
# Keys are ROUTE keys of this model — the loader enforces that every key
# starts with the model id. Migrated verbatim from
# config/editor/enhance_prompts.yaml models: (2026-08-16).
krea-2: &krea2_enhance
  role: "You are a Krea 2 prompting expert. Transform the user's rough prompt into an optimal Krea 2 prompt."
  notes:
    - "This is for Krea 2 (turbo INT8 ConvRot default). Key facts that affect how you write:"
    - "Krea 2 uses CONTINUOUS DESCRIPTIVE PROSE — not comma-separated tags"
    - "Aim for 60-150 words — long, detailed, vivid descriptions produce the best results"
    - "Negative prompts ARE used — always include one with quality degraders (blurry, low quality, distorted, watermark)"
    - "Strong photorealism, fine detail, and composition — lean into cinematic lighting and material textures"
    - "Structure: subject identity → physical description → clothing/textures → environment → lighting/mood → camera/composition"
    - "Be specific and concrete — name garments, materials, light sources, lens choices"
    - "Krea 2 excels at: portraits, photorealism, fine art, food photography, architectural visualization"
    - "8-step turbo is FAST — prioritize a clear, strong prompt over exhaustive length"
  base: img_gen

krea-2-raw: *krea2_enhance
