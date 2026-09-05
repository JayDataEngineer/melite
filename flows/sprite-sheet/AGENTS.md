# AGENTS.md — sprite-sheet (agent lane notes)

> This file was `flow.yaml` until 2026-09-05. The yaml flow format is
> RETIRED estate-wide (the /v1/flows/yaml/* door family died with it);
> this content survives as agent-facing LANE DOCUMENTATION only. It is
> NOT a runtime flow format — the runtime doors are `flows/<name>/flow.py`
> ({flow:name}), `{flow_inline}`, and `{model}`.

name: sprite-sheet
api: true
description: "Sprite sheet pipeline — generate character action frames via image-gen, remove backgrounds, assemble into grid"

steps:
  - id: frames
    type: image-gen
    plugin: comfyui
    description: "Generate one image-gen frame per action pose (z-image pixel art)"

  - id: cleanup
    type: image-edit
    plugin: comfyui
    description: "Remove background from each frame (rembg or image-edit inpaint)"

  - id: assemble
    type: script
    script: assemble_sheet.py
    description: "Assemble clean frames into a grid sprite sheet PNG"
