/** lane-store-materialize.ts — THE DECL-DERIVED STORE SEAT for walls
 *  that ride the real estate door (phase1Card/phase2Card) inside a
 *  hermetic lane-store overlay.
 *
 *  THE DRIFT CLASS THIS KILLS (CI, 2026-11-05): the music3 walls
 *  hand-materialized ONE declared file (the fp16 DiT); the int8 fold
 *  later seated the int8 text encoder on the family row and every
 *  machine without a live model store went red at the door —
 *  "lane presence: family 'music3' declares text_encoder … but no
 *  store copy exists" — while the operator's machine (store present)
 *  stayed green. A wall that names files by hand is a copy of the
 *  DECL that drifts; THIS helper reads the DECL's OWN rows — every
 *  provision (name + folder) and every lane_input across the family
 *  rows, every variant row, and every cell row — so the hermetic
 *  store always carries exactly what any compose of that family can
 *  demand, existence-only (no run loads these bytes). */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { LANE_FOLDERS } from "../../packages/harness/estate-queue/src/cardsLanes.ts";

/** A lane-checkable lane_inputs row (family, variant, or cell shape). */
type LaneInputsRow = { lane_inputs?: Record<string, unknown> }

/** A cell row inside a variant (may carry its own lane_inputs). */
type CellRow = { cells?: LaneInputsRow[] } & LaneInputsRow

/** The DECL slice this helper walks (structurally typed — any DECL
 *  shape carrying these optional rows materializes). */
export type MaterializeDecl = {
  lane_inputs?: Record<string, unknown>
  provisions?: Array<{ name?: unknown, folder?: unknown }>
  variants?: Array<CellRow & { id?: unknown }>
}

/** Materialize every declared lane weight of `decl` under the
 *  overlay's comfyui store (existence-only, the overlay's own law).
 *  Folder resolution is the DOOR'S own order: a provisions row's
 *  folder wins when present (the provision row owns the file's home
 *  — cardsLanes.ts's provision-folder leg), else the slot's first
 *  stock folder (LANE_FOLDERS, the same table the presence check
 *  probes).
 * @param storeRoot - the overlay root (installLaneStoreOverlay's
 *  return — the path whose data/runtime/comfyui/models tree the
 *  presence check reads).
 * @param decl - the family DECL (getModel(fam)).
 * @returns the count of files touched (skips already-present files —
 *  a live store is never rewritten). */
export function materializeLaneWeights(storeRoot: string, decl: MaterializeDecl): number {
  const provisionFolder = new Map<string, string>()
  for (const p of decl.provisions ?? []) {
    if (typeof p.name === 'string' && p.name !== '' && typeof p.folder === 'string' && p.folder !== '') {
      provisionFolder.set(p.name, p.folder)
    }
  }
  // every lane_inputs row the DECL can resolve at compose: the
  // family row, every variant row, and every variant's cell rows —
  // the union, never the stated pick (a wall may compose any cell)
  const rows: Array<Record<string, unknown>> = [decl.lane_inputs ?? {}]
  for (const variant of decl.variants ?? []) {
    rows.push(variant.lane_inputs ?? {})
    for (const cell of variant.cells ?? []) rows.push(cell.lane_inputs ?? {})
  }
  const files = new Set<string>()
  for (const row of rows) {
    for (const [slot, raw] of Object.entries(row)) {
      if (typeof raw !== 'string' || raw === '') continue
      const stock = LANE_FOLDERS[slot]
      if (stock === undefined) continue // clip_type & friends are not weights
      const folder = provisionFolder.get(raw) ?? stock[0]
      files.add(folder + '/' + raw)
    }
  }
  // provisioned weights beyond the lane rows (a DECL may provision a
  // file no lane_input names — it lands with its row's own folder)
  for (const [name, folder] of provisionFolder) files.add(folder + '/' + name)
  let touched = 0
  for (const rel of files) {
    const at = join(storeRoot, 'data', 'runtime', 'comfyui', 'models', rel)
    if (existsSync(at)) continue
    mkdirSync(dirname(at), { recursive: true })
    writeFileSync(at, '')
    touched += 1
  }
  return touched
}
