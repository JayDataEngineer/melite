// families/index.ts — the family table (32 plugins, generated +
// frozen): every family owns its declaration file; this index is
// the ONLY load order (sorted by genre then id — the table's key
// order is id-sorted at the service, order here is just load
// order). bootModels loads each through ctx.plugin — one fiber per
// family, transactional.
//
// The table is a ROW TABLE (pkg + id, the plugin law's 2026-11-17
// seam) loaded through dynamic import (the cordis config-driven
// plugin pattern): the engine never statically imports its
// plugins — a static edge here would cycle, because every family
// imports the engine's own service/contract types. The manifest's
// @melite/models-* dependency rows are the declared closure that
// makes these specifiers resolvable at runtime; the census wall
// (tests/walls/ts/suites/artifact-plane-law.spec.ts W9) pins BOTH
// columns to the manifests so a renamed family cannot rot
// silently, and loadFamilies asserts each loaded DECL.id equals
// its row id at boot.
//
// PLUGIN LAW (operator, the card-without-family audit): a family
// package absent from the install RETIRES ALONE — its card serves,
// its compose door refuses by name; it never takes the boot down.
// Total outage (zero packages load) still refuses: that install
// is an estate defect, not a lawful absence.
import type { Plugin } from "@deepseek-ai/cordis";

/** The contract every family module exports: one plugin object and
 *  the DECL it registers (the id pairing is asserted at load). */
export interface FamilyModule {
  family: Plugin
  DECL: { id: string }
}

/** One frozen row: the package specifier beside the family id its
 *  DECL must carry. The pairing cannot drift — loadFamilies refuses
 *  a loaded DECL whose id differs from the row. */
export interface FamilyRow {
  readonly pkg: string
  readonly id: string
}

/** A family package that failed to load and retired alone. The id
 *  stays threaded forward: validate.ts treats a boarded id in the
 *  dead roster as LAWFUL ABSENCE (the card serves; compose refuses
 *  by name), so the plugin law survives the boot. */
export interface DeadFamily {
  readonly pkg: string
  readonly id: string
  readonly error: string
}

/** The load result: the survivors and the retired. */
export interface FamilyLoad {
  readonly families: readonly Plugin[]
  readonly dead: readonly DeadFamily[]
}

/** The frozen roster, one row per family package. Exported for
 *  the census test: the roster is judged against packages/models
 *  without mounting a single plugin (loading is loadFamilies). */
export const FAMILY_ROWS: readonly FamilyRow[] = [
  { pkg: "@melite/models-anny", id: "anny" },
  { pkg: "@melite/models-fit", id: "fit" },
  { pkg: "@melite/models-pixal3d", id: "pixal3d" },
  { pkg: "@melite/models-skin", id: "skin" },
  { pkg: "@melite/models-somax", id: "somax" },
  { pkg: "@melite/models-transfer-rig", id: "transfer-rig" },
  { pkg: "@melite/models-trellis2-native", id: "trellis2-native" },
  { pkg: "@melite/models-moss-sfx", id: "moss-sfx" },
  { pkg: "@melite/models-music3", id: "music3" },
  { pkg: "@melite/models-yue2", id: "yue2" },
  { pkg: "@melite/models-qwen3-tts", id: "qwen3-tts" },
  { pkg: "@melite/models-anima", id: "anima" },
  { pkg: "@melite/models-fibo2-edit", id: "fibo2-edit" },
  { pkg: "@melite/models-florence2", id: "florence2" },
  { pkg: "@melite/models-flux-klein", id: "flux-klein" },
  { pkg: "@melite/models-h3-image", id: "h3-image" },
  { pkg: "@melite/models-h3-image-edit", id: "h3-image-edit" },
  { pkg: "@melite/models-input", id: "input" },
  { pkg: "@melite/models-joycaption", id: "joycaption" },
  { pkg: "@melite/models-joytag", id: "joytag" },
  { pkg: "@melite/models-krea-2", id: "krea-2" },
  { pkg: "@melite/models-mask", id: "mask-select" },
  { pkg: "@melite/models-moss-image", id: "moss-image" },
  { pkg: "@melite/models-qwen-img-21", id: "qwen-img-21" },
  { pkg: "@melite/models-qwen-img-edit-21", id: "qwen-img-edit-21" },
  { pkg: "@melite/models-seedvr2-ema", id: "seedvr2-ema" },
  { pkg: "@melite/models-wd14", id: "wd14" },
  { pkg: "@melite/models-z-image", id: "z-image" },
  { pkg: "@melite/models-kimodo", id: "kimodo" },
  { pkg: "@melite/models-gem-soma", id: "gem-soma" },
  { pkg: "@melite/models-concat", id: "concat" },
  { pkg: "@melite/models-h3", id: "h3" },
]

/** The package specifiers in load order (derived; the rows are the
 *  source of truth). Kept for the census wall and any roster reader
 *  that only needs the pkg column. */
export const FAMILY_PKGS: readonly string[] = FAMILY_ROWS.map((r) => r.pkg)

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Load every family plugin, in table order. A package that fails
 *  to load retires ALONE into the dead roster (the plugin law); a
 *  loaded DECL whose id differs from its row REFUSES the whole load
 *  (that is authoring drift, never runtime absence); zero
 *  survivors refuses (total outage — the estate install is
 *  broken, the receipt's own law). */
export async function loadFamilies(): Promise<FamilyLoad> {
  const families: Plugin[] = []
  const dead: DeadFamily[] = []
  for (const row of FAMILY_ROWS) {
    let mod: FamilyModule
    try {
      mod = (await import(row.pkg)) as FamilyModule
    } catch (err) {
      dead.push({ pkg: row.pkg, id: row.id, error: message(err) })
      continue
    }
    if (mod.DECL?.id !== row.id) {
      throw new Error(
        `family table drift: ${row.pkg} DECL.id is '${mod.DECL?.id ?? "absent"}' but its row pins '${row.id}' (fix the row or the DECL)`,
      )
    }
    families.push(mod.family)
  }
  if (families.length === 0) {
    throw new Error(
      `total family outage: all ${FAMILY_ROWS.length} family packages failed to load (the install is broken, not pruned — the plugin law absences single families, never the estate)`,
    )
  }
  return { families, dead }
}
