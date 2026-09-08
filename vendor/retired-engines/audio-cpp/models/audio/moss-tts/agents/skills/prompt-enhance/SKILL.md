---
name: prompt-enhance
description: MOSS-TTS — per-model prompt-enhance recipes
---
# MOSS-TTS — per-model prompt-enhance recipes (the model's agent-facing
# interface file; agents/ = the AI agent's interface with the model).
# Keys are ROUTE keys of this model — the loader enforces that every key
# starts with the model id. Migrated verbatim from
# config/editor/enhance_prompts.yaml models: (2026-08-16).
# The prompt is the TEXT TO SPEAK — both routes share the text-cleaner recipe.
moss-tts: &moss_tts_enhance
  role: "You are a TTS text cleaner. Polish the user's text for speech synthesis."
  notes:
    - "The words are the payload — this is NOT a creative rewrite"
  base: audio_speech
moss-tts-local: *moss_tts_enhance

# ── Central-file route (2026-08-16 central-file retirement) ─────────────
# moss_voicegenerator (audio/moss-tts/variants/voicegen — the underscore
# id IS the tree-promoted variant route key). Same text-cleaner recipe.
moss_voicegenerator: *moss_tts_enhance

# ── Shared blocks (reserved map, merged tree-wide) ──────────────────────
shared:
  audio_speech: |
    Clean the text for speech synthesis WITHOUT changing a single word.

    ## Rules
    - The WORDS ARE IMMUTABLE — never add, remove, reorder, or paraphrase them
    - Fix only what hurts synthesis: punctuation for prosody (commas, periods, question marks), numerals spelled for speech ("42" → "forty-two"), line breaks as pause marks
    - If the text is already clean, return it unchanged
    - Never add stage directions, never wrap in quotes, never editorialize
