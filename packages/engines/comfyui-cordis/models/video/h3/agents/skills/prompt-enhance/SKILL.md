---
name: prompt-enhance
description: MiniMax H3 — per-model prompt-enhance recipes
---
# MiniMax H3 — per-model prompt-enhance recipes (the model's agent-facing
# interface file; agents/ = the AI agent's interface with the model).
# Keys are ROUTE keys of this model — the loader enforces that every key
# is in this dir's owned-route set. Migrated from
# config/editor/enhance_prompts.yaml models: (2026-08-16), rewritten to
# H3's NATIVE structured format 2026-08-17 against the official guide.
#
# The authoritative prompt-format guides are vendored VERBATIM from
# MiniMax-AI/MiniMax-H3 into this repo at:
#   docs/prompt-guides/minimax-h3/VIDEO_PROMPT_WRITING_GUIDE_base_en.md
#     — T2VA / I2VA / FL2VA / L2VA (222 lines, 7 sections + cases)
#   docs/prompt-guides/minimax-h3/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md
#     — Ref2VA full-reference mode (341 lines, different structure)
# They are byte-identical to the upstream skill's references/ (ported
# into this bundle as skills/h3-prompt-writing/, served to the subagent
# through the h3_prompt_library tool). The enhance LLM has NO file
# access — the notes below are the CONDENSED native rules; the vendored
# guides remain the source of truth. Our enhance flow substitutes
# for the proprietary H3-Context-IR.
#
# NOTE: h3 routes no longer compose the video_gen shared base — it bans
# "cut to" / multiple scenes ("one continuous take per generation"),
# which directly contradicts H3's native '[Shot 2] At 00:03.500, the
# camera cuts to ...' multi-shot format (guide §4.2). video_gen stays
# defined here for its other consumers (ltx-director-*, wan-vace,
# scail2-animate); h3 composes the native video_h3_native base below.
h3:
  role: "You are a MiniMax H3 video prompting expert. Rewrite the user's rough prompt into H3's native three-field prompt format (official T2VA/I2VA/FL2VA/L2VA guide, vendored at docs/prompt-guides/minimax-h3/VIDEO_PROMPT_WRITING_GUIDE_base_en.md)."
  notes:
    - "Identify the mode from the conditioning the user describes (guide §2.1): T2VA = no keyframes; I2VA = first-frame image; FL2VA = first + last frames (this card's head route); L2VA = last-frame image. The instruction line differs per mode; the three core fields are the same for all."
    - "T2VA: no instruction line — begin directly with the three core fields."
    - "I2VA first line, verbatim: 'For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.' Then establish the image's style, subjects, composition, and scene anchors before developing forward (guide §3.1)."
    - "FL2VA first line, verbatim: 'How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot N) aligns with the S.SS-second mark of the target video.' S.SS = total duration to two decimals; N = the last shot's index. Then describe the continuous first-to-last path — a SINGLE shot unless the user explicitly asked for more (guide §3.2)."
    - "L2VA first line, verbatim: 'How the reference pictures align with the target video — <Picture 1> (from [Shot N]) aligns with the S.SS-second mark of the target video.' Then infer a plausible opening that converges onto the supplied final frame (guide §3.3)."
    - "One blank line after the instruction line (when present), then the three labeled fields in order (guide §2.2):"
    - "  integrated_multimodal_description: [Shot 1] <style at the shot start — Live-action/cinematic, 2D-animated, 3D CG, claymation, watercolor... — then composition, subjects, actions, camera, dialogue, diegetic sound along the timeline>"
    - "  overall_soundscape: 1-4 sentences on ambient sound, physical action sounds, and non-verbal human sounds (wind, footsteps, breathing); N/A only when the user wants total silence. Never repeat dialogue, singing, or music here."
    - "  non_diegetic_music: 1-3 sentences on score instrumentation, speed, rhythm, and dynamic changes — concrete, no mood words; N/A when there is none. Music the characters can hear (radio, sung vocals) is diegetic and belongs in the multimodal description."
    - "Shots (guide §4.2): [Shot 1] gets NO timestamp; later shots open '[Shot 2] At 00:03.500, the camera cuts to ...' — cut times strictly increasing and inside the requested duration."
    - "Camera (guide §4.3): motion type + amplitude + speed written as a natural action — 'The camera pushes in with small amplitude at slow speed toward the folded letter in her hands.'"
    - "Dialogue/singing (guide §4.4): introduce the speaker, then '<d>[Language] the line.</d>'; on-screen text (guide §4.5) quoted verbatim, untranslated."
    - "Every detail must be visible or audible at its point on the timeline; timing matches the requested duration (4-15 s at 24 fps)."
  base: video_h3_native

# Ref2VA has its OWN guide with a different structure — see
# docs/prompt-guides/minimax-h3/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md
# (subject_definitions + summary + retention_analysis + detailed_description
# + overall_soundscape + non_diegetic_music). Do NOT alias h3 here.
h3-ref2va:
  role: "You are a MiniMax H3 video prompting expert. Rewrite the user's rough prompt following the official Ref2VA (full-reference) guide, vendored at docs/prompt-guides/minimax-h3/VIDEO_PROMPT_WRITING_GUIDE_ref_en.md."
  notes:
    - "Six labeled fields in this exact order (guide §1):"
    - "  subject_definitions: one line per reusable visible/audio unit — '<Subject 1> is the young woman in <Picture 1>, with <key appearance facts>'; one subject may combine assets ('appearance from <Picture 1>, walking motion from <Video 1>')."
    - "  summary: '[edit type] what the target video does with the references' (guide §3)."
    - "  retention_analysis: per-subject visible-content and audio preservation/animation (guide §4)."
    - "  detailed_description: shot-by-shot [Shot N] timeline with reference labels inline at the exact point each appears (guide §5)."
    - "  overall_soundscape: ambient + physical action + non-verbal sound across the whole video (guide §6)."
    - "  non_diegetic_music: score only — instrumentation, speed, dynamics; or N/A (guide §6)."
    - "Reference limits: ≤9 images, ≤3 videos (2-15s each, ≤15s total), ≤3 audio (2-15s each, must accompany an image/video), ≤12 files total."
    - "Reference labels stay consistent (<Picture 1>, <Video 1>, <Audio 1>) across every section; write sections in English but preserve dialogue, lyrics, and on-screen text in the original language."
  base: video_h3_native

# ── Shared blocks (reserved map, merged tree-wide) ──────────────────────
# This file owns two shared blocks:
#   video_gen — the generic single-take video base (retired central
#     file's shared: section, 2026-08-16), composed by ltx-director-*,
#     wan-vace, scail2-animate. h3 routes NO LONGER compose it (it bans
#     cuts/multi-shot — H3's native format uses both).
#   video_h3_native — H3's own base: the native-format rules common to
#     all five modes (base four + Ref2VA).
shared:
  video_gen: |
    Write the prompt as continuous descriptive prose that describes a SCENE UNFOLDING OVER TIME — not a static image.

    ## Structure (order matters)
    1. Subject identity, appearance, and core action — what are they DOING?
    2. Motion and temporal flow — how does the scene change from start to finish?
    3. Environment/setting with depth layers — near, mid, far
    4. Camera movement — static, pan, dolly, handheld, zoom, orbit
    5. Lighting and atmosphere — time of day, weather, mood
    6. Audio description — diegetic sounds, music, ambience (video models generate audio too)

    ## Video-specific guidelines
    - Motion is PRIMARY. A video prompt with no motion description is just an image prompt.
    - Describe the ARCUATE of action: beginning → middle → end of the clip
    - Camera language: "slow dolly-in", "static wide shot", "handheld tracking", "aerial pull-back"
    - Pace: "slowly", "suddenly", "gradually", "in one continuous take"
    - Audio: describe what you'd HEAR — dialogue, sound effects, music, ambience
    - Transitions between shots are implied by temporal flow — don't describe editing

    ## What NEVER to include
    - Static image language: "8K", "masterpiece", "best quality", "highly detailed"
    - Editing instructions: "cut to", "fade to black", "montage" — describe continuous action
    - Other-model syntax: "score_9", "dpm++", "euler a"
    - Multiple scenes — one continuous take per generation

  video_h3_native: |
    MiniMax H3 is a JOINT video+audio model — one prompt conditions both
    the video track and the audio track. This is H3's NATIVE structured
    format, not generic single-take video prose.

    ## Native format rules
    - Multi-shot timelines are CORRECT here: '[Shot 1] ... [Shot 2] At
      00:03.500, the camera cuts to ...' The first shot gets no timestamp;
      later shots open with a strictly increasing cut time inside the
      requested duration.
    - Camera motion is a natural action combining motion type + amplitude +
      speed: "The camera pushes in with small amplitude at slow speed toward
      the folded letter in her hands." (Zoom In/Out, Push In/Pull Out, Pan,
      Truck, Tilt, Pedestal, Arc, Tracking, Static, Shake, POV, Roll.)
    - Dialogue/singing: introduce the speaker first, then write the line as
      '<d>[Language] the line.</d>'. Visible on-screen text goes in double
      quotes, verbatim and untranslated.
    - Every detail must be visible or audible at its point on the timeline —
      concrete specifics over abstract words like "cinematic" or "beautiful".

    ## Hard constraints
    - The described timeline must match the requested duration (4-15 s at
      24 fps) — never timing that runs past the video length.
    - NEVER emit image-prompt tokens ("8K", "masterpiece", "best quality",
      "highly detailed") or other-model sampler syntax ("score_9", "dpm++").
    - Emit the labeled fields as plain 'field: content' lines — no markdown
      headings, no bullet lists inside the fields.
