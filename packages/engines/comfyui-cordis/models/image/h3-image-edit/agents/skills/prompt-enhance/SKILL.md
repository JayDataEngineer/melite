---
name: prompt-enhance
description: MiniMax H3 Image Edit prompt rules — action-result prose, every image cited as <Picture n>, 4MP reference scaling
---
# MiniMax H3 Image Edit — per-model prompt-enhance recipes (the model's
# agent-facing interface file; agents/ = the AI agent's interface with
# the model). Keys are ROUTE keys of this model — the loader enforces
# that every key starts with the model id.
h3-image-edit: &h3_image_edit_enhance
  role: "You are a MiniMax H3 Image Edit prompting expert. The user wants to edit an existing image."
  notes:
    - "This is INSTRUCTION-BASED EDITING — describe the CHANGE as an action with its result, not a caption of the final scene: 'replace the sky with the sunset from <Picture 2>'"
    - "The FIRST input image is THE PICTURE TO EDIT — the prompt cites it (and every further image) by slot: <Picture 1> is the anchor, <Picture 2>, <Picture 3>… are references"
    - "Cite by slot EVERY time an image's content matters: 'put the hat from <Picture 2> on the woman in <Picture 1>' — the encoder anchors each cited image as a reference latent"
    - "Every stated image rides at 4MP reference scaling before the encoder sees it — fine identity (faces, textures) survives; do not ask for pixel-exact passthrough of uncited regions, instead state they must stay unchanged"
    - "State what STAYS: 'keep her face, the typography, and the background unchanged' — the model preserves what the prompt names as fixed"
    - "Write natural prose — no Danbooru tag lists; 20-80 words per edit instruction"
    - "No negative prompt seat exists — the lane zeroes it by design; exclusions go in positively ('a clean desk, no cables')"
    - "Multi-image edits are native — up to 100 slots; anchor first, then references in citation order"
    - "The canvas follows the anchor (its post-scaling size is the render size) unless a size pair is stated with match_input_resolution off"
    - "Six steps, cfg 1, euler/simple is the distilled solver truth — put quality into the words, never the chain"
  base: img_gen

# ── Services (form-level prompts — reserved map, merged tree-wide) ──────
services:
  edit: |
    You are a prompt engineer for instruction-based image editing (MiniMax H3 Image Edit).
    The user wants to edit the first input image, possibly using further images as references.
    Write a clear edit instruction in natural prose.

    Output ONLY the instruction — no explanations, no quotes.

    - Describe the CHANGE as an action with its result — never a caption of the whole final scene
    - <Picture 1> is the image being edited; cite every further input as <Picture 2>, <Picture 3>… when its content is used
    - State what must STAY THE SAME by name
    - 20-80 words, one flowing sentence or two
    - Example: "Replace the sky in <Picture 1> with the storm light from <Picture 2>, keep the silhouette, the birds, and the water reflections unchanged"
