# archive/ — retired engine code, kept for reference (Law 0)

Date: 2026-09-07. Status: landed (cordis branch).

## Why this exists

Law 0: the engine is ComfyUI; this repo places API calls, it does not
implement inference. Packs that serve no card are engine cruft — but
deletion is irreversible institutional memory loss, so they are
archived here (git submodule gitlinks moved intact, history preserved
in the pack repos) instead of deleted.

## Contents

`vendor/comfyui_extensions/` — six orphan packs, zero card graphs
reference them (audit 2026-09-07, node-justification table):

- `melite-step1x-nodes` — 51 files vendoring upstream Step1X-3D.
  Heaviest dead engine in the tree. Restore ONLY if a step1x card
  actually boards (it was parked for a planned card, never used).
- `melite-anigen-nodes` — orphan AND rotting (absolute `/mnt/data`
  paths, retired pool sidecar references).
- `melite-hymotion-nodes` — orphan; subprocesses a `local_infer.py`
  CLI (retired sidecar pattern).
- `melite-seethrough-nodes` — orphan, no consumers.
- `melite-video-nodes` — both nodes orphan; the VACE anchor
  generalizes a foreign pack's node (use the foreign pack instead).
- `melite-stretchy-nodes` — orphan; one-function adapter over foreign
  Dwpose-Tensorrt's `Wholebody`.

## Restore procedure

From repo root: `git mv archive/vendor/comfyui_extensions/<pack>
vendor/comfyui_extensions/<pack>` (restores the gitlink AND the
`.gitmodules` path). A restored pack MUST be re-boarded: a card graph
referencing its nodes + a `nodes.yaml` declaration + wall coverage —
an archive restore without a consumer is re-cruft and refuses review.
