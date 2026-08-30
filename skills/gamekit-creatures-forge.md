---
name: gamekit-creatures-forge
description: Autonomous anyCreature forge - breed a species JSON against the engine validator until zero BLOCKs, run the lane, vision-gate the turntable, write a private verdict.
---

THE CONTRACT is FORGE-PLAYBOOK.md in this folder - read it first.
Template lane: template_rock_boar.yaml (copy, rename, swap spec_path).

## Loop (max 8 iterations)
1. Declare deviation vector (3+ anchors vs wolf.json) in the spec _template.
2. Author references/anycreature/game/<name>.json.
3. Validate: cd references/anycreature && node dist/cli.js build game/<name>.json --out /tmp/<name>.glb
   Fix BLOCKs using the playbook table (dead-rhythm taper, anim folds ->
   drop sharp/ring_step up, root containment -> bury+fatten, limb clearance ->
   widen side).
4. Lane: cp template -> data/pipelines/<name>.yaml, validate + start via the
   gateway doors; poll to completed (~1 min).
5. Vision-gate 3 turntable views (vision-gate/SKILL.md protocol).
6. Write <name>.verdict.md privately. NEVER touch FORGE-LEDGER.md (parent merges).

## Law
Creatures are ANYCREATURE-only (Route B). TRELLIS never carries movers.
Delivered assets are DOTween-drivable: pivot base-center, plain transforms,
clips optional.