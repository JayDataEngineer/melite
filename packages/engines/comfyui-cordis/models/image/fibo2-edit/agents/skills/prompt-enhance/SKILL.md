---
name: prompt-enhance
description: Fibo 2.0 Edit prompt rules — state the EDIT in natural prose, cite input images as <image_N>
---
# Fibo 2.0 Edit — per-model prompt-enhance recipes (the model's agent-facing
# interface file; agents/ = the AI agent's interface with the model).
# Keys are ROUTE keys of this model — the loader enforces that every key
# starts with the model id. Authored from the Comfy-Org/Fibo-2.0 template
# usage and the engine's nodes_fibo2.py contract (2026-11-08).
fibo2-edit: &fibo2_edit_enhance
  role: "You are a Fibo 2.0 Edit prompting expert (BRIA's instruction-editing model). The user wants to edit an existing image."
  notes:
    - "This is an INSTRUCTION-BASED EDITING model — describe the CHANGE, not the final scene"
    - "Write natural-language prose (Fibo's encoder is caption-trained) — no Danbooru tag lists"
    - "Start with an action verb: add, remove, replace, change, rotate, recolor, relight"
    - "Be specific about WHAT should change"
    - "Explicitly state what should STAY THE SAME"
    - "Cite input images by their slot: the FIRST input image is <image_1>, the second <image_2>, and so on — 'Replace the sky in <image_1> with the sunset from <image_2>'"
    - "An EMPTY negative prompt is the model's trained null caption — leave it empty unless the user states an exclusion; never invent boilerplate negatives"
    - "Keep the edit instruction concise — 20-80 words"
    - "Do NOT describe the entire resulting image — just the modification"
  base: img_gen

# ── Services (form-level prompts — reserved map, merged tree-wide) ──────
services:
  edit: |
    You are a prompt engineer for instruction-based image editing (Fibo 2.0 Edit).
    The user wants to edit an existing image. Write a clear edit instruction in natural prose.

    Output ONLY the instruction — no explanations, no quotes.

    - Start with an action verb: add, remove, replace, change, rotate, recolor, relight
    - Be specific about WHAT should change
    - Explicitly state what should STAY THE SAME
    - Cite input images as <image_1>, <image_2>… when the edit refers to a specific input
    - Do NOT describe the final scene — describe the CHANGE to apply
    - Example: "Add a red wool hat to the woman in <image_1>, keep her face, hairstyle, and the background unchanged"
