# anyCreature Forge Loop — the autonomous spec-breeding playbook

Derived live 2026-08-25 (session: dune_hound/rock_boar/bone_crane/sand_skimmer
all forged green through exactly this loop). This file is the driver contract:
hand it to any agent (or human) and they can forge creatures unattended.

## The loop (per creature)

1. DESIGN: read the anchor `references/anycreature/example/wolf.json`
   (`_anchor_numbers` + `_template` doctrine). Pick a species brief and
   declare a DEVIATION VECTOR: which 1-3 anchor numbers you push and how far.
   Converging back to anchor numbers = you designed nothing.
2. AUTHOR: write `references/anycreature/game/<name>.json` (start from the
   wolf JSON structure; keep ALL sections: joints/chains/volumes/parts/
   animations; extra leg pairs are legal — sand_skimmer has LMid).
3. VALIDATE (fast, no GPU):
   `cd references/anycreature && node engine/cli.js ../../references/anycreature/game/<name>.json /tmp/<name>.glb`
   - exits clean + writes GLB = PASS. Any `BLOCK:` line = fix and repeat.
   - Budget: 8 iterations max, then stop and report.
4. LANE: write `data/pipelines/<name>.yaml` (copy any game/* creature lane;
   swap spec_path). Validate `POST /v1/pipelines/yaml/validate` then start
   `POST /v1/pipelines/start {"yaml":"<name>.yaml"}`.
5. GATE (agent eyes — operator law): for views front/left/back of the run dir
   (`data/runs/<run_id>/render_glb_views_<run_id>_<view>_mesh.png`),
   describe_image with prompt "Describe this render: subject, silhouette,
   materials. If there is no clear subject, say so." Retry once on empty.
   PASS = views agree on ONE subject in the right class (quadruped/canine/
   bird/etc). "A blob" = rework bolder silhouette. BLANK/gray frames = the
   known render_glb_views bug, NOT a bad asset — stop, report, do not
   rework the spec.
6. RECORD: append verdict to `references/anycreature/game/FORGE-LEDGER.md`.

## BLOCK fix patterns (all proven this session)

| BLOCK | Fix |
|---|---|
| proportion: chain "tail" dead rhythm (50:50) | Re-taper: Tail1 fwd ~0.09–0.17, Tail2 fwd ~0.10–0.19 with up drop ~-0.13–0.24, TailTip SHORTER (fwd ~0.05–0.09). Rhythm must land ~0.62–0.85. |
| anim_integrity folds @ ALL t (incl 0.0) | Static geometry: remove `sharp: true` flags on that volume's profile, reduce peak radii ~10%, or raise `ring_step` ~20% (boar fix). |
| anim_integrity folds only mid-anim | Reduce the driving joint rotations ~25% or split the bend across an added joint. |
| root_containment: chain X % outside host | Bury the root: pull it into the body (fwd toward center), reduce its `side` offset, fatten the HOST volume's profile near the attach t (crane/skimmer fix). |
| limb_clearance: pair N apart < min | Widen both roots' `side` offsets ~+0.01–0.02 (skimmer fix). |
| head root containment | HeadRoot fwd slightly negative + fatten body's neck-end rings. |

## Laws
- CPU-only: forge while the GPU is busy. Never route creatures through somax (W12).
- The engine is the ONLY spec validator; fix what it BLOCKs, never weaken numbers to dodge it.
- Anchor numbers, then DEVIATE on purpose; declare the vector in the spec's `_template`.
- Honest statuses only: 🟢 built+gated, 🟡 built/gate-mixed, 🔴 blocked. No narration without raw output.
