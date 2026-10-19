// @contract cards-phantom-key-law
// phantom-key-journey-rider.spec.tsx — ARM B of THE PHANTOM-KEY LAW
// (tests/walls/ts/suites/phantom-key-class.spec.ts owns Arms A+C and
// the header; this file is the journey arm, hosted beside the d-wall
// — the kit's proven seat, where react and the kit's import chain
// resolve under pnpm strict hoisting and the package's own tsconfig.)
//
// Derived admission (never a hand list): every CARD whose served spec
// stamps a BAG through a Recipe row (array/object-valued
// wire_defaults) mounts the shared RecipePills face through the Card
// Rail Seat Kit, picks every row through the REAL event path
// (AxisMenuSelect → onPick → the host's gate → the commit), and must
// journal the row on the face AFTER the card's own settle round-trip —
// and the settled bag carries no own-key `undefined` (the (d)
// mechanics judged at the seat the operator drives).

import { createElement as h } from "react"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { loadCardDefs } from "@melite/comfyui-cordis"
import { RecipePills } from "../../../../packages/web/card-base/src/axes.tsx"
import { ownStampOf, rowsFor } from "../../../../packages/web/card-base/src/spec.ts"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"
import {
  bindDeadEstateRemote,
  mountLiveLayer,
  pickRecipe,
  realServedSpec,
  recipeFace,
  releaseRailSeat,
  restoreLaneOverlay,
  serveFormSpec,
} from "../../../../packages/web/card-base/tests/helpers/card-rail-seat.tsx"

/** Recursive own-key walk (Arm A's own predicate, mirrored here so
 *  the journey hop judges the same shape). */
function hasOwnUndefined(v: unknown, depth = 0): boolean {
  if (depth > 12 || v === null || typeof v !== "object") return false
  if (Array.isArray(v)) return v.some((e) => hasOwnUndefined(e, depth + 1))
  for (const e of Object.values(v as Record<string, unknown>)) {
    if (e === undefined || hasOwnUndefined(e, depth + 1)) return true
  }
  return false
}

describe("THE PHANTOM-KEY LAW, ARM B — every bag-stamping card journals its row on the face after settle", () => {
  const riders: Array<{ card: string, rows: Array<{ id: string, label: string }>, hydratePair: boolean }> = []

  // The family DECLs — statically globbed (vite expands the pattern;
  // the directory name IS the family id), imported only for the
  // families the booted cards actually board.
  const familyDecls = (import.meta as unknown as { glob: (p: string) => Record<string, () => Promise<{ DECL?: { variants?: Array<Record<string, unknown>> } }> > }).glob("../../../../packages/models/*/src/index.ts")

  beforeAll(async () => {
    const defs = await loadCardDefs()
    for (const [cardId, def] of defs) {
      const fams = (def as unknown as { boarded?: string[] }).boarded ?? []
      const rows: Array<{ id: string, label: string }> = []
      for (const fam of fams) {
        // vite normalizes glob keys — match by the stable suffix (the
        // models/<id>/src/index.ts tail), never the spelled prefix.
        const load = Object.entries(familyDecls).find(([k]) => k.endsWith(`/models/${fam}/src/index.ts`))?.[1]
        if (load === undefined) continue // a family without a DECL package contributes nothing
        const decl = (await load()).DECL
        for (const r of decl?.variants ?? []) {
          const wd = r["wire_defaults"] as Record<string, unknown> | undefined
          if (wd === undefined || wd === null || typeof wd !== "object") continue
          // THE BAG CLASS: an array-of-records wire_default — the
          // per-entry materialization seam (the loras family). A flat
          // object stamp rides the generic plane (no per-entry
          // hydration) and is not this law's subject.
          if (Object.values(wd).some((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null)) {
            rows.push({ id: String(r["id"]), label: String(r["label"]) })
          }
        }
      }
      if (rows.length > 0) {
        riders.push({ card: cardId, rows, hydratePair: cardId === "h3-timeline" })
      }
    }
    expect(riders.length, "the rider must find the bag-stamping cards (a sweep that finds none is a dead wall)").toBeGreaterThan(2)
  }, 120_000)

  afterAll(async () => { await restoreLaneOverlay() })

  it("every bag-stamping card picks each row through the real event path and journals it on the face after settle", async () => {
    for (const rider of riders) {
      const served = await realServedSpec(rider.card)
      serveFormSpec(served)
      bindDeadEstateRemote()
      const seed: Record<string, unknown> = rider.hydratePair ? (hydrateLayerA({}) as unknown as Record<string, unknown>) : {}
      const mounted = mountLiveLayer<Record<string, unknown>>({
        seed,
        renderRail: (seat) => h(RecipePills, {
          spec: served,
          values: seat.layerA as never,
          onPick: (patch: unknown) => seat.setLayerA((prev: unknown) => ({ ...(prev as Record<string, unknown>), ...(patch as Record<string, unknown>) })),
        }),
        settle: rider.hydratePair
          ? (doc: Record<string, unknown>) => hydrateLayerA(serializeLayerA(doc as never)) as unknown as Record<string, unknown>
          : undefined,
      })
      // THE SERVED SET IS THE OFFERED SET: the pills' OWN offering
      // law (axes.tsx — rowsFor('Recipe') through the own-stamp gate)
      // intersected with the bag class. A family DECL row the card's
      // derived lane cannot honor (image-gen serves its HEAD family's
      // recipes only) is correctly unoffered; the rider drives
      // exactly what a hand could pick.
      const servedRows = rowsFor(served, "Recipe")
        .filter((r) => Object.keys(ownStampOf(served, r)).length > 0)
        .filter((r) => {
          // the SERVED rows carry the reconciled stamp (ownStampOf),
          // not the family DECL's raw wire_defaults — the bag class
          // reads the stamp the pick actually lands.
          const stamp = ownStampOf(served, r)
          return Object.values(stamp).some(
            (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && v[0] !== null,
          )
        })
        .map((r) => ({ id: String(r.id), label: String(r.label) }))
      for (const row of servedRows) {
        await pickRecipe(new RegExp(row.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
        const face = await recipeFace()
        expect(
          face,
          `${rider.card} × ${row.id}: the face journals no row after the pick settled — the recipe-face burn class (ERROR d) on the journey hop`,
        ).toContain(row.label)
        if (rider.hydratePair) {
          const layer = mounted.layer()
          for (const [bag, entries] of Object.entries(layer)) {
            if (!Array.isArray(entries)) continue
            for (let i = 0; i < entries.length; i++) {
              expect(
                hasOwnUndefined(entries[i]),
                `${rider.card} × ${row.id}: the settled ${bag}[${i}] carries a phantom key — the face is a lie over own-key counts`,
              ).toBe(false)
            }
          }
        }
      }
      releaseRailSeat()
    }
  }, 240_000)
})
