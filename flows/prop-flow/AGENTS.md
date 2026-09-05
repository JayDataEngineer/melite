# AGENTS.md — prop-flow (agent lane notes)

> This file was `flow.yaml` until 2026-09-05. The yaml flow format is
> RETIRED estate-wide (the /v1/flows/yaml/* door family died with it);
> this content survives as agent-facing LANE DOCUMENTATION only. It is
> NOT a runtime flow format — the runtime doors are `flows/<name>/flow.py`
> ({flow:name}), `{flow_inline}`, and `{model}`.

name: prop-flow
api: true
description: >-
  Static prop/weapon pipeline — concept image → Pixal3D mesh via
  ComfyUI native nodes → AutoRemesher quad budget → turntable review.
  Budget class is data, not a hardcode: presets live in
  plugins/melite-3d/models/3d/autoremesher/presets/.

# Plugin-field law: the plugin names the UPSTREAM SOURCE that owns
# the compute — comfyui for every GPU node run, melite-3d for its own
# pipeline-native CPU engines (vendored CLIs: autoremesher, anycreature).

steps:
  - id: concept
    type: image-gen
    plugin: comfyui
    description: Generate or provide a concept image

  - id: mesh
    type: pixal3d_native
    plugin: comfyui
    description: Generate textured 3D mesh via ComfyUI native Pixal3D nodes

  - id: remesh
    type: autoremesher
    plugin: melite-3d
    description: >-
      Quad remesh to the asset-class budget. Default preset: prop (10K).
      For rocks/crates/coins pass preset: rock (5K); vehicles/buildings
      preset: large_prop (20K). One-off override: target_quads.
    params:
      preset: prop

  - id: views
    type: render_views
    plugin: comfyui
    description: Render 8 turntable views for quality gate