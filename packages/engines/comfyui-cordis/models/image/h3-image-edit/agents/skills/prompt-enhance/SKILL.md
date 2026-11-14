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
    - "An edit RE-FRAMES — identity survives, composition does not: the model rebuilds the frame around the change, so camera distance, cropping, and background layout may shift even when the prompt names them fixed. A frame-preserving touch-up is the film repair door with masks (the h3-timeline repair cell), never this lane"
  base: img_gen

