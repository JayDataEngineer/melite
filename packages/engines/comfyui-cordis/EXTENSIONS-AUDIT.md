> **HISTORICAL AUDIT.** This is a dated extension/management audit. Current extension declarations and provisioning are documented in `docs/design/provisioning-service.md` and `docs/comfyui/setup.md`.

# custom_nodes audit — need / replace / retire

2026-09-03. Method: three-way cross-reference —
(1) what each pack registers (`NODE_CLASS_MAPPINGS`),
(2) what this estate actually wires (templates under `models/**.json`,
`flows/*.yaml`, `python/card_requires.py`, repo-wide name grep incl.
skills),
(3) what the LIVE server exposes (`GET :18465/object_info`, 3099 nodes,
ComfyUI **0.33.0**).

## Verdict table

| pack | size | wired by | verdict |
|---|---|---|---|
| melite-audio-nodes | 464K | music3 + tts templates, `card_requires` | **KEEP** — estate audiocore (ctypes, in-process); no upstream equivalent |
| melite-kimodo-nodes | 76K + anny family | 3d + motion lanes + `card_requires` (8 node types) | **KEEP** — ONE humanoid pack (2026-09-07 merge absorbed `melite-anny-estimator-nodes`: motion retarget + image→Anny estate, shared torch/`melite_model_base` spine, node type names unchanged) |
| melite-autoremesher-nodes | 84K | declared + `autoremesher` stage type | **KEEP** — vendored CLI, subprocess |
| melite-trelliscpp-nodes | **82M** | ONLY `models/3d/trellis2_gate/img2mesh.json` + `flows/trellis2-gate` + `card_requires["ComfyUI-TRELLIS2"]` | **RETIRE** (operator verdict 2026-09-03: "comfyui handles trellis natively, so this is next to useless"). Retarget the gate template to stock TRELLIS nodes. Dependency below. |
| melite-h3-motion-nodes | 136K | shadows stock `MiniMaxH3ImageToVideo`; exec-patches `PackedLayout.__init__` + `MiniMaxH3.extra_conds` | **RETIRE with Phase H** — a runtime-patch pack (the class upstream warns about); everything it ports is stock in ComfyUI ≥0.34 or upstream H3-Motion-Context |
| ComfyUI-H3-Motion-Context-MultiRef | 23M | h3-timeline templates: `MotionContextSave/LoadLatent` (8/6), `SongMaskedAVContext` (6), `GeneratedAVMaskedContext` (6) | **REPLACE with upstream NikoDemon80 v0.5.1** (GPL-3.0) — see Phase H |
| ComfyUI-Kimodo | **119M** | NOTHING (object_info only) | **DEAD WEIGHT** — zero wiring; melite-kimodo-nodes covers the wired cases |
| melite-anigen-nodes | 80K | nothing (object_info + test snapshot) | unconsumed |
| melite-poser-nodes | 9.3M | nothing in-repo (object_info + snapshot) | unconsumed here — confirm gamekit/poser flows before removal |
| melite-seethrough-nodes | 76K | `models/3d/seethrough/` is a nodes.yaml stub, no template | unconsumed lane stub |
| melite-step1x-nodes | 668K | `models/3d/step1x_texture` stub only | unconsumed lane stub |
| melite-stretchy-nodes | 72K | nothing | unconsumed |
| melite-hymotion-nodes | 72K | nothing (HYMotion* also stock upstream now) | unconsumed |
| melite-autorig-nodes | 364K | `transfer_rig` stub only; `KimodoExportFBX` unreferenced | unconsumed lane stub |
| melite-video-nodes | 72K | editor test fixtures only (spec_wan-vace.json) | unconsumed by lanes |
| melite-utility-nodes | 84K | nothing (GLBPreview/MotionPreview/ModelDirs helpers) | unconsumed |
| melite-anny-estimator-nodes | — | **MERGED 2026-09-07** into `melite-kimodo-nodes` (`nodes_anny.py` + `_vendor` + requirements union; declarations, gate map, walls, snapshots repointed) — submodule removed, repo archivable |

`tests/timeline/live_nodes.snapshot.json` pins the live registration set —
every removal updates it.

## The H3 finding: three overlapping seam layers

The estate currently runs THREE implementations of the same
continuation physics on one server:

1. **`melite-h3-motion-nodes`** (ours): shadows stock
   `MiniMaxH3ImageToVideo` and hot-patches the model layer via exec so
   0.33.0 gains `first_frame_latent`, `.h3latent` packs, audio-only
   keyframe guides, and a backwards audio window ending at the join.
2. **`ComfyUI-H3-Motion-Context-MultiRef`** (seitanism fork of
   NikoDemon80, Update 8 / 2026-08-30): the fork's masked-context node
   families our timeline templates actually wire.
3. **Upstream NikoDemon80 v0.5.x** (not installed): the same features
   done natively — bit-exact latent chaining (no pixel round trip),
   audio continuation via coordinate rewrite (join correlation
   0.45 → 0.95+), `layout_contract.py` that refuses LOUDLY instead of
   rendering wrong, zero runtime patches — because the anchor machinery
   it needs **landed in stock ComfyUI 0.34.0**.

## Dependencies (operator/host actions, both phases)

- Live server is ComfyUI **0.33.0**; object_info confirms **no stock
  TRELLIS nodes and no 0.34 anchor machinery** are registered. Both
  retirements need the server on **≥0.34** (upstream H3-Motion-Context
  requires exactly that; stock TRELLIS ships there too).
- Pack install/uninstall on the root-owned server is host jurisdiction;
  this repo's `custom_nodes/` is the declared source `card_requires`
  checks against.

## Mechanism (2026-09-03 restructure, EXTENSION LAW)

- This repo no longer ships pack copies. `packages/engines/comfyui/custom_nodes/`
  (17 dirs, ~235 MB) is DELETED; its audit verdicts stand.
- Our authored packs live as submodules at `vendor/comfyui_extensions/<pack>`
  (GitHub: JayDataEngineer/melite-*; anny + autoremesher published from this
  repo's only copies; kimodo's live container fix pushed as 3e0a83f).
- Foreign packs: DECLARED per-lane (`models/**/nodes.yaml`, url+ref pinned)
  and installed by the management plane (comfy-mcp/comfy-cli, PIN LAW).
  Study copies, if ever needed, go in `references/` (never loaded).
- The LIVE server truth: docker `tech-noir-inference-comfyui-1`, ComfyUI
  0.34.3 at /mnt/data/comfyui-root (bind-mounted /root), packs bind-mounted
  from the RAY estate (`ray/custom_nodes/*`) — deployment-side, not this
  repo. This repo declares; the server satisfies.
- Compose gate: `check_card_requires` (python/gateway.py) resolves card
  `requires` against live object_info + `vendor/comfyui_extensions/`.

## Phased plan

**Phase T — trellis retirement (operator-decided). EXECUTED 2026-09-03.**
~Deleted `melite-trelliscpp-nodes` (82M back); retargeted
`models/3d/trellis2_gate/img2mesh.json` to the stock TRELLIS node
names exactly as the updated server's object_info registers them;
updated `flows/trellis2-gate/flow.yaml` inject keys,
`python/card_requires.py` (`ComfyUI-TRELLIS2` row), and the live-nodes
snapshot. Gate lane stays live only after the server update.~
Execution record: packs retired from BOTH homes (ray compose bind line
removed; persistent `/root/ComfyUI/custom_nodes` copies moved to
`/mnt/data/comfyui-root/.retired-packs-20260903-*` — the audit had
missed that /root estate, it shadowed the ray binds); the retarget is
the full official stock flow (BiRefNet preprocess → conditioning →
structure@32 → shape@512 → upsample@1536 → texture, per-pass CFG
wrappers exactly as the Comfy-Org template wires them; RemeshMesh →
Decimate → SmoothNormals → PaintMesh → SaveGLB mesh chain); the
five-file stock weight set rides `trellis2-native/model.py` provisions
(diffusion int8, shape+texture VAEs, DINOn3-L, birefnet) provisioned
through the door, landed in the persistent store; vendor submodule
removed (source of record: GitHub). Two live-session engine fixes the
retarget surfaced: (1) `native.py` `_splice_workflow` never applied
`inject` in the workflow_file lane — the request prompt silently never
reached the graph (fixed: inject spliced with loud refusal on unknown
slots); (2) `MeshToFile3D` is not an output node — the entire mesh
tail pruned silently at validation (fixed: terminal `SaveGLB` on
PaintMesh). Proven on the managed instance (18466) with a real GLB
through the queue.

**Phase A — anny estate pivot (operator-decided). EXECUTED 2026-09-03.**
Operator: "We can REMOVE our ANNY stuff. Look, someone DID it for US."
`melite-anny-nodes` retired (both homes + vendor submodule; source of
record: GitHub JayDataEngineer/melite-anny-nodes). It had ZERO
consumers — no card, no template; the anny shape lane lives in the ray
Body Studio HTTP flow. Upstream
`ameliacode/ComfyUI-SMPLx-Estimator` was evaluated as the replacement
and DISQUALIFIED: every graph requires `Load SMPLx` →
SMPLX_NEUTRAL.npz, and SMPL-X is paywalled (operator: "we never use
SMPLX"). A downstream SMPL-X→SOMA-X converter cannot remove the wall —
the SMPL-X file is needed at prediction time, not after. `SAM3DBody`
registry-checked: no versioned release, experimental `comfy-env`/pixi
install (the GeometryPack breakage class) — not a candidate.
The license-clean path (proposed follow-up pack): Multi-HMR2 (free
NAVER non-commercial ckpt) predicts ANNy natively; anny is Apache 2.0;
`py-soma-x[anny]` + trimesh give the SOMA-X canonical topology direct;
SOMA-X/kimodo (NVIDIA, free) already serve rig/motion in the ray
estate. Shape = semantic params → anny(topology="soma") → GLB; image =
Multi-HMR2 anny output taken RAW (bypassing upstream's SMPL-X fit)
into the same seam. Declared in `models/3d/nodes.yaml` when built.
Follow-up pack **BUILT 2026-09-05**: `melite-anny-estimator-nodes`
landed at `vendor/comfyui_extensions/melite-anny-estimator-nodes`
(MultiHMR2ImageToAnny + AnnyFitOptimize; NAVER non-commercial research
ckpts, code MIT). Multi-HMR 2 pin in `models/3d/nodes.yaml` `pip:`
(f066532, "port to anny 0.6"); anny-fit's own checkpoints live in the
side checkout (per its INSTALL.md manual list). Live-nodes snapshot
unaffected — the live server is host-jurisdiction; updates land with
the next install.

**Phase H — H3 seam consolidation.**
Vendor upstream `NikoDemon80/ComfyUI-H3-Motion-Context` v0.5.1; delete
the MultiRef fork and `melite-h3-motion-nodes`; retarget timeline
templates: `MotionContextSave/LoadLatent` names are identical upstream,
`SongMaskedAV`/`GeneratedAVMasked` contexts → the upstream
`MotionContext` latent path (+ `MotionContextTrim` for the pinned head).
Timeline goldens re-pinned deliberately (wire contract change, C
RETIREMENT law). The card-level `first_frame_prev_sec` continuation
becomes the pack's `context_latent` chain — bit-exact, and true audio
continuation instead of same-sound re-takes.

**Phase D — dead weight.**
`ComfyUI-Kimodo` (119M, zero wiring) first. The remaining unconsumed
packs: confirm no other estate (gamekit/poser flows) drives this server
through them, then uninstall and drop from the live-nodes snapshot.
Lane stubs (`seethrough`, `step1x_texture`, `transfer_rig`) are
separate fossil questions, not pack questions.
