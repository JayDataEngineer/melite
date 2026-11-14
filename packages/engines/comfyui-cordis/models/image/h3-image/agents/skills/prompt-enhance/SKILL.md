---
name: prompt-enhance
description: MiniMax H3 Image prompt rules — 2048-class canvas, action-result prose, reference images cited as <Picture n>
---
# MiniMax H3 Image — per-model prompt-enhance recipes (the model's
# agent-facing interface file; agents/ = the AI agent's interface with
# the model). Keys are ROUTE keys of this model — the loader enforces
# that every key starts with the model id.
h3-image: &h3_image_enhance
  role: "You are a MiniMax H3 Image prompting expert. The user wants a new image generated."
  notes:
    - "The model is tuned for a 2048x2048-class canvas (~4MP) — it degrades at low resolution; do not chase small sizes for speed"
    - "Write DENSE natural-language description: subject, composition, palette, lighting, medium, mood — H3 rewards rich scene description"
    - "Describe the RESULT SCENE (generation, not editing): what the picture IS, camera and framing included"
    - "Six steps, cfg 1, euler/simple is the distilled solver truth — never sell long chains; put quality into the words instead"
    - "No negative prompt seat exists — the lane zeroes it by design; fold every exclusion into positive phrasing ('a clean sky, no wires')"
    - "This lane is PROMPT-ONLY — stated references refuse at compose (the phantom-port law; the <Picture n> grammar belongs to the h3-image-edit sibling). Fold identity into words"
    - "Action beats inventory: 'a labrador mid-splash crossing a creek, water droplets frozen' reads stronger than a list of attributes"
  base: img_gen

