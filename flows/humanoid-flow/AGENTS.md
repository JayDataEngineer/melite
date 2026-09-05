# AGENTS.md — humanoid-flow (agent lane notes)

> This file was `flow.yaml` until 2026-09-05. The yaml flow format is
> RETIRED estate-wide (the /v1/flows/yaml/* door family died with it);
> this content survives as agent-facing LANE DOCUMENTATION only. It is
> NOT a runtime flow format — the runtime doors are `flows/<name>/flow.py`
> ({flow:name}), `{flow_inline}`, and `{model}`.

name: humanoid-flow
api: true
description: "Humanoid character pipeline — ANNY body sculpt → SOMAX rig → textured asset → 8 review views"

steps:
  - id: body
    type: script
    script: build_anny_person.py
    plugin: anny
    description: "Sculpt character mesh via ANNY Body Studio (build_anny_person.py: POST /poser/skin/mesh → /poser/skin/bind_pose → bare GLB)"

  - id: rig
    type: somax
    plugin: comfyui
    description: "Apply SOMAX body rig to the ANNY mesh"

  - id: texture
    type: texture_project
    plugin: comfyui
    description: "Project textures onto the rigged mesh"

  - id: views
    type: render_views
    plugin: comfyui
    description: "Render 8 views for quality gate"
