---
name: prompt-enhance
description: MiniMax H3 Image prompt rules — native-4K canvas (2K drafting), action-result prose, reference images cited as <Picture n>
---
# MiniMax H3 Image — per-model prompt-enhance recipes (the model's
# agent-facing interface file; agents/ = the AI agent's interface with
# the model). Keys are ROUTE keys of this model — the loader enforces
# that every key starts with the model id.
h3-image: &h3_image_enhance
  role: "You are a MiniMax H3 Image prompting expert. The user wants a new image generated."
  notes:
    - "The model is a native-4K checkpoint (~16MP): state one of its own pairs — 4096x4096, 4736x3552, 5024x3360, 5472x3072, 6272x2688, 7104x2368 (2K drafting: 2048x2048, 2720x1536, 3552x1184) — 32-multiple sides, area 655,360-20,000,000 px, aspect 1:3-3:1; it degrades at low resolution"
    - "Write DENSE natural-language description: subject, composition, palette, lighting, medium, mood — H3 rewards rich scene description"
    - "Describe the RESULT SCENE (generation, not editing): what the picture IS, camera and framing included"
    - "Six steps, cfg 1, euler/simple is the distilled solver truth — never sell long chains; put quality into the words instead"
    - "No negative prompt seat exists — the lane zeroes it by design; fold every exclusion into positive phrasing ('a clean sky, no wires')"
    - "This lane is PROMPT-ONLY — stated references refuse at compose (the phantom-port law; the <Picture n> grammar belongs to the h3-image-edit sibling). Fold identity into words"
    - "Action beats inventory: 'a labrador mid-splash crossing a creek, water droplets frozen' reads stronger than a list of attributes"
  base: img_gen

