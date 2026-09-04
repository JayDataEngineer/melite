# procedural-creature — Route B creature lane (anyCreature in the card system)

> Operator law 2026-08-25: characters have TWO PATHS. (a) HUMANOID = the
> mesh lanes (frozen body prefix + attachment lanes). (b) NON-humanoid =
> THIS skill — the upstream anyCreature engine as a pipeline-native
> family. Never hand-roll creatures through somax (W12: the SOMA-77
> template destroys quadrupeds); never treat the monolith as a creature
> maker.

## What it is

A thin shim family (`plugins/melite-3d/families/anycreature.ts`,
`builder: null` — same contract as verify_glb) over the upstream engine:
`node engine/cli.js spec.json out.glb`. CPU-only, seconds-fast, zero GPU
dependence — usable while the GPU is busy or OOM'd. One JSON spec (joints
-> chains -> tube-volumes -> parts -> keyframe anims) compiles to a
skinned, vertex-colored, AO-baked GLB. Clone:
`references/anycreature` (gitignored; github.com/Ariescar/anyCreature,
MIT). Spec authoring doctrine: the clone's `cards/SYNTAX.md` + the
`example/wolf.json` _template (anchor numbers, then DEVIATE on purpose).

## When to use

- Articulated, keyframe-animated NON-humanoid creatures (beasts, bugs,
  constructs). Humanoids belong to the mesh lanes.
- Stylized/low-poly art direction (vertex colors, no textures) wanted.
- The GPU is unavailable — this lane is CPU end-to-end except the final
  turntable renders (Blender headless).

## Run loop

1. Author or pick the spec. Default lane uses the upstream wolf anchor;
   for a new creature write `data/pipelines/<creature>.yaml` with either
   `spec_path:` (repo-relative file) or inline `spec:` (OBJECT — never a
   string; the family BLOCKS strings).
2. `POST /v1/pipelines/yaml/validate {"yaml":"<creature>.yaml"}` must be
   ok before starting.
3. `POST /v1/pipelines/start {"yaml":"<creature>.yaml"}` -> poll
   `GET /v1/pipelines/status/{run_id}`.
4. Steps: anycreature (build) -> verify_glb (ADVISORY: fail_on never,
   stages structural/weights/deformation/visual — no arm_hand on beasts;
   tighten only after calibrating floors on a known-good anyCreature GLB)
   -> render_glb_views (8-angle turntable).

## Gate loop (AGENT EYES — blind_read retired 2026-08-25 by operator)

For EACH render view: call `describe_image` with a NEUTRAL factual
prompt ("Describe this render: subject, silhouette, materials. If there
is no clear subject, say so."). Never lead the witness with the spec's
creature name. On empty extraction (~10% flake) retry once, then treat
as unread. Cross-check: all views must agree on ONE subject — mutual
inconsistency means a broken build, not a borderline one. Record the
verdict + view-by-view extraction in session notes. If the reads say
"a blob"/"a shape": regenerate with a BOLDER silhouette (push the spec's
exaggeration vector — limb girth, mass thirds, head share). NEVER lower
the bar.

## Pitfalls

- `spec` and `spec_path` are mutually exclusive — supplying both or
  neither BLOCKS (no silent precedence).
- The engine is the only spec validator; a semantic error surfaces as
  the upstream's own error text in the step error. Read it; do not
  paraphrase it away.
- Provenance: the exact spec that ran lands beside the GLB as
  `anycreature/spec.json` — cite it when iterating, not your memory of
  the edit.
- verify_glb DEFORMATION stage chokes on anyCreature output (zero-norm
  quaternions in anim channels — invalid per glTF, written by the upstream
  engine; scipy raises "Found zero norm quaternions"). This lane runs
  structural/weights/visual only (run pmt8fy5cn2ljx8w, 2026-08-25). Do not
  re-add deformation until the quats are fixed upstream or the harness grows
  a tolerant reader — and fail_on stays "never" until floors are calibrated
  on a known-good anyCreature GLB.
- The GLB is vertex-colored by default; texture_project/step1x are NOT
  part of this lane. If a textured creature is wanted, that is a NEW
  lane (route it explicitly; do not grow this one silently).
